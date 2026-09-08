import Task from "../models/Task.js";
import Project from "../models/project.js";

export async function executeAction(action) {
  const { actionType, payload } = action;

  switch (actionType) {
    case "create_task": {
      const task = await Task.create({
        projectId: payload.project_id,
        title: payload.title,
        description: payload.description || "",
        status: payload.status || "todo",
        priority: payload.priority || "medium",
        deadline: payload.deadline ? new Date(payload.deadline) : null,
        assignee: {
          name: payload.assignee_name || "Unassigned",
          email: payload.assignee_email || "",
        },
        createdByAgent: true,
      });

      return {
        success: true,
        message: "Task created successfully",
        data: task,
      };
    }

    case "assign_task": {
      const task = await Task.findByIdAndUpdate(
        payload.task_id,
        {
          assignee: {
            name: payload.assignee_name || "Unassigned",
            email: payload.assignee_email || "",
          },
        },
        { new: true }
      );

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        message: `Task assigned to ${payload.assignee_name || "Unassigned"}`,
        data: task,
      };
    }

    case "share_task": {
      const task = await Task.findById(payload.task_id);
      if (!task) {
        throw new Error("Task not found");
      }

      const shareEntry = {
        name: payload.recipient_name,
        email: payload.recipient_email,
        role: payload.role || "Collaborator",
        sharedAt: new Date(),
        sharedBy: "AI Agent",
        note: payload.note || "",
      };

      const existingIndex = task.sharedWith.findIndex(
        (s) => s.email.toLowerCase() === payload.recipient_email.toLowerCase()
      );

      if (existingIndex >= 0) {
        task.sharedWith[existingIndex] = shareEntry;
      } else {
        task.sharedWith.push(shareEntry);
      }

      if (payload.note && payload.note.trim()) {
        task.comments.push({
          author: "AI Agent",
          text: `Shared with ${payload.recipient_name} (${payload.role || "Collaborator"}): "${payload.note}"`,
          createdAt: new Date(),
        });
      }

      await task.save();

      return {
        success: true,
        message: `Task shared with ${payload.recipient_name} successfully`,
        data: task,
      };
    }

    case "update_task_status": {
      const task = await Task.findByIdAndUpdate(
        payload.task_id,
        {
          status: payload.status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        message: "Task status updated successfully",
        data: task,
      };
    }

    case "update_task_priority": {
      const task = await Task.findByIdAndUpdate(
        payload.task_id,
        {
          priority: payload.priority,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        message: "Task priority updated successfully",
        data: task,
      };
    }

    case "update_task_deadline": {
      const task = await Task.findByIdAndUpdate(
        payload.task_id,
        {
          deadline: payload.deadline,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!task) {
        throw new Error("Task not found");
      }

      return {
        success: true,
        message: "Task deadline updated successfully",
        data: task,
      };
    }

    case "update_project_status": {
      const project = await Project.findByIdAndUpdate(
        payload.project_id,
        {
          status: payload.status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!project) {
        throw new Error("Project not found");
      }

      return {
        success: true,
        message: "Project status updated successfully",
        data: project,
      };
    }

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}