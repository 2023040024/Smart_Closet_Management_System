import os
import json
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

router = APIRouter(prefix="/vision", tags=["사진 자동 태그"])


# ──────────────────────────────────────────────
# 응답 스키마
# ──────────────────────────────────────────────

class ClothesTagResult(BaseModel):
    category:  str           # top, bottom, outer, shoes, acc
    color:     str           # black, white, gray 등
    season:    str           # spring, summer, autumn, winter, all
    style:     str           # casual, formal, minimal, street
    thickness: Optional[str] # thin, medium, thick
    material:  Optional[str] # cotton, poly, wool 등
    confidence: str          # high, medium, low


# ──────────────────────────────────────────────
# 사진 → Gemini 태그 분석
# ──────────────────────────────────────────────

@router.post("/analyze", response_model=ClothesTagResult)
async def analyze_clothes_image(image: UploadFile = File(...)):
    """
    옷 사진을 업로드하면 Gemini AI가 자동으로 태그 분석
    POST /vision/analyze
    """

    # 이미지 형식 확인
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="jpg, png, webp 형식만 가능합니다"
        )

    # 이미지 읽기
    image_data = await image.read()

    # Gemini에 전달할 프롬프트
    prompt = """
이 옷 사진을 분석해서 아래 정보를 JSON 형식으로만 답해줘.
다른 텍스트 없이 JSON만 출력해.

분석 기준:
- category: 옷 종류 (top=상의, bottom=하의, outer=아우터/자켓/코트, shoes=신발, acc=악세서리)
- color: 주요 색상 영어로 (black, white, gray, beige, brown, blue, green, red, orange, yellow, purple, pink, mint, khaki, pattern, etc 중 하나)
- season: 계절 (spring, summer, autumn, winter, all 중 하나)
- style: 스타일 (casual, formal, minimal, street 중 하나)
- thickness: 두께감 (thin=얇음, medium=보통, thick=두꺼움 중 하나, 모르면 null)
- material: 소재 (cotton, poly, wool, knit, linen, silk, denim, leather, etc 중 하나, 모르면 null)
- confidence: 분석 신뢰도 (high, medium, low 중 하나)

응답 형식:
{
  "category": "top",
  "color": "white",
  "season": "spring",
  "style": "casual",
  "thickness": "thin",
  "material": "cotton",
  "confidence": "high"
}
"""

    # Gemini API 호출
    try:
        response = model.generate_content([
            prompt,
            {
                "mime_type": image.content_type,
                "data": base64.b64encode(image_data).decode("utf-8")
            }
        ])

        text = response.text.strip()

        # ```json ... ``` 형식 제거
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        result = json.loads(text)
        return ClothesTagResult(**result)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini 응답 파싱 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API 오류: {str(e)}")
