import express from "express";
import { runAgent } from "../agent/agentLoop.js";
import Project from "../models/project.js";
import Task from "../models/Task.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    const projects = await Project.find();
    const tasks = await Task.find();

    const result = await runAgent(message, { projects, tasks });
    res.json(result);
  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;