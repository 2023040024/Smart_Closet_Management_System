import os
import json
import re
import httpx
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Clothes, CategoryEnum, StatusEnum, User, ThicknessEnum, MaterialEnum
from routers.auth import get_current_user
from tpo_rules import get_tpo_prompt_text

router = APIRouter(prefix="/recommend", tags=["코디 추천"])

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "여기에_API_키_입력")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

WEATHER_BASE_URL = os.getenv("WEATHER_BASE_URL", "http://localhost:8000")

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


def fetch_weather(address: str) -> dict:
    """
    B파트 /weather/address 호출
    실패 시 기본값(기온 20, 맑음) 반환하여 추천 중단 방지
    """
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
# ──────────────────────────────────────────────
# 사용자 프로필 텍스트 생성
# ──────────────────────────────────────────────

def get_user_profile_text(user: User, temperature: float):
    temp_sensitivity = user.temp_sensitivity or 0.0
    outer_threshold  = 14 + round(temp_sensitivity)
    felt_temp        = temperature - temp_sensitivity * 2
    preferred_style  = user.preferred_style.value if user.preferred_style else "캐주얼"
    profile_text = (
        f"- 선호 스타일: {preferred_style}\n"
        f"- 온도 민감도: {temp_sensitivity} "
        f"({'더위 타는 편' if temp_sensitivity < 0 else '추위 타는 편' if temp_sensitivity > 0 else '보통'})\n"
        f"- 체감 기온: {felt_temp:.1f}°C (실제 {temperature}°C 기준)\n"
        f"- 아우터 기준 온도: {outer_threshold}°C 이하"
    )
    return profile_text, preferred_style, felt_temp, outer_threshold


# ──────────────────────────────────────────────
# 1단계: 규칙 기반 필터링
# ──────────────────────────────────────────────

def filter_clothes(clothes_list: list[Clothes], temperature: float, weather_condition: str) -> list[Clothes]:
    result = []
    for c in clothes_list:
        if c.status != StatusEnum.wearable:
            continue
        if c.category == CategoryEnum.acc:
            continue
        if temperature is not None:
            if temperature >= 25 and c.thickness == ThicknessEnum.thick:
                continue
            if temperature <= 14 and c.thickness == ThicknessEnum.thin:
                continue
        if weather_condition in ("rainy", "snowy"):
            if c.material == MaterialEnum.leather:
                continue
        result.append(c)
    return result


def get_unworn_days(c: Clothes) -> int:
    if c.last_worn_date is None:
        return 999
    return (date.today() - c.last_worn_date).days


def clothes_to_text(c: Clothes) -> str:
    unworn = get_unworn_days(c)
    unworn_str = f"{unworn}일 미착용" if unworn < 999 else "착용 기록 없음"
    return (
        f"[ID:{c.clothes_id}] {c.name} / "
        f"카테고리:{c.category.value} / "
        f"색상:{c.color} / "
        f"계절:{c.season.value} / "
        f"스타일:{c.style.value} / "
        f"소재:{c.material or '미입력'} / "
        f"두께:{c.thickness or '미입력'} / "
        f"{unworn_str}"
    )


# ──────────────────────────────────────────────
# 2단계: Gemini API 호출
# ──────────────────────────────────────────────

def build_prompt(
    clothes_list: list[Clothes],
    situation: str,
    temperature: float,
    weather_condition: str,
    user: User
) -> str:
    situation_map = {
        "daily":    "데일리",
        "business": "비즈니스",
        "interview":"면접",
        "wedding":  "결혼식",
        "funeral":  "장례식",
        "exercise": "운동",
        "date":     "데이트",
        "meeting":  "모임",
        "travel":   "여행",
        "school":   "데일리",
        "cafe":     "데일리",
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
[보유 옷 목록] (미착용 기간이 긴 옷 위주로 선별됨)
{clothes_text}
[추천 규칙]
1. 반드시 보유한 옷 ID만 사용하세요 (목록에 없는 ID 절대 사용 금지)
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 체감온도 {outer_threshold}°C 이하면 아우터 추가
3. 미착용 기간이 긴 옷을 우선 포함하세요
4. 색 조합이 자연스러워야 합니다 (무채색 베이스 선호)
5. {situation_kr} 상황과 사용자 선호 스타일({preferred_style})에 맞게 선택하세요
6. 면접이면 포멀 위주, 운동이면 활동성 우선
7. 코디 3가지는 서로 겹치는 옷이 없어야 합니다
8. items 배열이 절대 비어있으면 안 됩니다
9. reason은 반드시 한국어 2~3문장으로 작성하세요
[응답 형식] 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{{
  "outfits": [
    {{
      "outfit_number": 1,
      "items": [
        {{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}}
      ],
      "reason": "2~3문장"
    }},
    {{"outfit_number": 2, "items": [], "reason": "이유"}},
    {{"outfit_number": 3, "items": [], "reason": "이유"}}
  ],
  "ai_message": "오늘 {situation_kr}에 잘 어울리는 코디를 준비했어요! 한 줄 멘트"
}}
"""
    return prompt


def call_gemini(prompt: str, retries: int = 2) -> dict:
    last_error = None
    for attempt in range(retries + 1):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
            if match:
                text = match.group(1).strip()
            result = json.loads(text)
            if "outfits" in result:
                for outfit in result["outfits"]:
                    if not outfit.get("items"):
                        raise ValueError("Gemini가 빈 코디를 반환했습니다.")
            return result
        except (json.JSONDecodeError, ValueError) as e:
            last_error = str(e)
            if attempt < retries:
                continue
            raise HTTPException(
                status_code=500,
                detail=f"Gemini 응답 파싱 실패 ({retries + 1}회 시도): {last_error}"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini API 오류: {str(e)}")


# ──────────────────────────────────────────────
# API 엔드포인트
# ──────────────────────────────────────────────

@router.get("/today")
def recommend_today(
    situation: Optional[str] = None,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = "sunny",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.user_id
    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")
    filtered = filter_clothes(all_clothes, temperature or 20.0, weather_condition or "sunny")
    if len(filtered) < 2:
        raise HTTPException(status_code=400, detail="날씨·상태 조건에 맞는 옷이 부족합니다")
    prompt = build_prompt(filtered, situation or "daily", temperature or 20.0, weather_condition or "sunny", current_user)
    return call_gemini(prompt)


@router.post("/custom")
def recommend_custom(
    body: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.user_id
    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")
    filtered = filter_clothes(all_clothes, body.temperature or 20.0, body.weather_condition or "sunny")
    prompt = build_prompt(filtered, body.situation or "daily", body.temperature or 20.0, body.weather_condition or "sunny", current_user)
    return call_gemini(prompt)


@router.get("/weekly")
def recommend_weekly(
    situation: Optional[str] = None,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = "sunny",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.user_id
    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    filtered = [c for c in all_clothes if c.status == StatusEnum.wearable]
    if len(filtered) < 4:
        raise HTTPException(status_code=400, detail="주간 추천을 위해 최소 4벌 이상의 옷이 필요합니다")
    clothes_text = "\n".join([clothes_to_text(c) for c in filtered])
    situation_kr = situation or "데일리"

    prompt = f"""
당신은 패션 코디 전문가입니다.
아래 옷장에서 월~금 5일치 코디를 짜주세요. (옷 돌려막기 스타일)
[오늘 날씨]
- 기온: {temperature or 20.0}°C
- 날씨: {weather_condition or 'sunny'}
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
