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
    
    current_user_id = 1 #TODO: 인증 모듈 완료 후 JWT에서 실제 user_id 추출 필요

    created_histories = []
    try:
        for history_data in history_data_list:
            cloth = db.query(Clothes).filter(
                Clothes.clothes_id == history_data.clothes_id,
                Clothes.user_id == current_user_id
            ).first()
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

            cloth.wear_count = (cloth.wear_count or 0) + 1
            if cloth.last_worn_date is None or history_data.worn_date > cloth.last_worn_date:
                cloth.last_worn_date = history_data.worn_date
            db.add(new_history)
            db.add(cloth)
            created_histories.append(new_history)
    
        db.commit()
        for h in created_histories:
            db.refresh(h)
        
        return created_histories
    except Exception as e: 
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="서버 오류로 인해 기록에 실패했습니다.")

@router.get("", response_model=List[WearHistoryResponse])
def get_wear_histories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    histories = db.query(WearHistory).order_by(WearHistory.worn_date.desc()).offset(skip).limit(limit).all()
    return histories

@router.delete("/{history_id}")
def delete_wear_history(history_id: int, db: Session = Depends(get_db)):
    # 1. 삭제할 기록 찾기
    history = db.query(WearHistory).filter(WearHistory.history_id == history_id).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="삭제할 기록을 찾을 수 없습니다.")
    
    # 2. 연결된 옷 정보 가져오기 (wear_count 수정을 위해)
    cloth = db.query(Clothes).filter(Clothes.clothes_id == history.clothes_id).first()
    
    if cloth:
        # 착용 횟수 1 감소
        if cloth.wear_count > 0:
            cloth.wear_count -= 1
        
        # 마지막 착용일 갱신, 삭제 후 가장 최근의 남은 기록으로 업데이트
        remaining_last_history = db.query(WearHistory)\
            .filter(WearHistory.clothes_id == history.clothes_id, WearHistory.history_id != history_id)\
            .order_by(WearHistory.worn_date.desc()).first()
        
        cloth.last_worn_date = remaining_last_history.worn_date if remaining_last_history else None
        db.add(cloth)

    # 3. DB에서 실제 삭제
    db.delete(history)
    db.commit()
    
    return {"message": f"기록 {history_id}번이 성공적으로 삭제되었으며, 옷의 착용 횟수가 조정되었습니다."}
