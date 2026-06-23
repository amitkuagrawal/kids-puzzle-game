from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
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

class StructuredFact(BaseModel):
    label: str          # e.g. "Capital"
    value: str          # e.g. "Brasília"

class LearnPayload(BaseModel):
    structured: List[StructuredFact] = []
    shortText: str = ""        # ~2 kid-friendly sentences
    detailText: str = ""       # ~1 paragraph "read more"
    emoji: Optional[str] = None

class PuzzleImageCreate(BaseModel):
    name: str
    image_base64: str
    category: Optional[str] = None
    learn: Optional[LearnPayload] = None

class PuzzleImageResponse(BaseModel):
    id: str
    name: str
    image_base64: str
    created_at: datetime
    category: Optional[str] = None
    is_preloaded: bool = False

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

# Category Models
class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "📁"
    color: Optional[str] = "#667eea"
    ageBand: str = "all-ages"
    isFree: bool = False
    freeSampleCount: int = 0
    productId: Optional[str] = None
    order: int = 0

class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    color: str
    image_count: int = 0
    created_at: datetime

class BulkUploadItem(BaseModel):
    name: str
    image_base64: str

class BulkUploadRequest(BaseModel):
    category: str
    images: List[BulkUploadItem]

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

# Category Routes
@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate):
    """Create a new category"""
    try:
        # Check if category already exists
        existing = await db.categories.find_one({'name': category.name})
        if existing:
            raise HTTPException(status_code=400, detail="Category already exists")
        
        category_dict = category.dict()
        category_dict['created_at'] = datetime.utcnow()
        
        result = await db.categories.insert_one(category_dict)
        
        return CategoryResponse(
            id=str(result.inserted_id),
            name=category_dict['name'],
            icon=category_dict.get('icon', '📁'),
            color=category_dict.get('color', '#667eea'),
            image_count=0,
            created_at=category_dict['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_all_categories():
    """Get all categories with image counts"""
    try:
        categories = await db.categories.find().sort('created_at', -1).to_list(100)
        result = []
        
        for cat in categories:
            # Count images in this category
            image_count = await db.puzzles.count_documents({'category': cat['name']})
            result.append(CategoryResponse(
                id=str(cat['_id']),
                name=cat['name'],
                icon=cat.get('icon', '📁'),
                color=cat.get('color', '#667eea'),
                image_count=image_count,
                created_at=cat['created_at']
            ))
        
        return result
    except Exception as e:
        logging.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category (images in category remain but become uncategorized)"""
    try:
        category = await db.categories.find_one({'_id': ObjectId(category_id)})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Update images in this category to be uncategorized
        await db.puzzles.update_many(
            {'category': category['name']},
            {'$set': {'category': None}}
        )
        
        result = await db.categories.delete_one({'_id': ObjectId(category_id)})
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Puzzle Image Routes
@api_router.post("/puzzles", response_model=PuzzleImageResponse)
async def create_puzzle(puzzle: PuzzleImageCreate):
    """Admin endpoint to upload a new puzzle image"""
    try:
        puzzle_dict = puzzle.dict()
        puzzle_dict['created_at'] = datetime.utcnow()
        puzzle_dict['is_preloaded'] = True  # Images uploaded via admin are preloaded
        
        result = await db.puzzles.insert_one(puzzle_dict)
        puzzle_dict['id'] = str(result.inserted_id)
        puzzle_dict['_id'] = result.inserted_id
        
        return PuzzleImageResponse(
            id=str(result.inserted_id),
            name=puzzle_dict['name'],
            image_base64=puzzle_dict['image_base64'],
            created_at=puzzle_dict['created_at'],
            category=puzzle_dict.get('category'),
            is_preloaded=True
        )
    except Exception as e:
        logging.error(f"Error creating puzzle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/puzzles/bulk")
async def bulk_upload_puzzles(request: BulkUploadRequest):
    """Bulk upload multiple puzzle images to a category"""
    try:
        uploaded = []
        for img in request.images:
            puzzle_dict = {
                'name': img.name,
                'image_base64': img.image_base64,
                'category': request.category,
                'is_preloaded': True,
                'created_at': datetime.utcnow()
            }
            result = await db.puzzles.insert_one(puzzle_dict)
            uploaded.append({
                'id': str(result.inserted_id),
                'name': img.name
            })
        
        return {
            "message": f"Successfully uploaded {len(uploaded)} images",
            "uploaded": uploaded
        }
    except Exception as e:
        logging.error(f"Error bulk uploading puzzles: {e}")
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
                created_at=puzzle['created_at'],
                category=puzzle.get('category'),
                is_preloaded=puzzle.get('is_preloaded', False)
            )
            for puzzle in puzzles
        ]
    except Exception as e:
        logging.error(f"Error fetching puzzles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/puzzles/preloaded")
async def get_preloaded_puzzles():
    """Get all preloaded puzzle images organized by category"""
    try:
        # Get all preloaded puzzles
        puzzles = await db.puzzles.find({'is_preloaded': True}).sort('created_at', -1).to_list(500)
        
        # Organize by category
        categorized: Dict[str, List] = {}
        uncategorized = []
        
        for puzzle in puzzles:
            category = puzzle.get('category')
            puzzle_data = {
                'id': str(puzzle['_id']),
                'name': puzzle['name'],
                'image_base64': puzzle['image_base64'],
                'created_at': puzzle['created_at'].isoformat(),
            }
            
            if category:
                if category not in categorized:
                    categorized[category] = []
                categorized[category].append(puzzle_data)
            else:
                uncategorized.append(puzzle_data)
        
        # Get category metadata
        categories = await db.categories.find().to_list(100)
        category_meta = {cat['name']: {'icon': cat.get('icon', '📁'), 'color': cat.get('color', '#667eea')} for cat in categories}
        
        result = []
        for cat_name, puzzles_list in categorized.items():
            meta = category_meta.get(cat_name, {'icon': '📁', 'color': '#667eea'})
            result.append({
                'category': cat_name,
                'icon': meta['icon'],
                'color': meta['color'],
                'puzzles': puzzles_list
            })
        
        if uncategorized:
            result.append({
                'category': 'Uncategorized',
                'icon': '📁',
                'color': '#999999',
                'puzzles': uncategorized
            })
        
        return result
    except Exception as e:
        logging.error(f"Error fetching preloaded puzzles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

@api_router.get("/puzzles/category/{category_name}")
async def get_puzzles_by_category(category_name: str):
    """Get all puzzles in a specific category"""
    try:
        puzzles = await db.puzzles.find({'category': category_name}).sort('created_at', -1).to_list(100)
        return [
            PuzzleImageResponse(
                id=str(puzzle['_id']),
                name=puzzle['name'],
                image_base64=puzzle['image_base64'],
                created_at=puzzle['created_at'],
                category=puzzle.get('category'),
                is_preloaded=puzzle.get('is_preloaded', False)
            )
            for puzzle in puzzles
        ]
    except Exception as e:
        logging.error(f"Error fetching puzzles by category: {e}")
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

@api_router.get("/scores/solved")
async def get_solved_puzzles():
    """Get list of all solved puzzle IDs (puzzles that have at least one score)"""
    try:
        # Get distinct puzzle IDs from scores collection
        solved_puzzles = await db.scores.distinct("puzzle_id")
        return {"solved_puzzles": solved_puzzles}
    except Exception as e:
        logging.error(f"Error fetching solved puzzles: {e}")
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

# Web Admin Dashboard (Analytics + Image Management)
@api_router.get("/admin-dashboard", response_class=HTMLResponse)
async def admin_dashboard():
    """Serve the web admin dashboard for app creators"""
    try:
        dashboard_path = Path(__file__).parent / "admin_dashboard.html"
        with open(dashboard_path, 'r') as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        logging.error(f"Error serving admin dashboard: {e}")
        return HTMLResponse(content="<h1>Admin Dashboard Not Found</h1>", status_code=500)

# Keep old analytics-dashboard URL for backwards compatibility
@api_router.get("/analytics-dashboard", response_class=HTMLResponse)
async def analytics_dashboard():
    """Redirect to admin dashboard for backwards compatibility"""
    try:
        dashboard_path = Path(__file__).parent / "admin_dashboard.html"
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
