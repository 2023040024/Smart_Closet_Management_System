from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Union

from database import get_db
from models import Clothes, WearHistory, User
from schemas import WearHistoryCreate, WearHistoryResponse
from .auth import get_current_user

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("", response_model=Union[WearHistoryResponse, List[WearHistoryResponse]], status_code=status.HTTP_201_CREATED)
def create_wear_history(history_data: Union[WearHistoryCreate, List[WearHistoryCreate]],
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)
                        ):
    is_single = isinstance(history_data, WearHistoryCreate)
    history_data_list = [history_data] if is_single else history_data
    
    if not history_data_list:
        raise HTTPException(status_code=400, detail="기록할 옷 데이터가 비어있습니다.")
    
    seen = set()
    for data in history_data_list:
        key = (data.clothes_id, data.worn_date)
        if key in seen:
            raise HTTPException(status_code=400, detail="요청 내에 중복된 기록이 포함되어 있습니다.")
        seen.add(key)

    created_histories = []
    try:
        for history_data in history_data_list:
            cloth = db.query(Clothes).filter(
                Clothes.clothes_id == history_data.clothes_id,
                Clothes.user_id == current_user.id
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
                user_id=current_user.id,
                clothes_id=history_data.clothes_id,
                worn_date=history_data.worn_date,
                tpo=history_data.tpo,
                style=history_data.style,
                mood=history_data.mood,
                feedback_temperature=history_data.feedback_temperature,
                feedback_tpo=history_data.feedback_tpo,
                memo=history_data.memo
            )

            cloth.wear_count = (cloth.wear_count or 0) + 1
            if cloth.last_worn_date is None or history_data.worn_date > cloth.last_worn_date:
                cloth.last_worn_date = history_data.worn_date
            db.add(new_history)
            created_histories.append(new_history)
    
        db.commit()
        for h in created_histories:
            db.refresh(h)
        return created_histories[0] if is_single else created_histories
    
    except Exception as e: 
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="서버 오류로 인해 기록에 실패했습니다.")

@router.get("", response_model=List[WearHistoryResponse])
def get_wear_histories(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    histories = db.query(WearHistory)\
        .options(joinedload(WearHistory.clothes))\
        .filter(WearHistory.user_id == current_user.id)\
        .order_by(WearHistory.worn_date.desc()).offset(skip).limit(limit)\
        .all()
    
    return histories

@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wear_history(history_id: int, 
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)
                        ):
    # 1. 삭제할 기록 찾기
    history = db.query(WearHistory).filter(
        WearHistory.history_id == history_id,
        WearHistory.user_id == current_user.id).first()
    
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

    # 3. DB에서 실제 삭제
    try:
        db.delete(history)
        db.commit()
    except Exception as e:
        db.rollback() # 에러 발생 시 DB 보호
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="삭제 중 서버 오류가 발생했습니다.")
    
    return None

# =========================================================================
# "날짜 기반 착용 기록 수정 (PUT)" API 영역
# =========================================================================
@router.put("/date/{worn_date}", response_model=List[WearHistoryResponse])
def update_daily_wear_history(
    worn_date: str, 
    history_data_list: List[WearHistoryCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not history_data_list:
        raise HTTPException(status_code=400, detail="기록할 옷 데이터가 비어있습니다.")
    
    try:
        # 1. 해당 날짜의 기존 착용 기록 모두 불러오기
        old_records = db.query(WearHistory).filter(
            WearHistory.worn_date == worn_date,
            WearHistory.user_id == current_user.id
        ).all()

        # 2. 기존 옷들의 착용 횟수(wear_count) 1씩 차감하고 기록 삭제
        for record in old_records:
            cloth = db.query(Clothes).filter(
                Clothes.clothes_id == record.clothes_id,
                Clothes.user_id == current_user.id).first()
            if cloth and cloth.wear_count and cloth.wear_count > 0:
                cloth.wear_count -= 1

                remaining_last_history = db.query(WearHistory).filter(
                    WearHistory.clothes_id == record.clothes_id,
                    WearHistory.user_id == current_user.id,
                    WearHistory.history_id != record.history_id
                ).order_by(WearHistory.worn_date.desc()).first()
                
                cloth.last_worn_date = remaining_last_history.worn_date if remaining_last_history else None

            # 세션에 삭제 마킹
            db.delete(record)

        # 3. 새로운 기록들을 DB에 추가 (POST 로직과 동일)
        created_histories = []
        for history_data in history_data_list:
            cloth = db.query(Clothes).filter(
                Clothes.clothes_id == history_data.clothes_id,
                Clothes.user_id == current_user.id
            ).first()
            
            if not cloth:
                raise HTTPException(status_code=404, detail=f"해당 ID({history_data.clothes_id})의 옷을 찾을 수 없습니다.")

            new_history = WearHistory(
                user_id=current_user.id,
                clothes_id=history_data.clothes_id,
                worn_date=worn_date,
                tpo=history_data.tpo,
                style=history_data.style,
                mood=history_data.mood,
                feedback_temperature=history_data.feedback_temperature,
                feedback_tpo=history_data.feedback_tpo,
                memo=history_data.memo
            )

            # 새 옷의 착용 횟수 증가 및 최근 착용일 갱신
            cloth.wear_count = (cloth.wear_count or 0) + 1
            if cloth.last_worn_date is None or worn_date > cloth.last_worn_date:
                cloth.last_worn_date = worn_date
            
            db.add(new_history)
            created_histories.append(new_history)

        db.commit()
        for h in created_histories:
            db.refresh(h)
        return created_histories

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="서버 오류로 인해 기록 수정에 실패했습니다.")