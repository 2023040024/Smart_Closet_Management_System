import sys, os
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