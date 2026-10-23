import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
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
    acceptanceCriteria: {
      type: String,
      default: "",
    },
    epic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      default: null,
    },
    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Backlog",
        "To Do",
        "In Progress",
        "In Review",
        "Done",
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
      ],
      default: "todo",
    },
    priority: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "urgent",
        "Low",
        "Medium",
        "High",
        "Urgent",
      ],
      default: "medium",
    },
    assignee: {
      name: { type: String, default: "Unassigned" },
      email: { type: String, default: "" },
    },
    storyPoints: {
      type: Number,
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

storySchema.virtual("isOverdue").get(function () {
  if (!this.dueDate) return false;
  const isDone = ["done", "Done", "completed", "Completed"].includes(this.status);
  return new Date(this.dueDate) < new Date() && !isDone;
});

storySchema.pre("save", function () {
  if (this.epic && !this.epicId) {
    this.epicId = this.epic;
  } else if (this.epicId && !this.epic) {
    this.epic = this.epicId;
  }
});

const Story = mongoose.models.Story || mongoose.model("Story", storySchema);
export default Story;
