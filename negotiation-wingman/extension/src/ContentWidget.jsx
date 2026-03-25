import React, { useState, useEffect } from 'react';

export default function ContentWidget({ sessionId, token }) {
  const [isMeetingActive, setIsMeetingActive] = useState(true);
  const [lastTranscribed, setLastTranscribed] = useState(""); 
  const [transcriptLog, setTranscriptLog] = useState([]); 
  
  // 1. HUD Data State
  const [insight, setInsight] = useState({
    sentiment: "Neutral",
    tip: "Listening to conversation...",
    knowledge: ["SaaS multiples: 4x-5x ARR", "Ensure API keys upfront"],
    timeline: "6-8 weeks", 
    recommendedPrice: "$45,000"
  });

  const [postMeetingData, setPostMeetingData] = useState(null);
  
  // 🆕 NEW: State to hold and edit the final settled price
  const [editablePrice, setEditablePrice] = useState("");

  // 2. Listen for Data from the Scraper
  useEffect(() => {
    // Clear old memory when a new session starts
    chrome.storage.local.set({ meetingTranscript: [] });

    const handleData = (e) => {
      const { tip, sentiment, recommendedPrice, timeline, text } = e.detail;
      
      if (text) {
        setLastTranscribed(text);
        
        // 🧠 Save the script locally like a play! 
        setTranscriptLog(prev => {
          const newLog = [...prev, text];
          chrome.storage.local.set({ meetingTranscript: newLog });
          return newLog;
        });
      }
      
      setInsight(prev => ({
        ...prev,
        tip: tip || prev.tip,
        sentiment: sentiment || prev.sentiment,
        recommendedPrice: recommendedPrice || prev.recommendedPrice,
        timeline: timeline || prev.timeline
      }));
    };

    window.addEventListener('wingman-data', handleData);
    return () => window.removeEventListener('wingman-data', handleData);
  }, []);

  // 3. End Meeting Logic (SENDS LOCAL MEMORY TO GEMINI)
  const handleEndMeeting = () => {
    setIsMeetingActive(false); 
    
    // Pull the final script from Chrome Storage
    chrome.storage.local.get(['meetingTranscript'], async (result) => {
      const finalTranscriptArray = result.meetingTranscript || transcriptLog;
      const fullPlayScript = finalTranscriptArray.join('\n');

      console.log("📜 Sending this script to Gemini:\n", fullPlayScript);

      try {
        const response = await fetch('http://localhost:5000/api/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            transcript: fullPlayScript 
          })
        });
        
        const data = await response.json();
        
        if (data.error) {
          console.warn("API Error, Fallback used:", data.error);
          setPostMeetingData({
              finalMoM: { decisionsMade: ["None"], actionItems: ["None"], unresolvedIssues: ["None"], personalTips: ["Speak more clearly next time."] },
              projectTimeline: { estimatedWeeks: insight.timeline, capitalRequired: insight.recommendedPrice }
          });
          setEditablePrice("Not Settled"); // Fallback price
        } else {
          setPostMeetingData(data); // Real AI Data Loaded!
          
          // 🆕 NEW: Extract the settled price from Gemini and put it in the editable state
          if (data.finalMoM && data.finalMoM.settledPrice) {
              setEditablePrice(data.finalMoM.settledPrice);
          }
        }
      } catch (err) {
        console.error("Failed to generate MoM", err);
      }
    });
  };

  // 4. DOWNLOAD MoM LOGIC
  const handleDownloadMoM = () => {
    if (!postMeetingData) return;

    // 🆕 NEW: The download text now includes the editablePrice instead of just the target value
    const momText = `
=========================================
        MINUTES OF MEETING (MoM)
=========================================
Date: ${new Date().toLocaleDateString()}
Project Timeline: ${postMeetingData.projectTimeline.estimatedWeeks}
Final Settled Price: ${editablePrice}

--- DECISIONS MADE ---
${(postMeetingData.finalMoM?.decisionsMade || ["None"]).map(item => `[✓] ${item}`).join('\n')}

--- ACTION ITEMS ---
${(postMeetingData.finalMoM?.actionItems || ["None"]).map(item => `[ ] ${item}`).join('\n')}

--- UNRESOLVED ISSUES ---
${(postMeetingData.finalMoM?.unresolvedIssues || ["None"]).map(item => `[!] ${item}`).join('\n')}

=========================================
      WINGMAN PERSONAL COACHING
=========================================
${(postMeetingData.finalMoM?.personalTips || ["None"]).map(item => `💡 ${item}`).join('\n')}
=========================================
Generated autonomously by Wingman AI
=========================================
    `;

    const blob = new Blob([momText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Wingman_MoM_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- VIEW 1: LIVE HUD ---
  if (isMeetingActive) {
    return (
      <div className="fixed inset-0 pointer-events-none z-[2147483647] p-10 font-sans">
        <div className="w-full h-full grid grid-cols-2 grid-rows-2">
          
          <div className="p-4 bg-black/70 backdrop-blur-md border border-blue-500/50 rounded-xl text-white self-start justify-self-start pointer-events-auto max-w-sm shadow-2xl">
            <h3 className="text-[10px] text-blue-400 uppercase font-bold mb-2 tracking-widest">Market Intel</h3>
            <ul className="text-sm space-y-1 text-gray-200">
              {insight.knowledge.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-black/70 backdrop-blur-md border border-blue-500/50 rounded-xl text-white self-start justify-self-end pointer-events-auto w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
              <span className="flex items-center gap-2 text-[10px] font-bold text-red-400 animate-pulse">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> LIVE
              </span>
              <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded uppercase">{insight.sentiment}</span>
            </div>
            <p className="text-sm font-medium leading-tight italic">"{insight.tip}"</p>
            
            {lastTranscribed && (
              <div className="mt-3 pt-2 border-t border-white/5 opacity-40 italic">
                <p className="text-[9px] uppercase tracking-tighter text-gray-400 mb-1">Heard:</p>
                <p className="text-[10px] truncate leading-tight">{lastTranscribed}</p>
              </div>
            )}
          </div>

          <div className="mb-20 p-4 bg-black/70 backdrop-blur-md border border-purple-500/50 rounded-xl text-white self-end justify-self-start pointer-events-auto shadow-2xl">
            <h3 className="text-[10px] text-purple-400 uppercase font-bold mb-1">Delivery Estimate</h3>
            <p className="text-xl font-bold">{insight.timeline}</p>
          </div>

          <div className="mb-20 p-4 bg-black/70 backdrop-blur-md border border-green-500/50 rounded-xl text-white self-end justify-self-end pointer-events-auto flex flex-col items-end shadow-2xl gap-3">
            <div className="text-right">
              <h3 className="text-[10px] text-green-400 uppercase font-bold">Target Price</h3>
              <p className="text-3xl font-black text-green-400 leading-none">{insight.recommendedPrice}</p>
            </div>
            <button 
              onClick={handleEndMeeting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold text-[10px] uppercase tracking-wider transition-colors shadow-lg"
            >
              End Meeting
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- VIEW 2: POST-MEETING DASHBOARD ---
// --- VIEW 2: POST-MEETING DASHBOARD ---
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2147483647] flex items-center justify-center pointer-events-auto p-8 font-sans text-white">
       {!postMeetingData ? (
         <div className="text-white text-xl animate-pulse flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Compiling MoM & Tips...
         </div>
       ) : (
         <div className="bg-gray-900 border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8 grid grid-cols-2 gap-8">
<div>
              <h2 className="text-2xl font-bold mb-6 text-blue-400 text-left">Meeting Minutes</h2>
              
              <div className="mb-6 text-left">
                <h3 className="text-xs uppercase text-green-400 font-bold mb-2">Decisions</h3>
                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                  {postMeetingData.finalMoM?.decisionsMade?.length > 0 
                    ? postMeetingData.finalMoM.decisionsMade.map((item, i) => <li key={i}>{item}</li>)
                    : <li className="text-gray-500 italic">No formal decisions recorded.</li>
                  }
                </ul>
              </div>

              <div className="mb-6 text-left">
                <h3 className="text-xs uppercase text-yellow-400 font-bold mb-2">Actions</h3>
                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                  {postMeetingData.finalMoM?.actionItems?.length > 0 
                    ? postMeetingData.finalMoM.actionItems.map((item, i) => <li key={i}>{item}</li>)
                    : <li className="text-gray-500 italic">No action items assigned.</li>
                  }
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-6 text-left">
              <h2 className="text-2xl font-bold text-purple-400">Wingman Review</h2>
              
              <div className="bg-gray-800 p-4 rounded-xl border border-purple-500/30">
                <h3 className="text-[10px] uppercase text-purple-400 font-bold mb-2 tracking-widest">Personal Coaching Tips</h3>
                <ul className="space-y-2 text-sm text-gray-200">
                   {/* BULLETPROOF MAPPING */}
                   {(postMeetingData.finalMoM?.personalTips || ["Great job! No specific tips generated."]).map((tip, i) => (
                     <li key={i} className="flex gap-2">
                       <span className="text-purple-400">💡</span> {tip}
                     </li>
                   ))}
                </ul>
              </div>

              <div className="bg-gray-800 p-4 rounded-xl border border-green-500/50">
                <label className="text-[10px] text-green-400 uppercase tracking-widest font-bold block mb-2">
                  Final Settled Price (Editable)
                </label>
                <input 
                  type="text" 
                  value={editablePrice} 
                  onChange={(e) => setEditablePrice(e.target.value)}
                  className="w-full bg-gray-900 text-3xl font-black text-green-400 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-green-400 transition-colors"
                  placeholder="e.g. $45,000 or Not Settled"
                />
              </div>
              
              <div className="flex gap-4 mt-4">
                <button 
                  onClick={handleDownloadMoM} 
                  className="w-1/2 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download MoM
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-1/2 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all shadow-xl"
                >
                  Close
                </button>
              </div>

            </div>
         </div>
       )}
    </div>
  );
}