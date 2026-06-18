# Fable – Ebook Sharing Platform 📚

A full-stack ebook sharing platform built with Next.js, Express.js, MongoDB, and Stripe.

## 🌐 Live URL
[https://fable-ebook.vercel.app](https://fable-ebook.vercel.app)

## 📌 Purpose
Fable democratizes access to literature by connecting readers with emerging writers. Readers can browse, purchase, and read original ebooks. Writers can publish and manage their work. Admins oversee the entire platform.

## ✨ Key Features
- 🔐 Role-based authentication (User, Writer, Admin) with JWT
- 📖 Browse, search, filter, and sort ebooks
- 💳 Stripe payment integration for ebook purchases
- 👤 Role-specific dashboards with full CRUD
- 📊 Admin analytics with charts (Recharts)
- 🖼️ imgBB image upload for covers and avatars
- 🔖 Bookmark/wishlist system
- 🌙 Dark mode toggle
- 📱 Fully responsive design

## 🛠️ Tech Stack (Server)
| Package | Purpose |
|---|---|
| express | HTTP server framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| stripe | Payment processing |
| cors | Cross-origin resource sharing |
| dotenv | Environment variables |
| nodemon | Dev server auto-restart |

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account
- Stripe account

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file based on `.env.example`:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
CLIENT_URL=http://localhost:3000
```

### Running
```bash
# Development
npm run dev

# Production
npm start
```

## 👤 Admin Credentials
- **Email**: admin@fable.com
- **Password**: Admin@123

## 📁 Project Structure
```
fable-server/
├── config/
│   └── db.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── User.js
│   ├── Ebook.js
│   └── Transaction.js
├── routes/
│   ├── auth.js
│   ├── ebooks.js
│   ├── users.js
│   ├── transactions.js
│   ├── bookmarks.js
│   └── stripe.js
├── .env.example
├── index.js
└── package.json
```
