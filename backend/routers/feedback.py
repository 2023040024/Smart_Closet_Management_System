from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db

# (참고) 필요한 모델이나 스키마는 구현 단계에서 추가 임포트 예정
# from models import WearHistory
# from schemas import FeedbackCreate 

router = APIRouter(prefix="/feedback", tags=["피드백"])

@router.post("")
def create_feedback(db: Session = Depends(get_db)):
    """
    [10주차 기능] 사용자의 착용 피드백을 저장하는 API
    """
    # 현재는 연결 확인을 위한 임시 반환값만 설정
    return {"message": "피드백 라우터가 성공적으로 연결되었습니다. 로직 구현을 시작해 주세요."}