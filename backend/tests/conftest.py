from unittest.mock import MagicMock
from datetime import date
from models import StatusEnum, CategoryEnum, ThicknessEnum, MaterialEnum

def make_clothes(**kwargs):
    c = MagicMock()
    c.status         = kwargs.get("status",         StatusEnum.wearable)
    c.category       = kwargs.get("category",       CategoryEnum.top)
    c.thickness      = kwargs.get("thickness",      ThicknessEnum.medium)
    c.material       = kwargs.get("material",       None)
    c.last_worn_date = kwargs.get("last_worn_date", None)
    c.clothes_id     = kwargs.get("clothes_id",     1)
    c.name           = kwargs.get("name",           "테스트옷")
    c.color          = kwargs.get("color",          "블랙")
    c.season         = kwargs.get("season",         "사계절")
    c.style          = kwargs.get("style",          "캐주얼")
    c.tone           = None
    c.mood           = None
    c.point          = None
    c.wear_count     = kwargs.get("wear_count",     0)
    return c

def make_user(**kwargs):
    u = MagicMock()
    u.temp_sensitivity = kwargs.get("temp_sensitivity", 0.0)
    preferred_style    = kwargs.get("preferred_style",  None)
    if preferred_style:
        mock_style        = MagicMock()
        mock_style.value  = preferred_style
        u.preferred_style = mock_style
    else:
        u.preferred_style = None
    return u
