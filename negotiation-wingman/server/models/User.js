const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Auth
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Just hash this with bcrypt quickly later
  
  // Constant Profile Details
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  skillset: [{ type: String }], // e.g., ["React", "Node", "System Design"]
  experienceLevel: { type: String }, // e.g., "5 years" or "Senior"

  // AI Context Boosters (I added these for better LLM leverage)
  currency: { type: String, default: "USD" }, // So the AI knows how to format arbitrage
  tonePreference: { type: String, default: "Assertive" }, // e.g., "Assertive", "Collaborative"
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);