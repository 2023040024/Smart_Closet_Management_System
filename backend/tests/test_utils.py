import pytest
from datetime import datetime
from unittest.mock import patch
from utils import get_base_time 

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