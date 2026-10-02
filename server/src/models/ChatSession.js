import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "New Chat",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ChatSession", chatSessionSchema);