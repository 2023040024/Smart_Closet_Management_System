import os
import json
import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import google.generativeai as genai

from database import get_db
from models import Clothes, CategoryEnum, StatusEnum, User
from routers.auth import get_current_user
from tpo_rules import get_tpo_prompt_text

router = APIRouter(prefix="/recommend", tags=["코디 추천"])

# ──────────────────────────────────────────────
# Gemini API 설정
# ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "여기에_API_키_입력")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


# ──────────────────────────────────────────────
# 요청/응답 스키마
# ──────────────────────────────────────────────

class RecommendRequest(BaseModel):
    situation: Optional[str] = None
    temperature: Optional[float] = None
    weather_condition: Optional[str] = None


class RotationRequest(BaseModel):
    fixed_clothes_ids: list[int]          # 고정할 옷 ID 목록 (매일 포함)
    days: int = 5                          # 며칠치 (1~14)
    situation: Optional[str] = None
    temperature: Optional[float] = None
    weather_condition: Optional[str] = None


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
# 1단계: 규칙 기반 필터링
# ──────────────────────────────────────────────

def _filter_by_weather(clothes_list: list[Clothes], temperature: float, weather_condition: str) -> list[Clothes]:
    """날씨 기준만 필터링 (두께, 소재) — status/acc 체크 없음"""
    result = []
    for c in clothes_list:
        if temperature is not None:
            if temperature >= 25 and c.thickness == "thick":
                continue
            if temperature <= 14 and c.thickness == "thin":
                continue
        if weather_condition in ("rainy", "snowy"):
            if c.material in ("leather", "가죽"):
                continue
        result.append(c)
    return result


def filter_clothes(clothes_list: list[Clothes], temperature: float, weather_condition: str) -> list[Clothes]:
    """전체 필터링 — 착용 불가 상태, 액세서리, 날씨 모두 포함"""
    result = []
    for c in clothes_list:
        if c.status != StatusEnum.wearable:
            continue
        if c.category == CategoryEnum.acc:
            continue
        result.append(c)
    return _filter_by_weather(result, temperature, weather_condition)


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
# 유저 개인화 정보 추출 헬퍼
# ──────────────────────────────────────────────

def get_user_profile_text(user: User, temperature: float) -> tuple[str, str, float]:
    """
    User 모델의 개인화 필드를 읽어 프롬프트용 텍스트 생성.
    B가 아직 컬럼을 추가 안 했을 경우 getattr로 안전하게 기본값 처리.
    """
    cold_sensitive    = getattr(user, "cold_sensitive", False)
    heat_sensitive    = getattr(user, "heat_sensitive", False)
    temp_offset       = getattr(user, "preferred_temp_offset", 0) or 0
    preferred_style   = getattr(user, "preferred_style", None) or "캐주얼"

    # 체감온도 보정
    felt_temp = temperature + temp_offset

    sensitivity_lines = []
    if cold_sensitive:
        sensitivity_lines.append("추위를 잘 타는 편 (체감온도 더 낮게 느낌)")
    if heat_sensitive:
        sensitivity_lines.append("더위를 잘 타는 편 (체감온도 더 높게 느낌)")
    if not sensitivity_lines:
        sensitivity_lines.append("온도 민감도 보통")

    return (
        f"- 선호 스타일: {preferred_style}\n"
        f"- 체감온도: {felt_temp:.1f}°C (실제 {temperature:.1f}°C, 보정 {temp_offset:+.1f}°C)\n"
        f"- 온도 민감도: {', '.join(sensitivity_lines)}"
    ), preferred_style, felt_temp


# ──────────────────────────────────────────────
# 2단계: Gemini 프롬프트 생성
# ──────────────────────────────────────────────

def build_prompt(
    clothes_list: list[Clothes],
    situation: str,
    temperature: float,
    weather_condition: str,
    user: User
) -> str:
    context = get_tpo_prompt_text(situation, temperature, weather_condition)

    situation_map = {
        "school": "학교", "date": "데이트", "interview": "면접",
        "exercise": "운동", "cafe": "카페", "travel": "여행",
    }
    situation_kr = situation_map.get(situation, situation)

    # 개인화 정보
    profile_text, preferred_style, felt_temp = get_user_profile_text(user, temperature)

    # 카테고리별 분류 및 미착용 기간 긴 옷 우선
    tops    = sorted([c for c in clothes_list if c.category == CategoryEnum.top],    key=get_unworn_days, reverse=True)[:5]
    bottoms = sorted([c for c in clothes_list if c.category == CategoryEnum.bottom], key=get_unworn_days, reverse=True)[:5]
    outers  = sorted([c for c in clothes_list if c.category == CategoryEnum.outer],  key=get_unworn_days, reverse=True)[:3]
    shoes   = sorted([c for c in clothes_list if c.category == CategoryEnum.shoes],  key=get_unworn_days, reverse=True)[:3]

    all_candidates = tops + bottoms + outers + shoes
    clothes_text = "\n".join([clothes_to_text(c) for c in all_candidates])

    # 개인화 온도 민감도에 따른 아우터 기준 조정
    cold_sensitive = getattr(user, "cold_sensitive", False)
    outer_threshold = 17 if cold_sensitive else 14  # 추위 잘 타면 아우터 기준 올림

    prompt = f"""
당신은 패션 코디 전문가입니다. 아래 정보를 바탕으로 오늘 입기 좋은 코디 3가지를 추천해주세요.

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
9. reason 작성 규칙 (가장 중요):
   - 반드시 한국어 2~3문장
   - 문장 1: 사용자 온도 민감도 또는 체감온도 기준으로 이 코디를 고른 날씨 이유
   - 문장 2: 미착용 기간이 긴 옷이 포함된 경우 그 옷을 구체적으로 언급
   - 문장 3: {situation_kr} 상황과 선호 스타일에 어울리는 이유
   - 예시: "추위를 잘 타시는 편이라 체감온도 {felt_temp:.0f}°C에 맞게 두꺼운 니트를 포함했어요. {'{'}N{'}'}일간 못 입으셨던 베이지 니트가 이번 기회에 딱 좋아요. {situation_kr} 분위기와 {preferred_style} 스타일에도 자연스럽게 어울립니다."

[응답 형식] 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{{
  "outfits": [
    {{
      "outfit_number": 1,
      "items": [
        {{"clothes_id": 1, "name": "옷이름", "category": "카테고리", "color": "색상"}},
        {{"clothes_id": 2, "name": "옷이름", "category": "카테고리", "color": "색상"}}
      ],
      "reason": "위 규칙 9번에 따라 2~3문장으로 작성"
    }},
    {{"outfit_number": 2, "items": [], "reason": "이유"}},
    {{"outfit_number": 3, "items": [], "reason": "이유"}}
  ],
  "ai_message": "오늘 {situation_kr}에 잘 어울리는 코디를 준비했어요! 한 줄 멘트"
}}
"""
    return prompt


# ──────────────────────────────────────────────
# Gemini API 호출 (재시도 포함)
# ──────────────────────────────────────────────

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

            # outfits (today/custom) 또는 rotation (돌려막기) 빈 items 검증
            for key in ("outfits", "rotation", "weekly_outfits"):
                if key in result:
                    for outfit in result[key]:
                        if not outfit.get("items"):
                            raise ValueError(f"Gemini가 빈 코디를 반환했습니다. (key: {key})")

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
    """
    오늘의 코디 추천
    GET /recommend/today?situation=date&temperature=18&weather_condition=cloudy
    """
    all_clothes = db.query(Clothes).filter(Clothes.user_id == current_user.id).all()

    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")

    filtered = filter_clothes(all_clothes, temperature or 20.0, weather_condition or "sunny")

    if len(filtered) < 2:
        raise HTTPException(status_code=400, detail="날씨·상태 조건에 맞는 옷이 부족합니다")

    prompt = build_prompt(
        filtered,
        situation or "cafe",
        temperature or 20.0,
        weather_condition or "sunny",
        current_user
    )

    return call_gemini(prompt)


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
    all_clothes = db.query(Clothes).filter(Clothes.user_id == current_user.id).all()

    if len(all_clothes) < 3:
        raise HTTPException(status_code=400, detail="추천을 위해 최소 3벌 이상의 옷을 등록해주세요")

    filtered = filter_clothes(all_clothes, body.temperature or 20.0, body.weather_condition or "sunny")

    prompt = build_prompt(
        filtered,
        body.situation or "cafe",
        body.temperature or 20.0,
        body.weather_condition or "sunny",
        current_user
    )

    return call_gemini(prompt)


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
    all_clothes = db.query(Clothes).filter(Clothes.user_id == current_user.id).all()
    filtered = filter_clothes(all_clothes, temperature or 20.0, weather_condition or "sunny")

    if len(filtered) < 4:
        raise HTTPException(status_code=400, detail="주간 추천을 위해 최소 4벌 이상의 옷이 필요합니다")

    clothes_text = "\n".join([clothes_to_text(c) for c in filtered])
    situation_kr = {
        "school": "학교", "date": "데이트", "cafe": "카페",
        "travel": "여행", "exercise": "운동", "interview": "면접"
    }.get(situation or "school", "일상")

    # 개인화 정보
    cold_sensitive  = getattr(current_user, "cold_sensitive", False)
    heat_sensitive  = getattr(current_user, "heat_sensitive", False)
    temp_offset     = getattr(current_user, "preferred_temp_offset", 0) or 0
    preferred_style = getattr(current_user, "preferred_style", None) or "캐주얼"
    felt_temp       = (temperature or 20.0) + temp_offset

    sensitivity_str = "추위를 잘 탐" if cold_sensitive else ("더위를 잘 탐" if heat_sensitive else "보통")
    outer_threshold = 17 if cold_sensitive else 14

    prompt = f"""
당신은 패션 코디 전문가입니다.
아래 옷장에서 월~금 5일치 코디를 짜주세요. (옷 돌려막기 스타일)

[이번 주 날씨]
- 실제 기온: {temperature or 20.0}°C
- 체감온도: {felt_temp:.1f}°C
- 날씨: {weather_condition or 'sunny'}

[사용자 개인 정보]
- 선호 스타일: {preferred_style}
- 온도 민감도: {sensitivity_str}
- 상황: {situation_kr}

[추천 규칙]
1. 반드시 보유한 옷 ID만 사용하세요 (목록에 없는 ID 절대 사용 금지)
2. 코디는 상의 1개 + 하의 1개 조합이 기본이며, 체감온도 {outer_threshold}°C 이하면 아우터 추가
3. 같은 옷을 연속으로 입지 않기
4. 미착용 기간이 긴 옷 우선 활용
5. items 배열이 절대 비어있으면 안 됩니다
6. reason은 반드시 한국어 2~3문장, 해당 날 날씨/상황/미착용 기간을 구체적으로 언급

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
  "tip": "이번 주 코디 팁 한 줄 (사용자 온도 민감도 반영)"
}}
"""
    return call_gemini(prompt)


# ──────────────────────────────────────────────
# 옷 착용 팁 (신규)
# ──────────────────────────────────────────────

@router.get("/tips/{clothes_id}")
def get_clothes_tips(
    clothes_id: int,
    temperature: Optional[float] = None,
    weather_condition: Optional[str] = "sunny",
    situation: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    특정 옷에 대한 착용 팁 및 코디 제안
    GET /recommend/tips/{clothes_id}?temperature=18&weather_condition=sunny&situation=cafe
    """
    # 해당 옷 조회 (본인 소유 확인)
    clothes = db.query(Clothes).filter(
        Clothes.clothes_id == clothes_id,
        Clothes.user_id == current_user.id
    ).first()

    if not clothes:
        raise HTTPException(status_code=404, detail="옷을 찾을 수 없습니다")

    # 개인화 정보
    cold_sensitive  = getattr(current_user, "cold_sensitive", False)
    heat_sensitive  = getattr(current_user, "heat_sensitive", False)
    temp_offset     = getattr(current_user, "preferred_temp_offset", 0) or 0
    preferred_style = getattr(current_user, "preferred_style", None) or "캐주얼"

    temp = temperature or 20.0
    felt_temp = temp + temp_offset
    unworn_days = get_unworn_days(clothes)
    unworn_str = f"{unworn_days}일 미착용" if unworn_days < 999 else "착용 기록 없음"

    sensitivity_str = "추위를 잘 타는 편" if cold_sensitive else ("더위를 잘 타는 편" if heat_sensitive else "온도 민감도 보통")

    situation_kr = {
        "school": "학교", "date": "데이트", "interview": "면접",
        "exercise": "운동", "cafe": "카페", "travel": "여행"
    }.get(situation or "", "일상")

    prompt = f"""
당신은 패션 스타일리스트입니다. 아래 옷 하나에 대해 오늘 착용 팁을 알려주세요.

[옷 정보]
- 이름: {clothes.name}
- 카테고리: {clothes.category.value}
- 색상: {clothes.color}
- 스타일: {clothes.style.value}
- 소재: {clothes.material or '미입력'}
- 두께: {clothes.thickness or '미입력'}
- 착용 현황: {unworn_str}

[오늘 상황]
- 실제 기온: {temp}°C / 체감온도: {felt_temp:.1f}°C
- 날씨: {weather_condition}
- 상황: {situation_kr}

[사용자 정보]
- 선호 스타일: {preferred_style}
- 온도 민감도: {sensitivity_str}

[작성 규칙]
1. tip: 이 옷을 오늘 입기 좋은 이유 1~2문장. 미착용 기간이 길면 반드시 언급.
2. match_suggestion: 어울리는 하의 또는 아우터 스타일 구체적으로 1가지 제안
3. caution: 오늘 날씨나 상황에서 주의할 점 (없으면 빈 문자열)
4. 모든 응답은 한국어, 친근한 말투

[응답 형식] JSON만:
{{
  "clothes_id": {clothes_id},
  "tip": "오늘 입기 좋은 이유 (미착용 기간, 날씨, 상황 반영)",
  "match_suggestion": "어울리는 아이템 제안",
  "caution": "주의사항 (없으면 빈 문자열)"
}}
"""

    result = call_gemini(prompt)
    return result


# ──────────────────────────────────────────────
# 옷 돌려막기 (사용자 지정 고정 + 날짜 수 직접 지정)
# ──────────────────────────────────────────────

@router.post("/rotation")
def recommend_rotation(
    body: RotationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    옷 돌려막기 추천 — 고정 옷 지정 + 며칠치 직접 지정
    POST /recommend/rotation
    Body: {
        "fixed_clothes_ids": [3, 7],   ← 매일 입을 옷 ID (상의+신발 고정 등)
        "days": 7,                      ← 며칠치
        "situation": "school",
        "temperature": 18,
        "weather_condition": "sunny"
    }
    """
    # 날짜 범위 제한 (1~14일)
    days = max(1, min(body.days, 14))

    # 고정 옷 리스트 비어있는지 확인
    if not body.fixed_clothes_ids:
        raise HTTPException(status_code=400, detail="고정할 옷을 1개 이상 선택해주세요")

    # 고정 옷 조회 및 소유자 확인
    fixed_clothes = []
    for cid in body.fixed_clothes_ids:
        c = db.query(Clothes).filter(
            Clothes.clothes_id == cid,
            Clothes.user_id == current_user.id
        ).first()
        if not c:
            raise HTTPException(
                status_code=404,
                detail=f"옷 ID {cid}를 찾을 수 없거나 본인 소유가 아닙니다"
            )
        fixed_clothes.append(c)

    # 착용 가능한 나머지 옷 (고정 옷 제외, 액세서리 제외)
    fixed_ids_set = set(body.fixed_clothes_ids)
    all_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user.id,
        Clothes.status == StatusEnum.wearable
    ).all()

    pool = [
        c for c in all_clothes
        if c.clothes_id not in fixed_ids_set
        and c.category != CategoryEnum.acc
    ]

    # 날씨 필터 적용 (두께, 소재 기준 — status/acc는 위에서 이미 필터됨)
    temp = body.temperature or 20.0
    weather = body.weather_condition or "sunny"
    pool = _filter_by_weather(pool, temp, weather)

    if len(pool) < 2:
        raise HTTPException(
            status_code=400,
            detail="날씨·상태 조건에 맞는 나머지 옷이 부족합니다 (최소 2벌 필요)"
        )

    # 개인화 정보
    cold_sensitive  = getattr(current_user, "cold_sensitive", False)
    heat_sensitive  = getattr(current_user, "heat_sensitive", False)
    temp_offset     = getattr(current_user, "preferred_temp_offset", 0) or 0
    preferred_style = getattr(current_user, "preferred_style", None) or "캐주얼"
    felt_temp       = temp + temp_offset
    outer_threshold = 17 if cold_sensitive else 14
    sensitivity_str = "추위를 잘 탐" if cold_sensitive else ("더위를 잘 탐" if heat_sensitive else "보통")

    situation_kr = {
        "school": "학교", "date": "데이트", "cafe": "카페",
        "travel": "여행", "exercise": "운동", "interview": "면접"
    }.get(body.situation or "", "일상")

    # 고정 옷 텍스트
    fixed_text = "\n".join([
        f"[고정 ID:{c.clothes_id}] {c.name} / 카테고리:{c.category.value} / 색상:{c.color}"
        for c in fixed_clothes
    ])

    # 풀 옷장 텍스트 (미착용 기간 긴 순)
    pool_sorted = sorted(pool, key=get_unworn_days, reverse=True)
    pool_text = "\n".join([clothes_to_text(c) for c in pool_sorted])

    # 요일 이름 생성 (days 수에 맞게)
    day_names = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
    day_list = [day_names[i % 7] for i in range(days)]
    day_json_template = "\n    ".join([
        f'{{"day": "{d}", "items": [], "reason": "이유"}}{"," if i < days - 1 else ""}'
        for i, d in enumerate(day_list)
    ])

    prompt = f"""
당신은 패션 코디 전문가입니다.
사용자가 매일 꼭 입고 싶은 옷이 있어요. 고정 옷을 포함해서 {days}일치 코디를 완성해주세요.

[고정 옷] ← 매일 반드시 포함해야 함
{fixed_text}

[나머지 옷장] (고정 옷 제외, 미착용 기간 긴 순)
{pool_text}

[오늘 날씨 및 상황]
- 실제 기온: {temp}°C / 체감온도: {felt_temp:.1f}°C
- 날씨: {weather}
- 상황: {situation_kr}

[사용자 정보]
- 선호 스타일: {preferred_style}
- 온도 민감도: {sensitivity_str}

[추천 규칙]
1. 고정 옷 ID는 매일 items에 반드시 포함
2. 나머지 옷은 목록에 있는 ID만 사용 (없는 ID 절대 금지)
3. 체감온도 {outer_threshold}°C 이하면 아우터 추가 (고정 옷이 아우터가 아닌 경우)
4. 같은 나머지 옷을 연속으로 입히지 마세요
5. 미착용 기간이 긴 옷을 우선 조합하세요
6. 고정 옷 색상에 어울리는 나머지 옷을 선택하세요
7. items 배열 절대 비워두면 안 됩니다
8. reason: 한국어 2문장. "고정 옷과 어울리는 이유 + 미착용 기간/날씨 언급"

[응답 형식] JSON만:
{{
  "fixed_clothes": {[c.clothes_id for c in fixed_clothes]},
  "days": {days},
  "rotation": [
    {day_json_template}
  ],
  "tip": "고정 옷을 활용한 이번 주 코디 팁 한 줄"
}}
"""

    result = call_gemini(prompt)
    return result