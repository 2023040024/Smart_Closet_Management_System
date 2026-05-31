from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from routers.auth import get_current_user

from database import get_db
from models import WearHistory, Clothes, User, TpoScore
from schemas import FeedbackCreate, FeedbackTempEnum, FeedbackTpoEnum

router = APIRouter(prefix="/feedback", tags=["피드백"])


def update_tpo_score(db: Session, clothes_id: int, situation: str, feedback_tpo) -> None:
    """TpoScore 업데이트: bad → -5 (하한 0), good → +5 (상한 100)"""
    tpo_score_rec = db.query(TpoScore).filter(
        TpoScore.clothes_id == clothes_id,
        TpoScore.tpo_name == situation
    ).first()
    if feedback_tpo == FeedbackTpoEnum.bad:
        if not tpo_score_rec:
            db.add(TpoScore(clothes_id=clothes_id, tpo_name=situation, score=95))
        else:
            tpo_score_rec.score = max(0, tpo_score_rec.score - 5)
    elif feedback_tpo == FeedbackTpoEnum.good:
        if tpo_score_rec:
            tpo_score_rec.score = min(100, tpo_score_rec.score + 5)


def update_temp_sensitivity(user, feedback_temp) -> None:
    """온도 민감도 보정: cold → +0.5, hot → -0.5, 범위 -2.0~2.0"""
    current = user.temp_sensitivity or 0.0
    if feedback_temp == FeedbackTempEnum.cold:
        user.temp_sensitivity = max(-2.0, min(2.0, current + 0.5))
    elif feedback_temp == FeedbackTempEnum.hot:
        user.temp_sensitivity = max(-2.0, min(2.0, current - 0.5))

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
        update_temp_sensitivity(current_user, feedback_data.feedback_temperature)

    if feedback_data.feedback_tpo is not None:
        history.feedback_tpo = feedback_data.feedback_tpo
        situation = history.tpo.value if hasattr(history.tpo, 'value') else history.tpo
        if situation and cloth:
            update_tpo_score(db, cloth.clothes_id, situation, feedback_data.feedback_tpo)


    if feedback_data.memo is not None:
        history.memo = feedback_data.memo
        
    # 4. DB에 변경사항 저장 (트랜잭션 안전성 확보)
    try:
        db.commit()
        db.refresh(history)
        db.refresh(current_user)
        
        return [{
            "message": "피드백 저장 및 사용자 온도 민감도 보정이 완료되었습니다.",
            "history_id": history.history_id,
            "new_temp_sensitivity": current_user.temp_sensitivity
        }]
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="피드백 저장 중 서버 오류가 발생했습니다."
        )