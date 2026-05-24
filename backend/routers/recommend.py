import os
import json
import re
import httpx
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Clothes, CategoryEnum, StatusEnum, User, ThicknessEnum
from routers.auth import get_current_user
from tpo_rules import get_tpo_prompt_text, check_color_conflict

# .env 파일 로드
load_dotenv()

router = APIRouter(prefix="/recommend", tags=["코디 추천"])

# Gemini API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("models/gemini-flash-latest")

WEATHER_BASE_URL = os.getenv("WEATHER_BASE_URL", "http://localhost:8000")

# --- 데이터 모델 정의 ---
class RecommendRequest(BaseModel):
    situation: Optional[str] = None
    temperature: Optional[float] = None
    weather_condition: Optional[str] = None
    address: Optional[str] = None 

class OutfitItem(BaseModel):
    clothes_id: int
    name: str
    category: str
    color: str

class RecommendResult(BaseModel):
    outfit_number: int
    items: list[OutfitItem]
    reason: str

class RecommendResponse(BaseModel):
    outfits: list[RecommendResult]
    ai_message: str

# --- 유틸리티 함수 ---
def fetch_weather(address: str) -> dict:
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(
                f"{WEATHER_BASE_URL}/weather/address",
                params={"address": address}
            )
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "success":
            return {"temperature": 20.0, "condition": "sunny"}

        weather = data["weather"]
        temp_str = weather.get("현재 기온", "20°C").replace("°C", "").strip()
        temperature = float(temp_str)

        sky  = weather.get("하늘 상태", "맑음")
        rain = weather.get("강수 형태", "없음")

        if rain in ("비", "소나기", "비/눈"):
            condition = "rainy"
        elif rain == "눈":
            condition = "snowy"
        elif sky == "맑음":
            condition = "sunny"
        else:
            condition = "cloudy"

        return {"temperature": temperature, "condition": condition}

    except Exception as e:
        print(f"[날씨 연동 실패, 기본값 사용] {e}")
        return {"temperature": 20.0, "condition": "sunny"}

def get_user_profile_text(user: User, temperature: float):
    temp_sensitivity = user.temp_sensitivity or 0.0
    outer_threshold  = 14 + round(temp_sensitivity)
    felt_temp        = temperature - temp_sensitivity * 2
    
    # Enum 값 처리 (AttributeError 방지)
    preferred_style = user.preferred_style.value if hasattr(user.preferred_style, 'value') else (user.preferred_style or "캐주얼")
    
    profile_text = (
        f"- 선호 스타일: {preferred_style}\n"
        f"- 온도 민감도: {temp_sensitivity} "
        f"({'더위 타는 편' if temp_sensitivity < 0 else '추위 타는 편' if temp_sensitivity > 0 else '보통'})\n"
        f"- 체감 기온: {felt_temp:.1f}°C (실제 {temperature}°C 기준)\n"
        f"- 아우터 기준 온도: {outer_threshold}°C 이하"
    )
    return profile_text, preferred_style, felt_temp, outer_threshold


# ──────────────────────────────────────────────
# 1단계: 규칙 기반 필터링 (F-13 계절·색 충돌 포함)
# ──────────────────────────────────────────────

def get_current_season() -> str:
    month = date.today().month
    if month in (3, 4, 5):   return "봄"
    elif month in (6, 7, 8): return "여름"
    elif month in (9, 10, 11): return "가을"
    else:                     return "겨울"


def calculate_conflict_score(c: Clothes, situation: str) -> int:
    """F-13: 색·계절 충돌 감점(C) 계산
    - 계절 불일치 C=80 (사계절 제외)
    - 면접 고채도 색상(레드/핑크) C=60
    """
    season_val = c.season.value if hasattr(c.season, "value") else c.season
    if season_val != "사계절" and season_val != get_current_season():
        return 80
    if situation in ("면접", "interview"):
        color = c.color or ""
        if check_color_conflict(color, "", "면접") >= 60:
            return 60
    return 0


def filter_clothes(clothes_list: list[Clothes], temperature: float, weather_condition: str, situation: str = "데일리") -> list[Clothes]:
    result = []
    for c in clothes_list:
        if c.status is not None and c.status != StatusEnum.wearable.value:
            continue
        if c.category == CategoryEnum.acc.value:
            continue
        if temperature is not None:
            if temperature >= 25 and c.thickness == ThicknessEnum.thick.value:
                continue
            if temperature <= 14 and c.thickness == ThicknessEnum.thin.value:
                continue
        if weather_condition in ("rainy", "snowy"):
            if c.material == "레더":
                continue
        # F-13: 계절 불일치(C=80) 제외
        if calculate_conflict_score(c, situation) >= 80:
            continue
        result.append(c)
    return result

def apply_fallback_filter(
    all_clothes: list[Clothes],
    temperature: float,
    weather_condition: str,
    situation: str = "데일리",
) -> tuple[list[Clothes], bool]:
    """strict filter 후 상의/하의가 2벌 미만이면 해당 카테고리의 계절·두께 필터를 해제.

    옷장 규모가 작은 초기 사용자(3~5벌)도 추천을 받을 수 있도록 fallback 적용.
    반환: (필터 결과, fallback 사용 여부)
    """
    MIN_PER_CATEGORY = 2

    strict = filter_clothes(all_clothes, temperature, weather_condition, situation)

    def _cat(c: Clothes) -> str:
        return c.category.value if hasattr(c.category, "value") else c.category

    def _is_wearable(c: Clothes) -> bool:
        status = c.status.value if hasattr(c.status, "value") else c.status
        return (status is None or status == StatusEnum.wearable.value) and _cat(c) != CategoryEnum.acc.value

    tops    = [c for c in strict if _cat(c) == CategoryEnum.top.value]
    bottoms = [c for c in strict if _cat(c) == CategoryEnum.bottom.value]

    if len(tops) >= MIN_PER_CATEGORY and len(bottoms) >= MIN_PER_CATEGORY:
        return strict, False

    strict_ids = {c.clothes_id for c in strict}
    result = list(strict)

    if len(tops) < MIN_PER_CATEGORY:
        for c in all_clothes:
            if _cat(c) == CategoryEnum.top.value and c.clothes_id not in strict_ids and _is_wearable(c):
                result.append(c)
                strict_ids.add(c.clothes_id)

    if len(bottoms) < MIN_PER_CATEGORY:
        for c in all_clothes:
            if _cat(c) == CategoryEnum.bottom.value and c.clothes_id not in strict_ids and _is_wearable(c):
                result.append(c)
                strict_ids.add(c.clothes_id)

    return result, True


def get_unworn_days(c: Clothes) -> int:
    if c.last_worn_date is None:
        return 999
    return (date.today() - c.last_worn_date).days

def clothes_to_text(c: Clothes) -> str:
    unworn = get_unworn_days(c)
    unworn_str = f"{unworn}일 미착용" if unworn < 999 else "착용 기록 없음"
    
    # Enum 필드 처리
    category = c.category.value if hasattr(c.category, 'value') else c.category
    color = c.color.value if hasattr(c.color, 'value') else c.color
    season = c.season.value if hasattr(c.season, 'value') else c.season
    style = c.style.value if hasattr(c.style, 'value') else c.style
    situation = c.situation.value if hasattr(c.situation, 'value') else (c.situation or '미입력')
    thickness = c.thickness.value if hasattr(c.thickness, 'value') else (c.thickness or '미입력')
    
    return (
        f"[ID:{c.clothes_id}] {c.name} / "
        f"카테고리:{category} / "
        f"색상:{color} / "
        f"계절:{season} / "
        f"스타일:{style} / "
        f"상황:{situation} / "
        f"소재:{c.material or '미입력'} / "
        f"두께:{thickness} / "
        f"{unworn_str}"
    )

def build_prompt(clothes_list: list[Clothes], situation: str, temperature: float, weather_condition: str, user: User) -> str:
    situation_map = {
        "daily": "데일리", "business": "비즈니스", "interview": "면접",
        "wedding": "결혼식", "funeral": "장례식", "exercise": "운동",
        "date": "데이트", "meeting": "모임", "travel": "여행",
        "school": "데일리", "cafe": "데일리",
    }
    situation_kr = situation_map.get(situation or "daily", situation or "데일리")
    context = get_tpo_prompt_text(situation_kr, temperature, weather_condition)
    profile_text, preferred_style, felt_temp, outer_threshold = get_user_profile_text(user, temperature)

    tops    = sorted([c for c in clothes_list if c.category == CategoryEnum.top],    key=get_unworn_days, reverse=True)[:5]
    bottoms = sorted([c for c in clothes_list if c.category == CategoryEnum.bottom], key=get_unworn_days, reverse=True)[:5]
    outers  = sorted([c for c in clothes_list if c.category == CategoryEnum.outer],  key=get_unworn_days, reverse=True)[:3]
    shoes   = sorted([c for c in clothes_list if c.category == CategoryEnum.shoes],  key=get_unworn_days, reverse=True)[:3]

    all_candidates = tops + bottoms + outers + shoes
    clothes_text = "\n".join([clothes_to_text(c) for c in all_candidates])

    prompt = f"""
[오늘 상황]
{context}
[사용자 개인 정보]
{profile_text}
[보유 옷 목록]
{clothes_text}
[추천 규칙]
1. 반드시 보유한 옷 ID만 사용하세요 (목록에 없는 ID 절대 사용 금지)
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 체감온도 {outer_threshold}°C 이하면 아우터 추가
3. 미착용 기간이 긴 옷을 우선 포함하세요
4. 색 조합이 자연스러워야 합니다 (무채색 베이스 선호)
5. {situation_kr} 상황과 사용자 선호 스타일({preferred_style})에 맞게 선택하세요
6. 면접이면 포멀 위주, 운동이면 활동성 우선
7. 면접 상황에서 레드·핑크 계열 색상은 피하세요 (고채도 충돌 C=60 감점 적용)
8. 코디 3가지는 서로 겹치는 옷이 없어야 합니다
9. items 배열이 절대 비어있으면 안 됩니다
10. reason은 반드시 한국어 2~3문장으로 작성하세요
[응답 형식] 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{{
  "outfits": [
    {{
      "outfit_number": 1,
      "items": [
        {{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}}
      ],
      "reason": "이유"
    }}
  ],
  "ai_message": "멘트"
}}
"""
    return prompt

def call_gemini(prompt: str, retries: int = 2) -> dict:
    for attempt in range(retries + 1):
        try:
            response = model.generate_content(prompt)
            print(f"--- AI 응답 원본 (시도 {attempt+1}) ---\n{response.text}\n----------------")
            
            text = response.text.strip()
            
            # 백틱(```) 3개로 감싸진 JSON 블록을 찾는 코드
            pattern = r"[`]{3}(?:json)?\s*([\s\S]*?)[`]{3}"
            match = re.search(pattern, text)
            
            if match:
                text = match.group(1).strip()
            else:
                # 백틱이 없는 경우 전체 텍스트에서 JSON 형태({})를 찾습니다.
                json_match = re.search(r"\{[\s\S]*\}", text)
                if json_match:
                    text = json_match.group(0)
            
            result = json.loads(text)
            if "outfits" in result and len(result["outfits"]) > 0:
                return result
            else:
                raise ValueError("AI가 추천 코디를 생성하지 못했습니다.")

        except Exception as e:
            print(f"❌ AI 호출/파싱 중 에러 발생: {str(e)}")
            if attempt == retries:
                raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {str(e)}")

@router.get("/today", response_model=RecommendResponse)
def recommend_today(
    situation: Optional[str] = None,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = None,
    address: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 날씨 정보 가져오기 (주소가 있다면)
    if address:
        fetched = fetch_weather(address)
        temperature       = temperature       or fetched["temperature"]
        weather_condition = weather_condition or fetched["condition"]

    # 기본값 설정
    temperature       = temperature       or 20.0
    weather_condition = weather_condition or "sunny"

    # 2. 사용자 옷 데이터 조회
    user_id = current_user.id
    try:
        all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    except LookupError as e:
        raise HTTPException(status_code=500, detail=f"옷 데이터 조회 중 오류 발생: {str(e)}")
    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")
    filtered, used_fallback = apply_fallback_filter(all_clothes, temperature, weather_condition, situation or "데일리")
    if len(filtered) < 2:
        return {
            "outfits": [],
            "ai_message": "날씨·상태 조건에 맞는 옷이 부족합니다"
        }
    prompt = build_prompt(filtered, situation or "daily", temperature, weather_condition, current_user)
    result = call_gemini(prompt)
    if used_fallback:
        result["ai_message"] = "[현재 날씨·계절에 맞는 옷이 부족하여 전체 옷장 기준으로 추천했습니다] " + result.get("ai_message", "")
    return result

@router.post("/custom", response_model=RecommendResponse)
def recommend_custom(
    body: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    temperature       = body.temperature
    weather_condition = body.weather_condition

    if body.address:
        fetched = fetch_weather(body.address)
        temperature       = temperature       or fetched["temperature"]
        weather_condition = weather_condition or fetched["condition"]

    temperature       = temperature       or 20.0
    weather_condition = weather_condition or "sunny"

    user_id = current_user.id
    try:
        all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    except LookupError as e:
        raise HTTPException(status_code=500, detail=f"옷 데이터 조회 중 오류 발생: {str(e)}")
    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")
    filtered, used_fallback = apply_fallback_filter(all_clothes, temperature, weather_condition, body.situation or "데일리")
    if len(filtered) < 2:
        return {
            "outfits": [],
            "ai_message": "날씨·상태 조건에 맞는 옷이 부족합니다"
        }
    prompt = build_prompt(filtered, body.situation or "daily", temperature, weather_condition, current_user)
    result = call_gemini(prompt)
    if used_fallback:
        result["ai_message"] = "[현재 날씨·계절에 맞는 옷이 부족하여 전체 옷장 기준으로 추천했습니다] " + result.get("ai_message", "")
    return result

@router.get("/weekly")
def recommend_weekly(
    situation: Optional[str] = None,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = None,   # ← "sunny" 제거
    address: Optional[str] = None,              # ← 추가
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if address:
        fetched = fetch_weather(address)
        temperature       = temperature       or fetched["temperature"]
        weather_condition = weather_condition or fetched["condition"]

    temperature       = temperature       or 20.0
    weather_condition = weather_condition or "sunny"

    user_id = current_user.id
    try:
        all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    except LookupError as e:
        raise HTTPException(status_code=500, detail=f"옷 데이터 조회 중 오류 발생: {str(e)}")
    filtered = [c for c in all_clothes if c.status in (StatusEnum.wearable, None)]
    if len(filtered) < 4:
        return {
            "outfits": [], 
            "ai_message": "주간 추천을 위해 최소 4벌 이상의 옷을 등록해주세요."
        }
    clothes_text = "\n".join([clothes_to_text(c) for c in filtered])
    situation_kr = situation or "데일리"

    prompt = f"""
당신은 패션 코디 전문가입니다.
아래 옷장에서 월~금 5일치 코디를 짜주세요. (옷 돌려막기 스타일)
[오늘 날씨]
- 기온: {temperature}°C
- 날씨: {weather_condition}
[목표]
- 같은 옷을 연속으로 입지 않기
- 상의 하나로 여러 코디 만들기
- 미착용 기간이 긴 옷 우선 활용
- 상황: {situation_kr}
[추천 규칙]
1. 반드시 보유한 옷 ID만 사용하세요
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 기온 14°C 이하면 아우터 추가
3. items 배열이 절대 비어있으면 안 됩니다
4. reason은 반드시 한국어 2~3문장으로 작성하세요
[보유 옷]
{clothes_text}
[응답 형식] JSON만 응답:
{{
  "weekly_outfits": [
    {{"day": "월요일", "items": [{{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}}], "reason": "이유"}},
    {{"day": "화요일", "items": [], "reason": "이유"}},
    {{"day": "수요일", "items": [], "reason": "이유"}},
    {{"day": "목요일", "items": [], "reason": "이유"}},
    {{"day": "금요일", "items": [], "reason": "이유"}}
  ],
  "tip": "이번 주 코디 팁 한 줄"
}}
"""
    return call_gemini(prompt)