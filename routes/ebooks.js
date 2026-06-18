import express from 'express';
import Ebook from '../models/Ebook.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/ebooks — Public: browse with search, filter, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      genre,
      minPrice,
      maxPrice,
      availability,
      sort = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    // Build query — only published ebooks for public
    const query = { isPublished: true };

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { writerName: { $regex: search, $options: 'i' } }
      ];
    }

    // Genre filter
    if (genre && genre !== 'All') {
      query.genre = genre;
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort options
    let sortOption = {};
    if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Ebook.countDocuments(query);
    const ebooks = await Ebook.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('writer', 'fullName avatar');

    res.json({
      ebooks,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ebooks.', error: error.message });
  }
});

// GET /api/ebooks/featured — Latest 6 published ebooks
router.get('/featured', async (req, res) => {
  try {
    const ebooks = await Ebook.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('writer', 'fullName avatar');
    res.json(ebooks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch featured ebooks.' });
  }
});

// GET /api/ebooks/top-writers — Writers with most sales
router.get('/top-writers', async (req, res) => {
  try {
    const topWriters = await Ebook.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: '$writer',
          writerName: { $first: '$writerName' },
          totalSales: { $sum: '$totalSales' },
          totalRevenue: { $sum: '$totalRevenue' },
          ebookCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'writerInfo'
        }
      },
      { $unwind: { path: '$writerInfo', preserveNullAndEmptyArrays: true } }
    ]);
    res.json(topWriters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch top writers.' });
  }
});

// GET /api/ebooks/:id — Single ebook (public)
router.get('/:id', async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id).populate('writer', 'fullName avatar email');
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });
    res.json(ebook);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ebook.', error: error.message });
  }
});

// POST /api/ebooks — Writer creates ebook
router.post('/', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const { title, description, fullContent, price, genre, coverImage } = req.body;

    if (!title || !description || !fullContent || price === undefined || !genre || !coverImage) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const ebook = await Ebook.create({
      title,
      description,
      fullContent,
      price: Number(price),
      genre,
      coverImage,
      writer: req.user._id,
      writerName: req.user.fullName,
      isPublished: false
    });

    res.status(201).json(ebook);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create ebook.', error: error.message });
  }
});

// PUT /api/ebooks/:id — Writer/Admin edits ebook
router.put('/:id', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });

    // Writer can only edit their own ebooks
    if (req.user.role === 'writer' && ebook.writer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this ebook.' });
    }

    const updatedEbook = await Ebook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updatedEbook);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ebook.', error: error.message });
  }
});

// PATCH /api/ebooks/:id/publish — Toggle publish status
router.patch('/:id/publish', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });

    if (req.user.role === 'writer' && ebook.writer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    ebook.isPublished = !ebook.isPublished;
    await ebook.save();
    res.json({ message: `Ebook ${ebook.isPublished ? 'published' : 'unpublished'}.`, ebook });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle publish.', error: error.message });
  }
});

// DELETE /api/ebooks/:id
router.delete('/:id', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });

    if (req.user.role === 'writer' && ebook.writer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this ebook.' });
    }

    await ebook.deleteOne();
    res.json({ message: 'Ebook deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete ebook.', error: error.message });
  }
});

// GET /api/ebooks/writer/my-ebooks — Writer's own ebooks
router.get('/writer/my-ebooks', protect, authorize('writer', 'admin'), async (req, res) => {
  try {
    const ebooks = await Ebook.find({ writer: req.user._id }).sort({ createdAt: -1 });
    res.json(ebooks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your ebooks.' });
  }
});

export default router;
