import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["active", "paused", "done"], default: "active" }
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);