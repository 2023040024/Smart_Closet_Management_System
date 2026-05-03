import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from database import get_db
from models import Clothes, User, CategoryEnum, SeasonEnum, StyleEnum, ThicknessEnum, StatusEnum
from schemas import ClothesUpdate, ClothesStatusUpdate, ClothesResponse
from .auth import get_current_user
from schemas import ClothesCreate

router = APIRouter(prefix="/clothes", tags=["옷장"])

IMAGE_DIR = "uploaded_images"
os.makedirs(IMAGE_DIR, exist_ok=True)

# 소재별 관리 팁 (정적 데이터 - B 담당자가 내용 채울 것)
MATERIAL_TIPS = {
    "면":    "30도 이하 세탁, 직사광선 피해 그늘 건조, 접어서 보관",
    "울":    "손세탁 권장, 평평하게 눕혀 건조, 습기 차단 필수",
    "폴리":  "세탁기 가능, 고온 건조 금지, 옷걸이 보관 권장",
    "니트":  "손세탁 후 눕혀서 건조, 옷걸이 사용 시 늘어남 주의",
    "린넨":  "물세탁 가능, 구김 주의, 반건조 후 다림질",
    "실크":  "드라이클리닝 권장, 직사광선 금지, 단독 보관",
    "데님":  "뒤집어서 세탁, 건조기 금지, 옷걸이 보관",
    "가죽":  "물 닿지 않게 주의, 전용 크림 관리, 통풍 좋은 곳 보관",
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
    category:       str               = Form(...),
    color:          str               = Form(...),
    season:         str               = Form(...),
    style:          str               = Form(...),
    material:       Optional[str]     = Form(None),
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
        material       = material.strip() if material else None,
        thickness      = thickness,
        price          = price,
        image_url      = image_url,
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
    db:       Session                = Depends(get_db),
    current_user: User               = Depends(get_current_user)
):

    query = db.query(Clothes).filter(Clothes.user_id == current_user.id)

    if category: query = query.filter(Clothes.category == category)
    if season:   query = query.filter(Clothes.season == season)
    if style:    query = query.filter(Clothes.style == style)
    if status:   query = query.filter(Clothes.status == status)

    return query.order_by(Clothes.created_at.desc()).all()


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
