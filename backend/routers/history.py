from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("")
def save_history(db: Session = Depends(get_db)):
    return {"message": "착용 기록 저장 - 구현 예정"}

@router.get("")
def get_history(db: Session = Depends(get_db)):
    return {"message": "착용 이력 조회 - 구현 예정"}