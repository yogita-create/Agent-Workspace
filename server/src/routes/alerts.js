import express from "express";
import Task from "../models/Task.js";
import PendingAction from "../models/PendingAction.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// ==========================================
// GET ALL FILTERED ALERTS FOR CURRENT USER
// GET /api/alerts
// ==========================================
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const preferences = {
      actionApproval: true,
      promptChips: true,
      notifyTaskAssigned: true,
      notifyDeadlines: true,
      notifyAiProposals: true,
      ...(user.preferences?.toObject ? user.preferences.toObject() : user.preferences || {}),
    };

    const dismissedAlerts = new Set(user.dismissedAlerts || []);

    // Clean user timezone
    let tz = "Asia/Kolkata";
    if (user.timezone && typeof user.timezone === "string") {
      const cleaned = user.timezone.replace(/\s*\(.*?\)\s*/g, "").trim();
      try {
        Intl.DateTimeFormat(undefined, { timeZone: cleaned });
        tz = cleaned;
      } catch {
        tz = "Asia/Kolkata";
      }
    }

    const now = new Date();
    const indiaDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const friendlyDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const todayString = indiaDateFormatter.format(now);

    const getDateString = (date) => {
      if (!date) return null;
      try {
        return indiaDateFormatter.format(new Date(date));
      } catch {
        return null;
      }
    };

    const getDayDifference = (dateString) => {
      const [tYear, tMonth, tDay] = todayString.split("-").map(Number);
      const [targetYear, targetMonth, targetDay] = dateString.split("-").map(Number);
      const todayUtc = Date.UTC(tYear, tMonth - 1, tDay);
      const targetUtc = Date.UTC(targetYear, targetMonth - 1, targetDay);
      return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
    };

    const alerts = [];

    // ------------------------------------------
    // 1. DEADLINE ALERTS (Overdue, Due Today, Due Tomorrow, Upcoming)
    // Controlled by preferences.notifyDeadlines
    // ------------------------------------------
    if (preferences.notifyDeadlines !== false) {
      const tasks = await Task.find({
        status: { $ne: "done" },
        deadline: { $ne: null },
      })
        .populate("projectId", "name")
        .sort({ deadline: 1 });

      for (const task of tasks) {
        const alertId = `deadline-${task._id}`;
        if (dismissedAlerts.has(alertId) || dismissedAlerts.has(task._id.toString())) {
          continue;
        }

        const deadlineString = getDateString(task.deadline);
        if (!deadlineString) continue;

        const dayDifference = getDayDifference(deadlineString);
        let type = null;
        let severity = null;
        let badge = null;
        let title = null;
        let message = null;

        if (dayDifference < 0) {
          const overdueDays = Math.abs(dayDifference);
          type = "overdue";
          severity = "danger";
          badge = "OVERDUE";
          title = "Task Overdue";
          message =
            overdueDays === 1
              ? `${task.title} was due yesterday.`
              : `${task.title} is overdue by ${overdueDays} days.`;
        } else if (dayDifference === 0) {
          type = "due_today";
          severity = "warning";
          badge = "DUE TODAY";
          title = "Due Today";
          message = `${task.title} is due today.`;
        } else if (dayDifference === 1) {
          type = "due_tomorrow";
          severity = "info";
          badge = "DUE TOMORROW";
          title = "Due Tomorrow";
          message = `${task.title} is due tomorrow.`;
        } else if (dayDifference > 1 && dayDifference <= 7) {
          type = "upcoming";
          severity = "info";
          badge = "UPCOMING";
          title = "Upcoming Task";
          message = `${task.title} is due in ${dayDifference} days.`;
        }

        if (!type) continue;

        let formattedDeadline = "";
        try {
          formattedDeadline = friendlyDateFormatter.format(new Date(task.deadline));
        } catch {
          formattedDeadline = deadlineString;
        }

        alerts.push({
          id: alertId,
          rawId: task._id.toString(),
          category: "deadline",
          type,
          severity,
          badge,
          title,
          message,
          deadlineDate: task.deadline,
          deadlineStr: formattedDeadline,
          priority: task.priority || "medium",
          taskKey: task.taskKey || "TSK",
          assigneeName: task.assignee?.name || "Unassigned",
          projectName: task.projectId?.name || "Workspace",
          task: {
            _id: task._id,
            id: task._id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            deadline: task.deadline,
            taskKey: task.taskKey,
          },
          project: task.projectId
            ? {
                id: task.projectId._id,
                name: task.projectId.name,
              }
            : null,
          createdAt: task.createdAt,
        });
      }
    }

    // ------------------------------------------
    // 2. TASK ASSIGNED ALERTS
    // Controlled by preferences.notifyTaskAssigned
    // ------------------------------------------
    if (preferences.notifyTaskAssigned !== false) {
      const assignedTasks = await Task.find({
        status: { $ne: "done" },
        $or: [
          { "assignee.email": user.email },
          { "assignee.name": user.name },
        ],
      })
        .populate("projectId", "name")
        .sort({ updatedAt: -1 })
        .limit(20);

      for (const task of assignedTasks) {
        const alertId = `assigned-${task._id}`;
        if (dismissedAlerts.has(alertId)) continue;

        let formattedDeadline = "No deadline";
        if (task.deadline) {
          try {
            formattedDeadline = friendlyDateFormatter.format(new Date(task.deadline));
          } catch {
            formattedDeadline = "";
          }
        }

        const assigner = task.createdBy?.name || "a teammate";

        alerts.push({
          id: alertId,
          rawId: task._id.toString(),
          category: "task_assigned",
          type: "task_assigned",
          severity: "info",
          badge: "ASSIGNED",
          title: "Task Assigned",
          message: `You were assigned to "${task.title}" by ${assigner}.`,
          deadlineDate: task.deadline,
          deadlineStr: formattedDeadline,
          priority: task.priority || "medium",
          taskKey: task.taskKey || "TSK",
          assigneeName: task.assignee?.name || user.name,
          projectName: task.projectId?.name || "Workspace",
          task: {
            _id: task._id,
            id: task._id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            deadline: task.deadline,
            taskKey: task.taskKey,
          },
          project: task.projectId
            ? {
                id: task.projectId._id,
                name: task.projectId.name,
              }
            : null,
          createdAt: task.updatedAt || task.createdAt,
        });
      }
    }

    // ------------------------------------------
    // 3. AI ACTION PROPOSALS ALERTS
    // Controlled by preferences.notifyAiProposals
    // ------------------------------------------
    if (preferences.notifyAiProposals !== false) {
      const pendingActions = await PendingAction.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(10);

      for (const action of pendingActions) {
        const alertId = `proposal-${action._id}`;
        if (dismissedAlerts.has(alertId)) continue;

        const actionName = (action.actionType || "action").replace(/_/g, " ");

        alerts.push({
          id: alertId,
          rawId: action._id.toString(),
          category: "ai_proposal",
          type: "ai_proposal",
          severity: "warning",
          badge: "AI PROPOSAL",
          title: "AI Action Proposal",
          message: `Workspace Bot drafted a pending ${actionName} for review.`,
          deadlineDate: null,
          deadlineStr: "Pending Approval",
          priority: "high",
          taskKey: "BOT",
          assigneeName: "Workspace Bot",
          projectName: "Workspace AI",
          actionId: action._id,
          actionType: action.actionType,
          payload: action.payload,
          createdAt: action.createdAt,
        });
      }
    }

    // ------------------------------------------
    // SUMMARY COUNTS
    // ------------------------------------------
    const summary = {
      total: alerts.length,
      overdue: alerts.filter((a) => a.type === "overdue").length,
      dueToday: alerts.filter((a) => a.type === "due_today").length,
      dueTomorrow: alerts.filter((a) => a.type === "due_tomorrow").length,
      upcoming: alerts.filter((a) => a.type === "upcoming").length,
      taskAssigned: alerts.filter((a) => a.type === "task_assigned").length,
      aiProposals: alerts.filter((a) => a.type === "ai_proposal").length,
      activeAlertsCount: alerts.length,
    };

    return res.status(200).json({
      success: true,
      today: todayString,
      summary,
      alerts,
    });
  } catch (error) {
    console.error("Load alerts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load alerts",
    });
  }
});

// ==========================================
// DISMISS AN ALERT (PERSISTED ON SERVER PER USER)
// POST /api/alerts/:id/dismiss and POST /api/alerts/dismiss
// ==========================================
const handleDismissAlert = async (req, res) => {
  try {
    const alertId = req.params.id || req.body?.id || req.body?.alertId;
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: "Alert ID is required to dismiss",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { dismissedAlerts: String(alertId) },
    });

    return res.json({
      success: true,
      message: "Alert dismissed successfully",
      dismissedId: alertId,
    });
  } catch (error) {
    console.error("Dismiss alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dismiss alert",
    });
  }
};

router.post("/:id/dismiss", verifyToken, handleDismissAlert);
router.post("/dismiss", verifyToken, handleDismissAlert);

export default router;