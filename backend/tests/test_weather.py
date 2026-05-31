import pytest, sys, os, importlib, httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from io import StringIO

from routers import weather
from routers.weather import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

class TestWeatherAPI:
    @patch("routers.weather.httpx.AsyncClient.get", new_callable=AsyncMock)
    @patch("routers.weather.get_base_time")
    @patch("routers.weather.convert_grid")
    @patch("routers.weather.get_coords_from_address", new_callable=AsyncMock)
    def test_날씨_조회_성공_모든_조건_통과(self, mock_coords, mock_grid, mock_time, mock_get):
        """정상적인 API 응답 및 모든 if/elif 카테고리(TMP, TMX, TMN, SKY, PTY, POP) 파싱 검증"""
        mock_coords.return_value = (37.5665, 126.9780)
        mock_grid.return_value = (60, 127)
        mock_time.return_value = ("20260529", "1400")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "response": {
                "header": {"resultCode": "00"},
                "body": {
                    "items": {
                        "item": [
                            {"category": "TMP", "fcstValue": "25"},
                            {"category": "TMX", "fcstValue": "30"},
                            {"category": "TMN", "fcstValue": "20"},
                            {"category": "SKY", "fcstValue": "3"},
                            {"category": "PTY", "fcstValue": "1"},
                            {"category": "POP", "fcstValue": "80"},
                            {"category": "WSD", "fcstValue": "5"}
                        ]
                    }
                }
            }
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        response = client.get("/weather/address?address=서울시")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["base_info"]["date"] == "2026-05-29"
        assert data["base_info"]["time"] == "14시 00분"
        
        weather_data = data["weather"]
        assert weather_data["현재 기온"] == "25°C"
        assert weather_data["최고 기온"] == "30°C"
        assert weather_data["최저 기온"] == "20°C"
        assert weather_data["하늘 상태"] == "구름많음"
        assert weather_data["강수 형태"] == "비"
        assert weather_data["강수 확률"] == "80%"

    @patch("routers.weather.get_coords_from_address", new_callable=AsyncMock)
    def test_유효하지_않은_주소(self, mock_coords):
        """주소 변환 실패(lat is None) 시 400 에러 검증"""
        mock_coords.return_value = (None, None)

        response = client.get("/weather/address?address=알수없는곳")
        
        assert response.status_code == 400
        assert response.json()["detail"] == "유효하지 않은 주소입니다."

    @patch("routers.weather.httpx.AsyncClient.get", new_callable=AsyncMock)
    @patch("routers.weather.get_base_time")
    @patch("routers.weather.convert_grid")
    @patch("routers.weather.get_coords_from_address", new_callable=AsyncMock)
    def test_기상청_API_응답_오류(self, mock_coords, mock_grid, mock_time, mock_get):
        """기상청 서버에서 resultCode가 '00'이 아닌 에러 코드를 내려줄 때 검증"""
        mock_coords.return_value = (37.5665, 126.9780)
        mock_grid.return_value = (60, 127)
        mock_time.return_value = ("20260529", "1400")

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "response": {
                "header": {"resultCode": "10", "resultMsg": "오류 발생"}
            }
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        response = client.get("/weather/address?address=서울시")
        
        assert response.status_code == 500
        assert "기상청 API 응답 오류: 오류 발생" in response.json()["detail"]

    @patch("routers.weather.httpx.AsyncClient.get", new_callable=AsyncMock)
    @patch("routers.weather.get_coords_from_address", new_callable=AsyncMock)
    def test_통신_예외_발생_503(self, mock_coords, mock_get):
        """requests.get에서 타임아웃 등 Exception이 터졌을 때 500 에러 검증"""
        mock_coords.return_value = (37.5665, 126.9780)
        
        mock_get.side_effect = httpx.RequestError("Timeout Error", request=MagicMock())

        response = client.get("/weather/address?address=서울시")
        
        assert response.status_code == 503
        assert "기상청 서버와 통신할 수 없습니다" in response.json()["detail"]

    @patch("routers.weather.httpx.AsyncClient.get", new_callable=AsyncMock)
    @patch("routers.weather.get_coords_from_address", new_callable=AsyncMock)
    def test_내부_서버_예외_발생_500(self, mock_coords, mock_get):
        """그 외의 일반적인 Exception 발생 시 500 에러 검증"""
        mock_coords.return_value = (37.5665, 126.9780)
        
        mock_get.side_effect = Exception("Unknown Server Error")

        response = client.get("/weather/address?address=서울시")
        
        assert response.status_code == 500
        assert "내부 서버 에러" in response.json()["detail"]

    def test_환경변수_누락_프린트문_커버리지(self):
        """
        파일 최상단의 `if not SERVICE_KEY: print(...)` 라인을 커버하기 위한 테스트.
        모듈을 강제로 리로드하여 확인합니다.
        """
        with patch.dict(os.environ, {}, clear=True):
            captured_output = StringIO()
            sys.stdout = captured_output

            importlib.reload(weather)

            sys.stdout = sys.__stdout__

            assert "WEATHER_SERVICE_KEY 환경 변수가 로드되지 않았습니다." in captured_output.getvalue()