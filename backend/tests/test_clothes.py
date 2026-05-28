import sys, os, io
from unittest.mock import patch
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
        fake_file = io.BytesIO(b"fake image data")
        fake_file.name = "test.pdf"
        
        res = client.post(
            "/clothes",
            headers=auth_headers,
            data={"name": "바지", "category": "하의", "color": "블랙"},
            files={"image": ("test.pdf", fake_file, "application/pdf")}
        )
        assert res.status_code in (400, 422)

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
            data={"name": "수정된 티셔츠", "category": "상의"} 
        )
        assert res.status_code in (200, 422)

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

    def test_소재_팁_조회_소재없음(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        client.put(f"/clothes/{clothes['clothes_id']}", headers=auth_headers, data={"material": ""})

        res = client.get(f"/clothes/{clothes['clothes_id']}/tips", headers=auth_headers)
        assert res.status_code == 200
        assert "소재 정보가 없습니다" in res.json()["tip"]

    def test_소재_팁_조회_유사단어(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        client.put(f"/clothes/{clothes['clothes_id']}", headers=auth_headers, data={"material": "면 100%"})
        
        res = client.get(f"/clothes/{clothes['clothes_id']}/tips", headers=auth_headers)
        assert res.status_code == 200
        assert "소재에 대한 팁이 아직 없습니다" not in res.json()["tip"]

    def test_소재_팁_조회_알수없는소재(self, client, auth_headers, sample_clothes):
        clothes = sample_clothes[0]
        cid = clothes.get('clothes_id') or clothes.get('id')
        client.put(f"/clothes/{clothes['clothes_id']}", headers=auth_headers, data={"material": "우주소재"})
        
        res = client.get(f"/clothes/{clothes['clothes_id']}/tips", headers=auth_headers)
        assert res.status_code == 200
        assert "소재 정보가 없습니다. 옷 정보를 수정해서 소재를 입력해주세요." in res.json()["tip"]

    # 불량 데이터 예외 처리
    @patch("routers.clothes.ClothesResponse.model_validate")
    def test_옷_목록_조회_불량데이터_무시(self, mock_validate, client, auth_headers, sample_clothes):
        mock_validate.side_effect = Exception("고의로 발생시킨 DB 검증 에러")
        
        res = client.get("/clothes", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []