from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from enum import Enum

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

# JWT Settings
JWT_SECRET = "scout_ouragan_secret_key_2024"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Enums
class BranchType(str, Enum):
    MEUTE = "meute"
    TROUPE = "troupe"
    COMPAGNIE = "compagnie"
    CLAN = "clan"

class OrganType(str, Enum):
    CONSEIL = "conseil"
    MAITRISE = "maitrise"
    ASSEMBLEE = "assemblee"

# Models
class Admin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminCreate(BaseModel):
    username: str
    password: str

class Member(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str
    prenom: str
    age: int
    branch: BranchType
    date_inscription: datetime = Field(default_factory=datetime.utcnow)
    actif: bool = True

class MemberCreate(BaseModel):
    nom: str
    prenom: str
    age: int
    branch: BranchType

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titre: str
    description: str
    date_activite: datetime
    branch: Optional[BranchType] = None
    organ: Optional[OrganType] = None
    lieu: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityCreate(BaseModel):
    titre: str
    description: str
    date_activite: datetime
    branch: Optional[BranchType] = None
    organ: Optional[OrganType] = None
    lieu: Optional[str] = None

class PedagogicalProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titre: str
    contenu: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PedagogicalProjectUpdate(BaseModel):
    titre: str
    contenu: str

# Auth functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))

def create_jwt_token(username: str) -> str:
    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = verify_jwt_token(credentials.credentials)
        admin = await db.admins.find_one({"username": payload["username"]})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Public Routes
@api_router.get("/")
async def root():
    return {"message": "Groupe Scout Ouragan API"}

@api_router.get("/branches")
async def get_branches_info():
    return {
        "branches": [
            {
                "name": "Meute",
                "age_range": "6-12 ans",
                "type": "meute",
                "description": "Découverte et jeux pour les plus jeunes scouts"
            },
            {
                "name": "Troupe",
                "age_range": "12-16 ans", 
                "type": "troupe",
                "description": "Aventures et camping pour les adolescents"
            },
            {
                "name": "Compagnie",
                "age_range": "17-19 ans",
                "type": "compagnie", 
                "description": "Projets de service et leadership"
            },
            {
                "name": "Clan",
                "age_range": "20-25 ans",
                "type": "clan",
                "description": "Engagement communautaire et mentorat"
            }
        ],
        "organs": [
            {
                "name": "Conseil du Groupe",
                "type": "conseil",
                "description": "Organe de décision du groupe scout"
            },
            {
                "name": "Maîtrise du Groupe", 
                "type": "maitrise",
                "description": "Équipe des chefs et responsables"
            },
            {
                "name": "Assemblée Générale",
                "type": "assemblee", 
                "description": "Rassemblement annuel de tous les membres"
            }
        ]
    }

@api_router.get("/members")
async def get_all_members():
    members = await db.members.find({"actif": True}).to_list(1000)
    return [Member(**member) for member in members]

@api_router.get("/members/{branch}")
async def get_members_by_branch(branch: BranchType):
    members = await db.members.find({"branch": branch, "actif": True}).to_list(1000)
    return [Member(**member) for member in members]

@api_router.get("/activities")
async def get_all_activities():
    activities = await db.activities.find().sort("date_activite", -1).to_list(1000)
    return [Activity(**activity) for activity in activities]

@api_router.get("/activities/{branch}")
async def get_activities_by_branch(branch: BranchType):
    activities = await db.activities.find({"branch": branch}).sort("date_activite", -1).to_list(1000)
    return [Activity(**activity) for activity in activities]

@api_router.get("/project")
async def get_pedagogical_project():
    project = await db.pedagogical_projects.find_one()
    if project:
        return PedagogicalProject(**project)
    return {"titre": "Projet Pédagogique", "contenu": "Le projet pédagogique sera bientôt disponible."}

# Auth Routes
@api_router.post("/auth/login")
async def login(admin_login: AdminLogin):
    admin = await db.admins.find_one({"username": admin_login.username})
    if not admin or not verify_password(admin_login.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")
    
    token = create_jwt_token(admin_login.username)
    return {"access_token": token, "token_type": "bearer"}

@api_router.post("/auth/create-admin")
async def create_admin(admin_create: AdminCreate):
    # Check if admin already exists
    existing_admin = await db.admins.find_one({"username": admin_create.username})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    # Hash password and create admin
    password_hash = hash_password(admin_create.password)
    admin = Admin(username=admin_create.username, password_hash=password_hash)
    
    await db.admins.insert_one(admin.dict())
    return {"message": "Admin created successfully"}

# Admin Routes (Protected)
@api_router.post("/admin/members", response_model=Member)
async def create_member(member: MemberCreate, current_admin=Depends(get_current_admin)):
    member_obj = Member(**member.dict())
    await db.members.insert_one(member_obj.dict())
    return member_obj

@api_router.put("/admin/members/{member_id}", response_model=Member)
async def update_member(member_id: str, member_update: MemberCreate, current_admin=Depends(get_current_admin)):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_data = member_update.dict()
    await db.members.update_one({"id": member_id}, {"$set": update_data})
    
    updated_member = await db.members.find_one({"id": member_id})
    return Member(**updated_member)

@api_router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, current_admin=Depends(get_current_admin)):
    result = await db.members.update_one({"id": member_id}, {"$set": {"actif": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

@api_router.post("/admin/activities", response_model=Activity)
async def create_activity(activity: ActivityCreate, current_admin=Depends(get_current_admin)):
    activity_obj = Activity(**activity.dict())
    await db.activities.insert_one(activity_obj.dict())
    return activity_obj

@api_router.put("/admin/activities/{activity_id}", response_model=Activity)
async def update_activity(activity_id: str, activity_update: ActivityCreate, current_admin=Depends(get_current_admin)):
    activity = await db.activities.find_one({"id": activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = activity_update.dict()
    await db.activities.update_one({"id": activity_id}, {"$set": update_data})
    
    updated_activity = await db.activities.find_one({"id": activity_id})
    return Activity(**updated_activity)

@api_router.delete("/admin/activities/{activity_id}")
async def delete_activity(activity_id: str, current_admin=Depends(get_current_admin)):
    result = await db.activities.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted successfully"}

@api_router.put("/admin/project")
async def update_pedagogical_project(project: PedagogicalProjectUpdate, current_admin=Depends(get_current_admin)):
    project_obj = PedagogicalProject(**project.dict())
    
    # Upsert the project
    await db.pedagogical_projects.update_one(
        {},
        {"$set": project_obj.dict()},
        upsert=True
    )
    return {"message": "Projet pédagogique mis à jour avec succès"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_admin=Depends(get_current_admin)):
    # Count members by branch
    meute_count = await db.members.count_documents({"branch": "meute", "actif": True})
    troupe_count = await db.members.count_documents({"branch": "troupe", "actif": True})
    compagnie_count = await db.members.count_documents({"branch": "compagnie", "actif": True})
    clan_count = await db.members.count_documents({"branch": "clan", "actif": True})
    
    # Count total activities
    total_activities = await db.activities.count_documents({})
    
    return {
        "members_by_branch": {
            "meute": meute_count,
            "troupe": troupe_count,
            "compagnie": compagnie_count,
            "clan": clan_count,
            "total": meute_count + troupe_count + compagnie_count + clan_count
        },
        "total_activities": total_activities
    }

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