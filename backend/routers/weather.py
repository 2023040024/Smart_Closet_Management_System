from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from utils import convert_grid, get_base_time, get_coords_from_address # 유틸리티 함수 로드
import requests, os
from dotenv import load_dotenv
from typing import Optional, Dict

load_dotenv()

router = APIRouter(prefix="/weather", tags=["날씨"])
SERVICE_KEY = os.getenv("WEATHER_SERVICE_KEY")

if not SERVICE_KEY:
    print("WEATHER_SERVICE_KEY 환경 변수가 로드되지 않았습니다. .env 파일을 확인하세요.")

class WeatherInfo(BaseModel):
    주소: str
    좌표: Dict[str, float]
    # FE로는 "현재 기온"으로 응답하고, 백엔드 내부에서는 "현재_기온"으로 다룹니다.
    현재_기온: Optional[str] = Field(None, alias="현재 기온")
    최고_기온: Optional[str] = Field(None, alias="최고 기온")
    최저_기온: Optional[str] = Field(None, alias="최저 기온")
    하늘_상태: Optional[str] = Field(None, alias="하늘 상태")
    강수_형태: Optional[str] = Field(None, alias="강수 형태")
    강수_확률: Optional[str] = Field(None, alias="강수 확률")

    model_config = ConfigDict(populate_by_name=True)

class BaseInfo(BaseModel):
    date: str
    time: str

class WeatherResponse(BaseModel):
    status: str
    base_info: BaseInfo
    weather: WeatherInfo
    
@router.get("/address")
def get_weather_by_location(
    address: str = Query(..., description="주소명 (예: 서울시, 부산광역시 해운대구)")
):
    # 1. 주소를 위경도로 변환
    lat, lon = get_coords_from_address(address)
    
    if lat is None:
        raise HTTPException(status_code=400, detail="유효하지 않은 주소입니다.")
    
    # 1. 위경도 -> 격자 변환
    nx, ny = convert_grid(lat, lon)
    
    # 2. 현재 시점 최신 발표 시간 계산
    base_date, base_time = get_base_time()

    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
    params = {
        'serviceKey': SERVICE_KEY,
        'pageNo': '1',
        'numOfRows': '200', # 필요한 항목만큼 적절히 조절
        'dataType': 'JSON',
        'base_date': base_date,
        'base_time': base_time,
        'nx': nx,
        'ny': ny
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        res_data = response.json()
        
        if res_data.get('response', {}).get('header', {}).get('resultCode') != '00':
            return {"status": "error", "message": "기상청 API 응답 오류"}

        items = res_data['response']['body']['items']['item']

        # 데이터 매핑을 위한 한글 변환 딕셔너리
        sky_status = {"1": "맑음", "3": "구름많음", "4": "흐림"}
        pty_status = {"0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기"}
        # 가독성을 위해 데이터 정제
        weather_info = {
            "주소": address,
            "좌표": {"위도": lat, "경도": lon},
            "현재_기온": None,  # TMP
            "최고_기온": None,      # TMX
            "최저_기온": None,      # TMN
            "하늘_상태": None, # SKY
            "강수_형태": None, # PTY
            "강수_확률": None # POP
        }

        for item in items:
            category = item['category']
            value = item['fcstValue']

            # 1. 현재 기온 (가장 빠른 예보 시간의 TMP)
            if category == 'TMP' and weather_info["현재 기온"] is None:
                weather_info["현재_기온"] = f"{value}°C"
            
            # 2. 최고 기온
            elif category == 'TMX':
                weather_info["최고_기온"] = f"{value}°C"
            
            # 3. 최저 기온
            elif category == 'TMN':
                weather_info["최저_기온"] = f"{value}°C"
            
            # 4. 하늘 상태
            elif category == 'SKY' and weather_info["하늘 상태"] is None:
                weather_info["하늘_상태"] = sky_status.get(value, "알 수 없음")
            
            # 5. 강수 형태
            elif category == 'PTY' and weather_info["강수 형태"] is None:
                weather_info["강수_형태"] = pty_status.get(value, "알 수 없음")
            
            # 6. 강수 확률
            elif category == 'POP' and weather_info["강수 확률"] is None:
                weather_info["강수_확률"] = f"{value}%"

        return {
            "status": "success",
            "base_info": {
                "date": f"{base_date[:4]}-{base_date[4:6]}-{base_date[6:]}",
                "time": f"{base_time[:2]}시 {base_time[2:]}분"
                },
            "weather": weather_info
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
