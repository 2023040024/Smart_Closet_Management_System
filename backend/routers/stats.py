from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func  
from typing import List
from datetime import datetime, timedelta, date 
from database import get_db
from models import Clothes, SeasonEnum, User
from routers.auth import get_current_user
from schemas import ClothesResponse


router = APIRouter(prefix="/stats", tags=["통계 및 분석"])


# 미착용 옷/ 재활용 옷 우선순위 추출 API
@router.get("/unworn", response_model=List[ClothesResponse])
def get_unworn_clothes(
    current_season: SeasonEnum, 
    days: int = 30, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff_date = (datetime.now() - timedelta(days=days)).date()
    
    unworn_clothes = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user.id,
            (Clothes.season == current_season) | (Clothes.season == SeasonEnum.all_year),
            (Clothes.last_worn_date <= cutoff_date) | (Clothes.last_worn_date.is_(None)) 
        )
        .order_by(Clothes.wear_count.asc())
        .limit(10)
        .all()
    )

    return unworn_clothes

# 착용 빈도 통계 API
@router.get("/frequency", response_model=List[ClothesResponse])
def get_top_frequency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    top_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user.id,
        Clothes.wear_count > 0
    ).order_by(Clothes.wear_count.desc()).limit(5).all()
    
    return top_clothes

@router.get("/dispose", response_model=List[ClothesResponse])
def get_disposal_recommendation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ninety_days_ago_datetime = datetime.now() - timedelta(days=90)
    ninety_days_ago_date = ninety_days_ago_datetime.date() 
    
    disposal_targets = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user.id,
            (Clothes.last_worn_date <= ninety_days_ago_date) | 
            (
                ((Clothes.wear_count == 0) | Clothes.wear_count.is_(None)) & 
                (Clothes.created_at <= ninety_days_ago_datetime) 
            )
        )
        .all()
    )
    
    return disposal_targets

# 가성비 계산 API
@router.get("/cost-per-wear")
def get_cost_efficiency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user.id,
        Clothes.price > 0,  # purchase_price 오타 수정
        Clothes.wear_count > 0
    ).all()

    validated_clothes = [ClothesResponse.model_validate(c) for c in clothes]
    sorted_clothes = sorted(validated_clothes, key=lambda x: x.cost_per_wear)

    total_items = len(sorted_clothes)
    if total_items >= 6:
        best_items = sorted_clothes[:3]
        worst_items = sorted_clothes[-3:]
    else:
        mid_index = (total_items + 1) // 2
        best_items = sorted_clothes[:mid_index]
        worst_items = sorted_clothes[mid_index:]

    best_item_name = best_items[0].name if best_items else None
    worst_total_price = sum(c.price for c in worst_items)

    return {
        "message": "가성비 분석 완료",
        "best_efficiency": best_items, 
        "worst_efficiency": worst_items, 
        "ai_summary": { 
            "most_efficient_item": best_item_name,
            "total_investment_on_worst": worst_total_price
        }
    }


# 옷장 과부하 분석 API
@router.get("/overload")
def get_closet_overload(
    threshold: int = 3, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    overloaded_groups = (
        db.query(
            Clothes.category, 
            Clothes.color, 
            func.count(Clothes.clothes_id).label("count")
        )
        .filter(Clothes.user_id == current_user.id)
        .group_by(Clothes.category, Clothes.color)
        .having(func.count(Clothes.clothes_id) >= threshold)
        .all()
    )

    detailed_data = []
    for group in overloaded_groups:
        items = db.query(Clothes).filter(
            Clothes.user_id == current_user.id,
            Clothes.category == group.category,
            Clothes.color == group.color
        ).all()
        detailed_data.append({
            "category": group.category,
            "color": group.color,
            "count": group.count,
            "items": [ClothesResponse.model_validate(item).model_dump(by_alias=True) for item in items]
        })

    return {
        "message": f"과다 보유 리포트: {len(detailed_data)}건 발견",
        "overload_details": detailed_data,
        "ai_insight": f"사용자는 현재 {len(detailed_data)}개의 스타일에서 중복 구매 패턴을 보입니다."
    }
