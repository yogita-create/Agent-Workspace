import mongoose from "mongoose";

const epicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "in_review",
        "done",
        "To Do",
        "In Progress",
        "In Review",
        "Done",
      ],
      default: "todo",
    },
    color: {
      type: String,
      default: "#6366f1",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Epic = mongoose.models.Epic || mongoose.model("Epic", epicSchema);
export default Epic;
