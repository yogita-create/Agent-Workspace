import Task from "../models/Task.js";
import Project from "../models/project.js";

export async function executeAction(action) {
  const { actionType, payload } = action;

  switch (actionType) {
   case "create_task": {
  const project = await Project.findById(payload.project_id);

  if (!project) {
    throw new Error("Project not found");
  }

  const task = await Task.create({
    projectId: project._id,
    title: payload.title,
    description: payload.description || "",
    priority: payload.priority || "medium",
    deadline: payload.deadline || null,
    createdByAgent: true,
  });

  return {
    success: true,
    message: "Task created successfully",
    data: task,
    project: {
      id: project._id,
      name: project.name,
    },
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