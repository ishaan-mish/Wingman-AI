const Negotiation = require('../models/Negotiation');
const axios = require('axios'); // Add this at the top
exports.createSession = async (req, res) => {
  try {
const userId = req.user.userId;    
    const { 
      projectName, 
      opponentEntity, 
      description, 
      role,                  // NEW
      resourceDescription,   // NEW
      capitalContext,        // NEW
      floorPrice, 
      ceilingPrice, 
      referenceDocuments 
    } = req.body;

    const newSession = new Negotiation({
      userId,
      projectName,
      opponentEntity,
      description,
      role,
      resourceDescription,
      capitalContext,
      floorPrice,
      ceilingPrice,
      referenceDocuments,
      status: 'Active'
    });

    const session = await newSession.save();
    
    res.json({ 
      msg: `Session locked. AI initialized as ${role}.`, 
      sessionId: session.id 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getPastSessions = async (req, res) => {
  try {
    // Quick endpoint to load past MoMs and history
    const sessions = await Negotiation.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.processAudioChunk = async (req, res) => {
  const { sessionId, speaker, text } = req.body;

  try {
    // 1. Save transcript to MongoDB
    await Negotiation.findByIdAndUpdate(sessionId, {
      $push: { transcript: { speaker, text, timestamp: new Date() } }
    });

    // 2. Send the text to your Python AI Microservice
    const pythonResponse = await axios.post('http://localhost:8000/analyze-chunk', {
      text: text,
      speaker: speaker
    });

    // 3. Send the AI insights back to the React Extension UI
    res.status(200).json(pythonResponse.data);

  } catch (err) {
    console.error("Error communicating with Python service:", err.message);
    res.status(500).json({ error: 'Failed to process audio chunk' });
  }
};
exports.endSessionAndGenerateMoM = async (req, res) => {
  const { sessionId } = req.body;

  try {
    // 1. Mark session as completed and grab full transcript
    const session = await Negotiation.findByIdAndUpdate(sessionId, { status: 'Completed' }, { new: true });
    
    // Concatenate the whole transcript into one string
    const fullConversation = session.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

    // 2. Send to Python to generate MoM, Timeline, and Trackers
    const pythonResponse = await axios.post('http://localhost:8000/generate-mom', {
      transcript: fullConversation
    });

    // 3. Save the AI output to MongoDB
    session.finalMoM = pythonResponse.data.mom;
    session.projectTimeline = pythonResponse.data.timeline;
    session.paymentMilestones = pythonResponse.data.payments;
    await session.save();

    res.status(200).json({ msg: "MoM generated and saved successfully", data: session });

  } catch (err) {
    res.status(500).json({ error: 'Failed to generate MoM' });
  }
};