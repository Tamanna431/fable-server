import mongoose from 'mongoose';

const ebookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  fullContent: {
    type: String,
    required: [true, 'Full content is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    enum: ['Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Horror', 'Biography', 'Self-Help', 'History', 'Thriller', 'Adventure', 'Poetry']
  },
  coverImage: {
    type: String,
    required: [true, 'Cover image is required']
  },
  writer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  writerName: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Text index for search
ebookSchema.index({ title: 'text', writerName: 'text', description: 'text' });

const Ebook = mongoose.model('Ebook', ebookSchema);
export default Ebook;
