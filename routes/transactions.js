import express from 'express';
import Transaction from '../models/Transaction.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/transactions — Admin: all transactions
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'fullName email')
      .populate('ebook', 'title coverImage')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
});

// GET /api/transactions/my — Logged-in user's purchase history
router.get('/my', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, status: 'completed' })
      .populate('ebook', 'title coverImage price genre')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your transactions.' });
  }
});

// GET /api/transactions/writer-sales — Writer's sales history
router.get('/writer-sales', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const transactions = await Transaction.find({ writer: req.user._id, status: 'completed' })
      .populate('user', 'fullName email')
      .populate('ebook', 'title coverImage price')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sales.' });
  }
});

// GET /api/transactions/admin-stats — Admin analytics
router.get('/admin-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const Ebook = (await import('../models/Ebook.js')).default;

    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalWriters = await User.countDocuments({ role: 'writer' });
    const totalEbooks = await Ebook.countDocuments({ isPublished: true });

    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalSold: { $sum: 1 } } }
    ]);

    const { totalRevenue = 0, totalSold = 0 } = revenueResult[0] || {};

    // Monthly sales chart data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          sales: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Genre distribution
    const genreData = await Ebook.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ totalUsers, totalWriters, totalEbooks, totalRevenue, totalSold, monthlySales, genreData });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats.', error: error.message });
  }
});

export default router;
