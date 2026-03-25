import React from 'react'
import Popup from './Popup'

function App() {
  const handleSessionStart = (sessionId, token) => {
    // 1. Save the keys to Chrome's local storage so the Google Meet tab can find them
    chrome.storage.local.set({ wingmanSessionId: sessionId, wingmanToken: token }, () => {
      // 2. Close the tiny extension popup window!
      window.close();
    });
  };

  return (
    <div className="w-96 min-h-[400px] bg-gray-900 overflow-hidden">
      <Popup onSessionStart={handleSessionStart} />
    </div>
  )
}

export default App