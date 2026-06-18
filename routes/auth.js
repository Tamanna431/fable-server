import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper: safe user object
const safeUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const allowedRoles = ['user', 'writer'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const user = await User.create({ fullName, email, password, role: userRole });

    const token = generateToken(user._id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

// ─── POST /api/auth/google ─────────────────────────────────────────────────
// Accepts a Google ID token from the frontend (after Google Sign-In)
router.post('/google', async (req, res) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required.' });
    }

    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name: fullName, picture: avatar } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Could not get email from Google account.' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // New Google user — apply selected role (writer or default user)
      const allowedRoles = ['user', 'writer'];
      const userRole = allowedRoles.includes(role) ? role : 'user';
      user = await User.create({
        fullName,
        email,
        avatar,
        googleId,
        role: userRole,
        isVerified: true, // Google accounts are pre-verified
      });
    } else {
      // Existing user — update Google info if missing
      if (!user.googleId) user.googleId = googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ message: 'Google authentication failed.', error: error.message });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
// Verify token & return current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: safeUser(user) });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

export default router;
