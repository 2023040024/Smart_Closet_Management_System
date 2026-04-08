from datetime import datetime, timedelta
import math
import requests

# 1. 주소 -> 위경도 변환 (OpenStreetMap Nominatim 사용)
def get_coords_from_address(address: str):
    url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json"
    headers = {"User-Agent": "SmartClosetApp"} # 필수 헤더
    
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
        return None, None
    except:
        return None, None
    
def convert_grid(lat, lon):
    # 기상청 격자 변환 상수
    RE = 6371.00877  # 지구 반경(km)
    GRID = 5.0       # 격자 간격(km)
    SLAT1 = 30.0     # 투영 위도1(degree)
    SLAT2 = 60.0     # 투영 위도2(degree)
    OLON = 126.0     # 기준점 경도(degree)
    OLAT = 38.0      # 기준점 위도(degree)
    XO = 43          # 기준점 X좌표(GRID)
    YO = 136         # 기준점 Y좌표(GRID)

    DEGRAD = math.pi / 180.0
    
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / math.pow(ro, sn)
    
    ra = math.tan(math.pi * 0.25 + (lat) * DEGRAD * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * DEGRAD - olon
    if theta > math.pi: theta -= 2.0 * math.pi
    if theta < -math.pi: theta += 2.0 * math.pi
    theta *= sn
    
    nx = math.floor(ra * math.sin(theta) + XO + 0.5)
    ny = math.floor(ro - ra * math.cos(theta) + YO + 0.5)
    
    return nx, ny

def get_base_time():
    now = datetime.now()
    # 기상청 단기예보 발표 시간: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
    base_times = [2, 5, 8, 11, 14, 17, 20, 23]
    
    # 현재 시간에서 10분 정도의 여유를 줌 (발표 직후에는 데이터가 없을 수 있음)
    check_time = now - timedelta(minutes=10)
    current_hour = check_time.hour
    
    # 현재 시간보다 이전이면서 가장 가까운 발표 시간 찾기
    closest_time = 23 # 기본값은 전날 마지막 예보
    for t in base_times:
        if current_hour >= t:
            closest_time = t
        else:
            break
            
    # 만약 현재 시간이 02:10 이전이라면 날짜를 전날로 변경해야 함
    if current_hour < 2:
        base_date = (now - timedelta(days=1)).strftime("%Y%m%d")
        base_time = "2300"
    else:
        base_date = now.strftime("%Y%m%d")
        base_time = f"{closest_time:02d}00"
        
    return base_date, base_time
