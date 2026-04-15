from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func  
from typing import List
from datetime import datetime, timedelta, date 
from database import get_db
from models import Clothes, SeasonEnum


router = APIRouter(prefix="/stats", tags=["통계 및 분석"])


# 미착용 옷/ 재활용 옷 우선순위 추출 API
@router.get("/unworn/priority")
def get_underutilized_clothes(current_season: SeasonEnum, db: Session = Depends(get_db)):
    current_user_id = 1 
    
    priority_clothes = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user_id,
            # 현재 계절이거나 사계절용 옷 모두 포함
            (Clothes.season == current_season) | (Clothes.season == SeasonEnum.all_year) 
        )
        .order_by(Clothes.wear_count.asc())
        .limit(10)
        .all()
    )

    return {"message": f"우선 추천 후보 추출 완료", "data": priority_clothes}

# 착용 빈도 통계 API
@router.get("/frequency/top")
def get_top_frequency(db: Session = Depends(get_db)):
    current_user_id = 1
    
    # wear_count 기준 내림차순 정렬하여 상위 5개 추출
    top_clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user_id,
        Clothes.wear_count > 0
    ).order_by(Clothes.wear_count.desc()).limit(5).all()
    
    return {"message": "가장 즐겨 입는 상위 5벌 조회", "data": top_clothes}


@router.get("/disposal-recommendation")
def get_disposal_recommendation(db: Session = Depends(get_db)):
    current_user_id = 1
    
    # Date와 DateTime 변수 명확히 분리
    ninety_days_ago_datetime = datetime.now() - timedelta(days=90)
    ninety_days_ago_date = ninety_days_ago_datetime.date() 
    
    disposal_targets = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user_id,
            (Clothes.last_worn_date <= ninety_days_ago_date) | 
            (
                ((Clothes.wear_count == 0) | (Clothes.wear_count == None)) & 
                (Clothes.created_at <= ninety_days_ago_datetime) 
            )
        )
        .all()
    )
    
    return {"message": f"90일 방치 옷 {len(disposal_targets)}벌 조회 완료", "data": disposal_targets}


# 가성비 계산 API
@router.get("/cost-efficiency")
def get_cost_efficiency(db: Session = Depends(get_db)):
    current_user_id = 1
    
    # 가격 정보가 있고 한 번이라도 입은 옷 필터링
    clothes = db.query(Clothes).filter(
        Clothes.user_id == current_user_id,
        Clothes.purchase_price > 0,
        Clothes.wear_count > 0
    ).all()

    sorted_clothes = sorted(clothes, key=lambda x: x.cost_per_wear)

    return {
        "message": "가성비 분석 완료",
        "best_efficiency": sorted_clothes[:3],   # UI용 가성비 좋은 옷
        "worst_efficiency": sorted_clothes[-3:], # UI용 가성비 나쁜 옷
        "ai_summary": {                          # AI 프롬프트용 요약 데이터
            "most_efficient_item": sorted_clothes[0].name if sorted_clothes else None,
            "total_investment_on_worst": sum(c.purchase_price for c in sorted_clothes[-3:])
        }
    }


# 옷장 과부하 분석 API
@router.get("/overload-analysis")
def get_closet_overload(threshold: int = 3, db: Session = Depends(get_db)):
    current_user_id = 1
    
    # 카테고리/색상별 그룹화 및 threshold 이상 중복 감지
    overloaded_groups = (
        db.query(
            Clothes.category, 
            Clothes.color, 
            func.count(Clothes.clothes_id).label("count")
        )
        .filter(Clothes.user_id == current_user_id)
        .group_by(Clothes.category, Clothes.color)
        .having(func.count(Clothes.clothes_id) >= threshold)
        .all()
    )

    detailed_data = []
    for group in overloaded_groups:
        items = db.query(Clothes).filter(
            Clothes.user_id == current_user_id,
            Clothes.category == group.category,
            Clothes.color == group.color
        ).all()
        detailed_data.append({
            "category": group.category,
            "color": group.color,
            "count": group.count,
            "items": items
        })


    return {
        "message": f"과다 보유 리포트: {len(detailed_data)}건 발견",
        "overload_details": detailed_data,
        "ai_insight": f"사용자는 현재 {len(detailed_data)}개의 스타일에서 중복 구매 패턴을 보입니다."
    }

