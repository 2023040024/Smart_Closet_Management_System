from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Clothes, WearHistory
from schemas import WearHistoryCreate, WearHistoryResponse

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("", response_model=WearHistoryResponse)
def create_wear_history(history_data: WearHistoryCreate, db: Session = Depends(get_db)):
    cloth = db.query(Clothes).filter(Clothes.clothes_id == history_data.clothes_id).first()
    if not cloth:
        raise HTTPException(status_code=404, detail="해당 ID의 옷을 찾을 수 없습니다.")

    new_history = WearHistory(
        user_id=cloth.user_id,  # Clothes 테이블에서 소유자 ID를 가져옴
        clothes_id=history_data.clothes_id,
        worn_date=history_data.worn_date,
        feedback_temperature=history_data.feedback_temperature,
        feedback_fit=history_data.feedback_fit,
        feedback_tpo=history_data.feedback_tpo,
        memo=history_data.memo
    )
    db.add(new_history)




@router.get("")
def get_history(db: Session = Depends(get_db)):
    return {"message": "착용 이력 조회 - 구현 예정"}