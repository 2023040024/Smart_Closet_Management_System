import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from tpo_rules import get_temperature_level

class TestGetTemperatureLevel:
    def test_30도_very_hot(self):     assert get_temperature_level(30.0) == "very_hot"
    def test_25도_hot(self):          assert get_temperature_level(25.0) == "hot"
    def test_20도_warm(self):         assert get_temperature_level(20.0) == "warm"
    def test_14도_cool(self):         assert get_temperature_level(14.0) == "cool"
    def test_8도_cold(self):          assert get_temperature_level(8.0)  == "cold"
    def test_0도_very_cold(self):     assert get_temperature_level(0.0)  == "very_cold"
    def test_영하10도_very_cold(self): assert get_temperature_level(-10.0) == "very_cold"
