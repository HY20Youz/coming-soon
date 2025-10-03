import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    balanceCents: { type: Number, default: 0 },
    // coins that didn't reach the next cent yet (carry across sessions)
    pendingCoins: { type: Number, default: 0 },
    // optional stats if you want to show lifetime coins
    totalCoins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('GameWallet', schema);
