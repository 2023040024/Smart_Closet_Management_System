from fastapi import APIRouter, Query, HTTPException
from utils import convert_grid, get_base_time # 유틸리티 함수 로드
import requests

router = APIRouter(prefix="/weather", tags=["weather"])
SERVICE_KEY = "0b1a641aa90d0faf85b954ff4400466397b5737a27a3f95d1997150ba7f28f01"

@router.get("/current")
def get_weather_by_location(
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도")
):
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
            "current_temp": None,  # TMP
            "max_temp": None,      # TMX
            "min_temp": None,      # TMN
            "sky_condition": None, # SKY
            "precipitation_type": None, # PTY
            "precipitation_chance": None # POP
        }

        for item in items:
            category = item['category']
            value = item['fcstValue']

            # 1. 현재 기온 (가장 빠른 예보 시간의 TMP)
            if category == 'TMP' and weather_info["current_temp"] is None:
                weather_info["current_temp"] = f"{value}°C"
            
            # 2. 최고 기온
            elif category == 'TMX':
                weather_info["max_temp"] = f"{value}°C"
            
            # 3. 최저 기온
            elif category == 'TMN':
                weather_info["min_temp"] = f"{value}°C"
            
            # 4. 하늘 상태
            elif category == 'SKY' and weather_info["sky_condition"] is None:
                weather_info["sky_condition"] = sky_status.get(value, "알 수 없음")
            
            # 5. 강수 형태
            elif category == 'PTY' and weather_info["precipitation_type"] is None:
                weather_info["precipitation_type"] = pty_status.get(value, "알 수 없음")
            
            # 6. 강수 확률
            elif category == 'POP' and weather_info["precipitation_chance"] is None:
                weather_info["precipitation_chance"] = f"{value}%"

        return {
            "status": "success",
            "base_info": {"date": base_date, "time": base_time},
            "weather": weather_info
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
