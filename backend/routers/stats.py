from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func  
from datetime import datetime, timedelta, date 
from database import get_db
from models import Clothes, SeasonEnum, User
from routers.auth import get_current_user
# schemas.py에서 새로운 OverloadItem, OverloadResponse를 추가로 불러오기.
from schemas import ClothesResponse, OverloadItem, OverloadResponse, DisposalResponse
from pydantic import BaseModel

class CostEfficiencyResult(BaseModel):
    best_efficiency: list[ClothesResponse]
    worst_efficiency: list[ClothesResponse]

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

@router.get("/dispose", response_model=DisposalResponse) 
def get_disposal_recommendation(
    current_season: SeasonEnum,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ninety_days_ago_datetime = datetime.now() - timedelta(days=90)
    ninety_days_ago_date = ninety_days_ago_datetime.date() 
    
    disposal_targets = (
        db.query(Clothes)
        .filter(
            Clothes.user_id == current_user.id,
            (Clothes.season == current_season) | (Clothes.season == SeasonEnum.all_year), # 필터링 조건 추가
            (Clothes.last_worn_date <= ninety_days_ago_date) | 
            (
                ((Clothes.wear_count == 0) | Clothes.wear_count.is_(None)) & 
                (Clothes.created_at <= ninety_days_ago_datetime) 
            )
        )
        .all()
    )

    if not disposal_targets:
        advice = "90일 이상 미착용된 옷이 없습니다."
    else:
        advice_list = [f"옷 ID {c.clothes_id}번은 90일 이상 미착용된 옷입니다. 처분을 고려해보세요." for c in disposal_targets]
        advice = "\n".join(advice_list)
        
    return {
        "items": disposal_targets,
        "ai_advice": advice
    }
    

# 가성비 계산 API
@router.get("/cost-per-wear", response_model=CostEfficiencyResult) 
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

    return {
        "best_efficiency": best_items,
        "worst_efficiency": worst_items
    }


# 옷장 과부하 분석 API
@router.get("/overload", response_model=OverloadResponse) 
def get_closet_overload(
    threshold: int = 4, # 1. 임계값 4로 상향
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 2. 계절(season)과 소재(material)를 group_by 조건에 추가 및 NULL 엣지 케이스 방어 로직 추가
    subquery = (
        db.query(Clothes.category, Clothes.color, Clothes.season, Clothes.material)
        .filter(
            Clothes.user_id == current_user.id,
            Clothes.season.is_not(None),    # [팀원 리뷰 반영] 계절이 미입력된 옷 제외
            Clothes.material.is_not(None)   # [팀원 리뷰 반영] 소재가 미입력된 옷 제외
        )
        .group_by(Clothes.category, Clothes.color, Clothes.season, Clothes.material)
        .having(func.count(Clothes.clothes_id) >= threshold)
        .subquery()
    )

    # 3. 조인 조건에도 4가지 속성이 모두 완벽히 일치해야 함을 명시
    overloaded_items = (
        db.query(Clothes)
        .join(subquery, (
            (Clothes.category == subquery.c.category) & 
            (Clothes.color == subquery.c.color) &
            (Clothes.season == subquery.c.season) &
            (Clothes.material == subquery.c.material)
        ))
        .all()
    )
    
    # [97번 최적화] 메모리 내 그룹화로 DB 부하 감소
    grouped_data = {}
    for item in overloaded_items:
        # 그룹 묶음 단위를 4가지 속성으로 확장
        key = (item.category, item.color, item.season, item.material)
        if key not in grouped_data:
            grouped_data[key] = []
        grouped_data[key].append(item)

    detailed_data = []
    for key, items in grouped_data.items():
        # 4가지 Key에서 Enum 객체 처리 및 결측치 기본값 할당
        cat_val = key[0].value if hasattr(key[0], 'value') else key[0]
        col_val = key[1].value if hasattr(key[1], 'value') else key[1]
        sea_val = key[2].value if hasattr(key[2], 'value') else (key[2] or '계절무관')
        mat_val = key[3].value if hasattr(key[3], 'value') else (key[3] or '기본')
        count = len(items)
        
        # 더 엄격해진 기준을 반영한 상세 경고 메시지
        message = f"경고! 옷장에 [{sea_val}]에 입는 [{mat_val}] 소재의 [{col_val} {cat_val}]만 {count}벌이 있어요. 유사한 옷의 충동 소비를 주의하세요!"
        
        detailed_data.append(
            OverloadItem(
                category=cat_val,
                color=col_val,
                count=count,
                warning_message=message,
                items=items
            )
        )

    total_warnings = len(detailed_data)
    if total_warnings == 0:
        advice = "옷장에 중복되는 아이템이 없네요! 스마트한 소비를 하고 계십니다."
    elif total_warnings <= 2:
        advice = "몇 가지 비슷한 아이템이 눈에 띄네요. 다음번엔 새로운 스타일이나 색상에 도전해 보세요."
    else:
        advice = "옷장 다이어트가 시급합니다! 안 입는 중복 옷을 비워낼 타이밍입니다."

    return {
        "total_warnings": total_warnings,
        "items": detailed_data,
        "ai_advice": advice
    }


@router.get("/monthly-report")
def get_monthly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 옷장 생태계 활성도 계산 (최근 30일 기준)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
    
    # 전체 옷 개수
    total_clothes_count = db.query(Clothes).filter(
        Clothes.user_id == current_user.id
    ).count()
    
    # 활성 옷 개수 (최근 30일 이내에 입은 기록이 있는 옷)
    active_clothes_count = db.query(Clothes).filter(
        Clothes.user_id == current_user.id,
        Clothes.last_worn_date >= thirty_days_ago
    ).count()
    
    inactive_clothes_count = total_clothes_count - active_clothes_count
    
    # 활성도 퍼센트 계산 (0으로 나누는 에러 방지)
    if total_clothes_count > 0:
        activity_rate = round((active_clothes_count / total_clothes_count) * 100, 1)
    else:
        activity_rate = 0.0

# 2. 충동구매 방어율 / 과부하 지수
    overload_data = get_closet_overload(threshold=4, db=db, current_user=current_user)
    total_warnings = overload_data["total_warnings"]
    
    # 프론트엔드 신호등 UI 렌더링을 위한 상태 분기 처리
    if total_warnings == 0:
        status_color = "green"
        status_message = "안전: 완벽한 옷장 다이어트 상태입니다."
    elif total_warnings <= 2:
        status_color = "yellow"
        status_message = "주의: 비슷한 아이템이 모이고 있어요."
    else:
        status_color = "red"
        status_message = "위험: 옷장 다이어트가 시급합니다!"

    # 3. 최종 통합 응답 반환 (기존에 작성한 return 문을 아래 코드로 교체합니다)
    return {
        "ecosystem": {
            "total_clothes": total_clothes_count,
            "active_clothes": active_clothes_count,
            "inactive_clothes": inactive_clothes_count,
            "activity_rate": activity_rate
        },
        "overload": {
            "total_warnings": total_warnings,
            "status_color": status_color,
            "status_message": status_message
        }
    }