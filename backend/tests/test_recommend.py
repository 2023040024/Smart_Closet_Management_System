import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from conftest import make_clothes, make_user
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum
from routers.recommend import filter_clothes, get_unworn_days, get_user_profile_text, get_current_season, calculate_conflict_score
from unittest.mock import patch
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