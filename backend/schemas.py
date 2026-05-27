from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, field_validator, model_validator, ConfigDict, Field
from models import (
    CategoryEnum, TopFitEnum, BottomFitEnum, ColorEnum, SeasonEnum,
    ToneEnum, StyleEnum, MoodEnum, MaterialEnum, ThicknessEnum, PointEnum,
    StatusEnum, SituationEnum, FeedbackTempEnum, FeedbackTpoEnum
)

# 1. 클래스 외부에서는 순수 함수로 정의 (데코레이터 제거)
def map_korean_to_enum_logic(v: Any, info: Any) -> Any:
    # 빈 값("")이 들어오면 None으로 반환하여 nullable 허용
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    
    if info.field_name == 'material' and isinstance(v, str):
        for m in MaterialEnum:
            if m.value in v:  # 예: "면"이 "면 100%" 문자열 안에 포함되어 있다면
                return m.value  # "면"(표준값)만 골라내어 반환
        return v  # 일치하는 키워드가 없으면 입력한 문자열 그대로 저장 (에러 방지)
    
    # 이미 Enum 객체라면 그대로 반환
    if not isinstance(v, str):
        return v

    enum_map = {
        'category': CategoryEnum, 'color': ColorEnum, 'season': SeasonEnum,
        'style': StyleEnum, 'top_fit': TopFitEnum, 'bottom_fit': BottomFitEnum,
        'tone': ToneEnum, 'mood': MoodEnum, 'material': MaterialEnum,
        'point': PointEnum, 'thickness': ThicknessEnum, 
        'situation': SituationEnum, 'status': StatusEnum , 'preferred_style': StyleEnum,
        'feedback_temperature': FeedbackTempEnum, 'feedback_tpo': FeedbackTpoEnum
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
    preferred_style: Optional[StyleEnum]
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
    name:           str
    category:       CategoryEnum
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    color:          Optional[ColorEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    material:       Optional[str] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None
    price:          Optional[int] = 0
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
    name:           str
    category:       CategoryEnum
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    color:          Optional[ColorEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    material:       Optional[str] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None
    price:          Optional[int] = 0
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

class ClothesTagsResponse(BaseModel):
    category:       CategoryEnum
    color:          Optional[ColorEnum] = None
    situation:      Optional[SituationEnum] = None
    top_fit:        Optional[TopFitEnum] = None
    bottom_fit:     Optional[BottomFitEnum] = None
    style:          Optional[StyleEnum] = None
    mood:           Optional[MoodEnum] = None
    season:         Optional[SeasonEnum] = None
    tone:           Optional[ToneEnum] = None
    material:       Optional[str] = None
    thickness:      Optional[ThicknessEnum] = None
    point:          Optional[PointEnum] = None

class ClothesResponse(BaseModel):
    id:             int = Field(..., alias="clothes_id")
    name:           str
    price:          Optional[int] = 0
    image:          Optional[str] = Field(None, alias="image_url")
    status:         Optional[StatusEnum] = None
    wear_count:     int
    last_worn_date: Optional[date] = None
    cost_per_wear:  Optional[float] = None  # 계산된 값 (wear_count=0이면 null)
    created_at:     datetime
    tags:           ClothesTagsResponse

    @model_validator(mode='before')
    @classmethod
    def wrap_tags(cls, data: Any) -> Any:
        """
        DB에서 가져온 Flat한 데이터를 프론트엔드용 
        계층형(tags 객체 내부) 구조로 변환하는 헬퍼 로직
        """
        # SQLAlchemy 모델 객체인 경우 dict로 변환하여 처리
        if not isinstance(data, dict):
            obj_data = {c.name: getattr(data, c.name) for c in data.__table__.columns}
        else:
            obj_data = data

        tag_fields = [
            'category', 'color', 'situation', 'top_fit', 'bottom_fit',
            'style', 'mood', 'season', 'tone', 'material', 'thickness', 'point'
        ]
        
        # tags 키가 없는 경우에만 생성하여 데이터 매핑
        if 'tags' not in obj_data:
            obj_data['tags'] = {k: obj_data.get(k) for k in tag_fields}
            
        return obj_data

    @model_validator(mode='after')
    def calculate_cpw(self) -> 'ClothesResponse':
        """
        구매가(price)를 착용 횟수(wear_count)로 나누어 1회 착용당 비용을 산출
        """
        price = self.price or 0
        count = self.wear_count or 0

        if count > 0:
            # 소수점 둘째 자리까지 반올림하여 계산
            self.cost_per_wear = round(price / count, 2)
        else:
            # 한 번도 입지 않았다면 가격 대신 None으로 처리
            self.cost_per_wear = None
            
        return self

    model_config = ConfigDict(from_attributes=True)


# ──────────────────────────────────────────────
# Wear History & Feedback
# ──────────────────────────────────────────────

class WearHistoryCreate(BaseModel):
    clothes_id:           int
    worn_date:            date
    tpo:                  Optional[SituationEnum] = None
    style:                Optional[StyleEnum] = None
    mood:                 Optional[MoodEnum] = None
    feedback_temperature: Optional[FeedbackTempEnum] = None
    feedback_tpo:         Optional[FeedbackTpoEnum]  = None
    memo:                 Optional[str]              = None

    @field_validator('tpo', 'style', 'mood', 
    'feedback_temperature', 'feedback_tpo', mode='before')
    @classmethod
    def validate_enums(cls, v: Any, info: Any) -> Any:
        return map_korean_to_enum_logic(v, info)

    
    model_config = ConfigDict(from_attributes=True)

class WearHistoryResponse(BaseModel):
    history_id:           int
    clothes_id:           int
    worn_date:            date
    tpo:                  Optional[SituationEnum]
    style:                Optional[StyleEnum]
    mood:                 Optional[MoodEnum]
    feedback_temperature: Optional[FeedbackTempEnum]
    feedback_tpo:         Optional[FeedbackTpoEnum]
    memo:                 Optional[str]
    created_at:           datetime
    clothes:              Optional[ClothesResponse] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    history_id:           int
    feedback_temperature: Optional[FeedbackTempEnum] = None
    feedback_tpo:         Optional[FeedbackTpoEnum]  = None
    memo:                 Optional[str]              = None

    @field_validator('feedback_temperature', 'feedback_tpo', mode='before')
    @classmethod
    def validate_enums(cls, v: Any, info: Any) -> Any:
        return map_korean_to_enum_logic(v, info)

class OverloadItem(BaseModel):
    category: str
    color: str
    count: int
    warning_message: str
    items: list[ClothesResponse]

class OverloadResponse(BaseModel):
    total_warnings: int
    items: list[OverloadItem]
    ai_advice: str