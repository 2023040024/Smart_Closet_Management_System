from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# 프로젝트 모듈 임포트
from database import get_db
from models import WearHistory, Clothes # Clothes 모델 추가
from schemas import FeedbackCreate, FeedbackTempEnum

router = APIRouter(prefix="/feedback", tags=["피드백"])

@router.post("", status_code=status.HTTP_200_OK)
def create_feedback(feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    """
    사용자의 착용 피드백을 저장하고, 온도 피드백에 따라 옷의 추천 기준 온도를 보정하는 API
    """
    # 1. DB에서 해당 history_id를 가진 착용 기록 조회
    history = db.query(WearHistory).filter(WearHistory.history_id == feedback_data.history_id).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="해당 착용 기록을 찾을 수 없습니다."
        )
        
    # 2. 해당 기록과 연결된 옷(Clothes) 정보 조회
    cloth = db.query(Clothes).filter(Clothes.clothes_id == history.clothes_id).first()
    
    # 3. 데이터 업데이트 (히스토리 기록)
    if feedback_data.feedback_temperature is not None:
        history.feedback_temperature = feedback_data.feedback_temperature
        
        # 💡 [핵심 로직] 온도 피드백에 따른 옷의 추천 온도 보정 (Calibration)
        if cloth:
            # 기본 보정값이 없다면 0.0으로 초기화 (models.py에 temp_offset 컬럼이 있다고 가정)
            current_offset = getattr(cloth, 'temp_offset', 0.0) 
            
            # 추웠다면 -> 이 옷은 더 따뜻한 날씨에 입어야 함 -> 기준 온도 + 보정
            if feedback_data.feedback_temperature == FeedbackTempEnum.COLD:
                cloth.temp_offset = current_offset + 1.0
            
            # 더웠다면 -> 이 옷은 더 시원한 날씨에 입어야 함 -> 기준 온도 - 보정
            elif feedback_data.feedback_temperature == FeedbackTempEnum.HOT:
                cloth.temp_offset = current_offset - 1.0

            elif feedback_data.feedback_temperature == FeedbackTempEnum.GOOD:
                pass    
            # '적당함'인 경우 보정값을 유지하거나

    if feedback_data.feedback_tpo is not None:
        history.feedback_tpo = feedback_data.feedback_tpo
    if feedback_data.memo is not None:
        history.memo = feedback_data.memo
        
    # 4. DB에 변경사항 저장 (history와 cloth 모두 업데이트됨)
    db.commit()
    db.refresh(history)
    if cloth:
        db.refresh(cloth)
    
    return {
        "message": "피드백 저장 및 온도 보정이 완료되었습니다.",
        "history_id": history.history_id,
        "calibrated_offset": getattr(cloth, 'temp_offset', None) if cloth else None
    }