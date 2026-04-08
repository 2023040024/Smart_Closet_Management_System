from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Clothes, WearHistory
from schemas import WearHistoryCreate, WearHistoryResponse

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("", response_model=List[WearHistoryResponse])
def create_wear_history(history_data_list: List[WearHistoryCreate], db: Session = Depends(get_db)):
    created_histories = []
    
    for history_data in history_data_list:
        cloth = db.query(Clothes).filter(Clothes.clothes_id == history_data.clothes_id).first()
        if not cloth:
            raise HTTPException(status_code=404, detail=f"해당 ID({history_data.clothes_id})의 옷을 찾을 수 없습니다.")

@router.get("", response_model=List[WearHistoryResponse])
def get_wear_histories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    histories = db.query(WearHistory).order_by(WearHistory.worn_date.desc()).offset(skip).limit(limit).all()
    return histories