import pytest
from datetime import date
from pydantic import ValidationError
from datetime import datetime
from unittest.mock import MagicMock

from schemas import (
    ClothesCreate, ClothesUpdate, ClothesResponse, FeedbackCreate, map_korean_to_enum_logic
)
from schemas import WearHistoryCreate
from models import CategoryEnum, MaterialEnum, FeedbackTempEnum, FeedbackTpoEnum, StyleEnum

class DummyInfo:
    def __init__(self, field_name):
        self.field_name = field_name

class TestSchemas:
    def test_map_korean_to_enum_logic_branches(self):
        empty_style_clothes = ClothesCreate(
            name="빈 스타일 옷", category="상의", style="   "
        )
        assert empty_style_clothes.style is None

        material_clothes = ClothesCreate(
            name="면 티셔츠", category="상의", material="면 100%"
        )
        assert material_clothes.material is not None 

        enum_clothes = ClothesCreate(
            name="기본 티셔츠", category=CategoryEnum("상의")
        )
        assert isinstance(enum_clothes.category, CategoryEnum)

        with pytest.raises(ValidationError):
            ClothesCreate(name="오류 티셔츠", category="알수없는카테고리")
    
    def test_map_korean_to_enum_logic_material_match(self):
        mock_info = MagicMock()
        mock_info.field_name = 'material'

        result = map_korean_to_enum_logic("니트 100%", mock_info)
        
        assert result == "니트"

    def test_material_no_match(self):
        info = DummyInfo(field_name="material")
        
        result = map_korean_to_enum_logic("우주소재", info)
        assert result == "우주소재"

    def test_not_string_value(self):
        info = DummyInfo(field_name="style")
        
        result_enum = map_korean_to_enum_logic(StyleEnum.casual, info)
        assert result_enum == StyleEnum.casual
        
        result_int = map_korean_to_enum_logic(123, info)
        assert result_int == 123

    def test_clothes_update_validator(self):
        update_data = ClothesUpdate(
            name="수정된 바지", category="하의", color="블랙"
        )
        assert update_data.name == "수정된 바지"

    def test_clothes_response_wrap_tags_sqlalchemy_obj(self):
        mock_db_obj = MagicMock()
        
        mock_table = MagicMock()
        col_names = ['clothes_id', 'name', 'price', 'wear_count', 'created_at', 'category']
        mock_columns = []
        for name in col_names:
            col = MagicMock()
            col.name = name
            mock_columns.append(col)
    
        mock_table.columns = mock_columns
    
        mock_db_obj.__table__ = mock_table
    
        mock_db_obj.clothes_id = 1
        mock_db_obj.name = "Mock 티셔츠"
        mock_db_obj.price = 30000
        mock_db_obj.wear_count = 5
        mock_db_obj.created_at = datetime.now()
        mock_db_obj.category = "상의"

        response = ClothesResponse.model_validate(mock_db_obj)
        assert response.id == 1

    def test_clothes_response_cpw_zero_wear(self):
        response = ClothesResponse(
            clothes_id=2,
            name="한번도 안입은 옷",
            price=50000,
            wear_count=0,
            created_at=datetime.now(),
            tags={"category": "아우터"}
        )
        assert response.cost_per_wear is None

    def test_feedback_create_validator(self):
        test_data = {
        "clothes_id": 1,
        "worn_date": date(2026, 5, 20),
        "style": "캐주얼",
        "feedback_temperature": "적당함"
    }

        obj = WearHistoryCreate(**test_data)

        assert obj.clothes_id == 1
        assert obj.worn_date == date(2026, 5, 20)

    def test_feedback_create_with_none(self):
        data = {
            "history_id": 2,
            "feedback_temperature": "",
            "feedback_tpo": None
        }
        
        feedback = FeedbackCreate(**data)
        
        assert feedback.feedback_temperature is None
        assert feedback.feedback_tpo is None