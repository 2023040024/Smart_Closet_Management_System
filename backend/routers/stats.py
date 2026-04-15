from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Clothes

# 통계 API 라우터 설정
router = APIRouter(prefix="/stats", tags=["통계 및 분석"])


# 미착용 옷 분석 API
@router.get("/unworn")
def get_unworn_clothes(db: Session = Depends(get_db)):
    current_user_id = 1  # TODO: 인증 모듈 연동 필요
    
    # wear_count가 0이거나 데이터가 없는 옷 필터링
    unworn_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user_id,
        (Clothes.wear_count == 0) | (Clothes.wear_count == None)
    ).all()
    
    return {"message": f"미착용 옷 {len(unworn_clothes)}벌 조회 성공", "data": unworn_clothes}