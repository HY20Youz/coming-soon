import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
  finishedAt:{ type: Date },
  coins:     { type: Number, default: 0 },
  rewardCents: { type: Number, default: 0 },
  mode: { type: String, enum: ['endless','arena'], default: 'endless' }
});

export default mongoose.model('GameSession', schema);
