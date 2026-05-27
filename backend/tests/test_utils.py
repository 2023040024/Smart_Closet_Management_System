import pytest
from datetime import datetime
from unittest.mock import patch
from utils import get_base_time, get_weather_data

def test_get_base_time_midnight_edge_case():
    """
    시나리오 1: 자정 직후 (00:05) 엣지케이스 테스트
    - 예상 결과: base_date는 전날(20260519), base_time은 '2300'
    """
    mock_now = datetime(2026, 5, 20, 0, 5, 0) # 2026년 5월 20일 00시 05분 가정
    
    with patch('utils.datetime') as mock_datetime:
        mock_datetime.now.return_value = mock_now
        
        base_date, base_time = get_base_time()
        
        assert base_date == "20260519"  # 전날 날짜로 정상 계산되는지 검증
        assert base_time == "2300"      # 23시 예보 데이터로 매핑되는지 검증


def test_get_base_time_early_morning():
    """
    시나리오 2: 새벽 시간대 (01:30) 테스트 (02:10 이전)
    - 예상 결과: base_date는 전날(20260519), base_time은 '2300'
    """
    mock_now = datetime(2026, 5, 20, 1, 30, 0)
    
    with patch('utils.datetime') as mock_datetime:
        mock_datetime.now.return_value = mock_now
        
        base_date, base_time = get_base_time()
        
        assert base_date == "20260519"
        assert base_time == "2300"


def test_get_base_time_normal_daytime():
    """
    시나리오 3: 정상 시간대 (06:00) 테스트 (02:10 이후)
    - 예상 결과: base_date는 당일(20260520), base_time은 정해진 규칙에 따른 값
    """
    mock_now = datetime(2026, 5, 20, 6, 0, 0)
    
    with patch('utils.datetime') as mock_datetime:
        mock_datetime.now.return_value = mock_now
        
        base_date, base_time = get_base_time()
        
        assert base_date == "20260520"  # 당일 날짜 유지
        # 시스템에 정의된 base_times 규칙(예: 0200, 0500 등) 중 06시 직전 최적 타임라인 검증
        assert base_time == "0500"


class TestGetWeatherData:
    def _make_api_response(self, temp, sky, pty):
        return {
            "response": {
                "header": {"resultCode": "00"},
                "body": {"items": {"item": [
                    {"category": "TMP", "fcstValue": str(temp)},
                    {"category": "SKY", "fcstValue": str(sky)},
                    {"category": "PTY", "fcstValue": str(pty)},
                ]}}
            }
        }

    def test_맑은날_sunny반환(self):
        with patch("utils.get_coords_from_address", return_value=(37.5, 127.0)), \
             patch("utils.convert_grid", return_value=(60, 127)), \
             patch("utils.get_base_time", return_value=("20260527", "0800")), \
             patch("utils.requests.get") as mock_get:
            mock_get.return_value.json.return_value = self._make_api_response(18, 1, 0)
            result = get_weather_data("서울시 강남구")
        assert result["temperature"] == 18.0
        assert result["condition"] == "sunny"

    def test_비오는날_rainy반환(self):
        with patch("utils.get_coords_from_address", return_value=(37.5, 127.0)), \
             patch("utils.convert_grid", return_value=(60, 127)), \
             patch("utils.get_base_time", return_value=("20260527", "0800")), \
             patch("utils.requests.get") as mock_get:
            mock_get.return_value.json.return_value = self._make_api_response(15, 4, 1)
            result = get_weather_data("서울시 강남구")
        assert result["condition"] == "rainy"

    def test_유효하지않은주소_기본값반환(self):
        with patch("utils.get_coords_from_address", return_value=(None, None)):
            result = get_weather_data("존재하지않는주소xxxxxx")
        assert result == {"temperature": 20.0, "condition": "sunny"}

    def test_API호출실패_기본값반환(self):
        with patch("utils.get_coords_from_address", return_value=(37.5, 127.0)), \
             patch("utils.convert_grid", return_value=(60, 127)), \
             patch("utils.get_base_time", return_value=("20260527", "0800")), \
             patch("utils.requests.get", side_effect=Exception("network error")):
            result = get_weather_data("서울시 강남구")
        assert result == {"temperature": 20.0, "condition": "sunny"}