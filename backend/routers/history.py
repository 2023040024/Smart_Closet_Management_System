from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import date  

from database import get_db
from models import Clothes, WearHistory, User
from schemas import WearHistoryCreate, WearHistoryResponse
from .auth import get_current_user

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("", response_model=list[WearHistoryResponse], status_code=status.HTTP_201_CREATED)
def create_wear_history(history_data: list[WearHistoryCreate],
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)
                        ) -> list[WearHistoryResponse]: # 반환 타입 힌트
    if not history_data:
        raise HTTPException(status_code=400, detail="기록할 옷 데이터가 비어있습니다.")
    
    seen = set()
    for data in history_data:
        key = (data.clothes_id, data.worn_date)
        if key in seen:
            raise HTTPException(status_code=400, detail="요청 내에 중복된 기록이 포함되어 있습니다.")
        seen.add(key)

    created_histories = []
    try:
        clothes_ids = [data.clothes_id for data in history_data]
        clothes_db = db.query(Clothes).filter(
            Clothes.clothes_id.in_(clothes_ids),
            Clothes.user_id == current_user.id
        ).all()
        clothes_map = {c.clothes_id: c for c in clothes_db}

        worn_dates = [data.worn_date for data in history_data]
        existing_records_db = db.query(WearHistory)\
            .filter(WearHistory.user_id == current_user.id)\
            .filter(WearHistory.clothes_id.in_(clothes_ids))\
            .filter(WearHistory.worn_date.in_(worn_dates))\
            .all()
        existing_records_set = {(r.clothes_id, r.worn_date) for r in existing_records_db}

        # [Phase 1] 데이터 무결성 사전 검증
        for hd in history_data:
            cloth = clothes_map.get(hd.clothes_id)
            if not cloth:
                raise HTTPException(status_code=404, detail=f"해당 ID({hd.clothes_id})의 옷을 찾을 수 없습니다.")
            
            if (hd.clothes_id, hd.worn_date) in existing_records_set:
                raise HTTPException(status_code=400, detail=f"ID({hd.clothes_id}) 옷은 오늘 이미 기록되었습니다.")

        # [Phase 2] 안전한 비즈니스 로직 연산 및 DB 적재
        for hd in history_data:
            cloth = clothes_map[hd.clothes_id]
            new_history = WearHistory(
                user_id=current_user.id,
                clothes_id=hd.clothes_id,
                worn_date=hd.worn_date,
                tpo=hd.tpo,
                style=hd.style,
                mood=hd.mood,
                feedback_temperature=hd.feedback_temperature,
                feedback_tpo=hd.feedback_tpo,
                memo=hd.memo
            )
            
            cloth.wear_count = (cloth.wear_count or 0) + 1
            if cloth.last_worn_date is None or hd.worn_date > cloth.last_worn_date:
                cloth.last_worn_date = hd.worn_date
            
            db.add(new_history)
            created_histories.append(new_history)
    
        db.commit()
        for h in created_histories:
            db.refresh(h)
            
        # 단일/다중 상관없이 항상 리스트 형태로만 반환
        return created_histories
    
    except Exception as e: 
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="서버 오류로 인해 기록에 실패했습니다.")

@router.get("", response_model=list[WearHistoryResponse])
def get_wear_histories(
    skip: int = 0, 
    limit: int = 100,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[WearHistoryResponse]: # 반환 타입 힌트
    
    # 1. 기본 쿼리 생성 (실행 안 됨)
    query = db.query(WearHistory)\
        .options(joinedload(WearHistory.clothes))\
        .filter(WearHistory.user_id == current_user.id)
    
    # 2. 동적 날짜 필터링 적용 (조건이 있을 때만 쿼리 추가)
    if start_date:
        query = query.filter(WearHistory.worn_date >= start_date)
    if end_date:
        query = query.filter(WearHistory.worn_date <= end_date)
        
    # 3. 최종 정렬 및 페이징 후 실행
    histories = query.order_by(WearHistory.worn_date.desc())\
        .offset(skip).limit(limit).all()
    
    return histories

@router.put("", response_model=list[WearHistoryResponse], status_code=status.HTTP_200_OK)
def update_daily_wear_history(
    history_data: list[WearHistoryCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[WearHistoryResponse]:
    if not history_data:
        raise HTTPException(status_code=400, detail="수정할 옷 데이터가 비어있습니다.")

    target_dates = list({data.worn_date for data in history_data})
    
    try:
        # 기존 기록 삭제 예약
        existing_records = db.query(WearHistory).filter(
            WearHistory.user_id == current_user.id,
            WearHistory.worn_date.in_(target_dates)
        ).all()
        
        for record in existing_records:
            # 삭제되는 기록에 연결된 옷 객체를 찾아 착용 횟수 1 감소 (4줄 추가)
            cloth_to_reduce = db.query(Clothes).filter(Clothes.clothes_id == record.clothes_id).first()
            if cloth_to_reduce and cloth_to_reduce.wear_count > 0:
                cloth_to_reduce.wear_count -= 1
            db.delete(record)
            
        db.flush()

        # 신규 데이터 삽입
        created_histories = []
        clothes_ids = [data.clothes_id for data in history_data]
        clothes_db = db.query(Clothes).filter(
            Clothes.clothes_id.in_(clothes_ids),
            Clothes.user_id == current_user.id
        ).all()
        clothes_map = {c.clothes_id: c for c in clothes_db}

        for hd in history_data:
            if hd.clothes_id not in clothes_map:
                raise HTTPException(status_code=404, detail=f"해당 ID({hd.clothes_id})의 옷을 찾을 수 없습니다.")
                
            cloth = clothes_map[hd.clothes_id]
            cloth.wear_count = (cloth.wear_count or 0) + 1
            if not cloth.last_worn_date or hd.worn_date > cloth.last_worn_date:
                cloth.last_worn_date = hd.worn_date

            new_history = WearHistory(
                user_id=current_user.id,
                clothes_id=hd.clothes_id,
                worn_date=hd.worn_date,
                tpo=hd.tpo,
                style=hd.style,
                mood=hd.mood,
                feedback_temperature=hd.feedback_temperature,
                feedback_tpo=hd.feedback_tpo,
                memo=hd.memo
            )
            db.add(new_history)
            created_histories.append(new_history)

        db.commit()
        for h in created_histories:
            db.refresh(h)
            
        return created_histories

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="서버 오류로 인해 수정에 실패했습니다.")

@router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wear_history(history_id: int, 
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)
                        ) -> None: # 반환값 없음
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