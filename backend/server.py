from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class PuzzleImage(BaseModel):
    id: Optional[str] = None
    name: str
    image_base64: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PuzzleImageCreate(BaseModel):
    name: str
    image_base64: str

class PuzzleImageResponse(BaseModel):
    id: str
    name: str
    image_base64: str
    created_at: datetime

# Puzzle Image Routes
@api_router.post("/puzzles", response_model=PuzzleImageResponse)
async def create_puzzle(puzzle: PuzzleImageCreate):
    """Admin endpoint to upload a new puzzle image"""
    try:
        puzzle_dict = puzzle.dict()
        puzzle_dict['created_at'] = datetime.utcnow()
        
        result = await db.puzzles.insert_one(puzzle_dict)
        puzzle_dict['id'] = str(result.inserted_id)
        puzzle_dict['_id'] = result.inserted_id
        
        return PuzzleImageResponse(
            id=str(result.inserted_id),
            name=puzzle_dict['name'],
            image_base64=puzzle_dict['image_base64'],
            created_at=puzzle_dict['created_at']
        )
    except Exception as e:
        logging.error(f"Error creating puzzle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/puzzles", response_model=List[PuzzleImageResponse])
async def get_all_puzzles():
    """Get all available puzzle images"""
    try:
        puzzles = await db.puzzles.find().sort('created_at', -1).to_list(100)
        return [
            PuzzleImageResponse(
                id=str(puzzle['_id']),
                name=puzzle['name'],
                image_base64=puzzle['image_base64'],
                created_at=puzzle['created_at']
            )
            for puzzle in puzzles
        ]
    except Exception as e:
        logging.error(f"Error fetching puzzles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/puzzles/{puzzle_id}")
async def delete_puzzle(puzzle_id: str):
    """Admin endpoint to delete a puzzle image"""
    try:
        result = await db.puzzles.delete_one({'_id': ObjectId(puzzle_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Puzzle not found")
        return {"message": "Puzzle deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting puzzle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/")
async def root():
    return {"message": "Puzzle API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
