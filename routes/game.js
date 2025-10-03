// backend/routes/game.js
import { Router } from 'express';
import crypto from 'crypto';
import GameWallet from '../models/GameWallet.js';
import GameSession from '../models/GameSession.js';

const router = Router();

/** === Coin→Cent rules per mode ===
 *  Endless: 5 coins  = 1 cent
 *  Arena  : 15 coins = 1 cent
 */
const COINS_PER_CENT_ENDLESS = 5;
const COINS_PER_CENT_ARENA = 15;

// --- Start session ---
router.post('/start', async (req, res) => {
  try {
    const { email } = req.body || {};
    // allow optional mode from client; default to 'endless'
    let { mode } = req.body || {};
    mode = mode === 'arena' ? 'arena' : 'endless';

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const sessionId = crypto.randomUUID();

    // Ensure wallet exists
    await GameWallet.updateOne(
      { email },
      { $setOnInsert: { email, balanceCents: 0 } },
      { upsert: true }
    );

    // Create session with chosen mode
    await GameSession.create({ sessionId, email, mode });
    return res.json({ sessionId, mode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// --- Wallet balance ---
router.get('/wallet', async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });
    let wallet = await GameWallet.findOne({ email });
    if (!wallet) wallet = await GameWallet.create({ email, balanceCents: 0 });
    return res.json({ email, balanceCents: wallet.balanceCents || 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// --- Finish session ---
router.post('/finish', async (req, res) => {
  try {
    const { sessionId, coins = 0, elapsedMs = 0 } = req.body || {};
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    const sess = await GameSession.findOne({ sessionId });
    if (!sess) return res.status(404).json({ message: 'Session not found' });

    if (sess.finishedAt) {
      // idempotent
      const wallet = await GameWallet.findOne({ email: sess.email });
      return res.status(200).json({
        message: 'Already finished',
        rewardCents: sess.rewardCents,
        balanceCents: wallet?.balanceCents ?? 0
      });
    }

    // Basic anti-abuse timing checks
    const now = Date.now();
    const started = new Date(sess.startedAt).getTime();
    const serverElapsed = now - started;
    if (elapsedMs <= 0 || elapsedMs > 10 * 60 * 1000) {
      return res.status(400).json({ message: 'Invalid elapsed time' });
    }
    if (serverElapsed > 15 * 60 * 1000) {
      return res.status(400).json({ message: 'Session timed out' });
    }

    const safeCoins = Math.max(0, Math.min(100000, Number(coins)));

    // Compute reward based on the session's mode
    const perCent =
      sess.mode === 'arena' ? COINS_PER_CENT_ARENA : COINS_PER_CENT_ENDLESS;
    const earnedCents = Math.floor(safeCoins / perCent); // integer cents

    // Save session + wallet
    sess.finishedAt = new Date();
    sess.coins = safeCoins;
    sess.rewardCents = earnedCents;
    await sess.save();

    const wallet = await GameWallet.findOneAndUpdate(
      { email: sess.email },
      { $inc: { balanceCents: earnedCents } },
      { new: true, upsert: true }
    );

    return res.json({
      message: 'Round finished',
      rewardCents: earnedCents,
      balanceCents: wallet?.balanceCents ?? earnedCents,
      mode: sess.mode
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
