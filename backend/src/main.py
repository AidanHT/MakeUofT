from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
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

def generate_pose_feedback(pose_data: PoseData) -> str:
    # Create a detailed prompt for the LLM
    prompt = f"""You are a professional yoga instructor. Analyze the following pose accuracy data for {pose_data.pose_name} and provide specific, actionable feedback to help the student improve their form.

Overall pose accuracy: {pose_data.overall_accuracy}%

Segment accuracies:
"""
    
    for segment, data in pose_data.segment_accuracies.items():
        prompt += f"- {segment}: {data['accuracy']}%\n"

    prompt += """
Based on these measurements, provide:
1. A brief assessment of the student's current form
2. Specific tips for improving the segments with lower accuracy
3. Safety reminders if necessary
4. Encouragement for what they're doing well

Keep the response concise and actionable."""

    # Get response from Groq
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are an experienced yoga instructor providing real-time feedback on student poses. Focus on being encouraging while providing specific, actionable improvements."
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

    return chat_completion.choices[0].message.content

@app.websocket("/ws/pose-feedback")
async def pose_feedback_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive pose data
            data = await websocket.receive_text()
            pose_data = PoseData(**json.loads(data))
            
            # Generate feedback
            feedback = generate_pose_feedback(pose_data)
            
            # Send feedback back to client
            await websocket.send_text(feedback)
            
    except Exception as e:
        print(f"Error in websocket connection: {e}")
    finally:
        await websocket.close()

@app.get("/")
def read_root():
    return {"status": "MindMaxxing API is running"} 