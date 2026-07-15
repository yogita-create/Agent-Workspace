import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actionId: { type: mongoose.Schema.Types.ObjectId, ref: "PendingAction" },
  actionType: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  result: { type: String, default: "executed" }
}, { timestamps: true });

export default mongoose.model("AuditLog", auditLogSchema);