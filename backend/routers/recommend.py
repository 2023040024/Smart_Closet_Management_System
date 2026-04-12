import os
import json
import re
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Clothes, CategoryEnum, StatusEnum, User
from routers.auth import get_current_user
from tpo_rules import get_tpo_prompt_text

router = APIRouter(prefix="/recommend", tags=["코디 추천"])

# ──────────────────────────────────────────────
# Gemini API 설정
# ──────────────────────────────────────────────
# pip install google-generativeai
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "여기에_API_키_입력")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")  # 무료 티어 사용 가능


# ──────────────────────────────────────────────
# 요청/응답 스키마
# ──────────────────────────────────────────────

class RecommendRequest(BaseModel):
    situation: Optional[str] = None   # school, date, interview, exercise, cafe, travel
    temperature: Optional[float] = None  # 기온 (°C)
    weather_condition: Optional[str] = None  # sunny, cloudy, rainy, snowy


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


# ──────────────────────────────────────────────
# 1단계: 규칙 기반 필터링 (빠름)
# ──────────────────────────────────────────────

def filter_clothes(clothes_list: list[Clothes], temperature: float, weather_condition: str) -> list[Clothes]:
    """날씨·상태 기준으로 후보 옷 추려내기"""
    result = []
    for c in clothes_list:
        # 착용 불가 상태 제외
        if c.status != StatusEnum.wearable:
            continue
        # 액세서리 제외 (추천에서 제외)
        if c.category == CategoryEnum.acc:
            continue
        # 기온 기반 두께 필터
        if temperature is not None:
            if temperature >= 25 and c.thickness == "thick":
                continue
            if temperature <= 14 and c.thickness == "thin":
                continue
        # 비·눈 날씨 가죽·스웨이드 제외
        if weather_condition in ("rainy", "snowy"):
            if c.material in ("leather", "가죽"):
                continue
        result.append(c)
    return result


def get_unworn_days(c: Clothes) -> int:
    """마지막 착용일로부터 경과 일수"""
    if c.last_worn_date is None:
        return 999  # 한 번도 안 입은 옷
    return (date.today() - c.last_worn_date).days


def clothes_to_text(c: Clothes) -> str:
    """옷 데이터를 Gemini에게 전달할 텍스트로 변환"""
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
    preferred_style: str
) -> str:
    """Gemini에게 전달할 프롬프트 생성"""

    context = get_tpo_prompt_text(
        situation, temperature, weather_condition
    )
    
    situation_map = {
        "school": "학교",
        "date": "데이트",
        "interview": "면접",
        "exercise": "운동",
        "cafe": "카페",
        "travel": "여행",
    }
    situation_kr = situation_map.get(situation, situation)

    # 카테고리별로 옷 분류
    tops    = [c for c in clothes_list if c.category == CategoryEnum.top]
    bottoms = [c for c in clothes_list if c.category == CategoryEnum.bottom]
    outers  = [c for c in clothes_list if c.category == CategoryEnum.outer]
    shoes   = [c for c in clothes_list if c.category == CategoryEnum.shoes]

    # 미착용 기간 긴 옷 강조
    unworn_top = sorted(tops,    key=get_unworn_days, reverse=True)[:5]
    unworn_bot = sorted(bottoms, key=get_unworn_days, reverse=True)[:5]
    unworn_out = sorted(outers,  key=get_unworn_days, reverse=True)[:3]
    unworn_sho = sorted(shoes,   key=get_unworn_days, reverse=True)[:3]

    all_candidates = unworn_top + unworn_bot + unworn_out + unworn_sho
    clothes_text = "\n".join([clothes_to_text(c) for c in all_candidates])

    prompt = f"""
당신은 패션 코디 전문가입니다. 아래 정보를 바탕으로 오늘 입기 좋은 코디 3가지를 추천해주세요.

[오늘 상황]
{context}

[추가 사용자 정보]
- 사용자가 선호하는 스타일: {preferred_style}

[보유 옷 목록] (미착용 기간이 긴 옷 위주로 선별됨)
{clothes_text}

[추천 규칙]
1. 반드시 보유한 옷 ID만 사용하세요 (목록에 없는 ID 절대 사용 금지)
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 기온 14°C 이하면 아우터 추가
3. 미착용 기간이 긴 옷을 우선 포함하세요
4. 색 조합이 자연스러워야 합니다 (무채색 베이스 선호)
5. {situation_kr} 상황에 어울리는 스타일을 선택하세요
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
        {{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}},
        {{"clothes_id": 2, "name": "옷이름", "category": "카테고리", "color": "색상"}}
      ],
      "reason": "이 코디를 추천하는 이유를 2~3문장으로 설명"
    }},
    {{
      "outfit_number": 2,
      "items": [],
      "reason": "이유"
    }},
    {{
      "outfit_number": 3,
      "items": [],
      "reason": "이유"
    }}
  ],
  "ai_message": "오늘 {situation_kr}에 잘 어울리는 코디를 준비했어요! 한 줄 멘트"
}}
"""
    return prompt


def call_gemini(prompt: str, retries: int = 2) -> dict:
    """Gemini API 호출 및 JSON 파싱 (최대 2회 재시도)"""
    last_error = None

    for attempt in range(retries + 1):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()

            # ```json ... ``` 또는 ``` ... ``` 모두 안전하게 처리
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
            if match:
                text = match.group(1).strip()

            result = json.loads(text)

            # outfits 빈 items 검증
            if "outfits" in result:
                for outfit in result["outfits"]:
                    if not outfit.get("items"):
                        raise ValueError("Gemini가 빈 코디를 반환했습니다.")

            return result

        except (json.JSONDecodeError, ValueError) as e:
            last_error = str(e)
            if attempt < retries:
                continue  # 재시도
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
    """
    오늘의 코디 추천
    GET /recommend/today?situation=date&temperature=18&weather_condition=cloudy
    """
    user_id = current_user.id
    preferred_style = current_user.preferred_style or "캐주얼"

    # 1단계: DB에서 옷 전체 조회
    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()

    if len(all_clothes) < 3:
        raise HTTPException(
            status_code=400,
            detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요"
        )

    # 2단계: 규칙 기반 필터링
    filtered = filter_clothes(
        all_clothes,
        temperature or 20.0,
        weather_condition or "sunny"
    )

    if len(filtered) < 2:
        raise HTTPException(
            status_code=400,
            detail="날씨·상태 조건에 맞는 옷이 부족합니다"
        )

    # 3단계: Gemini API 호출

    prompt = build_prompt(
        filtered,
        situation or "cafe",
        temperature or 20.0,
        weather_condition or "sunny",
        preferred_style
    )

    result = call_gemini(prompt)
    return result


@router.post("/custom")
def recommend_custom(
    body: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    상황·날씨 직접 지정 추천
    POST /recommend/custom
    Body: { "situation": "date", "temperature": 18, "weather_condition": "rainy" }
    """
    user_id = current_user.id

    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()

    if len(all_clothes) < 3:
        raise HTTPException(
            status_code=400,
            detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요"
        )

    filtered = filter_clothes(
        all_clothes,
        body.temperature or 20.0,
        body.weather_condition or "sunny"
    )

    preferred_style = current_user.preferred_style or "캐주얼"

    prompt = build_prompt(
        filtered,
        body.situation or "cafe",
        body.temperature or 20.0,
        body.weather_condition or "sunny",
        preferred_style
    )

    result = call_gemini(prompt)
    return result


@router.get("/weekly")
def recommend_weekly(
    situation: Optional[str] = None,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = "sunny",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    일주일치 코디 추천 (옷 돌려막기)
    GET /recommend/weekly?situation=school&temperature=18&weather_condition=cloudy
    """
    user_id = current_user.id

    all_clothes = db.query(Clothes).filter(Clothes.user_id == user_id).all()
    filtered = [c for c in all_clothes if c.status == StatusEnum.wearable]

    if len(filtered) < 4:
        raise HTTPException(
            status_code=400,
            detail="주간 추천을 위해 최소 4벌 이상의 옷이 필요합니다"
        )

    clothes_text = "\n".join([clothes_to_text(c) for c in filtered])
    situation_kr = {
        "school": "학교", "date": "데이트", "cafe": "카페",
        "travel": "여행", "exercise": "운동", "interview": "면접"
    }.get(situation or "school", "일상")

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
1. 반드시 보유한 옷 ID만 사용하세요 (목록에 없는 ID 절대 사용 금지)
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 기온 14°C 이하면 아우터 추가
3. items 배열이 절대 비어있으면 안 됩니다
4. reason은 반드시 한국어 2~3문장으로 작성하세요

[보유 옷]
{clothes_text}

[응답 형식] JSON만 응답:
{{
  "weekly_outfits": [
    {{
      "day": "월요일",
      "items": [{{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}}],
      "reason": "이유"
    }},
    {{"day": "화요일", "items": [], "reason": "이유"}},
    {{"day": "수요일", "items": [], "reason": "이유"}},
    {{"day": "목요일", "items": [], "reason": "이유"}},
    {{"day": "금요일", "items": [], "reason": "이유"}}
  ],
  "tip": "이번 주 코디 팁 한 줄"
}}
"""
    result = call_gemini(prompt)
    return result
