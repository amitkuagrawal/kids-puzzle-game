from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
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

class Score(BaseModel):
    id: Optional[str] = None
    puzzle_id: str
    difficulty: str
    time_seconds: int
    moves: int
    score: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ScoreCreate(BaseModel):
    puzzle_id: str
    difficulty: str
    time_seconds: int
    moves: int
    score: int

class ScoreResponse(BaseModel):
    id: str
    puzzle_id: str
    difficulty: str
    time_seconds: int
    moves: int
    score: int
    created_at: datetime

class AnalyticsEvent(BaseModel):
    id: Optional[str] = None
    event_type: str
    event_data: dict
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    device_type: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AnalyticsEventCreate(BaseModel):
    event_type: str
    event_data: dict
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    device_type: Optional[str] = None

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

# Score Routes
@api_router.post("/scores", response_model=ScoreResponse)
async def create_score(score: ScoreCreate):
    """Save a puzzle completion score"""
    try:
        score_dict = score.dict()
        score_dict['created_at'] = datetime.utcnow()
        
        result = await db.scores.insert_one(score_dict)
        score_dict['id'] = str(result.inserted_id)
        
        return ScoreResponse(
            id=str(result.inserted_id),
            puzzle_id=score_dict['puzzle_id'],
            difficulty=score_dict['difficulty'],
            time_seconds=score_dict['time_seconds'],
            moves=score_dict['moves'],
            score=score_dict['score'],
            created_at=score_dict['created_at']
        )
    except Exception as e:
        logging.error(f"Error creating score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/scores/{puzzle_id}/{difficulty}", response_model=List[ScoreResponse])
async def get_scores(puzzle_id: str, difficulty: str):
    """Get last 10 scores for a specific puzzle and difficulty"""
    try:
        scores = await db.scores.find({
            'puzzle_id': puzzle_id,
            'difficulty': difficulty
        }).sort('score', -1).limit(10).to_list(10)
        
        return [
            ScoreResponse(
                id=str(score['_id']),
                puzzle_id=score['puzzle_id'],
                difficulty=score['difficulty'],
                time_seconds=score['time_seconds'],
                moves=score['moves'],
                score=score['score'],
                created_at=score['created_at']
            )
            for score in scores
        ]
    except Exception as e:
        logging.error(f"Error fetching scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Routes
@api_router.post("/analytics/event")
async def log_analytics_event(event: AnalyticsEventCreate):
    """Log an analytics event"""
    try:
        event_dict = event.dict()
        event_dict['timestamp'] = datetime.utcnow()
        
        await db.analytics.insert_one(event_dict)
        return {"message": "Event logged successfully"}
    except Exception as e:
        logging.error(f"Error logging analytics event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/metrics")
async def get_analytics_metrics(days: int = 7):
    """Get analytics metrics for the specified number of days"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all events in time range
        events = await db.analytics.find({
            'timestamp': {'$gte': cutoff_date}
        }).to_list(10000)
        
        # Calculate metrics
        metrics = {
            'total_sessions': len(set(e.get('session_id') for e in events if e.get('session_id'))),
            'total_events': len(events),
            'puzzles_completed': len([e for e in events if e['event_type'] == 'puzzle_completed']),
            'puzzles_abandoned': len([e for e in events if e['event_type'] == 'puzzle_abandoned']),
            'uploads': len([e for e in events if e['event_type'] == 'puzzle_uploaded']),
            'hint_usage': len([e for e in events if e['event_type'] == 'hint_used']),
            'event_breakdown': {},
            'difficulty_breakdown': {},
            'avg_completion_time': {},
            'return_visits': 0,
        }
        
        # Event type breakdown
        for event in events:
            event_type = event['event_type']
            metrics['event_breakdown'][event_type] = metrics['event_breakdown'].get(event_type, 0) + 1
        
        # Difficulty breakdown
        for event in events:
            if event['event_type'] in ['puzzle_started', 'puzzle_completed']:
                difficulty = event.get('event_data', {}).get('difficulty', 'unknown')
                metrics['difficulty_breakdown'][difficulty] = metrics['difficulty_breakdown'].get(difficulty, 0) + 1
        
        # Average completion time by difficulty
        completion_times = {}
        for event in events:
            if event['event_type'] == 'puzzle_completed':
                difficulty = event.get('event_data', {}).get('difficulty', 'unknown')
                time = event.get('event_data', {}).get('time_seconds', 0)
                if difficulty not in completion_times:
                    completion_times[difficulty] = []
                completion_times[difficulty].append(time)
        
        for diff, times in completion_times.items():
            metrics['avg_completion_time'][diff] = sum(times) / len(times) if times else 0
        
        return metrics
    except Exception as e:
        logging.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/")
async def root():
    return {"message": "Puzzle API is running"}

# Web Analytics Dashboard
@api_router.get("/analytics-dashboard", response_class=HTMLResponse)
async def analytics_dashboard():
    """Serve the web analytics dashboard for app creators"""
    try:
        dashboard_path = Path(__file__).parent / "analytics_dashboard.html"
        with open(dashboard_path, 'r') as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        logging.error(f"Error serving analytics dashboard: {e}")
        return HTMLResponse(content="<h1>Analytics Dashboard Not Found</h1>", status_code=500)

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
