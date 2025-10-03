import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  balanceCents: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('GameWallet', schema);
