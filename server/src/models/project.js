import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    techStack: {
      type: String,
      default: "",
    },

    goal: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold"],
      default: "Active",
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },

    members: [
      {
        name: String,
        email: String,
        role: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;