import React, { useState } from 'react';

export default function Popup({ onSessionStart }) {
  const [step, setStep] = useState(1); 
  const [token, setToken] = useState('');
  
  // Auth State
  const [isLogin, setIsLogin] = useState(true); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Session State (Added projectDescription)
  const [formData, setFormData] = useState({
    projectName: 'API Deal',
    opponentEntity: 'TechNova',
    role: 'Seller',
    floorPrice: 40000,
    ceilingPrice: 80000,
    capitalContext: 'Need 30% advance',
    resourceDescription: 'Working solo.',
    projectDescription: 'A custom Remote Patient Monitoring platform with SMS alerts.'
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    
    const payload = isLogin 
      ? { email, password } 
      : { 
          name, email, password,
          age: 21, gender: "Not Specified",
          skillset: ["Software Engineering"], experienceLevel: "Junior",
          currency: "USD", tonePreference: "Professional"
        };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.token) {
        setToken(data.token);
        setStep(2); 
      } else {
        alert(data.msg || "Authentication failed! Check backend terminal.");
      }
    } catch (err) {
      console.error("Auth failed", err);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/session/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.sessionId) {
        console.log("Timeline Generated:", data.timeline);
        onSessionStart(data.sessionId, token);
      }
    } catch (err) {
      console.error("Session start failed", err);
    }
  };

  return (
    <div className="w-96 p-6 bg-gray-900 border border-gray-700 rounded-xl text-white shadow-2xl font-sans m-auto mt-20">
      <h1 className="text-2xl font-bold mb-6 text-blue-400">Wingman Setup</h1>

      {step === 1 && (
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            {isLogin ? "Authenticate to connect to backend." : "Create a new Wingman account."}
          </p>
          
          {!isLogin && (
            <input 
              className="p-3 bg-gray-800 rounded border border-gray-700 outline-none focus:border-blue-500" 
              type="text" 
              placeholder="Your Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          )}
          
          <input 
            className="p-3 bg-gray-800 rounded border border-gray-700 outline-none focus:border-blue-500" 
            type="email" 
            placeholder="Email Address"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            className="p-3 bg-gray-800 rounded border border-gray-700 outline-none focus:border-blue-500" 
            type="password" 
            placeholder="Password"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          
          <button className="bg-blue-600 p-3 rounded hover:bg-blue-500 font-bold transition-colors">
            {isLogin ? "Login" : "Sign Up"}
          </button>

          <p 
            className="text-xs text-center text-gray-400 cursor-pointer hover:text-white mt-2"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign up here." : "Already have an account? Log in."}
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStartSession} className="flex flex-col gap-3">
          <div className="flex justify-between items-center mb-2">
             <span className="text-sm text-green-400 font-bold">✓ Authenticated</span>
          </div>

          <label className="text-xs text-gray-400 uppercase">Project Name</label>
          <input className="p-2 bg-gray-800 rounded text-sm border border-gray-700 outline-none" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} />
          
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-xs text-gray-400 uppercase">Floor Price</label>
              <input className="p-2 bg-gray-800 rounded text-sm w-full border border-gray-700 outline-none" type="number" value={formData.floorPrice} onChange={e => setFormData({...formData, floorPrice: e.target.value})} />
            </div>
            <div className="w-1/2">
              <label className="text-xs text-gray-400 uppercase">Ceiling Price</label>
              <input className="p-2 bg-gray-800 rounded text-sm w-full border border-gray-700 outline-none" type="number" value={formData.ceilingPrice} onChange={e => setFormData({...formData, ceilingPrice: e.target.value})} />
            </div>
          </div>

          <label className="text-xs text-gray-400 uppercase">Your Role</label>
          <select className="p-2 bg-gray-800 rounded text-sm border border-gray-700 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
            <option>Seller</option>
            <option>Buyer</option>
          </select>

          {/* NEW PROJECT DESCRIPTION FIELD */}
          <label className="text-xs text-gray-400 uppercase mt-1">Project Description (For Timeline)</label>
          <textarea 
            className="p-2 bg-gray-800 rounded text-sm border border-gray-700 outline-none w-full resize-none" 
            rows="2"
            value={formData.projectDescription} 
            onChange={e => setFormData({...formData, projectDescription: e.target.value})} 
          />

          <button className="bg-green-600 p-3 rounded hover:bg-green-500 font-bold mt-2 transition-colors">Inject HUD & Start</button>
        </form>
      )}
    </div>
  );
}