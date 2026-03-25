from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from transformers import pipeline

app = FastAPI()

# Load the local sentiment model on startup
print("⏳ Loading local AI model... (This takes a few seconds)")
sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
print("✅ Local AI Model loaded successfully!")

# Data model expected by the React frontend
class NegotiationData(BaseModel):
    transcript: str
    speaker: str = "Opponent"
    role: str = "Seller"
    floor_price: float = 40000.0
    ceiling_price: float = 50000.0
    # --- NEW FIELDS ADDED HERE ---
    project_details: str = ""
    timeline: str = "Pending" 

# 1. Simple intent detection (rule-based for hackathon)
def detect_intent(text):
    text = text.lower()
    
    # I added a few extra keywords for your specific demo!
    if any(word in text for word in ["maybe", "not sure", "i think", "hmm"]):
        return "Hesitation"
    elif any(word in text for word in ["too high", "expensive", "reduce", "lower", "budget", "match"]):
        return "Price Resistance"
    elif any(word in text for word in ["okay", "sounds good", "deal", "agree", "perfect"]):
        return "Agreement"
    elif any(word in text for word in ["must", "final", "non-negotiable"]):
        return "Aggressive"
    else:
        return "Neutral"

# 2. Suggestion engine
def get_suggestion(sentiment, intent, speaker):
    # If the user is speaking, we just want to track them, not give them opponent advice
    if speaker == "User":
        return "You are speaking. Keep it concise and hold your ground."

    # If the opponent is speaking, run your logic:
    if intent == "Hesitation":
        return "Try reinforcing value or offer flexibility."
    elif intent == "Price Resistance":
        return "Justify pricing or provide alternatives."
    elif intent == "Agreement":
        return "Close the deal now. Confirm next steps."
    elif intent == "Aggressive":
        return "Stay calm and counter logically. Don't fold."
    else:
        if sentiment == "NEGATIVE":
            return "They seem cautious. Clarify their concerns."
        else:
            return "Listen actively. Proceed normally."

@app.post("/analyze")
async def analyze_negotiation(data: NegotiationData):
    print(f"\n🎤 [{data.speaker}] Said: {data.transcript}")

    try:
        # Run local sentiment model
        sentiment_result = sentiment_model(data.transcript)[0]
        sentiment_label = sentiment_result['label']
        
        # Run intent detection
        intent = detect_intent(data.transcript)
        
        # Generate the tip based on your logic
        suggestion = get_suggestion(sentiment_label, intent, data.speaker)

        print(f"🧠 Local AI -> Intent: {intent} | Sentiment: {sentiment_label} | Conf: {sentiment_result['score']:.2f}")

        # Return the exact JSON format your React HUD is expecting
        return {
            "tip": suggestion,
            # We display your Intent if it caught one, otherwise fallback to Sentiment
            "sentiment": intent if intent != "Neutral" else sentiment_label.capitalize(),
            "recommendedPrice": f"${data.ceiling_price}",
            "timeline": data.timeline # <--- CHANGED: Now uses the Gemini-calculated timeline from Node
        }

    except Exception as e:
        print(f"❌ Local AI Error: {e}")
        return {
            "tip": "Processing... Keep listening.",
            "sentiment": "Neutral",
            "recommendedPrice": f"${data.ceiling_price}",
            "timeline": data.timeline # <--- CHANGED: Now uses the Gemini-calculated timeline from Node
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)