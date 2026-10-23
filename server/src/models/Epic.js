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
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

epicSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate) return false;
  const isDone = ["done", "Done", "completed", "Completed"].includes(this.status);
  return new Date(this.dueDate) < new Date() && !isDone;
});

const Epic = mongoose.models.Epic || mongoose.model("Epic", epicSchema);
export default Epic;
