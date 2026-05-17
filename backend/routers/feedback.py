from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from routers.auth import get_current_user  

from database import get_db
from models import WearHistory, Clothes, User, TpoScore  
from schemas import FeedbackCreate, FeedbackTempEnum, FeedbackTpoEnum 

router = APIRouter(prefix="/feedback", tags=["피드백"])

@router.post("", status_code=status.HTTP_200_OK)
def create_feedback(
    feedback_data: FeedbackCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 인증 주입 추가
):
    """
    착용 피드백을 저장하고, 사용자의 전반적인 온도 민감도를 보정하는 API
    """
    # 1. 내 착용 기록만 조회하도록 조건 추가
    history = db.query(WearHistory).filter(
        WearHistory.history_id == feedback_data.history_id,
        WearHistory.user_id == current_user.id  # 본인 검증 추가
    ).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="해당 착용 기록을 찾을 수 없거나 접근 권한이 없습니다." # 에러 메시지 보강
        )
        
    # 2. 해당 기록과 연결된 옷(Clothes), 그리고 그 옷의 소유자(User) 조회
    cloth = db.query(Clothes).filter(Clothes.clothes_id == history.clothes_id).first()
    if not cloth:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 기록에 연결된 옷 정보를 찾을 수 없습니다."
        )
    
    # 3. 데이터 업데이트
    if feedback_data.feedback_temperature is not None:
        history.feedback_temperature = feedback_data.feedback_temperature
        
        # current_user를 직접 사용하여 로직 간소화
        current_sensitivity = current_user.temp_sensitivity or 0.0
        
        if feedback_data.feedback_temperature == FeedbackTempEnum.cold:
            current_user.temp_sensitivity = current_sensitivity + 1
        elif feedback_data.feedback_temperature == FeedbackTempEnum.hot:
            current_user.temp_sensitivity = current_sensitivity - 1
        elif feedback_data.feedback_temperature == FeedbackTempEnum.good:
            current_user.temp_sensitivity = current_sensitivity

    
    if feedback_data.feedback_tpo is not None:
        history.feedback_tpo = feedback_data.feedback_tpo
        
        if feedback_data.feedback_tpo == FeedbackTpoEnum.bad:
            situation = history.tpo.value if hasattr(history.tpo, 'value') else history.tpo
            
            if situation and cloth:
                tpo_score_rec = db.query(TpoScore).filter(
                    TpoScore.clothes_id == cloth.clothes_id,
                    TpoScore.tpo_name == situation
                ).first()  

                # 기존 기록이 없을 경우 신규 생성
                if not tpo_score_rec:
                    new_score = TpoScore(
                        clothes_id=cloth.clothes_id,
                        tpo_name=situation,
                        score=95
                    )
                    db.add(new_score)
                else:
                    current_score = tpo_score_rec.score
                    tpo_score_rec.score = max(0, current_score - 5)


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
    }