import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Not required for Google OAuth users
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'writer', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  googleId: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Wishlist / bookmarks
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook'
  }],
  // Purchased ebooks
  purchasedEbooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook'
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
