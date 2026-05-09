from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import WearHistory, Clothes, User  # User 모델 추가
from schemas import FeedbackCreate, FeedbackTempEnum

router = APIRouter(prefix="/feedback", tags=["피드백"])

@router.post("", status_code=status.HTTP_200_OK)
def create_feedback(feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    """
    착용 피드백을 저장하고, 사용자(User)의 전반적인 온도 민감도(temp_sensitivity)를 조정하는 API
    """
    # 1. DB에서 해당 history_id를 가진 착용 기록 조회
    history = db.query(WearHistory).filter(WearHistory.history_id == feedback_data.history_id).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="해당 착용 기록을 찾을 수 없습니다."
        )
        
    # 2. 해당 기록과 연결된 옷(Clothes), 그리고 그 옷의 소유자(User) 조회
    cloth = db.query(Clothes).filter(Clothes.clothes_id == history.clothes_id).first()
    user = None
    if cloth:
        user = db.query(User).filter(User.user_id == cloth.user_id).first() # 사용자 가져오기
    
    # 3. 데이터 업데이트
    if feedback_data.feedback_temperature is not None:
        history.feedback_temperature = feedback_data.feedback_temperature
        
        # 💡 [협업 맞춤형 로직] 사용자의 온도 민감도(temp_sensitivity) 보정
        if user:
            # 기본값이 없으면 0.0으로 시작
            current_sensitivity = getattr(user, 'temp_sensitivity', 0.0) or 0.0
            
            # 추웠다면 -> 추위를 타는 편 -> 민감도 증가 (+0.2 정도씩 미세 조정)
            # 팀원 코드: 민감도가 높아지면 아우터 추천 기준 온도(outer_threshold)가 올라감!
            if feedback_data.feedback_temperature == FeedbackTempEnum.COLD:
                user.temp_sensitivity = current_sensitivity + 0.2
            
            # 더웠다면 -> 더위를 타는 편 -> 민감도 감소 (-0.2)
            elif feedback_data.feedback_temperature == FeedbackTempEnum.HOT:
                user.temp_sensitivity = current_sensitivity - 0.2
                
            # 적당함 -> 현재 민감도 유지

    if feedback_data.feedback_tpo is not None:
        history.feedback_tpo = feedback_data.feedback_tpo
    if feedback_data.memo is not None:
        history.memo = feedback_data.memo
        
    # 4. DB에 변경사항 저장
    db.commit()
    db.refresh(history)
    if user:
        db.refresh(user) # User 테이블 변경사항 확정
    
    return {
        "message": "피드백 저장 및 사용자 온도 민감도 보정이 완료되었습니다.",
        "history_id": history.history_id,
        "new_temp_sensitivity": getattr(user, 'temp_sensitivity', None) if user else None