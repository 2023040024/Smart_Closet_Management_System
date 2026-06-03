import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from datetime import date

class TestHistory:
    def test_착용기록_등록(self, client, auth_headers, sample_clothes):
        clothes_id = sample_clothes[0]["clothes_id"]
        res = client.post("/history", headers=auth_headers,
                        json=[{"clothes_id": clothes_id, "worn_date": str(date.today())}])
        assert res.status_code in (200, 201)

    def test_착용기록_조회(self, client, auth_headers):
        res = client.get("/history", headers=auth_headers)
        assert res.status_code == 200