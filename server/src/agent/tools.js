export const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Propose creating a new task inside an existing project with optional assignee, priority, status and deadline",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The MongoDB _id of the project" },
          title: { type: "string", description: "Title of the task" },
          description: { type: "string", description: "Detailed description of the task" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
          status: { type: "string", enum: ["todo", "in_progress", "in_review", "done"], description: "Initial status" },
          deadline: { type: "string", description: "Due date in YYYY-MM-DD format" },
          assignee_name: { type: "string", description: "Name of person assigned to task" },
          assignee_email: { type: "string", description: "Email of assignee" },
        },
        required: ["project_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_task",
      description: "Propose assigning or reassigning a task to a team member",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The MongoDB _id of the task" },
          assignee_name: { type: "string", description: "Name of person to assign" },
          assignee_email: { type: "string", description: "Email of person to assign" },
        },
        required: ["task_id", "assignee_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "share_task",
      description: "Propose sharing a task with another collaborator/team member with an optional note",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The MongoDB _id of the task" },
          recipient_name: { type: "string", description: "Name of the person to share the task with" },
          recipient_email: { type: "string", description: "Email of the recipient" },
          role: { type: "string", enum: ["Collaborator", "Reviewer", "Watcher"], description: "Role for collaboration" },
          note: { type: "string", description: "Optional collaboration note or instruction" },
        },
        required: ["task_id", "recipient_name", "recipient_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Propose changing a task's status",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The MongoDB _id of the task" },
          status: { type: "string", enum: ["todo", "in_progress", "in_review", "done"] },
        },
        required: ["task_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_priority",
      description: "Propose changing a task's priority",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The MongoDB _id of the task" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        },
        required: ["task_id", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_deadline",
      description: "Propose changing a task's deadline",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The MongoDB _id of the task" },
          deadline: { type: "string", description: "Due date in ISO format or YYYY-MM-DD" },
        },
        required: ["task_id", "deadline"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Propose changing a project's status",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The MongoDB _id of the project" },
          status: { type: "string", enum: ["Active", "Completed", "On Hold"] },
        },
        required: ["project_id", "status"],
      },
    },
  },
];