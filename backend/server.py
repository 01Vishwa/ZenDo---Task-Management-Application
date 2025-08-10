from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
import hmac
import hashlib
import time
import json
import re
from croniter import croniter
from slack_sdk import WebClient
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "1nCaMObXCst877vo-5CrZPjxDbpPmP663VXWZUGLsPk"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Slack configuration
SLACK_SIGNING_SECRET = os.environ.get('SLACK_SIGNING_SECRET')
SLACK_BOT_TOKEN = os.environ.get('SLACK_BOT_TOKEN')

# Stripe configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

# Premium plans
PREMIUM_PLANS = {
    "starter": {"price": 9.99, "name": "Starter Plan", "features": ["Unlimited tasks", "Basic integrations"]},
    "professional": {"price": 19.99, "name": "Professional Plan", "features": ["Everything in Starter", "Slack integration", "Advanced analytics"]},
    "enterprise": {"price": 49.99, "name": "Enterprise Plan", "features": ["Everything in Professional", "Custom integrations", "Priority support"]}
}

# Create the main app without a prefix
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    is_premium: bool = False
    subscription_plan: Optional[str] = None
    subscription_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    priority: str = "medium"  # low, medium, high
    status: str = "todo"  # todo, in_progress, completed
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    recurring_pattern: Optional[str] = None  # daily, weekly, monthly, custom cron
    tags: List[str] = []
    reminders: List[datetime] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    reminders: Optional[List[datetime]] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    priority: str = "medium"
    status: str = "todo"
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    recurring_pattern: Optional[str] = None
    tags: List[str] = []
    reminders: List[datetime] = []
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#8B5CF6"
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#8B5CF6"
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SearchFilters(BaseModel):
    query: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class NotificationCreate(BaseModel):
    user_id: str
    task_id: str
    message: str
    scheduled_time: datetime
    type: str = "reminder"  # reminder, deadline, recurring

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: str
    message: str
    scheduled_time: datetime
    type: str = "reminder"
    sent: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserMapping(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slack_user_id: str
    email: str
    app_user_id: Optional[str] = None

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    plan: str
    amount: float
    currency: str = "usd"
    status: str = "pending"  # pending, completed, failed, expired
    payment_status: str = "unpaid"  # unpaid, paid, failed
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CheckoutRequest(BaseModel):
    plan: str
    origin_url: str

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

async def verify_slack_signature(request: Request):
    if not SLACK_SIGNING_SECRET:
        raise HTTPException(400, "Slack not configured")
        
    timestamp = request.headers.get("X-Slack-Request-Timestamp")
    signature = request.headers.get("X-Slack-Signature")

    if abs(time.time() - int(timestamp)) > 60 * 5:
        raise HTTPException(400, "Invalid timestamp")

    body = await request.body()
    sig_basestring = f"v0:{timestamp}:{body.decode()}".encode()
    computed_signature = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        sig_basestring,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature):
        raise HTTPException(403, "Invalid signature")

# Auth routes
@api_router.post("/register", response_model=Token)
async def register(user_create: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_create.password)
    user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_premium": current_user.is_premium,
        "subscription_plan": current_user.subscription_plan,
        "subscription_expires": current_user.subscription_expires
    }

# Task routes with advanced search
@api_router.post("/tasks", response_model=Task)
async def create_task(task_create: TaskCreate, current_user: User = Depends(get_current_user)):
    task = Task(**task_create.dict(), user_id=current_user.id)
    await db.tasks.insert_one(task.dict())
    
    # Create notifications for reminders
    for reminder_time in task_create.reminders:
        notification = Notification(
            user_id=current_user.id,
            task_id=task.id,
            message=f"Reminder: {task.title}",
            scheduled_time=reminder_time
        )
        await db.notifications.insert_one(notification.dict())
    
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.post("/tasks/search", response_model=List[Task])
async def search_tasks(filters: SearchFilters, current_user: User = Depends(get_current_user)):
    query = {"user_id": current_user.id}
    
    if filters.query:
        query["$or"] = [
            {"title": {"$regex": filters.query, "$options": "i"}},
            {"description": {"$regex": filters.query, "$options": "i"}}
        ]
    
    if filters.status:
        query["status"] = filters.status
    
    if filters.priority:
        query["priority"] = filters.priority
    
    if filters.project_id:
        query["project_id"] = filters.project_id
    
    if filters.tags:
        query["tags"] = {"$in": filters.tags}
    
    if filters.date_from or filters.date_to:
        date_query = {}
        if filters.date_from:
            date_query["$gte"] = filters.date_from
        if filters.date_to:
            date_query["$lte"] = filters.date_to
        query["start_time"] = date_query
    
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str, 
    task_update: TaskUpdate, 
    current_user: User = Depends(get_current_user)
):
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Delete associated notifications
    await db.notifications.delete_many({"task_id": task_id})
    return {"message": "Task deleted successfully"}

# Recurring tasks
@api_router.post("/tasks/{task_id}/generate-recurring")
async def generate_recurring_tasks(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task or not task.get("recurring_pattern"):
        raise HTTPException(status_code=400, detail="Task not found or not recurring")
    
    pattern = task["recurring_pattern"]
    base_time = task["start_time"]
    duration = task["end_time"] - task["start_time"]
    
    # Generate next 10 occurrences
    cron = croniter(pattern, base_time)
    generated_tasks = []
    
    for _ in range(10):
        next_time = cron.get_next(datetime)
        recurring_task = Task(
            title=f"{task['title']} (Recurring)",
            description=task.get("description"),
            start_time=next_time,
            end_time=next_time + duration,
            priority=task["priority"],
            project_id=task.get("project_id"),
            tags=task.get("tags", []),
            user_id=current_user.id
        )
        
        await db.tasks.insert_one(recurring_task.dict())
        generated_tasks.append(recurring_task)
    
    return {"message": f"Generated {len(generated_tasks)} recurring tasks"}

# Project routes
@api_router.post("/projects", response_model=Project)
async def create_project(
    project_create: ProjectCreate, 
    current_user: User = Depends(get_current_user)
):
    project = Project(**project_create.dict(), user_id=current_user.id)
    await db.projects.insert_one(project.dict())
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user.id}).sort("created_at", -1).to_list(1000)
    return [Project(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    # Also delete all tasks in this project
    await db.tasks.delete_many({"project_id": project_id, "user_id": current_user.id})
    
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project and all associated tasks deleted successfully"}

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_tasks = await db.tasks.count_documents({"user_id": current_user.id})
    completed_tasks = await db.tasks.count_documents({"user_id": current_user.id, "status": "completed"})
    pending_tasks = await db.tasks.count_documents({"user_id": current_user.id, "status": {"$in": ["todo", "in_progress"]}})
    total_projects = await db.projects.count_documents({"user_id": current_user.id})
    
    # Get today's tasks
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    today_tasks = await db.tasks.count_documents({
        "user_id": current_user.id,
        "start_time": {"$gte": today_start, "$lt": today_end}
    })
    
    # Get upcoming tasks (next 7 days)
    week_end = today_start + timedelta(days=7)
    upcoming_tasks = await db.tasks.count_documents({
        "user_id": current_user.id,
        "start_time": {"$gte": today_end, "$lt": week_end},
        "status": {"$ne": "completed"}
    })
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "total_projects": total_projects,
        "today_tasks": today_tasks,
        "upcoming_tasks": upcoming_tasks,
        "is_premium": current_user.is_premium
    }

# Notification routes
@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find({
        "user_id": current_user.id,
        "scheduled_time": {"$lte": datetime.utcnow()},
        "sent": False
    }).sort("scheduled_time", 1).to_list(100)
    
    return [Notification(**notif) for notif in notifications]

@api_router.post("/notifications/{notification_id}/mark-sent")
async def mark_notification_sent(notification_id: str, current_user: User = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"sent": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as sent"}

# Slack Integration Routes
@api_router.post("/slack/events")
async def handle_slack_events(request: Request):
    if SLACK_SIGNING_SECRET:
        await verify_slack_signature(request)

    body = await request.body()
    payload = json.loads(body.decode())

    # Handle URL verification challenge
    if payload.get("type") == "url_verification":
        return {"challenge": payload["challenge"]}

    # Handle app mention events
    if payload.get("type") == "event_callback":
        event = payload.get("event", {})

        if event.get("type") == "app_mention":
            await handle_app_mention(event)

    return {"status": "ok"}

async def handle_app_mention(event):
    if not SLACK_BOT_TOKEN:
        return

    text = event.get("text", "")
    channel_id = event.get("channel")
    user_id = event.get("user")

    # Parse mentions and task description
    mentions = parse_user_mentions(text)
    task_description = extract_task_description(text)

    if task_description:
        # Get or create project based on channel
        project = await get_or_create_project_for_channel(channel_id)

        # Get user email mapping
        assigned_user = mentions[0] if mentions else None
        user_mapping = None
        if assigned_user:
            user_mapping = await db.user_mappings.find_one({"slack_user_id": assigned_user})

        # Find the app user
        app_user = None
        if user_mapping:
            app_user = await db.users.find_one({"email": user_mapping["email"]})

        if app_user:
            # Create task
            task = Task(
                title=task_description,
                description=f"Created from Slack channel #{project['channel_name']}",
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow() + timedelta(hours=1),
                project_id=project["id"],
                user_id=app_user["id"]
            )

            await db.tasks.insert_one(task.dict())

            # Send confirmation message
            await send_slack_message(channel_id, f"✅ Task created: {task_description}")
        else:
            await send_slack_message(channel_id, "❌ User mapping not found. Please set up user mapping first.")

def parse_user_mentions(text: str):
    return re.findall(r"<@(U[A-Z0-9]+)>", text)

def extract_task_description(text: str):
    quoted_match = re.search(r'"([^"]+)"', text)
    if quoted_match:
        return quoted_match.group(1)

    clean_text = re.sub(r"<@[UW][A-Z0-9]+>", "", text).strip()
    return clean_text if clean_text else None

async def get_or_create_project_for_channel(channel_id: str):
    project = await db.projects.find_one({"channel_id": channel_id})

    if not project:
        client = WebClient(token=SLACK_BOT_TOKEN)
        try:
            channel_info = client.conversations_info(channel=channel_id)
            channel_name = channel_info["channel"]["name"]

            # Create project for the first user (this is a simplification)
            first_user = await db.users.find_one()
            if first_user:
                new_project = Project(
                    name=channel_name,
                    channel_id=channel_id,
                    channel_name=channel_name,
                    user_id=first_user["id"]
                )
                await db.projects.insert_one(new_project.dict())
                project = new_project.dict()
        except Exception as e:
            # Fallback project
            first_user = await db.users.find_one()
            if first_user:
                new_project = Project(
                    name=f"Channel {channel_id}",
                    channel_id=channel_id,
                    channel_name=f"channel_{channel_id}",
                    user_id=first_user["id"]
                )
                await db.projects.insert_one(new_project.dict())
                project = new_project.dict()

    return project

async def send_slack_message(channel_id: str, message: str):
    if SLACK_BOT_TOKEN:
        client = WebClient(token=SLACK_BOT_TOKEN)
        try:
            client.chat_postMessage(channel=channel_id, text=message)
        except Exception as e:
            logging.error(f"Failed to send Slack message: {e}")

@api_router.get("/slack/status")
async def slack_status():
    if not SLACK_BOT_TOKEN:
        return {"status": "not_configured"}
    
    try:
        client = WebClient(token=SLACK_BOT_TOKEN)
        auth_test = client.auth_test()
        return {
            "status": "connected",
            "bot_user_id": auth_test["user_id"],
            "team": auth_test["team"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@api_router.post("/users/mapping")
async def create_user_mapping(mapping: UserMapping):
    await db.user_mappings.insert_one(mapping.dict())
    return {"message": "User mapping created successfully"}

@api_router.get("/users/slack")
async def sync_slack_users():
    if not SLACK_BOT_TOKEN:
        raise HTTPException(400, "Slack not configured")
    
    client = WebClient(token=SLACK_BOT_TOKEN)
    users = client.users_list()

    slack_users = []
    for user in users["members"]:
        if not user.get("deleted") and not user.get("is_bot"):
            slack_users.append({
                "id": user["id"],
                "name": user["name"],
                "real_name": user.get("real_name", ""),
                "email": user.get("profile", {}).get("email", "")
            })

    return {"users": slack_users}

# Stripe Payment Routes
@api_router.get("/plans")
async def get_plans():
    return {"plans": PREMIUM_PLANS}

@api_router.post("/checkout")
async def create_checkout_session(
    checkout_request: CheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    if checkout_request.plan not in PREMIUM_PLANS:
        raise HTTPException(400, "Invalid plan")
    
    plan_info = PREMIUM_PLANS[checkout_request.plan]
    amount = plan_info["price"]
    
    # Create URLs
    success_url = f"{checkout_request.origin_url}/premium/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_request.origin_url}/premium"
    
    # Create checkout session using Stripe
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': plan_info["name"],
                    },
                    'unit_amount': int(amount * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user.id,
                "plan": checkout_request.plan,
                "source": "web_checkout"
            }
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        session_id=session.session_id,
        user_id=current_user.id,
        plan=checkout_request.plan,
        amount=amount,
        metadata=checkout_session_request.metadata
    )
    
    await db.payment_transactions.insert_one(transaction.dict())
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: User = Depends(get_current_user)):
    # Check if we already processed this payment
    transaction = await db.payment_transactions.find_one({"session_id": session_id, "user_id": current_user.id})
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    if transaction["status"] == "completed":
        return {"status": "complete", "payment_status": "paid"}
    
    # Get status from Stripe
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = "paid" if session.payment_status == "paid" else "unpaid"
        status = session.status
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    # Update transaction status
    update_data = {
        "status": status,
        "payment_status": payment_status,
        "updated_at": datetime.utcnow()
    }
    
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": update_data}
    )
    
    # If payment is successful and not already processed
    if checkout_status.payment_status == "paid" and transaction["status"] != "completed":
        # Update user to premium
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "is_premium": True,
                "subscription_plan": transaction["plan"],
                "subscription_expires": datetime.utcnow() + timedelta(days=30)
            }}
        )
        
        # Mark transaction as completed
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed"}}
        )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status
    }

@api_router.post("/webhook/stripe")
async def handle_stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(400, "Stripe not configured")
    
    webhook_body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        # Verify webhook signature
        webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                webhook_body, signature, webhook_secret
            )
        else:
            # For development, parse without verification
            event = json.loads(webhook_body)
        
        if event['type'] == "checkout.session.completed":
            # Update transaction and user
            session_id = event['data']['object']['id']
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            
            if transaction and transaction["status"] != "completed":
                # Update user to premium
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {
                        "is_premium": True,
                        "subscription_plan": transaction["plan"],
                        "subscription_expires": datetime.utcnow() + timedelta(days=30)
                    }}
                )
                
                # Mark transaction as completed
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Stripe webhook error: {e}")
        raise HTTPException(400, "Webhook processing failed")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create indexes for better performance
    try:
        await db.tasks.create_index([("user_id", 1), ("created_at", -1)])
        await db.tasks.create_index([("user_id", 1), ("status", 1)])
        await db.tasks.create_index([("user_id", 1), ("project_id", 1)])
        await db.projects.create_index([("user_id", 1), ("created_at", -1)])
        await db.projects.create_index("channel_id", unique=True, sparse=True)
        await db.notifications.create_index([("user_id", 1), ("scheduled_time", 1)])
        await db.user_mappings.create_index("slack_user_id", unique=True, sparse=True)
        await db.payment_transactions.create_index("session_id", unique=True)
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",  # Run on all hosts
        port=8000,
        reload=True,  # Enable auto-reload for development
        log_level="info"
    )