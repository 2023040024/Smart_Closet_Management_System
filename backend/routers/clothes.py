import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from database import get_db
from models import Clothes, User, CategoryEnum, SeasonEnum, StyleEnum, ThicknessEnum, StatusEnum, SituationEnum, ColorEnum
from schemas import ClothesUpdate, ClothesStatusUpdate, ClothesResponse, ClothesCreate
from .auth import get_current_user

router = APIRouter(prefix="/clothes", tags=["옷장"])

IMAGE_DIR = "uploaded_images"
os.makedirs(IMAGE_DIR, exist_ok=True)

# 소재별 관리 팁 (정적 데이터 - B 담당자가 내용 채울 것)
MATERIAL_TIPS = {
    "니트":  {
        "세탁 및 관리": "30도 이하의 미지근한 물에 중성세제로 단독 손세탁하세요. 비틀어 짜지 말고 수건으로 눌러 물기를 제거해야 합니다.",
        "보관 방법": "옷걸이는 어깨 늘어남의 원인이 됩니다. 반드시 가볍게 접거나 말아서 선반에 보관하세요."
    },
    "데님":  {
        "세탁 및 관리": "세탁 시 지퍼와 단추를 채우고 뒤집어서 찬물에 세탁하세요. 색상 유지를 위해 가급적 세탁 횟수를 줄이는 것이 좋습니다.",
        "보관 방법": "직사광선을 피해 그늘에서 거꾸로 매달아 건조하고, 보관 시에는 말아서 보관하면 접힌 자국을 방지할 수 있습니다."
    },
    "코튼":  {
        "세탁 및 관리": "30도 이하의 미지근한 물에서 일반 세탁이 가능합니다. 흰 옷은 단독 세탁하여 이염을 방지하고 건조기 사용 시 수축에 주의하세요.",
        "보관 방법": "세탁 후 젖은 상태에서 탁탁 털어 주름을 펴서 건조하세요. 옷걸이에 걸거나 접어서 보관 모두 가능합니다."
    },
    "레더":  {
        "세탁 및 관리": "물세탁은 절대 금물입니다. 오염 발생 시 전용 클리너를 사용하고, 전체 세탁은 반드시 가죽 전문 세탁소에 맡기세요.",
        "보관 방법": "통기성이 좋은 부직포 커버를 씌워 옷걸이에 걸어 보관하세요. 습기에 취약하므로 제습제와 함께 두는 것이 좋습니다."
    },
    "나일론": {
        "세탁 및 관리": "미지근한 물에 중성세제를 사용하여 세탁하세요. 열에 약하므로 다림질이나 건조기 사용은 피하는 것이 안전합니다.",
        "보관 방법": "구김이 잘 가지 않으므로 가볍게 접어서 보관하거나 옷걸이에 걸어 보관하세요."
    },
    "패딩":  {
        "세탁 및 관리": "기능성 유지를 위해 드라이클리닝보다 중성세제를 이용한 미온수 손세탁 혹은 울코스 세탁을 권장합니다.",
        "보관 방법": "압축 팩에 장기간 보관하면 충전재의 복원력이 떨어집니다. 여유 있는 공간에 걸어두거나 큼직하게 접어 보관하세요."
    },

    # 아래는 MaterialEnum에 정의되지 않은 값으로, 추후 필요시 추가
    "실크":  "드라이클리닝 권장, 직사광선 금지, 단독 보관",
    "면":    "30도 이하 세탁, 직사광선 피해 그늘 건조, 접어서 보관",
    "울":    "손세탁 권장, 평평하게 눕혀 건조, 습기 차단 필수",
    "폴리":  "세탁기 가능, 고온 건조 금지, 옷걸이 보관 권장",
    "린넨":  "물세탁 가능, 구김 주의, 반건조 후 다림질"
}

def get_material_tip(material_name: Optional[str]):
    if not material_name:
        return "소재 정보가 없습니다. 옷 정보를 수정해서 소재를 입력해주세요."
    
    # 공백 제거 및 정확한 매칭 시도
    cleaned_material = material_name.strip()
    tip = MATERIAL_TIPS.get(cleaned_material)
    
    if not tip:
        # 유사 단어 포함 여부 체크 (예: "면 100%" -> "면" 팁 반환)
        for key, value in MATERIAL_TIPS.items():
            if key in cleaned_material:
                return value
        return f"'{cleaned_material}' 소재에 대한 팁이 아직 없습니다."
    return tip


# ──────────────────────────────────────────────
# 옷 등록
# ──────────────────────────────────────────────

@router.post("", response_model=ClothesResponse, status_code=status.HTTP_201_CREATED)
async def create_clothes(
    # Form 필드로 받기 (이미지 업로드와 함께 사용 시 multipart/form-data)
    name:           str               = Form(...),
    category:       Optional[CategoryEnum] = Form(...),
    color:          Optional[ColorEnum] = Form(...),
    season:         Optional[SeasonEnum] = Form(...),
    style:          Optional[StyleEnum] = Form(...),
    material:       Optional[str]     = Form(None),
    situation:      Optional[SituationEnum] = Form(None),
    thickness:      Optional[ThicknessEnum] = Form(None),
    price:          Optional[int]     = Form(None),
    image:          Optional[UploadFile] = File(None),
    db:             Session           = Depends(get_db),
    current_user:   User = Depends(get_current_user)
):

    # 이미지 저장
    image_url = None
    if image and image.filename:
        ext = image.filename.rsplit(".", 1)[-1].lower()
        if ext not in ("jpg", "jpeg", "png", "webp"):
            raise HTTPException(status_code=400, detail="jpg, png, webp만 가능합니다")
        filename  = f"{uuid.uuid4()}.{ext}"
        save_path = os.path.join(IMAGE_DIR, filename)
        content   = await image.read()
        with open(save_path, "wb") as f:
            f.write(content)
        await image.close() # 리소스 해제
        image_url = f"/images/{filename}"

    clothes = Clothes(
        user_id        = current_user.id,
        name           = name,
        category       = category,
        color          = color,
        season         = season,
        style          = style,
        situation      = situation,
        material       = material.strip() if material else None,
        thickness      = thickness,
        price          = price,
        image_url      = image_url,
        status         = StatusEnum.wearable
    )
    db.add(clothes)
    db.commit()
    db.refresh(clothes)
    return clothes


# ──────────────────────────────────────────────
# 옷 목록 조회 (필터 가능)
# ──────────────────────────────────────────────

@router.get("", response_model=list[ClothesResponse])
def get_clothes(
    category: Optional[CategoryEnum] = None,
    season:   Optional[SeasonEnum]   = None,
    style:    Optional[StyleEnum]    = None,
    status:   Optional[StatusEnum]   = None,
    situation: Optional[SituationEnum] = None,
    db:       Session                = Depends(get_db),
    current_user: User               = Depends(get_current_user)
):

    query = db.query(Clothes).filter(Clothes.user_id == current_user.id)

    if category: query = query.filter(Clothes.category == category)
    if season:   query = query.filter(Clothes.season == season)
    if style:    query = query.filter(Clothes.style == style)
    if status:   query = query.filter(Clothes.status == status)
    if situation:query = query.filter(Clothes.situation == situation)

    all_clothes = query.order_by(Clothes.created_at.desc()).all()

    # 불량 DB 데이터(Enum 불일치 등) 1건이 전체 목록 응답을 막지 않도록 예외 처리
    result = []
    for c in all_clothes:
        try:
            result.append(ClothesResponse.model_validate(c))
        except Exception:
            continue

    return result


# ──────────────────────────────────────────────
# 옷 상세 조회
# ──────────────────────────────────────────────

@router.get("/{clothes_id}", response_model=ClothesResponse)
def get_clothes_detail(clothes_id: int, db: Session = Depends(get_db)
                       , current_user: User = Depends(get_current_user)):
    clothes = _get_clothes_or_404(db, clothes_id, current_user.id)
    return clothes


# ──────────────────────────────────────────────
# 옷 수정
# ──────────────────────────────────────────────

@router.put("/{clothes_id}", response_model=ClothesResponse)
def update_clothes(clothes_id: int, body: ClothesUpdate, db: Session = Depends(get_db)
                   , current_user: User = Depends(get_current_user)):
    clothes = _get_clothes_or_404(db, clothes_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(clothes, field, value)

    db.commit()
    db.refresh(clothes)
    return clothes


# ──────────────────────────────────────────────
# 세탁 상태만 변경 (PATCH)
# ──────────────────────────────────────────────

@router.patch("/{clothes_id}/status", response_model=ClothesResponse)
def update_status(clothes_id: int, body: ClothesStatusUpdate, db: Session = Depends(get_db)
                  , current_user: User = Depends(get_current_user)):
    clothes = _get_clothes_or_404(db, clothes_id, current_user.id)
    clothes.status = body.status
    db.commit()
    db.refresh(clothes)
    return clothes


# ──────────────────────────────────────────────
# 옷 삭제
# ──────────────────────────────────────────────

@router.delete("/{clothes_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clothes(clothes_id: int, db: Session = Depends(get_db)
                   , current_user: User = Depends(get_current_user)):
    clothes = _get_clothes_or_404(db, clothes_id, current_user.id)
    db.delete(clothes)
    db.commit()


# ──────────────────────────────────────────────
# 소재별 관리 팁
# ──────────────────────────────────────────────

@router.get("/{clothes_id}/tips")
def get_care_tips(clothes_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    clothes = _get_clothes_or_404(db, clothes_id, current_user.id)

    if not clothes.material:
        return {"tip": "소재 정보가 없습니다. 옷 정보를 수정해서 소재를 입력해주세요."}

    tip = get_material_tip(clothes.material)

    return {
        "clothes_name": clothes.name,
        "material":     clothes.material or "미입력",
        "tip":          tip
    }


# ──────────────────────────────────────────────
# 내부 유틸
# ──────────────────────────────────────────────

def _get_clothes_or_404(db: Session, clothes_id: int, user_id: int) -> Clothes:
    clothes = db.query(Clothes).filter(
        Clothes.clothes_id == clothes_id,
        Clothes.user_id    == user_id
    ).first()
    if not clothes:
        raise HTTPException(status_code=404, detail="옷을 찾을 수 없습니다")
    return clothes