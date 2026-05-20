from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func  
from datetime import datetime, timedelta, date 
from database import get_db
from models import Clothes, SeasonEnum, User
from routers.auth import get_current_user
from schemas import ClothesResponse


router = APIRouter(prefix="/stats", tags=["통계 및 분석"])


# 미착용 옷/ 재활용 옷 우선순위 추출 API
@router.get("/unworn", response_model=list[ClothesResponse])
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
@router.get("/frequency", response_model=list[ClothesResponse])
def get_top_frequency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    top_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user.id,
        Clothes.wear_count > 0
    ).order_by(Clothes.wear_count.desc()).limit(5).all()
    
    return top_clothes

@router.get("/dispose", response_model=list[ClothesResponse])
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
@router.get("/cost-per-wear", response_model=list[ClothesResponse])
def get_cost_efficiency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # [97번 최적화] DB 엔진에서 직접 나누기 연산 후 정렬하여 가져옴
    clothes = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user.id,
            Clothes.price > 0,
            Clothes.wear_count > 0
        )
        .order_by((Clothes.price / Clothes.wear_count).asc())
        .all()
    )

    # 프론트엔드 규격을 위한 Pydantic 검증
    validated_clothes = [ClothesResponse.model_validate(c) for c in clothes]
    
    # 6개 미만 시 발생하는 중복/누락 방지 동적 분할 알고리즘
    total_items = len(validated_clothes)
    if total_items >= 6:
        best_items = validated_clothes[:3]
        worst_items = validated_clothes[-3:]
    else:
        mid_index = (total_items + 1) // 2
        best_items = validated_clothes[:mid_index]
        worst_items = validated_clothes[mid_index:]

    return best_items + worst_items


# 옷장 과부하 분석 API
@router.get("/overload", response_model=list[dict])
def get_closet_overload(
    threshold: int = 3, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # [97번 최적화] 서브쿼리로 중복 횟수가 threshold 이상인 카테고리와 색상 조합만 찾기
    subquery = (
        db.query(Clothes.category, Clothes.color)
        .filter(Clothes.user_id == current_user.id)
        .group_by(Clothes.category, Clothes.color)
        .having(func.count(Clothes.clothes_id) >= threshold)
        .subquery()
    )

    overloaded_items = (
        db.query(Clothes)
        .join(subquery, (Clothes.category == subquery.c.category) & (Clothes.color == subquery.c.color))
        .all()
    )
    
    # [97번 최적화] 메모리 내 그룹화로 DB 부하 감소
    grouped_data = {}
    for item in overloaded_items:
        key = (item.category, item.color)
        if key not in grouped_data:
            grouped_data[key] = []
        grouped_data[key].append(item)

    # 리턴 시 Pydantic 스키마(ClothesResponse) 적용
    detailed_data = [
        {
            "category": key[0],
            "color": key[1],
            "count": len(items),
            "items": [ClothesResponse.model_validate(item).model_dump(by_alias=True) for item in items]
        }
        for key, items in grouped_data.items()
    ]

    return detailed_data