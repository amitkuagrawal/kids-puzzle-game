"""One-shot loader: upserts packs (categories) and items (puzzles) from content/*.json.
Usage: cd backend && python load_content.py
Idempotent: re-running updates existing packs and re-upserts items by (name, category).
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
