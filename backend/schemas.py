from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from models import (
    CategoryEnum, SeasonEnum, StyleEnum, ThicknessEnum,
    StatusEnum, FeedbackTempEnum, FeedbackFitEnum, FeedbackTpoEnum
)


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class UserSignup(BaseModel):
    email:    EmailStr
    password: str

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserResponse(BaseModel):
    user_id:         int
    email:           str
    preferred_style: Optional[StyleEnum]
    created_at:      datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse

class StyleUpdate(BaseModel):
    preferred_style: StyleEnum


# ──────────────────────────────────────────────
# Clothes
# ──────────────────────────────────────────────

class ClothesCreate(BaseModel):
    name:           str
    category:       CategoryEnum
    color:          str
    season:         SeasonEnum
    style:          StyleEnum
    material:       Optional[str]  = None
    thickness:      Optional[ThicknessEnum] = None
    purchase_price: Optional[int]  = None  # 없으면 null → cost_per_wear 계산불가

    @field_validator("purchase_price")
    @classmethod
    def price_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("구매가는 0 이상이어야 합니다")
        return v

class ClothesUpdate(BaseModel):
    name:           Optional[str]            = None
    category:       Optional[CategoryEnum]   = None
    color:          Optional[str]            = None
    season:         Optional[SeasonEnum]     = None
    style:          Optional[StyleEnum]      = None
    material:       Optional[str]            = None
    thickness:      Optional[ThicknessEnum]  = None
    purchase_price: Optional[int]            = None
    status:         Optional[StatusEnum]     = None

class ClothesStatusUpdate(BaseModel):
    status: StatusEnum

class ClothesResponse(BaseModel):
    clothes_id:     int
    name:           str
    category:       CategoryEnum
    color:          str
    season:         SeasonEnum
    style:          StyleEnum
    material:       Optional[str]
    thickness:      Optional[ThicknessEnum]
    purchase_price: Optional[int]
    image_url:      Optional[str]
    status:         StatusEnum
    wear_count:     int
    last_worn_date: Optional[date]
    cost_per_wear:  Optional[float]  # 계산된 값 (wear_count=0이면 null)
    created_at:     datetime

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True
