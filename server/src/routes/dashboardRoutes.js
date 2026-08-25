import express from "express";
import Task from "../models/Task.js";
import Project from "../models/project.js";

const router = express.Router();

/*
=========================================================
GET DASHBOARD SUMMARY

GET /api/dashboard/summary
=========================================================
*/

router.get("/summary", async (req, res) => {
  try {
    /*
    =====================================================
    LOAD PROJECTS
    =====================================================
    */

    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .lean();

    /*
    =====================================================
    LOAD TASKS
    =====================================================
    */

    const tasks = await Task.find()
      .populate("projectId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    /*
    =====================================================
    PROJECT STATISTICS
    =====================================================
    */

    const totalProjects = projects.length;

    const activeProjects = projects.filter(
      (project) => project.status === "Active"
    ).length;

    const completedProjects = projects.filter(
      (project) => project.status === "Completed"
    ).length;

    const onHoldProjects = projects.filter(
      (project) => project.status === "On Hold"
    ).length;

    /*
    =====================================================
    TASK STATISTICS
    =====================================================
    */

    const totalTasks = tasks.length;

    const todoTasks = tasks.filter(
      (task) => task.status === "todo"
    ).length;

    const inProgressTasks = tasks.filter(
      (task) => task.status === "in_progress"
    ).length;

    const completedTasks = tasks.filter(
      (task) => task.status === "done"
    ).length;

    /*
    =====================================================
    COMPLETION RATE
    =====================================================
    */

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round(
            (completedTasks / totalTasks) * 100
          );

    /*
    =====================================================
    PRIORITY STATISTICS
    =====================================================
    */

    const highPriorityTasks = tasks.filter(
      (task) => task.priority === "high"
    ).length;

    const mediumPriorityTasks = tasks.filter(
      (task) => task.priority === "medium"
    ).length;

    const lowPriorityTasks = tasks.filter(
      (task) => task.priority === "low"
    ).length;

    /*
    =====================================================
    PROJECT PERFORMANCE

    Progress is calculated from completed tasks.
    =====================================================
    */

    const projectPerformance = projects.map(
      (project) => {
        const projectTasks = tasks.filter(
          (task) =>
            task.projectId?._id?.toString() ===
            project._id.toString()
        );

        const total = projectTasks.length;

        const completed = projectTasks.filter(
          (task) => task.status === "done"
        ).length;

        const progress =
          total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
              );

        return {
          id: project._id,
          name: project.name,
          status: project.status,
          totalTasks: total,
          completedTasks: completed,
          progress,
        };
      }
    );

    /*
    =====================================================
    RECENT ACTIVITY

    We use task/project timestamps already available
    through Mongoose timestamps.
    =====================================================
    */

    const taskActivities = tasks
      .map((task) => ({
        id: `task-${task._id}`,
        type: "task",
        title: task.title,
        projectName:
          task.projectId?.name || "Unknown Project",
        status: task.status,
        updatedAt: task.updatedAt,
        createdAt: task.createdAt,
      }));

    const projectActivities = projects.map(
      (project) => ({
        id: `project-${project._id}`,
        type: "project",
        title: project.name,
        status: project.status,
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
      })
    );

    const recentActivity = [
      ...taskActivities,
      ...projectActivities,
    ]
      .sort(
        (a, b) =>
          new Date(b.updatedAt) -
          new Date(a.updatedAt)
      )
      .slice(0, 8);

    /*
    =====================================================
    RESPONSE
    =====================================================
    */

    return res.status(200).json({
      success: true,

      updatedAt: new Date(),

      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,

        totalTasks,
        todoTasks,
        inProgressTasks,
        completedTasks,

        completionRate,

        highPriorityTasks,
        mediumPriorityTasks,
        lowPriorityTasks,
      },

      projectPerformance,

      recentActivity,
    });
  } catch (error) {
    console.error(
      "Dashboard summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message,
    });
  }
});

export default router;