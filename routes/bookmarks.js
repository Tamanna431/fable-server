import express from 'express';
import User from '../models/User.js';
import Ebook from '../models/Ebook.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/bookmarks — Get user's bookmarks
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('bookmarks');
    res.json(user.bookmarks || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookmarks.' });
  }
});

// POST /api/bookmarks — Add bookmark
router.post('/', protect, async (req, res) => {
  try {
    const { ebookId } = req.body;

    const ebook = await Ebook.findById(ebookId);
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });

    const user = await User.findById(req.user._id);
    if (user.bookmarks.includes(ebookId)) {
      return res.status(400).json({ message: 'Already bookmarked.' });
    }

    user.bookmarks.push(ebookId);
    await user.save();
    res.json({ message: 'Bookmarked successfully.', bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add bookmark.' });
  }
});

// DELETE /api/bookmarks/:ebookId — Remove bookmark
router.delete('/:ebookId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.bookmarks = user.bookmarks.filter(
      (id) => id.toString() !== req.params.ebookId
    );
    await user.save();
    res.json({ message: 'Bookmark removed.', bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove bookmark.' });
  }
});

export default router;
