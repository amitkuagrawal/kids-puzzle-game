# Learning Loop (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After solving a puzzle, the child lands on a "Learn about X" screen with kid-friendly facts (two reading levels), served from the backend.

**Architecture:** Additive extension of the existing FastAPI + MongoDB backend (packs = `categories`, items = `puzzles`) and the Expo/expo-router frontend. Items gain a `learn` payload; packs gain age-band + pricing metadata. A new `learn.tsx` screen fetches an item's `learn` data by id and renders it. No rebuild — every change is additive and backward-compatible with the existing gallery/game flow.

**Tech Stack:** FastAPI, Motor (async MongoDB), Pydantic, pytest + requests (backend integration tests), Expo / React Native / expo-router, TypeScript, existing design system (`constants/theme.ts`, Pip component).

**Testing approach:**
- **Backend:** integration tests in `backend_test_learn.py` using `requests` against a locally-running server (matches existing `backend_test.py` convention). Each test seeds and cleans its own data.
- **Frontend:** no unit harness exists; verification is `npx tsc --noEmit` (zero errors) + running the app on web and walking the solve→learn flow visually. This is the method used throughout this project.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `backend/server.py` | Add `learn` to item models; add pack metadata; add `/api/packs`, `/api/packs/{name}/items`, `/api/items/{id}` endpoints | Modify |
| `backend/content/flags.json` | Flagship pack content (structured facts + 2 reading levels) | Create |
| `backend/content/animals.json` | Free-tier pack content | Create |
| `backend/load_content.py` | One-shot loader: upserts packs + items from the JSON files into Mongo | Create |
| `backend_test_learn.py` | Integration tests for the new endpoints | Create |
| `frontend/app/child/learn.tsx` | The learning screen (fetch by item id, render facts, reading-level toggle) | Create |
| `frontend/app/child/puzzle-game.tsx` | Detect learn availability; add "Learn about X" button on win screen | Modify |
| `frontend/app/_layout.tsx` | Register the `child/learn` route | Modify |

---

## Task 1: Backend — extend models with `learn` payload and pack metadata

**Files:**
- Modify: `backend/server.py:31-62` (model definitions)

- [ ] **Step 1: Add the learning + pack models**

In `backend/server.py`, immediately after the `PuzzleImageResponse` class (around line 48), add:

```python
class StructuredFact(BaseModel):
    label: str          # e.g. "Capital"
    value: str          # e.g. "Brasília"

class LearnPayload(BaseModel):
    structured: List[StructuredFact] = []
    shortText: str = ""        # ~2 kid-friendly sentences
    detailText: str = ""       # ~1 paragraph "read more"
    emoji: Optional[str] = None

class ItemLearnResponse(BaseModel):
    id: str
    name: str
    image_base64: str
    category: Optional[str] = None
    learn: Optional[LearnPayload] = None

class PackResponse(BaseModel):
    name: str
    icon: str = "📁"
    color: str = "#667eea"
    ageBand: str = "all-ages"          # "3-5" | "5-8" | "8-12" | "all-ages"
    isFree: bool = False
    freeSampleCount: int = 0
    productId: Optional[str] = None
    order: int = 0
    item_count: int = 0
```

- [ ] **Step 2: Extend the create/category models to accept the new fields**

Replace the existing `CategoryCreate` class (lines 51-54) with:

```python
class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "📁"
    color: Optional[str] = "#667eea"
    ageBand: Optional[str] = "all-ages"
    isFree: Optional[bool] = False
    freeSampleCount: Optional[int] = 0
    productId: Optional[str] = None
    order: Optional[int] = 0
```

Replace the existing `PuzzleImageCreate` class (lines 37-40) with:

```python
class PuzzleImageCreate(BaseModel):
    name: str
    image_base64: str
    category: Optional[str] = None
    learn: Optional[LearnPayload] = None
```

- [ ] **Step 3: Verify the server still imports cleanly**

Run: `cd backend && python -c "import server"`
Expected: no output, exit code 0 (no syntax/import errors).

- [ ] **Step 4: Commit**

```bash
git add backend/server.py
git commit -m "feat(backend): add learn payload and pack metadata models"
```

---

## Task 2: Backend — `GET /api/packs` endpoint

**Files:**
- Modify: `backend/server.py` (add route near the other `/puzzles` routes, after `get_preloaded_puzzles`)
- Test: `backend_test_learn.py`

- [ ] **Step 1: Write the failing test**

Create `backend_test_learn.py`:

```python
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
```

- [ ] **Step 2: Run the test to verify it fails**

Start the server in one shell: `cd backend && uvicorn server:app --port 8000`
Then run: `python backend_test_learn.py`
Expected: FAIL — `/api/packs` returns 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the endpoint**

In `backend/server.py`, after the `get_preloaded_puzzles` function, add:

```python
@api_router.get("/packs", response_model=List[PackResponse])
async def get_packs():
    """List packs (categories) with learning/pricing metadata and item counts."""
    try:
        categories = await db.categories.find().sort('order', 1).to_list(100)
        result = []
        for cat in categories:
            count = await db.puzzles.count_documents({'category': cat['name']})
            result.append(PackResponse(
                name=cat['name'],
                icon=cat.get('icon', '📁'),
                color=cat.get('color', '#667eea'),
                ageBand=cat.get('ageBand', 'all-ages'),
                isFree=cat.get('isFree', False),
                freeSampleCount=cat.get('freeSampleCount', 0),
                productId=cat.get('productId'),
                order=cat.get('order', 0),
                item_count=count,
            ))
        return result
    except Exception as e:
        logging.error(f"Error fetching packs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

Also update `create_category` so it persists the new fields. Find the `category_dict = category.dict()` line inside `create_category` — it already serializes all fields from `CategoryCreate`, so no change is needed there. Confirm by re-reading the function.

- [ ] **Step 4: Run the test to verify it passes**

Run: `python backend_test_learn.py`
Expected: `PASS: test_packs_endpoint_returns_metadata`

- [ ] **Step 5: Commit**

```bash
git add backend/server.py backend_test_learn.py
git commit -m "feat(backend): add GET /api/packs with pack metadata"
```

---

## Task 3: Backend — items-with-learn endpoints

**Files:**
- Modify: `backend/server.py` (add two routes)
- Test: `backend_test_learn.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend_test_learn.py` (above the `__main__` block):

```python
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
```

And update the `__main__` block to:

```python
if __name__ == "__main__":
    test_packs_endpoint_returns_metadata(); print("PASS: packs metadata")
    test_pack_items_include_learn();        print("PASS: pack items include learn")
    test_single_item_learn_by_id();         print("PASS: single item learn by id")
```

- [ ] **Step 2: Run to verify failure**

Run: `python backend_test_learn.py`
Expected: FAIL on `test_pack_items_include_learn` — `/api/packs/TestFlags/items` returns 404.

- [ ] **Step 3: Implement both endpoints**

In `backend/server.py`, after the `get_packs` function, add:

```python
def _item_learn_response(doc) -> ItemLearnResponse:
    learn = doc.get('learn')
    return ItemLearnResponse(
        id=str(doc['_id']),
        name=doc['name'],
        image_base64=doc['image_base64'],
        category=doc.get('category'),
        learn=LearnPayload(**learn) if learn else None,
    )

@api_router.get("/packs/{pack_name}/items", response_model=List[ItemLearnResponse])
async def get_pack_items(pack_name: str):
    """Items in a pack, including the learn payload. (Phase 2 adds entitlement gating.)"""
    try:
        docs = await db.puzzles.find({'category': pack_name}).sort('created_at', 1).to_list(500)
        return [_item_learn_response(d) for d in docs]
    except Exception as e:
        logging.error(f"Error fetching pack items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/items/{item_id}", response_model=ItemLearnResponse)
async def get_item(item_id: str):
    """Single item with its learn payload, by Mongo id."""
    try:
        doc = await db.puzzles.find_one({'_id': ObjectId(item_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Item not found")
        return _item_learn_response(doc)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching item: {e}")
        raise HTTPException(status_code=400, detail=str(e))
```

Then update the bulk/create insert paths to persist `learn`. In `create_puzzle`, find where `puzzle_dict` is built and ensure it includes `learn`: since `puzzle.dict()` is used, `learn` is already included. Confirm `create_puzzle` uses `puzzle.dict()` (it does) — no change needed. The `learn` field will round-trip automatically.

- [ ] **Step 4: Run to verify pass**

Run: `python backend_test_learn.py`
Expected: three `PASS:` lines.

- [ ] **Step 5: Commit**

```bash
git add backend/server.py backend_test_learn.py
git commit -m "feat(backend): serve items with learn payload (pack + single-item endpoints)"
```

---

## Task 4: Content — author + load the flags and animals packs

**Files:**
- Create: `backend/content/flags.json`, `backend/content/animals.json`
- Create: `backend/load_content.py`

> **Authoring note:** The full ~30–40 flag records and ~10 animal records are generated via the content pipeline (REST Countries + CIA World Factbook for structured fields → AI-drafted kid prose → human-verified). This task wires the *loader and schema*; populating all records is content work done alongside. The JSON files below show the exact required shape with two seed records each so the loader is testable immediately.

- [ ] **Step 1: Create `backend/content/flags.json` with the exact schema (seed records)**

```json
{
  "pack": {
    "name": "Flags", "icon": "🚩", "color": "#4C7DF0",
    "ageBand": "5-8", "isFree": false, "freeSampleCount": 10,
    "productId": "pack.flags", "order": 2
  },
  "items": [
    {
      "name": "Brazil",
      "image_base64": "REPLACE_WITH_PD_FLAG_BASE64",
      "learn": {
        "structured": [
          {"label": "Capital", "value": "Brasília"},
          {"label": "Population", "value": "212 million"},
          {"label": "Continent", "value": "South America"},
          {"label": "Cool fact", "value": "Home to most of the Amazon rainforest 🌳"}
        ],
        "shortText": "Brazil is the biggest country in South America! It's famous for soccer, colorful carnivals, and the giant Amazon rainforest.",
        "detailText": "Brazil is the largest country in South America and the fifth-largest in the whole world. About 212 million people live there, and its capital city is Brasília. Brazil has most of the Amazon rainforest, home to millions of animals and plants you won't find anywhere else!",
        "emoji": "🇧🇷"
      }
    },
    {
      "name": "Japan",
      "image_base64": "REPLACE_WITH_PD_FLAG_BASE64",
      "learn": {
        "structured": [
          {"label": "Capital", "value": "Tokyo"},
          {"label": "Population", "value": "125 million"},
          {"label": "Continent", "value": "Asia"},
          {"label": "Cool fact", "value": "Made of almost 7,000 islands! 🏝️"}
        ],
        "shortText": "Japan is a country made of thousands of islands in Asia. It's famous for cherry blossoms, fast trains, and yummy sushi!",
        "detailText": "Japan is an island country in Asia made of almost 7,000 islands. Its capital is Tokyo, one of the biggest cities in the world. Japan is known for beautiful pink cherry blossom trees, super-fast bullet trains, and inventing lots of video games!",
        "emoji": "🇯🇵"
      }
    }
  ]
}
```

- [ ] **Step 2: Create `backend/content/animals.json` (free pack, seed records)**

```json
{
  "pack": {
    "name": "Animals", "icon": "🦁", "color": "#4CAF50",
    "ageBand": "3-5", "isFree": true, "freeSampleCount": 0,
    "productId": null, "order": 1
  },
  "items": [
    {
      "name": "Lion",
      "image_base64": "REPLACE_WITH_IMAGE_BASE64",
      "learn": {
        "structured": [
          {"label": "Lives in", "value": "Africa"},
          {"label": "Eats", "value": "Meat"},
          {"label": "Sound", "value": "Roar!"},
          {"label": "Cool fact", "value": "A lion's roar can be heard 8 km away! 🔊"}
        ],
        "shortText": "The lion is called the King of the Jungle! Lions live together in families called prides and love to nap in the sun.",
        "detailText": "Lions are big, strong cats that live in Africa. They live in family groups called prides. Daddy lions have fluffy manes around their heads. Lions sleep up to 20 hours a day and their mighty roar can be heard from very far away!",
        "emoji": "🦁"
      }
    },
    {
      "name": "Elephant",
      "image_base64": "REPLACE_WITH_IMAGE_BASE64",
      "learn": {
        "structured": [
          {"label": "Lives in", "value": "Africa & Asia"},
          {"label": "Eats", "value": "Plants"},
          {"label": "Sound", "value": "Trumpet!"},
          {"label": "Cool fact", "value": "The biggest animal on land! 🐘"}
        ],
        "shortText": "Elephants are the biggest animals that live on land. They use their long trunks like a hand to grab food and squirt water!",
        "detailText": "Elephants are the largest land animals on Earth. They have a long nose called a trunk that they use to pick up food, drink water, and even give themselves a bath. Elephants are very smart and never forget their friends!",
        "emoji": "🐘"
      }
    }
  ]
}
```

- [ ] **Step 3: Create the loader `backend/load_content.py`**

```python
"""One-shot loader: upserts packs (categories) and items (puzzles) from content/*.json.
Usage: cd backend && python load_content.py
Idempotent: re-running updates existing packs and re-inserts items by (name, category).
"""
import asyncio, json, os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
CONTENT = ROOT / "content"

async def load_file(path: Path):
    data = json.loads(path.read_text())
    pack = data["pack"]
    await db.categories.update_one(
        {"name": pack["name"]},
        {"$set": {**pack, "created_at": datetime.utcnow()}},
        upsert=True,
    )
    for item in data["items"]:
        await db.puzzles.update_one(
            {"name": item["name"], "category": pack["name"]},
            {"$set": {
                "name": item["name"],
                "image_base64": item["image_base64"],
                "category": pack["name"],
                "learn": item.get("learn"),
                "is_preloaded": True,
                "created_at": datetime.utcnow(),
            }},
            upsert=True,
        )
    print(f"Loaded {pack['name']}: {len(data['items'])} items")

async def main():
    for f in sorted(CONTENT.glob("*.json")):
        await load_file(f)

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 4: Run the loader and verify via the API**

Run: `cd backend && python load_content.py`
Expected: `Loaded Animals: 2 items` and `Loaded Flags: 2 items`.
Then with the server running: `curl -s http://localhost:8000/api/packs | python -m json.tool`
Expected: JSON listing Animals (isFree true) and Flags (freeSampleCount 10) with `item_count` 2 each.

- [ ] **Step 5: Commit**

```bash
git add backend/content backend/load_content.py
git commit -m "feat(content): flags + animals pack schema and idempotent loader"
```

---

## Task 5: Frontend — the Learn screen

**Files:**
- Create: `frontend/app/child/learn.tsx`
- Modify: `frontend/app/_layout.tsx` (register route)

- [ ] **Step 1: Register the route**

In `frontend/app/_layout.tsx`, add inside the `<Stack>` (after the `child/puzzle-game` screen line):

```tsx
      <Stack.Screen name="child/learn" />
```

- [ ] **Step 2: Create `frontend/app/child/learn.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';
import Pip from '../../components/Pip';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface StructuredFact { label: string; value: string; }
interface Learn { structured: StructuredFact[]; shortText: string; detailText: string; emoji?: string | null; }
interface Item { id: string; name: string; image_base64: string; learn: Learn | null; }

export default function LearnScreen() {
  const router = useRouter();
  const { puzzleId, puzzleName, imageBase64 } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailed, setDetailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/items/${puzzleId}`);
        if (r.ok) setItem(await r.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [puzzleId]);

  const img = (imageBase64 as string) || item?.image_base64 || '';
  const name = (puzzleName as string) || item?.name || '';
  const learn = item?.learn;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.coral600} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Did you know?</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {!!img && <Image source={{ uri: img }} style={styles.hero} resizeMode="cover" />}
          <Text style={styles.name}>{learn?.emoji ? `${learn.emoji} ` : ''}{name}</Text>
        </View>

        {learn ? (
          <>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setDetailed(false)} style={[styles.pill, !detailed && styles.pillOn]}>
                <Text style={[styles.pillText, !detailed && styles.pillTextOn]}>Quick</Text>
              </Pressable>
              <Pressable onPress={() => setDetailed(true)} style={[styles.pill, detailed && styles.pillOn]}>
                <Text style={[styles.pillText, detailed && styles.pillTextOn]}>Tell me more</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.body}>{detailed ? learn.detailText : learn.shortText}</Text>
            </View>

            {learn.structured.length > 0 && (
              <View style={styles.facts}>
                {learn.structured.map((f, i) => (
                  <View key={i} style={styles.factChip}>
                    <Text style={styles.factLabel}>{f.label}</Text>
                    <Text style={styles.factValue}>{f.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.pipRow}>
              <Pip size={70} mood="happy" hat="none" />
              <View style={styles.pipBubble}>
                <Text style={styles.pipText}>You learned about {name}! 🎉</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noLearn}>Great solving! 🎉</Text>
        )}

        <Pressable style={styles.nextBtn} onPress={() => router.back()}>
          <Text style={styles.nextText}>Back to puzzles</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream300 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.coral600, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s5, ...Shadows.s1,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.h3, color: '#fff' },
  scroll: { padding: Spacing.s5, alignItems: 'center' },
  heroWrap: { alignItems: 'center', marginBottom: Spacing.s4 },
  hero: { width: 160, height: 160, borderRadius: Radii.card, ...Shadows.s2 },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.h1, color: Colors.coral600, marginTop: Spacing.s3 },
  toggleRow: { flexDirection: 'row', gap: Spacing.s2, marginBottom: Spacing.s4 },
  pill: { paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s5, borderRadius: Radii.hero, backgroundColor: Colors.paper, ...Shadows.s1 },
  pillOn: { backgroundColor: Colors.coral600 },
  pillText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink2 },
  pillTextOn: { color: '#fff' },
  card: { backgroundColor: Colors.paper, borderRadius: Radii.card, padding: Spacing.s5, width: '100%', ...Shadows.s1 },
  body: { fontFamily: Fonts.body, fontSize: FontSizes.body, color: Colors.ink, lineHeight: 26 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2, marginTop: Spacing.s4, width: '100%' },
  factChip: { backgroundColor: Colors.cream200, borderRadius: Radii.chip, paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s3 },
  factLabel: { fontFamily: Fonts.body, fontSize: FontSizes.small, color: Colors.ink2 },
  factValue: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink },
  pipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3, marginTop: Spacing.s5, width: '100%' },
  pipBubble: { flex: 1, backgroundColor: Colors.paper, borderRadius: Radii.card, padding: Spacing.s4, ...Shadows.s1 },
  pipText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.coral600 },
  noLearn: { fontFamily: Fonts.heading, fontSize: FontSizes.h2, color: Colors.coral600, marginVertical: Spacing.s7 },
  nextBtn: { backgroundColor: Colors.green500, borderRadius: Radii.card, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s7, marginTop: Spacing.s6, ...Shadows.s2 },
  nextText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.body, color: '#fff' },
});
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/child/learn.tsx frontend/app/_layout.tsx
git commit -m "feat(frontend): add Learn screen with reading-level toggle"
```

---

## Task 6: Frontend — surface "Learn about X" on the win screen

**Files:**
- Modify: `frontend/app/child/puzzle-game.tsx`

- [ ] **Step 1: Add learn-availability detection**

In `frontend/app/child/puzzle-game.tsx`, add a state near the other `useState` hooks:

```tsx
  const [hasLearn, setHasLearn] = useState(false);
```

And add an effect after the existing mount `useEffect` (local puzzle ids start with `local_` and have no learn data, so skip them):

```tsx
  useEffect(() => {
    const id = puzzleId as string;
    if (!id || id.startsWith('local_')) return;
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/items/${id}`);
        if (r.ok) {
          const data = await r.json();
          setHasLearn(!!data.learn);
        }
      } catch {}
    })();
  }, [puzzleId]);
```

- [ ] **Step 2: Add the Learn button to the win screen**

In the completion buttons block (where `scoreboardButton` / `playAgainButton` etc. are rendered), add as the FIRST button so the lesson is the primary call to action:

```tsx
                {hasLearn && (
                  <TouchableOpacity
                    style={[styles.button, styles.learnButton]}
                    onPress={() => router.push({
                      pathname: '/child/learn',
                      params: { puzzleId, puzzleName, imageBase64 },
                    })}
                  >
                    <Ionicons name="book" size={22} color="#fff" />
                    <Text style={styles.buttonText}>Learn about {puzzleName} 📖</Text>
                  </TouchableOpacity>
                )}
```

- [ ] **Step 3: Add the button style**

In the `StyleSheet.create` block, alongside the other `*Button` styles, add:

```tsx
  learnButton: { backgroundColor: Colors.purple500 },
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manual end-to-end verification**

Start backend (`uvicorn server:app --port 8000`) with content loaded, and the app (`npx expo start --web --port 8090`). Then:
1. Play → pick the Flags pack → pick Brazil → solve the puzzle.
2. On the win screen, confirm a purple **"Learn about Brazil 📖"** button appears as the top button.
3. Tap it → the Learn screen shows the flag, "Quick" facts by default, the structured chips (Capital, Population…), and Pip.
4. Tap **"Tell me more"** → body text swaps to the longer paragraph.
5. Tap **"Back to puzzles"** → returns to the game.
6. Solve a **My Pictures** puzzle (local image) → confirm **no** Learn button appears.

Expected: all six behave as described.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/child/puzzle-game.tsx
git commit -m "feat(frontend): show Learn button on win screen when item has learn content"
```

---

## Self-Review (completed)

- **Spec coverage:** §6.1 model → Task 1; §6.2 endpoints → Tasks 2–3; §6.3 learn screen + toggle → Tasks 5–6; §6.4 content pipeline/loader → Task 4; age-band + pricing metadata → Tasks 1–2/Task 4 JSON. Free-tier (`isFree`/`freeSampleCount`) is carried in the model + content now; enforcement is Phase 2 (correctly out of scope).
- **Placeholders:** the only `REPLACE_WITH_*` tokens are image base64 strings, which are content artifacts produced by the pipeline, not code gaps — flagged explicitly in Task 4's authoring note.
- **Type consistency:** `LearnPayload`/`ItemLearnResponse`/`PackResponse` names and fields match across backend tasks; frontend `Learn`/`Item` interfaces mirror the backend JSON; `/api/items/{id}` used identically in Tasks 5 and 6.
