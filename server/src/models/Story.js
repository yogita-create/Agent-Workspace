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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Story = mongoose.models.Story || mongoose.model("Story", storySchema);
export default Story;
