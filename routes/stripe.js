import express from 'express';
import Stripe from 'stripe';
import Ebook from '../models/Ebook.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/authMiddleware.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const { ebookId } = req.body;

    const ebook = await Ebook.findById(ebookId);
    if (!ebook) return res.status(404).json({ message: 'Ebook not found.' });
    if (!ebook.isPublished) return res.status(400).json({ message: 'Ebook not available.' });

    // Prevent writer from buying own ebook
    if (ebook.writer.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot purchase your own ebook.' });
    }

    // Check if already purchased
    const user = await User.findById(req.user._id);
    if (user.purchasedEbooks.includes(ebookId)) {
      return res.status(400).json({ message: 'You already own this ebook.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: ebook.title,
              description: ebook.description.substring(0, 200),
              images: [ebook.coverImage],
            },
            unit_amount: Math.round(ebook.price * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        ebookId: ebook._id.toString(),
        userId: req.user._id.toString(),
        writerId: ebook.writer.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/ebooks/${ebookId}?cancelled=true`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create checkout session.', error: error.message });
  }
});

// POST /api/stripe/webhook — Stripe sends event here after payment
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { ebookId, userId, writerId } = session.metadata;

    try {
      const ebook = await Ebook.findById(ebookId);
      const user = await User.findById(userId);
      if (!ebook || !user) return res.status(400).json({ message: 'Resource not found.' });

      // Update user's purchased ebooks
      if (!user.purchasedEbooks.includes(ebookId)) {
        user.purchasedEbooks.push(ebookId);
        await user.save();
      }

      // Update ebook sales stats
      ebook.totalSales += 1;
      ebook.totalRevenue += ebook.price;
      await ebook.save();

      // Create transaction record
      await Transaction.create({
        type: 'purchase',
        user: userId,
        userEmail: user.email,
        ebook: ebookId,
        ebookTitle: ebook.title,
        writer: writerId,
        writerName: ebook.writerName,
        amount: ebook.price,
        stripeSessionId: session.id,
        status: 'completed',
      });

      console.log(`✅ Purchase completed: ${user.email} bought "${ebook.title}"`);
    } catch (err) {
      console.error('Error processing webhook:', err.message);
    }
  }

  res.json({ received: true });
});

// GET /api/stripe/verify-session/:sessionId — Verify payment on success page
router.get('/verify-session/:sessionId', protect, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status === 'paid') {
      const transaction = await Transaction.findOne({ stripeSessionId: req.params.sessionId })
        .populate('ebook', 'title coverImage price genre');
      res.json({ success: true, session, transaction });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify session.', error: error.message });
  }
});

export default router;
