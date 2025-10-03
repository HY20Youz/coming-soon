import { Router } from 'express';
import crypto from 'crypto';
import GameWallet from '../models/GameWallet.js';
import GameSession from '../models/GameSession.js';

const router = Router();

/** Progressive conversion:
 *  < $2     => 30 coins / cent
 *  $2-$4.99 => 70 coins / cent
 *  >= $5    => 120 coins / cent
 */
function coinsPerCentFor(balanceCents) {
  const dollars = (balanceCents || 0) / 100;
  if (dollars < 2) return 30;
  if (dollars < 5) return 70;
  return 120;
}

/** Convert coins progressively across tiers.
 *  Returns { rewardCents, remainderCoins, newBalanceCents }
 */
function convertCoinsProgressive({ startingBalanceCents, coinsTotal }) {
  let balanceCents = startingBalanceCents;
  let pool = Math.max(0, Math.floor(coinsTotal || 0));
  let minted = 0;

  // Mint one cent at a time so we can update rate once crossing thresholds
  while (true) {
    const rate = coinsPerCentFor(balanceCents);
    if (pool < rate) break;
    pool -= rate;
    minted += 1;
    balanceCents += 1; // we just minted 1 cent, balance increases → may change tier
  }

  return {
    rewardCents: minted,
    remainderCoins: pool,
    newBalanceCents: balanceCents,
  };
}

// --- Start a session ---
router.post('/start', async (req, res) => {
  try {
    const { email } = req.body || {};
    let { mode } = req.body || {};
    mode = mode === 'arena' ? 'arena' : 'endless';

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const sessionId = crypto.randomUUID();

    // Ensure wallet exists
    await GameWallet.updateOne(
      { email },
      { $setOnInsert: { email, balanceCents: 0, pendingCoins: 0, totalCoins: 0 } },
      { upsert: true }
    );

    await GameSession.create({ sessionId, email, mode });

    return res.json({ sessionId, mode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// --- Get wallet balance ---
router.get('/wallet', async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    let wallet = await GameWallet.findOne({ email });
    if (!wallet) wallet = await GameWallet.create({ email, balanceCents: 0, pendingCoins: 0 });

    return res.json({
      email,
      balanceCents: wallet.balanceCents || 0,
      pendingCoins: wallet.pendingCoins || 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// --- Finish a session ---
router.post('/finish', async (req, res) => {
  try {
    const { sessionId, coins = 0, elapsedMs = 0 } = req.body || {};
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    const sess = await GameSession.findOne({ sessionId });
    if (!sess) return res.status(404).json({ message: 'Session not found' });

    if (sess.finishedAt) {
      // idempotent
      const walletPrev = await GameWallet.findOne({ email: sess.email });
      return res.status(200).json({
        message: 'Already finished',
        rewardCents: sess.rewardCents,
        balanceCents: walletPrev?.balanceCents ?? 0,
      });
    }

    // Anti-abuse: server-time sanity
    const now = Date.now();
    const started = new Date(sess.startedAt).getTime();
    const serverElapsed = now - started;

    if (elapsedMs <= 0 || elapsedMs > 10 * 60 * 1000) {
      return res.status(400).json({ message: 'Invalid elapsed time' });
    }
    if (serverElapsed > 15 * 60 * 1000) {
      return res.status(400).json({ message: 'Session timed out' });
    }

    // Clamp coins
    const safeCoins = Math.max(0, Math.min(100000, Number(coins) || 0));

    // Fetch wallet
    let wallet = await GameWallet.findOne({ email: sess.email });
    if (!wallet) {
      wallet = await GameWallet.create({
        email: sess.email,
        balanceCents: 0,
        pendingCoins: 0,
        totalCoins: 0,
      });
    }

    // Pool = previous pending + this session coins
    const pool = (wallet.pendingCoins || 0) + safeCoins;

    const { rewardCents, remainderCoins, newBalanceCents } =
      convertCoinsProgressive({
        startingBalanceCents: wallet.balanceCents || 0,
        coinsTotal: pool,
      });

    // Save session
    sess.finishedAt = new Date();
    sess.coins = safeCoins;
    sess.rewardCents = rewardCents;
    await sess.save();

    // Update wallet
    wallet.balanceCents = newBalanceCents;
    wallet.pendingCoins = remainderCoins;
    wallet.totalCoins = (wallet.totalCoins || 0) + safeCoins;
    await wallet.save();

    return res.json({
      message: 'Round finished',
      rewardCents,
      balanceCents: wallet.balanceCents,
      pendingCoins: wallet.pendingCoins,
      mode: sess.mode,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
