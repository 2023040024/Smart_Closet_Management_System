from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Clothes, WearHistory
from schemas import WearHistoryCreate, WearHistoryResponse

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("", response_model=List[WearHistoryResponse])
def create_wear_history(history_data_list: List[WearHistoryCreate], db: Session = Depends(get_db)):
    
    seen = set()
    for data in history_data_list:
        key = (data.clothes_id, data.worn_date)
        if key in seen:
            raise HTTPException(status_code=400, detail="요청 내에 중복된 기록이 포함되어 있습니다.")
        seen.add(key)

    if not history_data_list:
        raise HTTPException(status_code=400, detail="기록할 옷 데이터가 비어있습니다.")
    
    created_histories = []
    
    for history_data in history_data_list:
        cloth = db.query(Clothes).filter(Clothes.clothes_id == history_data.clothes_id).first()
        if not cloth:
            raise HTTPException(status_code=404, detail=f"해당 ID({history_data.clothes_id})의 옷을 찾을 수 없습니다.")
        existing_record = db.query(WearHistory).filter(
            WearHistory.clothes_id == history_data.clothes_id,
            WearHistory.worn_date == history_data.worn_date
        ).first()
        if existing_record:
            raise HTTPException(status_code=400, detail=f"ID({history_data.clothes_id}) 옷은 오늘 이미 기록되었습니다.")

        new_history = WearHistory(
            user_id=cloth.user_id,
            clothes_id=history_data.clothes_id,
            worn_date=history_data.worn_date,
            feedback_temperature=history_data.feedback_temperature,
            feedback_fit=history_data.feedback_fit,
            feedback_tpo=history_data.feedback_tpo,
            memo=history_data.memo
        )
        cloth.wear_count += 1
        cloth.last_worn_date = history_data.worn_date
        db.add(new_history)
        db.add(cloth)
        created_histories.append(new_history)
    
    db.commit()
    for h in created_histories:
        db.refresh(h)
        
    return created_histories

@router.get("", response_model=List[WearHistoryResponse])
def get_wear_histories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    histories = db.query(WearHistory).order_by(WearHistory.worn_date.desc()).offset(skip).limit(limit).all()
    return histories