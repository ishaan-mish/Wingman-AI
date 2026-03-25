const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Session = require('./models/Negotiation'); 
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const db = process.env.MONGO_URI || 'mongodb+srv://ishaanmishra507:918117@mydb.s0azucw.mongodb.net/?appName=MyDB';

mongoose.connect(db)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log(err));

// 🚀 HACKATHON MEMORY STORE: Keeps the timeline fast and accessible
const activeSessions = {};
// 🚨 NOTE: Please remember to change this key and use process.env.GEMINI_API_KEY when you deploy!
const GEMINI_API_KEY = "AIzaSyBhPZb2JFyrjfbJX3DOveluE8HUj1I4qNk"; 

// --- NEW ROUTE: START SESSION & CALCULATE TIMELINE ---
app.post('/api/session/start', async (req, res) => {
    const { role, floorPrice, ceilingPrice, projectDescription } = req.body;
    let estimatedTimeline = "6-8 weeks"; // Safe fallback

    // Ask Gemini for the timeline based on your description
    try {
        const prompt = `You are an expert tech project manager. Project Description: "${projectDescription}". Budget: $${floorPrice} to $${ceilingPrice}. Estimate a realistic development timeline. Return ONLY a short string like "4-6 weeks" or "3 months". Do not include any other text or punctuation.`;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const geminiData = await geminiResponse.json();
        if (geminiData.candidates && geminiData.candidates[0].content.parts[0].text) {
            estimatedTimeline = geminiData.candidates[0].content.parts[0].text.trim();
        }
        console.log(`🤖 Gemini Calculated Timeline: ${estimatedTimeline}`);
    } catch (err) {
        console.error("❌ Gemini Timeline Error:", err.message);
    }

    // Generate a unique ID for this meeting
    const sessionId = "sess_" + Date.now();
    
    // Store it in memory for instant retrieval during the audio chunks
    activeSessions[sessionId] = {
        role,
        floorPrice,
        ceilingPrice,
        projectDescription,
        timeline: estimatedTimeline,
        transcript: [] // <--- INITIALIZE MEMORY HERE
    };

    res.json({ sessionId, timeline: estimatedTimeline });
});

// --- NEW ROUTE: END SESSION & GENERATE DYNAMIC MoM ---
app.post('/api/session/end', async (req, res) => {
    // We now receive the FULL formatted transcript directly from the React Extension Storage!
    const { sessionId, transcript } = req.body;
    
    if (!transcript || transcript.trim().length === 0) {
        return res.json({ error: "No transcript received from extension storage." });
    }

    console.log(`📜 Generating MoM for Transcript Length: ${transcript.length} chars`);

    // Look up the active session data just to get the timeline/price context
    const sessionData = activeSessions[sessionId] || { timeline: "Unknown", ceilingPrice: "Unknown" };

    // 3. The Gemini MoM + Coaching Prompt (UPDATED FOR SETTLED PRICE)
    const prompt = `
    You are an elite Executive Assistant and Negotiation Coach. Read the following meeting transcript and generate a structured Minutes of Meeting (MoM) alongside personal coaching tips for the 'User'.
    
    === TRANSCRIPT (PLAY FORMAT) ===
    ${transcript}
    
    === INSTRUCTIONS ===
    Analyze the conversation and extract:
    1. decisionsMade: An array of 1-3 strings summarizing key agreements.
    2. actionItems: An array of 1-3 strings of tasks assigned or promised.
    3. unresolvedIssues: An array of 1-2 strings of things left hanging or pushed to later.
    4. personalTips: An array of 1-3 strings. Analyze how the 'User' handled the negotiation. Give them direct, actionable feedback on what they did well or what they need to improve next time.
    5. settledPrice: A string containing the final agreed-upon price or deal amount. If no exact price was settled, write "Not Settled".
    
    Respond ONLY with a valid JSON object in this exact format:
    {
      "decisionsMade": ["decision 1", "decision 2"],
      "actionItems": ["action 1", "action 2"],
      "unresolvedIssues": ["issue 1"],
      "personalTips": ["tip 1", "tip 2"],
      "settledPrice": "$45,000"
    }
    `;

    try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" } // Force JSON!
            })
        });

        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates[0].content.parts[0].text;
        const dynamicMoM = JSON.parse(rawText);
        
        console.log("✅ Dynamic MoM, Tips & Price Generated!");

        // Send it back to React!
        res.json({
            finalMoM: dynamicMoM,
            projectTimeline: { 
                estimatedWeeks: sessionData.timeline, 
                capitalRequired: sessionData.ceilingPrice 
            }
        });

    } catch (err) {
        console.error("❌ Gemini MoM Error:", err);
        res.status(500).json({ error: "Failed to generate MoM" });
    }
});

// --- EXISTING AUDIO CHUNK ROUTE ---
app.post('/api/session/audio-chunk', async (req, res) => {
    const { sessionId, text } = req.body;
    
    try {
        // Look up the active session data
        let sessionData = activeSessions[sessionId];
        
        if (!sessionData) {
            sessionData = { 
                role: "Seller", 
                floorPrice: 40000, 
                ceilingPrice: 100000,
                projectDescription: "Custom Software",
                timeline: "6-8 weeks",
                transcript: []
            };
            activeSessions[sessionId] = sessionData; // Keep it alive
        }

        // 🧠 HACKATHON MEMORY: Save the line so Gemini can read it at the end
        if (!sessionData.transcript) sessionData.transcript = [];
        sessionData.transcript.push({ speaker: req.body.speaker || "Opponent", text });

        // Forward to Python FastAPI Brain
        const pythonResponse = await fetch('http://localhost:8001/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: text,
                speaker: req.body.speaker || "Opponent", 
                role: sessionData.role,
                floor_price: sessionData.floorPrice,
                ceiling_price: sessionData.ceilingPrice,
                project_details: sessionData.projectDescription,
                timeline: sessionData.timeline // <--- Passing the Gemini timeline to Python!
            })
        });
        
        const data = await pythonResponse.json();
        
        res.json({
            tip: data.tip || "Analyze complete.",
            sentiment: data.sentiment || "Neutral",
            recommendedPrice: data.recommendedPrice || "$45,000",
            timeline: data.timeline || sessionData.timeline
        });

    } catch (err) {
        console.error("Pipeline Error:", err.message);
        res.status(500).json({ 
            tip: "Brain connection flickering...", 
            sentiment: "Neutral" 
        });
    }
});

app.use('/api', require('./routes/api'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));