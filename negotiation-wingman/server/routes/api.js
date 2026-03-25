const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const authController = require('../controllers/authController');
const negotiationController = require('../controllers/negotiationController');

// --- AUTH ROUTES ---
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// --- NEGOTIATION ROUTES ---
// Protected by the 'auth' middleware
router.post('/session/start', auth, negotiationController.createSession);
router.get('/sessions', auth, negotiationController.getPastSessions);

// We will build the controller for this in the next step (The LLM Wrapper)
router.post('/session/audio-chunk', auth, negotiationController.processAudioChunk);
router.post('/session/end', auth, negotiationController.endSessionAndGenerateMoM);
module.exports = router;    