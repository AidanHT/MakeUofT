from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
import groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))

class PoseData(BaseModel):
    pose_name: str
    overall_accuracy: float
    segment_accuracies: Dict[str, Dict[str, float]]
    current_streak: int = 0
    total_poses_completed: int = 0

class GameState(BaseModel):
    current_level: int
    total_score: int
    current_streak: int
    achievements: List[str]
    highest_accuracy: float
    poses_mastered: List[str]

# Game mechanics constants
ACCURACY_THRESHOLDS = {
    "PERFECT": 85,    # Lowered from 95
    "EXCELLENT": 75,  # Lowered from 85
    "GREAT": 65,     # Lowered from 75
    "GOOD": 55       # Lowered from 65
}

STREAK_BONUSES = {
    2: 1.5,  # 50% bonus for 2 streak (lowered from 3)
    3: 2.0,  # 100% bonus for 3 streak (lowered from 5)
    5: 3.0   # 200% bonus for 5 streak (lowered from 10)
}

ACHIEVEMENTS = {
    "FIRST_POSE": "Strike a Pose",
    "PERFECT_POSE": "Perfect Form",
    "STREAK_MASTER": "On Fire!",
    "POSE_VARIETY": "Yoga Explorer",
    "ACCURACY_KING": "Precision Master"
}

def calculate_score(accuracy: float, streak: int) -> int:
    # Increase base score multiplier
    base_score = int(accuracy * 15)  # Increased from 10
    
    # Apply streak multiplier
    multiplier = 1.0
    for streak_threshold, bonus in STREAK_BONUSES.items():
        if streak >= streak_threshold:
            multiplier = bonus
    
    return int(base_score * multiplier)

def check_achievements(accuracy: float, streak: int, total_poses: int, pose_name: str, game_state: GameState) -> List[str]:
    new_achievements = []
    
    if total_poses == 1 and "FIRST_POSE" not in game_state.achievements:
        new_achievements.append(ACHIEVEMENTS["FIRST_POSE"])
    
    # Lower perfect pose threshold
    if accuracy >= ACCURACY_THRESHOLDS["EXCELLENT"] and "PERFECT_POSE" not in game_state.achievements:  # Changed from PERFECT to EXCELLENT
        new_achievements.append(ACHIEVEMENTS["PERFECT_POSE"])
    
    # Lower streak requirement
    if streak >= 3 and "STREAK_MASTER" not in game_state.achievements:  # Lowered from 5
        new_achievements.append(ACHIEVEMENTS["STREAK_MASTER"])
    
    # Lower mastery threshold
    if pose_name not in game_state.poses_mastered and accuracy >= ACCURACY_THRESHOLDS["GREAT"]:  # Changed from EXCELLENT to GREAT
        game_state.poses_mastered.append(pose_name)
        
    # Lower pose variety requirement
    if len(game_state.poses_mastered) >= 3 and "POSE_VARIETY" not in game_state.achievements:  # Lowered from 5
        new_achievements.append(ACHIEVEMENTS["POSE_VARIETY"])
    
    return new_achievements

def generate_pose_feedback(pose_data: PoseData, game_state: GameState) -> dict:
    # Create a gamified prompt for the LLM
    prompt = f"""You are a gamified yoga instructor in a yoga training game. Analyze the following pose accuracy data and provide engaging, game-style feedback:

Pose: {pose_data.pose_name}
Overall accuracy: {pose_data.overall_accuracy}%
Current streak: {pose_data.current_streak}
Level: {game_state.current_level}

Segment accuracies:
"""
    
    for segment, data in pose_data.segment_accuracies.items():
        prompt += f"- {segment}: {data['accuracy']}%\n"

    prompt += """
Provide a response in this format:
1. A short, game-style encouragement (e.g., "Amazing form! You're crushing it! 🎯")
2. Quick tips for improvement
3. A fun fact about this pose or yoga in general
4. Next challenge suggestion

Keep it fun, engaging, and motivating!"""

    # Get response from Groq
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a gamified yoga instructor in an interactive yoga training game. Be encouraging, fun, and engaging while providing specific tips for improvement."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model="mixtral-8x7b-32768",
        temperature=0.7,
        max_tokens=500,
    )

    # Calculate game mechanics
    score = calculate_score(pose_data.overall_accuracy, pose_data.current_streak)
    
    # Update game state
    game_state.total_score += score
    game_state.current_streak = pose_data.current_streak
    game_state.highest_accuracy = max(game_state.highest_accuracy, pose_data.overall_accuracy)
    
    # Check for level up (every 1000 points)
    new_level = (game_state.total_score // 1000) + 1
    level_up = new_level > game_state.current_level
    game_state.current_level = new_level
    
    # Check for new achievements
    new_achievements = check_achievements(
        pose_data.overall_accuracy,
        pose_data.current_streak,
        pose_data.total_poses_completed,
        pose_data.pose_name,
        game_state
    )

    return {
        "feedback": chat_completion.choices[0].message.content,
        "score": score,
        "total_score": game_state.total_score,
        "level": game_state.current_level,
        "level_up": level_up,
        "new_achievements": new_achievements,
        "accuracy_rating": next(
            (label for label, threshold in ACCURACY_THRESHOLDS.items() 
             if pose_data.overall_accuracy >= threshold),
            "KEEP PRACTICING"
        )
    }

@app.websocket("/ws/pose-feedback")
async def pose_feedback_websocket(websocket: WebSocket):
    await websocket.accept()
    
    # Initialize game state
    game_state = GameState(
        current_level=1,
        total_score=0,
        current_streak=0,
        achievements=[],
        highest_accuracy=0.0,
        poses_mastered=[]
    )
    
    try:
        while True:
            # Receive pose data
            data = await websocket.receive_text()
            pose_data = PoseData(**json.loads(data))
            
            # Generate gamified feedback
            feedback = generate_pose_feedback(pose_data, game_state)
            
            # Send feedback back to client
            await websocket.send_text(json.dumps(feedback))
            
    except Exception as e:
        print(f"Error in websocket connection: {e}")
    finally:
        await websocket.close()

@app.get("/")
def read_root():
    return {"status": "MindMaxxing Gamified API is running"} 