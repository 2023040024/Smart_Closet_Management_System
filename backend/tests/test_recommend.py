import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.dirname(__file__))
from conftest import make_clothes, make_user
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum
from routers.recommend import filter_clothes, apply_fallback_filter, get_unworn_days, get_user_profile_text, get_current_season, calculate_conflict_score, to_situation_kr, clothes_to_text, build_prompt, load_tpo_scores
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

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

    def test_빈리스트(self):
        assert filter_clothes([], 20.0, "sunny") == []


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


class TestFilterClothesF13:
    def test_계절불일치_제외(self):
        c = make_clothes(season="겨울")
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert filter_clothes([c], 20.0, "sunny") == []

    def test_사계절_포함(self):
        c = make_clothes(season="사계절", status=StatusEnum.wearable)
        with patch("routers.recommend.get_current_season", return_value="봄"):
            assert c in filter_clothes([c], 20.0, "sunny")


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