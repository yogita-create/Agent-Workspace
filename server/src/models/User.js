import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  timezone: {
    type: String,
    default: "Asia/Kolkata",
    trim: true,
  },
  preferences: {
    actionApproval: { type: Boolean, default: true },
    promptChips: { type: Boolean, default: true },
    notifyTaskAssigned: { type: Boolean, default: true },
    notifyDeadlines: { type: Boolean, default: true },
    notifyAiProposals: { type: Boolean, default: true },
  },
  dismissedAlerts: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
