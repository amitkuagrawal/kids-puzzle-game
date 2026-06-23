import os
import requests

BASE = os.environ.get("BACKEND_URL", "http://localhost:8000/api")

def _make_pack(name="TestFlags"):
    r = requests.post(f"{BASE}/categories", json={
        "name": name, "icon": "🚩", "color": "#FF0000",
        "ageBand": "5-8", "isFree": False, "freeSampleCount": 2,
        "productId": "pack.testflags", "order": 1,
    })
    r.raise_for_status()

def _cleanup(name="TestFlags"):
    r = requests.get(f"{BASE}/categories")
    r.raise_for_status()
    cats = r.json()
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

def test_packs_item_count():
    _cleanup()
    _make_pack()
    puzzle_id = None
    try:
        # Create a puzzle in the TestFlags category
        pr = requests.post(f"{BASE}/puzzles", json={
            "name": "X",
            "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==",
            "category": "TestFlags",
        })
        pr.raise_for_status()
        puzzle_id = pr.json()["id"]

        r = requests.get(f"{BASE}/packs")
        assert r.status_code == 200
        packs = r.json()
        pack = next(p for p in packs if p["name"] == "TestFlags")
        assert pack["item_count"] == 1, f"expected item_count 1, got {pack['item_count']}"
    finally:
        if puzzle_id:
            requests.delete(f"{BASE}/puzzles/{puzzle_id}")
        _cleanup()

def _make_item(name="Brazil", category="TestFlags"):
    r = requests.post(f"{BASE}/puzzles", json={
        "name": name,
        "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==",
        "category": category,
        "learn": {
            "structured": [{"label": "Capital", "value": "Brasília"}],
            "shortText": "Brazil is the biggest country in South America!",
            "detailText": "Brazil is the largest country in South America...",
            "emoji": "🇧🇷",
        },
    })
    r.raise_for_status()
    return r.json()["id"]

def test_pack_items_include_learn():
    _cleanup(); _make_pack()
    _make_item()
    try:
        r = requests.get(f"{BASE}/packs/TestFlags/items")
        assert r.status_code == 200
        items = r.json()
        brazil = next(i for i in items if i["name"] == "Brazil")
        assert brazil["learn"]["shortText"].startswith("Brazil is the biggest")
        assert brazil["learn"]["structured"][0]["label"] == "Capital"
    finally:
        _cleanup()

def test_single_item_learn_by_id():
    _cleanup(); _make_pack()
    item_id = _make_item()
    try:
        r = requests.get(f"{BASE}/items/{item_id}")
        assert r.status_code == 200
        assert r.json()["learn"]["emoji"] == "🇧🇷"
    finally:
        _cleanup()

if __name__ == "__main__":
    test_packs_endpoint_returns_metadata()
    print("PASS: test_packs_endpoint_returns_metadata")
    test_packs_item_count()
    print("PASS: test_packs_item_count")
    test_pack_items_include_learn()
    print("PASS: test_pack_items_include_learn")
    test_single_item_learn_by_id()
    print("PASS: test_single_item_learn_by_id")
