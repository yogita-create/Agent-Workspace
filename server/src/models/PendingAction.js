import mongoose from "mongoose";

const pendingActionSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ["create_task", "update_task_status", "update_task_priority", "set_task_deadline", "update_project_status"],
    required: true
  },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "executed"], default: "pending" },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("PendingAction", pendingActionSchema);