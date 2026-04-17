from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict, Field
from models import (
    CategoryEnum, TopFitEnum, BottomFitEnum, ColorEnum, SeasonEnum,
    ToneEnum, StyleEnum, MoodEnum, MaterialEnum, ThicknessEnum, PointEnum,
    StatusEnum, SituationEnum, FeedbackTempEnum, FeedbackFitEnum, FeedbackTpoEnum
)

# 1. 클래스 외부에서는 순수 함수로 정의 (데코레이터 제거)
def map_korean_to_enum_logic(v: Any, info: Any) -> Any:
    # 빈 값("")이 들어오면 None으로 반환하여 nullable 허용
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    
    # 이미 Enum 객체라면 그대로 반환
    if not isinstance(v, str):
        return v

    enum_map = {
        'category': CategoryEnum, 'color': ColorEnum, 'season': SeasonEnum,
        'style': StyleEnum, 'top_fit': TopFitEnum, 'bottom_fit': BottomFitEnum,
        'tone': ToneEnum, 'mood': MoodEnum, 'material': MaterialEnum,
        'point': PointEnum, 'thickness': ThicknessEnum, 
        'situation': SituationEnum, 'status': StatusEnum
    }
    
    target_enum = enum_map.get(info.field_name)
    if target_enum:
        for item in target_enum:
            if item.value == v:
                return item
    return v

# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class UserSignup(BaseModel):
    email:    EmailStr
    password: str = Field(..., max_length=60)

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserResponse(BaseModel):
    id:              int
    email:           str
    preferred_style: Optional[StyleEnum] = None
    created_at:      datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse

class StyleUpdate(BaseModel):
    preferred_style: StyleEnum

    @field_validator('preferred_style', mode='before')
    @classmethod
    def validate_enums(cls, v: Any, info: Any) -> Any:
        return map_korean_to_enum_logic(v, info)


# ──────────────────────────────────────────────
# Clothes
# ──────────────────────────────────────────────

class ClothesCreate(BaseModel):
    name:           Optional[str] = None
    category:       Optional[CategoryEnum] = None
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    color:          Optional[ColorEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    material:       Optional[MaterialEnum] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None
    purchase_price: Optional[int] = None
    status:         Optional[StatusEnum] = None
    situation:      Optional[SituationEnum] = None

    @field_validator(
        'category', 'color', 'season', 'style', 'top_fit', 'situation',
        'bottom_fit', 'tone', 'mood', 'material', 'point', 'thickness', 'status',
        mode='before'
    )
    @classmethod
    def validate_enums(cls, v: Any, info: Any) -> Any:
        return map_korean_to_enum_logic(v, info)
    
class ClothesUpdate(BaseModel):
    name:           Optional[str] = None
    category:       Optional[CategoryEnum] = None
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    color:          Optional[ColorEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    material:       Optional[MaterialEnum] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None
    purchase_price: Optional[int] = None
    status:         Optional[StatusEnum] = None
    situation:      Optional[SituationEnum] = None

    @field_validator(
        'category', 'color', 'season', 'style', 'top_fit', 'situation',
        'bottom_fit', 'tone', 'mood', 'material', 'point', 'thickness', 'status',
        mode='before'
    )
    @classmethod
    def validate_enums(cls, v: Any, info: Any) -> Any:
        return map_korean_to_enum_logic(v, info)

class ClothesStatusUpdate(BaseModel):
    status: StatusEnum

class ClothesResponse(BaseModel):
    clothes_id:     int
    name:           Optional[str] = None
    category:       Optional[CategoryEnum] = None
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    color:          Optional[ColorEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    material:       Optional[MaterialEnum] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None
    purchase_price: Optional[int] = None
    situation:      Optional[SituationEnum] = None
    image_url:      Optional[str] = None
    status:         Optional[StatusEnum] = None
    wear_count:     int
    last_worn_date: Optional[date] = None
    cost_per_wear:  Optional[float] = None  # 계산된 값 (wear_count=0이면 null)
    created_at:     datetime

    model_config = ConfigDict(from_attributes=True)


# ──────────────────────────────────────────────
# Wear History & Feedback
# ──────────────────────────────────────────────

class WearHistoryCreate(BaseModel):
    clothes_id:           int
    worn_date:            date
    feedback_temperature: Optional[FeedbackTempEnum] = None
    feedback_fit:         Optional[FeedbackFitEnum]  = None
    feedback_tpo:         Optional[FeedbackTpoEnum]  = None
    memo:                 Optional[str]              = None

class WearHistoryResponse(BaseModel):
    history_id:           int
    clothes_id:           int
    worn_date:            date
    feedback_temperature: Optional[FeedbackTempEnum]
    feedback_fit:         Optional[FeedbackFitEnum]
    feedback_tpo:         Optional[FeedbackTpoEnum]
    memo:                 Optional[str]
    created_at:           datetime

    model_config = ConfigDict(from_attributes=True)
