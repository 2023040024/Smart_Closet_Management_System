import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.dirname(__file__))
from conftest import make_clothes, make_user
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum
from routers.recommend import filter_clothes, apply_fallback_filter, get_unworn_days, get_user_profile_text, get_current_season, calculate_conflict_score, to_situation_kr, clothes_to_text, build_prompt, load_tpo_scores, fetch_weather, call_gemini
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
import pytest
from fastapi import HTTPException

class TestFilterClothes:
    def test_세탁중_제외(self):
        c = make_clothes(status=StatusEnum.washing)
        assert filter_clothes([c], 20.0, "sunny") == []

    def test_수선중_제외(self):
        c = make_clothes(status=StatusEnum.repair)
        assert filter_clothes([c], 20.0, "sunny") == []

    def test_보관중_제외(self):
        c = make_clothes(status=StatusEnum.stored)
        assert filter_clothes([c], 20.0, "sunny") == []

    def test_악세사리_제외(self):
        c = make_clothes(category=CategoryEnum.acc)
        assert filter_clothes([c], 20.0, "sunny") == []

    def test_더운날_두꺼운옷_제외(self):
        c = make_clothes(thickness=ThicknessEnum.thick)
        assert filter_clothes([c], 30.0, "sunny") == []

    def test_추운날_얇은옷_제외(self):
        c = make_clothes(thickness=ThicknessEnum.thin)
        assert filter_clothes([c], 10.0, "sunny") == []

    def test_비오는날_레더_제외(self):
        c = make_clothes(material=MaterialEnum.leather)
        assert filter_clothes([c], 20.0, "rainy") == []

    def test_정상조건_포함(self):
        c = make_clothes(
            status=StatusEnum.wearable,
            category=CategoryEnum.top,
            thickness=ThicknessEnum.medium,
            material=MaterialEnum.cotton,
        )
        assert c in filter_clothes([c], 20.0, "sunny")

    def test_세탁필요_제외(self):
        c = make_clothes(status=StatusEnum.need_wash)
        assert filter_clothes([c], 20.0, "sunny") == []

    def test_빈리스트(self):
        assert filter_clothes([], 20.0, "sunny") == []

    def test_status_None_포함(self):
        c = make_clothes(status=None)
        assert c in filter_clothes([c], 20.0, "sunny")


class TestGetUnwornDays:
    def test_착용기록없음_999반환(self):
        c = make_clothes(last_worn_date=None)
        assert get_unworn_days(c) == 999

    def test_오늘착용_0반환(self):
        c = make_clothes(last_worn_date=date.today())
        assert get_unworn_days(c) == 0

    def test_7일전착용(self):
        c = make_clothes(last_worn_date=date.today() - timedelta(days=7))
        assert get_unworn_days(c) == 7

    def test_30일전착용(self):
        c = make_clothes(last_worn_date=date.today() - timedelta(days=30))
        assert get_unworn_days(c) == 30


class TestGetUserProfileText:
    def test_민감도0_아우터기준14(self):
        u = make_user(temp_sensitivity=0.0)
        _, _, _, outer = get_user_profile_text(u, 20.0)
        assert outer == 14

    def test_민감도2_아우터기준16(self):
        u = make_user(temp_sensitivity=2.0)
        _, _, _, outer = get_user_profile_text(u, 20.0)
        assert outer == 16

    def test_민감도마이너스2_아우터기준12(self):
        u = make_user(temp_sensitivity=-2.0)
        _, _, _, outer = get_user_profile_text(u, 20.0)
        assert outer == 12

    def test_체감기온계산(self):
        u = make_user(temp_sensitivity=2.0)
        _, _, felt_temp, _ = get_user_profile_text(u, 20.0)
        assert felt_temp == 16.0

    def test_선호스타일없으면_캐주얼기본값(self):
        u = make_user(preferred_style=None)
        _, preferred_style, _, _ = get_user_profile_text(u, 20.0)
        assert preferred_style == "캐주얼"

    def test_선호스타일있으면_해당값반환(self):
        u = make_user(preferred_style="미니멀")
        _, preferred_style, _, _ = get_user_profile_text(u, 20.0)
        assert preferred_style == "미니멀"

    def test_민감도_음수_체감기온_실제보다_높음(self):
        u = make_user(temp_sensitivity=-2.0)
        _, _, felt_temp, _ = get_user_profile_text(u, 20.0)
        assert felt_temp == 24.0

    def test_프로필텍스트에_아우터기준온도_포함(self):
        u = make_user(temp_sensitivity=0.0)
        profile_text, _, _, outer = get_user_profile_text(u, 20.0)
        assert str(outer) in profile_text

class TestGetCurrentSeason:
    def test_반환값이_4계절중하나(self):
        assert get_current_season() in ("봄", "여름", "가을", "겨울")

    def test_3월_봄(self):
        with patch("routers.recommend.date") as mock_date:
            mock_date.today.return_value = date(2026, 3, 1)
            assert get_current_season() == "봄"

    def test_7월_여름(self):
        with patch("routers.recommend.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 1)
            assert get_current_season() == "여름"

    def test_9월_가을(self):
        with patch("routers.recommend.date") as mock_date:
            mock_date.today.return_value = date(2026, 9, 1)
            assert get_current_season() == "가을"

    def test_12월_겨울(self):
        with patch("routers.recommend.date") as mock_date:
            mock_date.today.return_value = date(2026, 12, 1)
            assert get_current_season() == "겨울"


class TestCalculateConflictScore:
    def test_사계절_충돌없음(self):
        c = make_clothes(season="사계절")
        assert calculate_conflict_score(c, "데일리") == 0

    def test_계절불일치_80반환(self):
        c = make_clothes(season="겨울")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "데일리") == 80

    def test_계절일치_0반환(self):
        c = make_clothes(season="봄")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "데일리") == 0

    def test_면접_레드_60반환(self):
        c = make_clothes(season="봄", color="레드")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "면접") == 60

    def test_면접_안전색상_0반환(self):
        c = make_clothes(season="봄", color="블랙")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "면접") == 0

    def test_영문_interview도_면접_60반환(self):
        c = make_clothes(season="봄", color="레드")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "interview") == 60


class TestFilterClothesF13:
    def test_계절불일치_제외(self):
        c = make_clothes(season="겨울")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert filter_clothes([c], 20.0, "sunny") == []

    def test_사계절_포함(self):
        c = make_clothes(season="사계절", status=StatusEnum.wearable)
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert c in filter_clothes([c], 20.0, "sunny")

    def test_세탁필요_제외(self):
        c = make_clothes(status=StatusEnum.need_wash)
        assert filter_clothes([c], 20.0, "sunny") == []


class TestGetCurrentSeasonExtra:
    def test_9월_가을(self):
        with patch("routers.recommend.date") as mock_date:
            mock_date.today.return_value = date(2026, 9, 1)
            assert get_current_season() == "가을"


class TestCalculateConflictScoreExtra:
    def test_면접_영어상황도_60반환(self):
        c = make_clothes(season="봄", color="레드")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert calculate_conflict_score(c, "interview") == 60


class TestApplyFallbackFilter:
    def test_충분한경우_fallback미사용(self):
        tops    = [make_clothes(category=CategoryEnum.top,    season="봄", clothes_id=i) for i in range(1, 3)]
        bottoms = [make_clothes(category=CategoryEnum.bottom, season="봄", clothes_id=i) for i in range(3, 5)]
        with patch("routers.recommend.get_current_season", return_value="봄"):
            result, used = apply_fallback_filter(tops + bottoms, 20.0, "sunny")
        assert used == False
        assert len(result) == 4

    def test_상의부족시_fallback적용(self):
        top_spring = make_clothes(category=CategoryEnum.top,    season="봄",   clothes_id=1)
        top_winter = make_clothes(category=CategoryEnum.top,    season="겨울", clothes_id=2)
        bottoms    = [make_clothes(category=CategoryEnum.bottom, season="봄", clothes_id=i) for i in range(3, 5)]
        with patch("routers.recommend.get_current_season", return_value="봄"):
            result, used = apply_fallback_filter([top_spring, top_winter] + bottoms, 20.0, "sunny")
        assert used == True
        assert top_winter in result

    def test_하의부족시_fallback적용(self):
        tops          = [make_clothes(category=CategoryEnum.top,    season="봄",   clothes_id=i) for i in range(1, 3)]
        bottom_spring = make_clothes(category=CategoryEnum.bottom, season="봄",   clothes_id=3)
        bottom_winter = make_clothes(category=CategoryEnum.bottom, season="겨울", clothes_id=4)
        with patch("routers.recommend.get_current_season", return_value="봄"):
            result, used = apply_fallback_filter(tops + [bottom_spring, bottom_winter], 20.0, "sunny")
        assert used == True
        assert bottom_winter in result

    def test_fallback에서도_착용불가_제외(self):
        top_spring         = make_clothes(category=CategoryEnum.top, season="봄",   clothes_id=1)
        top_winter_washing = make_clothes(category=CategoryEnum.top, season="겨울", clothes_id=2, status=StatusEnum.washing)
        bottoms            = [make_clothes(category=CategoryEnum.bottom, season="봄", clothes_id=i) for i in range(3, 5)]
        with patch("routers.recommend.get_current_season", return_value="봄"):
            result, used = apply_fallback_filter([top_spring, top_winter_washing] + bottoms, 20.0, "sunny")
        assert top_winter_washing not in result


class TestFilterClothesTpoScore:
    def test_tpo_score_60미만_제외(self):
        c = make_clothes(clothes_id=1)
        assert filter_clothes([c], 20.0, "sunny", tpo_scores={1: 59}) == []

    def test_tpo_score_정확히60_제외(self):
        c = make_clothes(clothes_id=1)
        assert filter_clothes([c], 20.0, "sunny", tpo_scores={1: 60}) == []

    def test_tpo_score_61이상_포함(self):
        c = make_clothes(clothes_id=1)
        assert c in filter_clothes([c], 20.0, "sunny", tpo_scores={1: 61})

    def test_tpo_score_없으면_기본값100_포함(self):
        c = make_clothes(clothes_id=1)
        assert c in filter_clothes([c], 20.0, "sunny", tpo_scores={})

    def test_tpo_scores_None이면_모두포함(self):
        c = make_clothes(clothes_id=1)
        assert c in filter_clothes([c], 20.0, "sunny", tpo_scores=None)


class TestToSituationKr:
    def test_영문_daily_데일리(self):
        assert to_situation_kr("daily") == "데일리"

    def test_영문_interview_면접(self):
        assert to_situation_kr("interview") == "면접"

    def test_영문_meeting_미팅(self):
        assert to_situation_kr("meeting") == "미팅"

    def test_영문_business_비즈니스(self):
        assert to_situation_kr("business") == "비즈니스"

    def test_영문_wedding_결혼식(self):
        assert to_situation_kr("wedding") == "결혼식"

    def test_영문_funeral_장례식(self):
        assert to_situation_kr("funeral") == "장례식"

    def test_영문_exercise_운동(self):
        assert to_situation_kr("exercise") == "운동"

    def test_영문_date_데이트(self):
        assert to_situation_kr("date") == "데이트"

    def test_영문_travel_여행(self):
        assert to_situation_kr("travel") == "여행"

    def test_영문_school_데일리폴백(self):
        assert to_situation_kr("school") == "데일리"

    def test_영문_cafe_데일리폴백(self):
        assert to_situation_kr("cafe") == "데일리"

    def test_한글_그대로반환(self):
        assert to_situation_kr("데일리") == "데일리"

    def test_None이면_데일리(self):
        assert to_situation_kr(None) == "데일리"


class TestClothesToText:
    def test_착용기록_없으면_착용기록없음_표시(self):
        c = make_clothes(last_worn_date=None)
        result = clothes_to_text(c)
        assert "착용 기록 없음" in result

    def test_옷_ID와_이름_포함(self):
        c = make_clothes(clothes_id=42, name="청바지")
        result = clothes_to_text(c)
        assert "[ID:42]" in result
        assert "청바지" in result

    def test_situation_None이면_미입력_표시(self):
        c = make_clothes(situation=None)
        result = clothes_to_text(c)
        assert "미입력" in result

    def test_material_None이면_미입력_표시(self):
        c = make_clothes()
        c.material = None
        result = clothes_to_text(c)
        assert "미입력" in result


class TestBuildPrompt:
    def _make_top(self, clothes_id=1):
        c = make_clothes(clothes_id=clothes_id, category=CategoryEnum.top)
        c.category = CategoryEnum.top
        return c

    def _make_bottom(self, clothes_id=2):
        c = make_clothes(clothes_id=clothes_id, category=CategoryEnum.bottom)
        c.category = CategoryEnum.bottom
        return c

    def test_영문_상황이_한국어로_변환됨(self):
        user = make_user()
        prompt = build_prompt([], "interview", 20.0, "sunny", user)
        assert "면접" in prompt

    def test_옷_ID가_프롬프트에_포함됨(self):
        user = make_user()
        top = self._make_top(clothes_id=99)
        bottom = self._make_bottom(clothes_id=88)
        prompt = build_prompt([top, bottom], "daily", 20.0, "sunny", user)
        assert "ID:99" in prompt
        assert "ID:88" in prompt

    def test_JSON_응답형식_포함됨(self):
        user = make_user()
        prompt = build_prompt([], "daily", 20.0, "sunny", user)
        assert "outfits" in prompt
        assert "items" in prompt

    def test_영문_meeting이_미팅으로_변환됨(self):
        user = make_user()
        prompt = build_prompt([], "meeting", 20.0, "sunny", user)
        assert "미팅" in prompt
        assert "모임" not in prompt


class TestLoadTpoScores:
    def _make_db(self, rows):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.all.return_value = rows
        return db

    def test_점수_딕셔너리로_반환(self):
        row1 = MagicMock(clothes_id=1, score=80)
        row2 = MagicMock(clothes_id=2, score=65)
        db = self._make_db([row1, row2])
        result = load_tpo_scores(db, user_id=1, situation_kr="면접")
        assert result == {1: 80, 2: 65}

    def test_결과_없으면_빈_딕셔너리(self):
        db = self._make_db([])
        result = load_tpo_scores(db, user_id=1, situation_kr="데일리")
        assert result == {}

    def test_단일_레코드_반환(self):
        row = MagicMock(clothes_id=5, score=95)
        db = self._make_db([row])
        result = load_tpo_scores(db, user_id=1, situation_kr="미팅")
        assert result[5] == 95


class TestFetchWeather:
    def test_비오는날_rainy(self):
        with patch("routers.recommend.get_weather_data", return_value={"temperature": 15.0, "condition": "rainy"}):
            result = fetch_weather("서울")
        assert result["condition"] == "rainy"
        assert result["temperature"] == 15.0

    def test_눈오는날_snowy(self):
        with patch("routers.recommend.get_weather_data", return_value={"temperature": 0.0, "condition": "snowy"}):
            result = fetch_weather("서울")
        assert result["condition"] == "snowy"

    def test_맑은날_sunny(self):
        with patch("routers.recommend.get_weather_data", return_value={"temperature": 25.0, "condition": "sunny"}):
            result = fetch_weather("서울")
        assert result["condition"] == "sunny"

    def test_흐린날_cloudy(self):
        with patch("routers.recommend.get_weather_data", return_value={"temperature": 18.0, "condition": "cloudy"}):
            result = fetch_weather("서울")
        assert result["condition"] == "cloudy"

    def test_status_실패시_기본값반환(self):
        with patch("routers.recommend.get_weather_data", return_value={"temperature": 20.0, "condition": "sunny"}):
            result = fetch_weather("서울")
        assert result == {"temperature": 20.0, "condition": "sunny"}

    def test_예외발생시_기본값반환(self):
        with patch("routers.recommend.get_weather_data", side_effect=Exception("연결 실패")):
            result = fetch_weather("서울")
        assert result == {"temperature": 20.0, "condition": "sunny"}


class TestCallGemini:
    def test_정상_JSON_반환(self):
        mock_resp = MagicMock()
        mock_resp.text = '{"outfits": [{"outfit_number": 1, "items": [{"clothes_id": 1, "name": "티", "category": "상의", "color": "블랙"}], "reason": "좋아"}], "ai_message": "추천"}'
        with patch("routers.recommend.model.generate_content", return_value=mock_resp):
            result = call_gemini("test prompt")
        assert "outfits" in result
        assert len(result["outfits"]) == 1

    def test_백틱_JSON_파싱(self):
        mock_resp = MagicMock()
        mock_resp.text = '```json\n{"outfits": [{"outfit_number": 1, "items": [], "reason": "좋아"}], "ai_message": "추천"}\n```'
        with patch("routers.recommend.model.generate_content", return_value=mock_resp):
            result = call_gemini("test prompt")
        assert "outfits" in result

    def test_outfits_없으면_HTTPException(self):
        mock_resp = MagicMock()
        mock_resp.text = '{"outfits": [], "ai_message": "없음"}'
        with patch("routers.recommend.model.generate_content", return_value=mock_resp):
            with pytest.raises(HTTPException) as exc:
                call_gemini("test prompt", retries=0)
        assert exc.value.status_code == 500


class TestRecommendEndpoints:
    GEMINI_OK = {
        "outfits": [{
            "outfit_number": 1,
            "items": [{"clothes_id": 1, "name": "티셔츠", "category": "상의", "color": "블랙"}],
            "reason": "좋은 코디입니다"
        }],
        "ai_message": "오늘의 추천 완료"
    }
    GEMINI_WEEKLY_OK = {
        "weekly_outfits": [
            {"day": "월요일", "items": [{"clothes_id": 1, "name": "티셔츠", "category": "상의", "color": "블랙"}], "reason": "좋아"},
            {"day": "화요일", "items": [], "reason": "좋아"},
            {"day": "수요일", "items": [], "reason": "좋아"},
            {"day": "목요일", "items": [], "reason": "좋아"},
            {"day": "금요일", "items": [], "reason": "좋아"},
        ],
        "tip": "이번 주 팁"
    }

    def test_today_인증없이_거부(self, client):
        res = client.get("/recommend/today")
        assert res.status_code in (401, 403)

    def test_today_옷부족_400(self, client, auth_headers):
        res = client.get("/recommend/today", headers=auth_headers,
                         params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 400

    def test_today_정상_추천(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.call_gemini", return_value=self.GEMINI_OK):
            res = client.get("/recommend/today", headers=auth_headers,
                             params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200
        assert "outfits" in res.json()

    def test_custom_옷부족_400(self, client, auth_headers):
        res = client.post("/recommend/custom", headers=auth_headers,
                          json={"situation": "daily", "temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 400

    def test_custom_정상_추천(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.call_gemini", return_value=self.GEMINI_OK):
            res = client.post("/recommend/custom", headers=auth_headers,
                              json={"situation": "daily", "temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200

    def test_weekly_옷부족_empty반환(self, client, auth_headers, sample_clothes):
        res = client.get("/recommend/weekly", headers=auth_headers,
                         params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200
        assert res.json()["weekly_outfits"] == []

    def test_weekly_정상_추천(self, client, auth_headers, sample_clothes):
        client.post("/clothes", headers=auth_headers,
                    data={"name": "후드티", "category": "상의", "color": "그레이", "season": "사계절", "style": "캐주얼"})
        with patch("routers.recommend.call_gemini", return_value=self.GEMINI_WEEKLY_OK):
            res = client.get("/recommend/weekly", headers=auth_headers,
                             params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200

    def test_today_address_날씨조회(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.fetch_weather", return_value={"temperature": 18.0, "condition": "cloudy"}):
            with patch("routers.recommend.call_gemini", return_value=self.GEMINI_OK):
                res = client.get("/recommend/today", headers=auth_headers,
                                 params={"address": "서울"})
        assert res.status_code == 200

    def test_custom_address_날씨조회(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.fetch_weather", return_value={"temperature": 18.0, "condition": "cloudy"}):
            with patch("routers.recommend.call_gemini", return_value=self.GEMINI_OK):
                res = client.post("/recommend/custom", headers=auth_headers,
                                  json={"situation": "daily", "address": "서울"})
        assert res.status_code == 200

    def test_weekly_address_날씨조회(self, client, auth_headers, sample_clothes):
        client.post("/clothes", headers=auth_headers,
                    data={"name": "후드티", "category": "상의", "color": "그레이", "season": "사계절", "style": "캐주얼"})
        with patch("routers.recommend.fetch_weather", return_value={"temperature": 18.0, "condition": "cloudy"}):
            with patch("routers.recommend.call_gemini", return_value=self.GEMINI_WEEKLY_OK):
                res = client.get("/recommend/weekly", headers=auth_headers,
                                 params={"address": "서울"})
        assert res.status_code == 200

    def test_today_filtered_부족_empty반환(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.apply_fallback_filter", return_value=([], False)):
            res = client.get("/recommend/today", headers=auth_headers,
                             params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200
        assert res.json()["outfits"] == []

    def test_custom_filtered_부족_empty반환(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.apply_fallback_filter", return_value=([], False)):
            res = client.post("/recommend/custom", headers=auth_headers,
                              json={"situation": "daily", "temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200
        assert res.json()["outfits"] == []

    def test_weekly_인증없이_거부(self, client):
        res = client.get("/recommend/weekly")
        assert res.status_code in (401, 403)

    def test_weekly_filtered_부족_empty반환(self, client, auth_headers, sample_clothes):
        with patch("routers.recommend.apply_fallback_filter", return_value=([], False)):
            res = client.get("/recommend/weekly", headers=auth_headers,
                             params={"temperature": 20.0, "weather_condition": "sunny"})
        assert res.status_code == 200
        assert res.json()["weekly_outfits"] == []