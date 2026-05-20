import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from tpo_rules import (
    get_temperature_level,
    get_recommended_thickness,
    get_tpo_rule,
    get_avoided_materials,
    check_color_conflict,
    get_tpo_prompt_text
)

class TestGetTemperatureLevel:
    def test_30도_very_hot(self):     assert get_temperature_level(30.0) == "very_hot"
    def test_25도_hot(self):          assert get_temperature_level(25.0) == "hot"
    def test_20도_warm(self):         assert get_temperature_level(20.0) == "warm"
    def test_14도_cool(self):         assert get_temperature_level(14.0) == "cool"
    def test_8도_cold(self):          assert get_temperature_level(8.0)  == "cold"
    def test_0도_very_cold(self):     assert get_temperature_level(0.0)  == "very_cold"
    def test_영하10도_very_cold(self): assert get_temperature_level(-10.0) == "very_cold"

class TestGetRecommendedThickness:
    def test_더운날_얇음포함(self):
        assert "얇음" in get_recommended_thickness(30.0)
    def test_추운날_두꺼움포함(self):
        assert "두꺼움" in get_recommended_thickness(3.0)
    def test_선선한날_보통포함(self):
        assert "보통" in get_recommended_thickness(14.0)

class TestGetTpoRule:
    def test_면접_formality_high(self):
        assert get_tpo_rule("면접")["formality"] == "high"
    def test_면접_avoid_styles에_캐주얼포함(self):
        assert "캐주얼" in get_tpo_rule("면접")["avoid_styles"]
    def test_운동_activity_very_high(self):
        assert get_tpo_rule("운동")["activity"] == "very_high"
    def test_영어폴백_school_데일리반환(self):
        assert get_tpo_rule("school")["name_kr"] == "데일리"
    def test_없는키_데일리기본값(self):
        assert get_tpo_rule("없는상황XYZ")["name_kr"] == "데일리"

class TestGetAvoidedMaterials:
    def test_비오는날_레더회피(self):
        assert "레더" in get_avoided_materials("rainy")
    def test_눈오는날_레더회피(self):
        assert "레더" in get_avoided_materials("snowy")
    def test_맑은날_회피없음(self):
        assert get_avoided_materials("sunny") == []
    def test_흐린날_회피없음(self):
        assert get_avoided_materials("cloudy") == []

class TestCheckColorConflict:
    def test_면접_레드_60점감점(self):    assert check_color_conflict("레드", "블랙", "면접") == 60
    def test_면접_핑크_60점감점(self):    assert check_color_conflict("핑크", "네이비", "면접") == 60
    def test_고채도대비쌍_40점감점(self): assert check_color_conflict("레드", "올리브", "데일리") == 40
    def test_역순대비쌍_40점감점(self):   assert check_color_conflict("올리브", "레드", "데일리") == 40
    def test_안전조합_0점(self):          assert check_color_conflict("블랙", "화이트", "데일리") == 0
    def test_면접_일반색상_0점(self):     assert check_color_conflict("블랙", "네이비", "면접") == 0

class TestGetTpoPromptText:
    def test_문자열반환(self):       assert isinstance(get_tpo_prompt_text("데일리", 20.0, "sunny"), str)
    def test_상황명포함(self):       assert "면접" in get_tpo_prompt_text("면접", 15.0, "cloudy")
    def test_기온포함(self):         assert "25" in get_tpo_prompt_text("데일리", 25.0, "sunny")
    def test_비오는날_레더언급(self): assert "레더" in get_tpo_prompt_text("데일리", 20.0, "rainy")
    def test_소재없음_표시(self):     assert "없음" in get_tpo_prompt_text("데일리", 20.0, "sunny")