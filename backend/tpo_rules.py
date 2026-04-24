"""
TPO 조건 변환 규칙표
상황(situation) 입력 → 추천 조건으로 변환
D 담당자 구현
"""

TPO_RULES = {
    "데일리": {
        "name_kr": "데일리",
        "preferred_styles": ["캐주얼", "미니멀"],
        "avoid_styles": ["포멀"],
        "preferred_thickness": ["얇음", "보통"],
        "color_tone": "any",
        "formality": "low",
        "activity": "medium",
        "description": "편안하고 자연스러운 일상 스타일 추천"
    },
    "비즈니스": {
        "name_kr": "비즈니스",
        "preferred_styles": ["세미캐주얼", "포멀", "미니멀", "댄디"],
        "avoid_styles": ["스트릿", "스포티"],
        "preferred_thickness": ["보통"],
        "color_tone": "dark_neutral",
        "formality": "high",
        "activity": "low",
        "description": "단정하고 신뢰감 있는 비즈니스 스타일 추천"
    },
    "면접": {
        "name_kr": "면접",
        "preferred_styles": ["포멀", "미니멀"],
        "avoid_styles": ["캐주얼", "스트릿", "스포티", "빈티지"],
        "preferred_thickness": ["보통", "두꺼움"],
        "color_tone": "dark_neutral",
        "formality": "high",
        "activity": "low",
        "description": "단정하고 깔끔한 포멀 스타일 추천"
    },
    "결혼식": {
        "name_kr": "결혼식",
        "preferred_styles": ["포멀", "세미캐주얼", "댄디"],
        "avoid_styles": ["스트릿", "스포티", "고프코어"],
        "preferred_thickness": ["보통"],
        "color_tone": "any",
        "formality": "high",
        "activity": "low",
        "description": "격식 있고 우아한 스타일 추천"
    },
    "장례식": {
        "name_kr": "장례식",
        "preferred_styles": ["포멀", "미니멀"],
        "avoid_styles": ["캐주얼", "스트릿", "스포티", "빈티지"],
        "preferred_thickness": ["보통"],
        "color_tone": "dark_neutral",
        "formality": "high",
        "activity": "low",
        "description": "단정하고 어두운 계열의 포멀 스타일 추천"
    },
    "운동": {
        "name_kr": "운동",
        "preferred_styles": ["스포티", "캐주얼"],
        "avoid_styles": ["포멀", "댄디"],
        "preferred_thickness": ["얇음"],
        "color_tone": "any",
        "formality": "low",
        "activity": "very_high",
        "description": "활동성 높은 편안한 스포티 스타일 추천"
    },
    "데이트": {
        "name_kr": "데이트",
        "preferred_styles": ["캐주얼", "미니멀", "스트릿"],
        "avoid_styles": [],
        "preferred_thickness": ["얇음", "보통"],
        "color_tone": "any",
        "formality": "medium",
        "activity": "medium",
        "description": "깔끔하고 꾸민 느낌의 스타일 추천"
    },
    "모임": {
        "name_kr": "모임",
        "preferred_styles": ["세미캐주얼", "캐주얼", "미니멀"],
        "avoid_styles": ["스포티"],
        "preferred_thickness": ["얇음", "보통"],
        "color_tone": "any",
        "formality": "medium",
        "activity": "medium",
        "description": "편안하면서도 깔끔한 스타일 추천"
    },
    "여행": {
        "name_kr": "여행",
        "preferred_styles": ["캐주얼", "스트릿", "고프코어"],
        "avoid_styles": ["포멀"],
        "preferred_thickness": ["얇음", "보통"],
        "color_tone": "any",
        "formality": "low",
        "activity": "high",
        "description": "편안하고 활동적인 여행 스타일 추천"
    },
}

WEATHER_RULES = {
    "temperature": {
        "very_hot":  {"min": 28,  "max": 999, "thickness": ["얇음"],           "desc": "매우 더움 (28도+)"},
        "hot":       {"min": 23,  "max": 27,  "thickness": ["얇음"],           "desc": "더움 (23~27도)"},
        "warm":      {"min": 17,  "max": 22,  "thickness": ["얇음", "보통"],   "desc": "따뜻함 (17~22도)"},
        "cool":      {"min": 12,  "max": 16,  "thickness": ["보통"],           "desc": "선선함 (12~16도)"},
        "cold":      {"min": 5,   "max": 11,  "thickness": ["보통", "두꺼움"], "desc": "추움 (5~11도)"},
        "very_cold": {"min": -99, "max": 4,   "thickness": ["두꺼움"],         "desc": "매우 추움 (4도 이하)"},
    },
    "condition": {
        "rainy":  {"avoid_materials": ["레더", "suede", "silk"],          "desc": "비 오는 날 - 가죽/스웨이드/실크 소재 피하기"},
        "snowy":  {"avoid_materials": ["레더", "suede", "silk", "linen"], "desc": "눈 오는 날 - 방수 소재 우선"},
        "sunny":  {"avoid_materials": [],                                  "desc": "맑은 날 - 제한 없음"},
        "cloudy": {"avoid_materials": [],                                  "desc": "흐린 날 - 제한 없음"},
    }
}

COLOR_RULES = {
    "neutral": ["블랙", "화이트", "그레이", "베이지", "브라운"],
    "interview_avoid": ["레드", "핑크"],
    "high_contrast_pairs": [
        ("레드", "올리브"), ("블루", "브라운"),
    ],
    "safe_combinations": [
        ["블랙", "화이트", "그레이"],
        ["베이지", "브라운", "화이트"],
        ["네이비", "화이트", "그레이"],
    ]
}


def get_tpo_rule(situation: str) -> dict:
    return TPO_RULES.get(situation, TPO_RULES["데일리"])


def get_temperature_level(temperature: float) -> str:
    for level, rule in WEATHER_RULES["temperature"].items():
        if rule["min"] <= temperature <= rule["max"]:
            return level
    return "warm"


def get_recommended_thickness(temperature: float) -> list:
    level = get_temperature_level(temperature)
    return WEATHER_RULES["temperature"][level]["thickness"]


def get_avoided_materials(weather_condition: str) -> list:
    condition = WEATHER_RULES["condition"].get(weather_condition, {})
    return condition.get("avoid_materials", [])


def check_color_conflict(color1: str, color2: str, situation: str) -> int:
    if situation == "면접":
        if color1 in COLOR_RULES["interview_avoid"] or \
           color2 in COLOR_RULES["interview_avoid"]:
            return 60
    pair = (color1, color2)
    reverse_pair = (color2, color1)
    if pair in COLOR_RULES["high_contrast_pairs"] or \
       reverse_pair in COLOR_RULES["high_contrast_pairs"]:
        return 40
    return 0


def get_tpo_prompt_text(situation: str, temperature: float, weather_condition: str) -> str:
    tpo = get_tpo_rule(situation)
    thickness = get_recommended_thickness(temperature)
    avoid_materials = get_avoided_materials(weather_condition)
    temp_level = get_temperature_level(temperature)
    weather_desc = WEATHER_RULES["condition"].get(weather_condition, {}).get("desc", "")

    return f"""
[TPO 조건]
상황: {tpo['name_kr']}
추천 스타일: {', '.join(tpo['preferred_styles'])}
피해야 할 스타일: {', '.join(tpo['avoid_styles']) if tpo['avoid_styles'] else '없음'}
격식 수준: {tpo['formality']}
설명: {tpo['description']}

[날씨 조건]
기온: {temperature}°C ({WEATHER_RULES['temperature'][temp_level]['desc']})
날씨: {weather_desc}
권장 두께감: {', '.join(thickness)}
피해야 할 소재: {', '.join(avoid_materials) if avoid_materials else '없음'}
"""