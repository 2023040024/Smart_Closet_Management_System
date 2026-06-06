import sys, os, io, pytest
from models import Clothes
from unittest.mock import patch, mock_open
from routers.clothes import get_material_tip, MATERIAL_TIPS
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class TestClothes:
    def test_옷_등록(self, client, auth_headers):
        res = client.post("/clothes", headers=auth_headers,
        data={"name": "티셔츠", "category": "상의", "color": "블랙", "season": "사계절", "style": "캐주얼"})
        assert res.status_code in (200, 201)

    def test_옷_목록_조회(self, client, auth_headers, sample_clothes):
        res = client.get("/clothes", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_인증없이_거부(self, client):
        res = client.get("/clothes")
        assert res.status_code in (401, 403)

    def test_옷_조회_404_에러(self, client, auth_headers):
        res = client.get("/clothes/99999", headers=auth_headers)
        assert res.status_code == 404
        assert res.json()["detail"] == "옷을 찾을 수 없습니다"

    def test_옷_등록_잘못된_이미지_확장자(self, client, auth_headers):
        data = {
            "name": "바지", 
            "category": "하의", 
            "color": "블랙", 
            "season": "사계절", 
            "style": "캐주얼", 
            "situation": "데일리"
        }
        
        fake_file = io.BytesIO(b"fake pdf content")
        fake_file.name = "test.pdf"
        
        res = client.post(
            "/clothes",
            headers=auth_headers,
            data=data,
            files={"image": ("test.pdf", fake_file, "application/pdf")}
        )
        
        assert res.status_code == 400
        assert res.json()["detail"] == "jpg, png, webp만 가능합니다"

    @patch("builtins.open", new_callable=mock_open)
    def test_옷_등록_이미지_업로드_성공(self, mock_file, client, auth_headers):
        data = {"name": "이미지옷", "category": "상의", "color": "화이트", "season": "여름", "style": "캐주얼", "situation": "데일리"} 
        files = {"image": ("test.png", b"fake image content", "image/png")}
    
        res = client.post("/clothes", headers=auth_headers, data=data, files=files)
        assert res.status_code in (200, 201)

    def test_옷_상세_조회_성공(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        res = client.get(f"/clothes/{clothes['clothes_id']}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["name"] == clothes['name']

    def test_옷_수정_성공(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        res = client.put(
            f"/clothes/{clothes['clothes_id']}",
            headers=auth_headers,
            json={"name": "수정된 티셔츠", "category": "상의"} 
        )
        assert res.status_code == 200
        assert res.json()["name"] == "수정된 티셔츠"

    def test_옷_상태_변경_성공(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        res = client.patch(
            f"/clothes/{clothes['clothes_id']}/status",
            headers=auth_headers,
            json={"status": "세탁필요"}
        )

        assert res.status_code == 200
        assert res.json()["status"] == "세탁필요"

    def test_옷_삭제_성공(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        res = client.delete(f"/clothes/{clothes['clothes_id']}", headers=auth_headers)
        assert res.status_code == 204
        res_check = client.get(f"/clothes/{clothes['clothes_id']}", headers=auth_headers)
        assert res_check.status_code == 404

    def test_소재_팁_조회_소재없음(self):
        assert get_material_tip(None) == "소재 정보가 없습니다. 옷 정보를 수정해서 소재를 입력해주세요."
        assert get_material_tip("") == "소재 정보가 없습니다. 옷 정보를 수정해서 소재를 입력해주세요."

    def test_소재_팁_조회_유사단어(self):
        expected_tip = MATERIAL_TIPS["면"]
        assert get_material_tip("면 100%") == expected_tip

    def test_소재_팁_조회_알수없는소재(self):
        result = get_material_tip("우주소재")
        assert "'우주소재' 소재에 대한 팁이 아직 없습니다." in result

    def test_소재_팁_조회_정확한매칭(self):
        expected_tip = MATERIAL_TIPS["면"]
        assert get_material_tip("면") == expected_tip

    def test_소재_정보_미입력시_응답(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        res = client.get(f"/clothes/{clothes['clothes_id']}/tips", headers=auth_headers)
        assert res.status_code == 200

    def test_소재_팁_API_정상_반환(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        
        target_id = clothes.get("clothes_id", clothes.get("clothes_id"))
        
        client.put(
            f"/clothes/{target_id}",
            headers=auth_headers,
            json={
                "name": clothes["name"],
                "category": clothes["tags"]["category"],
                "season": clothes["tags"]["season"],
                "style": clothes["tags"]["style"],
                "material": "면"
            }
        )
        
        res = client.get(f"/clothes/{target_id}/tips", headers=auth_headers)

        assert res.status_code == 200
        json_data = res.json()
        assert json_data["material"] == "면"
        assert "clothes_name" in json_data
        assert "tip" in json_data

    # 불량 데이터 예외 처리
    @patch("routers.clothes.ClothesResponse.model_validate")
    def test_옷_목록_조회_불량데이터_무시(self, mock_validate, client, auth_headers, sample_clothes):
        mock_validate.side_effect = Exception("고의로 발생시킨 DB 검증 에러")
        
        res = client.get("/clothes", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

class TestCostPerWear:
    # 가성비 계산(cost_per_wear) 처리
    def test_cost_per_wear_price_is_none(self):
        # price가 None인 경우
        clothes = Clothes(price=None, wear_count=5)
        assert clothes.cost_per_wear is None

    def test_cost_per_wear_count_is_zero(self):
        # wear_count가 0인 경우
        clothes = Clothes(price=50000, wear_count=0)
        assert clothes.cost_per_wear is None

    def test_cost_per_wear_normal_calculation(self):
        # 정상적으로 계산되는 경우
        clothes = Clothes(price=50000, wear_count=3)
        assert clothes.cost_per_wear == 16667.0