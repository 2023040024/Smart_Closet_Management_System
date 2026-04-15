from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta 
from database import get_db
from models import Clothes

# 통계 API 라우터 설정
router = APIRouter(prefix="/stats", tags=["통계 및 분석"])


# 미착용 옷/ 재활용 옷 우선순위 추출 API
@router.get("/unworn/priority")
def get_underutilized_clothes(current_season: str, db: Session = Depends(get_db)):
    current_user_id = 1 
    
    priority_clothes = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user_id,
            Clothes.season == current_season
        )
        .order_by(Clothes.wear_count.asc())
        .limit(10)
        .all()
    )
    
    return {
        "message": f"이번 {current_season} 시즌에 우선적으로 활용할 옷을 찾았습니다.", 
        "data": priority_clothes
    }

# 착용 빈도 통계 API
@router.get("/frequency/top")
def get_top_frequency(db: Session = Depends(get_db)):
    current_user_id = 1
    
    # wear_count 기준 내림차순 정렬하여 상위 5개 추출
    top_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user_id,
        Clothes.wear_count > 0
    ).order_by(Clothes.wear_count.desc()).limit(5).all()
    
    return {"message": "가장 즐겨 입는 상위 5벌 조회", "data": top_clothes}