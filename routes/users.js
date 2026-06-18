import express from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users — Admin: get all users
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// GET /api/users/me — Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('purchasedEbooks')
      .populate('bookmarks');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
});

// PATCH /api/users/:id/role — Admin: change user role
router.patch('/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['user', 'writer', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update role.' });
  }
});

// PATCH /api/users/me — Update own profile (avatar)
router.patch('/me', protect, async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// DELETE /api/users/:id — Admin: delete user
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

export default router;
