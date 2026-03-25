import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ContentWidget from './ContentWidget';

console.log("🔥 WINGMAN CORE: Initializing Speaker-Aware Scraper...");

const rootDiv = document.createElement('div');
rootDiv.id = 'wingman-ai-root';
rootDiv.style.cssText = `
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  background: transparent !important;
  display: block !important;
`;
document.body.appendChild(rootDiv);
const root = ReactDOM.createRoot(rootDiv);

let captionTimer = null;
let lastCapturedText = "";

const startScraper = (sessionId) => {
  console.log("🎯 RADAR ACTIVE: Tracking Live Speaker...");

  const extractSpeech = () => {
    // 1. Find all Name Tags on the screen
    const nameTags = document.querySelectorAll('.adE6rb');
    let rawText = "";
    let currentSpeaker = "Opponent"; // Default to Opponent

    if (nameTags.length > 0) {
      // 2. ISOLATE THE LATEST SPEAKER
      // We only care about the very last name tag, because that's who is talking right now
      const latestTag = nameTags[nameTags.length - 1];
      const speakerName = latestTag.innerText.toLowerCase();
      
      // If the latest tag is you, switch the flag
      if (speakerName.includes("you") || speakerName.includes("ishaan")) {
        currentSpeaker = "User";
      }
      
      // Extract text ONLY from the latest speaker's container so we don't mix sentences
      if (latestTag.parentElement) {
        rawText = latestTag.parentElement.innerText;
      }

    } else {
      // Failsafe: Grab generic text spans if name tags are hidden
      const spans = document.querySelectorAll('.CNusnd, .iTtpOb, .a4cQT');
      Array.from(spans).forEach(span => {
        rawText += " " + span.innerText;
      });
    }

    // 3. AGGRESSIVE CLEANER: Strip out your name and UI junk
    rawText = rawText
      .replace(/You/g, "")
      .replace(/Ishaan Mishra/gi, "") 
      .replace(/Someone wants to join this call/gi, "")
      .replace(/admit or deny/gi, "")
      .replace(/Intel® Smart Sound Technology/gi, "")
      .replace(/Microphone Array/gi, "")
      .replace(/\n/g, " ")       
      .replace(/\s+/g, " ")      
      .trim();

    // 4. Send the speech if it's new and has actual words
    if (rawText !== lastCapturedText && rawText.length > 5) {
      lastCapturedText = rawText;

      clearTimeout(captionTimer);
      
      // TRIGGER: Wait exactly 1 second after speaking stops to send it
      captionTimer = setTimeout(async () => {
        console.log(`🎤 SUCCESS - [${currentSpeaker}] HEARD:`, lastCapturedText);

        try {
          const response = await fetch('http://localhost:5000/api/session/audio-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              text: lastCapturedText,
              speaker: currentSpeaker // Dynamically sends "User" or "Opponent"
            })
          });

          const data = await response.json();
          
          window.dispatchEvent(new CustomEvent('wingman-data', { 
            detail: { 
              ...data, 
              // Add the speaker tag to the text so you can see it on the HUD!
              text: `[${currentSpeaker}] ${lastCapturedText}` 
            } 
          }));

        } catch (err) {
          console.error("❌ Backend Fetch Failed:", err);
        }
      }, 1000); 
    }
  };

  // Run the scanner every 500ms
  setInterval(extractSpeech, 500);
};

const startHud = (sessionId, token) => {
  console.log("🚀 Launching HUD");
  root.render(<ContentWidget sessionId={sessionId} token={token} />);
  startScraper(sessionId);
};

chrome.storage.local.get(['wingmanSessionId', 'wingmanToken'], (data) => {
  if (data.wingmanSessionId) startHud(data.wingmanSessionId, data.wingmanToken);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.wingmanSessionId) {
    chrome.storage.local.get(['wingmanToken'], (data) => {
      startHud(changes.wingmanSessionId.newValue, data.wingmanToken);
    });
  }
});

window.forceWingman = () => startHud("debug-session", "debug-token");