const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Hackathon secret - put this in your .env later, hardcode for tonight if you must
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_hackathon_key"; 

exports.signup = async (req, res) => {
  try {
    const { email, password, name, age, gender, skillset, experienceLevel } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      email, password: hashedPassword, name, age, gender, skillset, experienceLevel
    });
    await user.save();

    // Create and send JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, userId: user.id });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

    // Send JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, userId: user.id });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};