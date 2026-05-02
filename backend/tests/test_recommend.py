import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from conftest import make_clothes
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum
from routers.recommend import filter_clothes, get_unworn_days
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
        c = make_clothes(material=MaterialEnum.레더)
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
