import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    // ==========================================
    // PROJECT NAME
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },


    // ==========================================
    // PROJECT DESCRIPTION
    // ==========================================

    description: {
      type: String,
      default: "",
      trim: true,
    },


    // ==========================================
    // TECH STACK
    // ==========================================

    techStack: {
      type: String,
      default: "",
      trim: true,
    },


    // ==========================================
    // PROJECT GOAL
    // ==========================================

    goal: {
      type: String,
      default: "",
      trim: true,
    },


    // ==========================================
    // PROJECT STATUS
    // ==========================================

    status: {
      type: String,

      enum: [
        "Active",
        "Completed",
        "On Hold",
      ],

      default: "Active",
    },


    // ==========================================
    // PROJECT MEMBERS
    // ==========================================

    members: [
      {
        name: {
          type: String,
          trim: true,
        },

        email: {
          type: String,
          trim: true,
        },

        role: {
          type: String,
          trim: true,
        },
      },
    ],
  },

  // ==========================================
  // TIMESTAMPS
  // ==========================================

  {
    timestamps: true,
  }
);


const Project =
  mongoose.model(
    "Project",
    projectSchema
  );


export default Project;