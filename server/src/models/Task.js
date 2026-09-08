import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    taskKey: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "in_review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    deadline: {
      type: Date,
      default: null,
    },
    assignee: {
      name: { type: String, default: "Unassigned" },
      email: { type: String, default: "" },
      avatar: { type: String, default: "" },
    },
    createdBy: {
      name: { type: String, default: "Yogita" },
      email: { type: String, default: "yogita@example.com" },
    },
    sharedWith: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: {
          type: String,
          enum: ["Collaborator", "Reviewer", "Assignee", "Watcher"],
          default: "Collaborator",
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        sharedBy: {
          type: String,
          default: "Yogita",
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
    comments: [
      {
        author: { type: String, default: "Yogita" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdByAgent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate taskKey if empty before saving
taskSchema.pre("save", async function () {
  if (!this.taskKey) {
    const count = await mongoose.model("Task").countDocuments();
    this.taskKey = `TSK-${100 + count + 1}`;
  }
});

const Task = mongoose.model("Task", taskSchema);
export default Task;