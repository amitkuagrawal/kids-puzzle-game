import os
import requests

BASE = os.environ.get("BACKEND_URL", "http://localhost:8000/api")

def _make_pack(name="TestFlags"):
    requests.post(f"{BASE}/categories", json={
        "name": name, "icon": "🚩", "color": "#FF0000",
        "ageBand": "5-8", "isFree": False, "freeSampleCount": 2,
        "productId": "pack.testflags", "order": 1,
    })

def _cleanup(name="TestFlags"):
    cats = requests.get(f"{BASE}/categories").json()
    for c in cats:
        if c["name"] == name:
            requests.delete(f"{BASE}/categories/{c['id']}")

def test_packs_endpoint_returns_metadata():
    _cleanup()
    _make_pack()
    try:
        r = requests.get(f"{BASE}/packs")
        assert r.status_code == 200
        packs = r.json()
        pack = next(p for p in packs if p["name"] == "TestFlags")
        assert pack["ageBand"] == "5-8"
        assert pack["isFree"] is False
        assert pack["freeSampleCount"] == 2
        assert pack["productId"] == "pack.testflags"
    finally:
        _cleanup()

if __name__ == "__main__":
    test_packs_endpoint_returns_metadata()
    print("PASS: test_packs_endpoint_returns_metadata")
