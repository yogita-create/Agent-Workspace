import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  deadline: { type: Date, default: null },
  createdByAgent: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);