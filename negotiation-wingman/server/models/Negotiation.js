const mongoose = require('mongoose');

const NegotiationSchema = new mongoose.Schema({

  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Pre-Meeting Details
  projectName: { type: String, required: true },
  opponentEntity: { type: String }, // e.g., "Acme Corp" or "HR Manager"
  description: { type: String }, // What is the deal about?
  
  // The Leverage Guardrails
  floorPrice: { type: Number, required: true },   // The "Walk Away" number
  ceilingPrice: { type: Number, required: true }, // The "Ideal/Anchor" number
  
  // The Hackathon Document Trick (Store extracted text, not actual files)
  referenceDocuments: [{ type: String }], 
  
  // Live Data (Populated during the meeting)
  status: { type: String, enum: ['Pending', 'Active', 'Completed'], default: 'Pending' },
  transcript: [{
    speaker: String, // "Me" or "Opponent"
    text: String,
    timestamp: Date
  }],
  
  // Post-Meeting
  finalMoM: { type: Object }, // To dump the JSON summary from the LLM later
  
  createdAt: { type: Date, default: Date.now },

  // Add these inside your NegotiationSchema
  
  // 4. Timeline Expected (Resource, Capital, Human)
  projectTimeline: {
    estimatedWeeks: Number,
    humanResourcesNeeded: [String],
    capitalRequired: Number
  },

  // 5. Capital Payment Tracking
  paymentMilestones: [{
    description: String,
    amount: Number,
    dueDate: Date,
    status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' }
  }],

  // 6. Automatic MoMs
  finalMoM: {
    actionItems: [String],
    decisionsMade: [String],
    unresolvedIssues: [String]
  },
  // NEW: Are you buying a service/product, or selling one?
  role: { type: String, enum: ['Buyer', 'Seller'], required: true },
  
  // NEW: What resources and capital are in play? (Fed to LLM for timeline/MoM)
  resourceDescription: { type: String }, // e.g., "I have 2 junior devs, need server architecture"
  capitalContext: { type: String }
});

module.exports = mongoose.model('Negotiation', NegotiationSchema);  