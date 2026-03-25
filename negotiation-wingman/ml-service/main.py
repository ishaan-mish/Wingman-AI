from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI()

# Input schemas
class AudioChunk(BaseModel):
    text: str
    speaker: str

class Document(BaseModel):
    text: str

@app.post("/analyze-chunk")
async def analyze_audio(chunk: AudioChunk):
    # MOCK AI LOGIC: Pretend we analyzed sentiment and found leverage
    sentiments = ["Hesitant", "Aggressive", "Neutral", "Defensive"]
    tips = [
        "They sound hesitant. Anchor your ceiling price now.",
        "Aggressive tone detected. Pause for 3 seconds before replying.",
        "They are open. Mention your reference documents."
    ]
    
    return {
        "sentiment": random.choice(sentiments),
        "tip": random.choice(tips),
        "arbitrage": "Competitor pricing is 15% lower. Mention it if they push back."
    }

@app.post("/process-document")
async def process_doc(doc: Document):
    # MOCK DOC ANALYSIS
    return {
        "weaknesses": ["Vague termination clause", "No SLA penalty defined"],
        "leveragePoints": ["Demand a net-30 payment term", "Ask for a 5% discount on bulk"]
    }

class MoMRequest(BaseModel):
    transcript: str

@app.post("/generate-mom")
async def generate_mom(req: MoMRequest):
    # MOCK AI LOGIC: Pretend the LLM read the transcript and built this JSON
    return {
        "mom": {
            "actionItems": ["Send API keys to Developer", "Setup AWS staging server"],
            "decisionsMade": ["Agreed on 30% advance", "Rejected 24/7 support clause"],
            "unresolvedIssues": ["Exact deadline for Phase 2"]
        },
        "timeline": {
            "estimatedWeeks": 4,
            "humanResourcesNeeded": ["1 Full Stack Dev", "1 Client Reviewer"],
            "capitalRequired": 80000
        },
        "payments": [
            {
                "description": "30% Advance Payment",
                "amount": 24000,
                "dueDate": "2026-03-30",
                "status": "Pending"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)