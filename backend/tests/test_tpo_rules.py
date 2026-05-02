# 커밋 6 상태
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from tpo_rules import get_temperature_level, get_recommended_thickness

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
