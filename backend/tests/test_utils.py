import pytest
import math
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock
from utils import (
    get_coords_from_address,
    convert_grid,
    get_base_time,
    get_weather_data
)

pytestmark = pytest.mark.asyncio  # 해당 파일의 모든 테스트에 asyncio 마커 적용

class TestGetCoordsFromAddress:
    """1. OpenStreetMap 주소 -> 위경도 변환 테스트"""
    
    @patch('utils.httpx.AsyncClient')
    async def test_success(self, mock_async_client):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [{'lat': '37.5665', 'lon': '126.9780'}]
        
        mock_instance = AsyncMock()
        mock_instance.get.return_value = mock_resp
        mock_async_client.return_value.__aenter__.return_value = mock_instance

        lat, lon = await get_coords_from_address("서울")
        assert lat == 37.5665
        assert lon == 126.9780

    @patch('utils.httpx.AsyncClient')
    async def test_empty_data(self, mock_async_client):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = []
        
        mock_instance = AsyncMock()
        mock_instance.get.return_value = mock_resp
        mock_async_client.return_value.__aenter__.return_value = mock_instance

        lat, lon = await get_coords_from_address("없는주소")
        assert lat is None
        assert lon is None

    @patch('utils.httpx.AsyncClient')
    async def test_non_200_status(self, mock_async_client):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        
        mock_instance = AsyncMock()
        mock_instance.get.return_value = mock_resp
        mock_async_client.return_value.__aenter__.return_value = mock_instance

        lat, lon = await get_coords_from_address("서울")
        assert lat is None
        assert lon is None

    @patch('utils.httpx.AsyncClient')
    async def test_exception(self, mock_async_client):
        mock_instance = AsyncMock()
        mock_instance.get.side_effect = Exception("Connection Timeout")
        mock_async_client.return_value.__aenter__.return_value = mock_instance

        lat, lon = await get_coords_from_address("서울")
        assert lat is None
        assert lon is None


class TestConvertGrid:
    """2. 기상청 격자 변환(수학 연산) 테스트"""
    
    def test_normal_grid(self):
        nx, ny = convert_grid(37.5665, 126.9780)
        assert isinstance(nx, int)
        assert isinstance(ny, int)

    def test_theta_greater_than_pi(self):
        nx, ny = convert_grid(37.5, 310.0) 
        assert nx is not None

    def test_theta_less_than_minus_pi(self):
        nx, ny = convert_grid(37.5, -60.0)
        assert nx is not None


class TestGetBaseTime:
    """3. 기상청 발표 시간 산출 로직 테스트"""

    @patch('utils.datetime')
    def test_normal_time(self, mock_datetime):
        # 일반적인 낮 시간대 (오후 2시 15분 -> base_time 1400)
        mock_datetime.now.return_value = datetime(2026, 5, 20, 14, 15)
        base_date, base_time = get_base_time()
        assert base_date == "20260520"
        assert base_time == "1400"

    @patch('utils.datetime')
    def test_midnight_edge_case(self, mock_datetime):
        # 자정 직후 (00:05 -> 전날 23:55로 취급되어 전날 2300으로 매핑)
        mock_datetime.now.return_value = datetime(2026, 5, 20, 0, 5)
        base_date, base_time = get_base_time()
        assert base_date == "20260519"
        assert base_time == "2300"

    @patch('utils.datetime')
    def test_early_morning(self, mock_datetime):
        # 새벽 시간대 (01:30 -> closest_time은 23, 현재 시간은 1이므로 날짜 롤백 발생)
        mock_datetime.now.return_value = datetime(2026, 5, 20, 1, 30)
        base_date, base_time = get_base_time()
        assert base_date == "20260519"
        assert base_time == "2300"


class TestGetWeatherData:
    """4. 기상청 단기예보 통신 및 날씨 분기 테스트"""

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    async def test_invalid_address(self, mock_get_coords):
        mock_get_coords.return_value = (None, None)
        res = await get_weather_data("이상한주소")
        assert res == {"temperature": 20.0, "condition": "sunny"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_requests_exception(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_requests_get.side_effect = Exception("API Server Down")
        
        res = await get_weather_data("서울")
        assert res == {"temperature": 20.0, "condition": "sunny"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_resultcode_not_00(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": {"header": {"resultCode": "99"}}}
        mock_requests_get.return_value = mock_resp
        
        res = await get_weather_data("서울")
        assert res == {"temperature": 20.0, "condition": "sunny"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_weather_condition_rainy(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": {"header": {"resultCode": "00"}, "body": {"items": {"item": [
            {"category": "TMP", "fcstValue": "15.0"},
            {"category": "SKY", "fcstValue": "4"},
            {"category": "PTY", "fcstValue": "1"}
        ]}}}}
        mock_requests_get.return_value = mock_resp
        
        res = await get_weather_data("서울")
        assert res == {"temperature": 15.0, "condition": "rainy"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_weather_condition_snowy(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": {"header": {"resultCode": "00"}, "body": {"items": {"item": [
            {"category": "TMP", "fcstValue": "-2.0"},
            {"category": "SKY", "fcstValue": "4"},
            {"category": "PTY", "fcstValue": "3"}
        ]}}}}
        mock_requests_get.return_value = mock_resp
        
        res = await get_weather_data("서울")
        assert res == {"temperature": -2.0, "condition": "snowy"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_weather_condition_cloudy(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": {"header": {"resultCode": "00"}, "body": {"items": {"item": [
            {"category": "TMP", "fcstValue": "22.0"},
            {"category": "SKY", "fcstValue": "4"},
            {"category": "PTY", "fcstValue": "0"}
        ]}}}}
        mock_requests_get.return_value = mock_resp
        
        res = await get_weather_data("서울")
        assert res == {"temperature": 22.0, "condition": "cloudy"}

    @patch('utils.get_coords_from_address', new_callable=AsyncMock)
    @patch('utils.requests.get')
    async def test_weather_condition_missing_tmp(self, mock_requests_get, mock_get_coords):
        mock_get_coords.return_value = (37.5, 126.9)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"response": {"header": {"resultCode": "00"}, "body": {"items": {"item": [
            {"category": "SKY", "fcstValue": "1"},
            {"category": "PTY", "fcstValue": "0"}
        ]}}}}
        mock_requests_get.return_value = mock_resp
        
        res = await get_weather_data("서울")
        assert res == {"temperature": 20.0, "condition": "sunny"}