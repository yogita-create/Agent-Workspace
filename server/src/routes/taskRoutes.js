import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to all task routes
router.use(verifyToken);

// ==========================================
// GET ALL TASKS (with optional filters, scoped to user's orgs & shared tasks)
// GET /api/tasks
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { projectId, status, priority, assigneeEmail, search } = req.query;
    const filter = {};

    // Get all organizations the user belongs to
    const memberships = await Membership.find({ userId: req.user.id });
    const orgIds = memberships.map((m) => m.organizationId);

    // Get all projects belonging to user's organizations or legacy projects
    const userProjects = await Project.find({
      $or: [
        { organizationId: { $in: orgIds } },
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id.toString());

    const userEmail = req.user.email?.toLowerCase().trim();

    if (projectId) {
      if (
        mongoose.Types.ObjectId.isValid(projectId) &&
        userProjectIds.includes(projectId.toString())
      ) {
        filter.projectId = projectId;
      } else {
        // Return no tasks if project doesn't exist or isn't in user's orgs
        filter.projectId = { $in: [] };
      }
    } else {
      // Include tasks from user's projects OR tasks explicitly shared with user
      const baseAccessConditions = [{ projectId: { $in: userProjectIds } }];
      if (userEmail) {
        baseAccessConditions.push({ "sharedWith.email": userEmail });
        baseAccessConditions.push({ "assignee.email": userEmail });
      }
      filter.$or = baseAccessConditions;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assigneeEmail) {
      filter["assignee.email"] = assigneeEmail.toLowerCase().trim();
    }

    if (search && search.trim()) {
      const searchCondition = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { taskKey: { $regex: search.trim(), $options: "i" } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCondition }];
        delete filter.$or;
      } else {
        filter.$or = searchCondition;
      }
    }

    const tasks = await Task.find(filter)
      .populate("projectId", "name status organizationId members")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

// ==========================================
// GET UNIQUE COLLABORATORS & EMPLOYEES
// GET /api/tasks/collaborators/all
// ==========================================
router.get("/collaborators/all", async (req, res) => {
  try {
    const memberships = await Membership.find({ userId: req.user.id });
    const orgIds = memberships.map((m) => m.organizationId);

    const memberMap = new Map();

    // 1. Add current user
    if (req.user?.id) {
      const currentUser = await User.findById(req.user.id);
      if (currentUser) {
        memberMap.set(currentUser.email.toLowerCase(), {
          name: currentUser.name || "You",
          email: currentUser.email.toLowerCase(),
          role: "Lead Developer",
          projectName: "Workspace",
        });
      }
    }

    // 2. Fetch all organization members / employees
    const orgMemberships = await Membership.find({
      organizationId: { $in: orgIds },
    }).populate("userId", "name email");

    orgMemberships.forEach((m) => {
      if (m.userId && m.userId.email) {
        const email = m.userId.email.toLowerCase();
        let roleDisplay = "Employee";
        if (m.role === "admin") roleDisplay = "Admin";
        else if (m.role === "manager") roleDisplay = "Manager";
        else if (m.role === "leader") roleDisplay = "Team Lead";

        memberMap.set(email, {
          name: m.userId.name || email.split("@")[0],
          email: email,
          role: roleDisplay,
          projectName: "Organization",
        });
      }
    });

    // 3. Fetch project members from user's projects
    const projects = await Project.find({
      $or: [
        { organizationId: { $in: orgIds } },
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    }).select("members name");

    projects.forEach((proj) => {
      if (Array.isArray(proj.members)) {
        proj.members.forEach((m) => {
          if (m.email && m.name) {
            const email = m.email.toLowerCase();
            if (!memberMap.has(email) || memberMap.get(email).projectName === "Organization") {
              memberMap.set(email, {
                name: m.name,
                email: email,
                role: m.role || "Developer",
                projectName: proj.name,
              });
            }
          }
        });
      }
    });

    // 4. Default team members for rich collaboration UX
    const defaultTeam = [
      { name: "Yogita", email: "yogita@example.com", role: "Lead Developer" },
      { name: "yogita sawant", email: "yogitasawant2004@gmail.com", role: "mern stack devloper" },
      { name: "riya", email: "riya@gmail.com", role: "devloper" },
      { name: "neha", email: "neha@gmail.com", role: "frontend devloper" },
      { name: "mahesh", email: "mahesh@gmail.com", role: "backend devloper" },
      { name: "radha", email: "radha@gmail.com", role: "database devloper" },
    ];

    defaultTeam.forEach((tm) => {
      const email = tm.email.toLowerCase();
      if (!memberMap.has(email)) {
        memberMap.set(email, {
          name: tm.name,
          email: email,
          role: tm.role,
          projectName: "Team",
        });
      }
    });

    res.status(200).json({
      success: true,
      collaborators: Array.from(memberMap.values()),
    });
  } catch (error) {
    console.error("Get collaborators error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaborators",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE TASK
// GET /api/tasks/:taskId
// ==========================================
router.get("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate(
      "projectId",
      "name status members organizationId"
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const userEmail = req.user.email?.toLowerCase().trim();
    let hasAccess = false;

    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });
      if (membership) hasAccess = true;
    } else {
      hasAccess = true;
    }

    if (!hasAccess && userEmail) {
      const isSharedWithUser =
        Array.isArray(task.sharedWith) &&
        task.sharedWith.some((s) => s.email?.toLowerCase() === userEmail);
      const isAssignedToUser =
        task.assignee?.email?.toLowerCase() === userEmail;
      const isCreatedByUser =
        task.createdBy?.email?.toLowerCase() === userEmail;

      if (isSharedWithUser || isAssignedToUser || isCreatedByUser) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project's organization",
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Get single task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE NEW TASK
// POST /api/tasks
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      status,
      priority,
      deadline,
      assignee,
      createdBy,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: project.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    // Generate taskKey
    const count = await Task.countDocuments();
    const taskKey = `TSK-${100 + count + 1}`;

    const senderUser = await User.findById(req.user.id);

    const task = await Task.create({
      projectId,
      taskKey,
      title: title.trim(),
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      deadline: deadline ? new Date(deadline) : null,
      assignee: assignee || {
        name: "Unassigned",
        email: "",
      },
      createdBy: createdBy || {
        name: senderUser?.name || "Workspace Member",
        email: senderUser?.email || req.user.email || "",
      },
      sharedWith: [],
      comments: [],
    });

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status organizationId members"
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE TASK
// PUT /api/tasks/:taskId
// ==========================================
router.put("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      deadline,
      assignee,
      projectId,
    } = req.body;

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const userEmail = req.user.email?.toLowerCase().trim();
    let hasAccess = false;

    // Verify user is member of current project's organization
    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });
      if (membership) hasAccess = true;
    } else {
      hasAccess = true;
    }

    // Allow shared collaborator or assignee to update status
    if (!hasAccess && userEmail) {
      const isShared =
        Array.isArray(task.sharedWith) &&
        task.sharedWith.some((s) => s.email?.toLowerCase() === userEmail);
      const isAssignee = task.assignee?.email?.toLowerCase() === userEmail;
      if (isShared || isAssignee) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to update this task",
      });
    }

    // If changing projectId, verify user is member of target project's organization
    if (projectId && projectId.toString() !== task.projectId?._id?.toString()) {
      const targetProject = await Project.findById(projectId);
      if (!targetProject) {
        return res.status(404).json({
          success: false,
          message: "Target project not found",
        });
      }

      if (targetProject.organizationId) {
        const targetMembership = await Membership.findOne({
          userId: req.user.id,
          organizationId: targetProject.organizationId,
        });

        if (!targetMembership) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You are not a member of the target project's organization",
          });
        }
      }
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (projectId !== undefined) updateData.projectId = projectId;

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    }).populate("projectId", "name status organizationId members");

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});

// ==========================================
// SHARE TASK WITH COLLABORATOR
// POST /api/tasks/:taskId/share
// ==========================================
router.post("/:taskId/share", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name, email, role, note, sharedBy } = req.body;

    if (!name || !name.trim() || !email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recipient name and email are required to share the task",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Verify user authorization
    const userEmail = req.user.email?.toLowerCase().trim();
    let hasAccess = false;

    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });
      if (membership) hasAccess = true;
    } else {
      hasAccess = true;
    }

    if (!hasAccess && userEmail) {
      if (
        task.createdBy?.email?.toLowerCase() === userEmail ||
        task.assignee?.email?.toLowerCase() === userEmail ||
        (Array.isArray(task.sharedWith) &&
          task.sharedWith.some((s) => s.email?.toLowerCase() === userEmail))
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to share this task",
      });
    }

    // Ensure sharedWith is an initialized array
    if (!Array.isArray(task.sharedWith)) {
      task.sharedWith = [];
    }

    // Sender's name & email
    const senderUser = await User.findById(req.user.id);
    const senderName = senderUser?.name || sharedBy || req.user.email || "Workspace Member";

    // Lookup recipient user if in DB for matching name
    const normalizedEmail = email.trim().toLowerCase();
    const recipientUser = await User.findOne({ email: normalizedEmail });
    const recipientDisplayName = recipientUser?.name || name.trim();

    // Validate role
    const validRoles = ["Collaborator", "Reviewer", "Assignee", "Watcher"];
    const assignedRole = validRoles.includes(role) ? role : "Collaborator";

    const shareEntry = {
      name: recipientDisplayName,
      email: normalizedEmail,
      role: assignedRole,
      sharedAt: new Date(),
      sharedBy: senderName,
      note: note ? note.trim() : "",
    };

    // Check if already shared with this email
    const existingIndex = task.sharedWith.findIndex(
      (s) => s.email && s.email.toLowerCase() === normalizedEmail
    );

    if (existingIndex >= 0) {
      task.sharedWith[existingIndex] = shareEntry;
    } else {
      task.sharedWith.push(shareEntry);
    }

    // Ensure comments is an initialized array
    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    // Add note as a comment if provided
    if (note && note.trim()) {
      task.comments.push({
        author: senderName,
        text: `Shared this task with ${recipientDisplayName} (${assignedRole}): "${note.trim()}"`,
        createdAt: new Date(),
      });
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status organizationId members"
    );

    res.status(200).json({
      success: true,
      message: `Task shared with ${recipientDisplayName} successfully`,
      task: populatedTask,
    });
  } catch (error) {
    console.error("Share task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share task",
      error: error.message,
    });
  }
});

// ==========================================
// REMOVE COLLABORATOR FROM TASK (UNSHARE)
// DELETE /api/tasks/:taskId/share/:shareEmail
// ==========================================
router.delete("/:taskId/share/:shareEmail", async (req, res) => {
  try {
    const { taskId, shareEmail } = req.params;

    if (!shareEmail) {
      return res.status(400).json({
        success: false,
        message: "Collaborator email is required",
      });
    }

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const userEmail = req.user.email?.toLowerCase().trim();
    let hasAccess = false;

    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });
      if (membership) hasAccess = true;
    } else {
      hasAccess = true;
    }

    const targetEmail = decodeURIComponent(shareEmail).toLowerCase().trim();

    if (!hasAccess && userEmail) {
      if (
        task.createdBy?.email?.toLowerCase() === userEmail ||
        task.assignee?.email?.toLowerCase() === userEmail ||
        targetEmail === userEmail // User unsharing themselves
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to remove collaborators from this task",
      });
    }

    if (!Array.isArray(task.sharedWith)) {
      task.sharedWith = [];
    }

    const prevLength = task.sharedWith.length;
    task.sharedWith = task.sharedWith.filter(
      (s) => s.email && s.email.toLowerCase() !== targetEmail
    );

    if (task.sharedWith.length === prevLength) {
      return res.status(404).json({
        success: false,
        message: "Collaborator not found on this task",
      });
    }

    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    const senderUser = await User.findById(req.user.id);
    const senderName = senderUser?.name || req.user.email || "Workspace Member";

    task.comments.push({
      author: senderName,
      text: `Removed collaborator ${targetEmail} from task`,
      createdAt: new Date(),
    });

    await task.save();

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status organizationId members"
    );

    res.status(200).json({
      success: true,
      message: "Collaborator removed successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Remove collaborator error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove collaborator",
      error: error.message,
    });
  }
});

// ==========================================
// ASSIGN / REASSIGN TASK
// POST /api/tasks/:taskId/assign
// ==========================================
router.post("/:taskId/assign", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name, email } = req.body;

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Verify organization membership
    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    task.assignee = {
      name: name ? name.trim() : "Unassigned",
      email: email ? email.trim().toLowerCase() : "",
    };

    await task.save();

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status organizationId members"
    );

    res.status(200).json({
      success: true,
      message: `Task assigned to ${name || "Unassigned"}`,
      task: populatedTask,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign task",
      error: error.message,
    });
  }
});

// ==========================================
// ADD COMMENT / ACTIVITY TO TASK
// POST /api/tasks/:taskId/comments
// ==========================================
router.post("/:taskId/comments", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { author, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const userEmail = req.user.email?.toLowerCase().trim();
    let hasAccess = false;

    // Verify organization membership
    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });
      if (membership) hasAccess = true;
    } else {
      hasAccess = true;
    }

    if (!hasAccess && userEmail) {
      const isShared =
        Array.isArray(task.sharedWith) &&
        task.sharedWith.some((s) => s.email?.toLowerCase() === userEmail);
      const isAssignee = task.assignee?.email?.toLowerCase() === userEmail;
      if (isShared || isAssignee) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to comment on this task",
      });
    }

    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    const senderUser = await User.findById(req.user.id);
    const commentAuthor = author || senderUser?.name || req.user.email || "Workspace Member";

    task.comments.push({
      author: commentAuthor,
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    res.status(200).json({
      success: true,
      message: "Comment added",
      comments: task.comments,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE TASK
// DELETE /api/tasks/:taskId
// ==========================================
router.delete("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate("projectId");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Verify organization membership
    if (task.projectId && task.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: task.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
});

export default router;
