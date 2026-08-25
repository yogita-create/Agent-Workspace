import express from "express";
import Task from "../models/Task.js";

const router = express.Router();

// ==========================================
// GET ALL TASK ALERTS
// GET /api/alerts
// ==========================================

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({
      status: { $ne: "done" },
      deadline: { $ne: null },
    })
      .populate("projectId", "name")
      .sort({ deadline: 1 });

    // --------------------------------------
    // Current date in India
    // --------------------------------------

    const now = new Date();

    const indiaDateFormatter = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

    const todayString =
      indiaDateFormatter.format(now);

    const getDateString = (date) => {
      if (!date) return null;

      return indiaDateFormatter.format(
        new Date(date)
      );
    };

    // --------------------------------------
    // Convert date string to Date
    // --------------------------------------

    const getDayDifference = (dateString) => {
      const today = new Date(
        `${todayString}T00:00:00+05:30`
      );

      const target = new Date(
        `${dateString}T00:00:00+05:30`
      );

      const difference =
        target.getTime() - today.getTime();

      return Math.round(
        difference / (1000 * 60 * 60 * 24)
      );
    };

    // --------------------------------------
    // Generate alerts
    // --------------------------------------

    const alerts = [];

    for (const task of tasks) {
      const deadlineString =
        getDateString(task.deadline);

      if (!deadlineString) continue;

      const dayDifference =
        getDayDifference(deadlineString);

      let type = null;
      let severity = null;
      let title = null;
      let message = null;

      // ------------------------------------
      // OVERDUE
      // ------------------------------------

      if (dayDifference < 0) {
        const overdueDays =
          Math.abs(dayDifference);

        type = "overdue";
        severity = "danger";
        title = "Task Overdue";

        message =
          overdueDays === 1
            ? `${task.title} was due yesterday.`
            : `${task.title} is overdue by ${overdueDays} days.`;
      }

      // ------------------------------------
      // DUE TODAY
      // ------------------------------------

      else if (dayDifference === 0) {
        type = "due_today";
        severity = "warning";
        title = "Due Today";

        message = `${task.title} is due today.`;
      }

      // ------------------------------------
      // DUE TOMORROW
      // ------------------------------------

      else if (dayDifference === 1) {
        type = "due_tomorrow";
        severity = "info";
        title = "Due Tomorrow";

        message = `${task.title} is due tomorrow.`;
      }

      // ------------------------------------
      // UPCOMING
      // ------------------------------------

      else if (dayDifference > 1 && dayDifference <= 3) {
        type = "upcoming";
        severity = "info";
        title = "Upcoming Task";

        message =
          `${task.title} is due in ${dayDifference} days.`;
      }

      if (!type) continue;

      alerts.push({
        id: task._id,
        type,
        severity,
        title,
        message,

        task: {
          id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
        },

        project: task.projectId
          ? {
              id: task.projectId._id,
              name: task.projectId.name,
            }
          : null,
      });
    }

    // --------------------------------------
    // SUMMARY
    // --------------------------------------

    const summary = {
      total: alerts.length,

      overdue: alerts.filter(
        (alert) => alert.type === "overdue"
      ).length,

      dueToday: alerts.filter(
        (alert) => alert.type === "due_today"
      ).length,

      dueTomorrow: alerts.filter(
        (alert) => alert.type === "due_tomorrow"
      ).length,

      upcoming: alerts.filter(
        (alert) => alert.type === "upcoming"
      ).length,
    };

    res.status(200).json({
      success: true,
      today: todayString,
      summary,
      alerts,
    });
  } catch (error) {
    console.error(
      "Load alerts error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load alerts",
    });
  }
});

export default router;