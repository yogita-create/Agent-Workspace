import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "New Chat",
    },

    // We will use this later when authentication is added
    // For now, it can remain null
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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