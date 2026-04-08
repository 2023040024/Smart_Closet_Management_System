from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Clothes, WearHistory
from schemas import WearHistoryCreate, WearHistoryResponse

router = APIRouter(prefix="/history", tags=["착용 기록"])

@router.post("")
def save_history(db: Session = Depends(get_db)):
    return {"message": "착용 기록 저장 - 구현 예정"}

@router.get("")
def get_history(db: Session = Depends(get_db)):
    return {"message": "착용 이력 조회 - 구현 예정"}