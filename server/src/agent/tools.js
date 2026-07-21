export const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Propose creating a new task inside an existing project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The MongoDB _id of the project" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["project_id", "title"],
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
          task_id: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
        },
        required: ["task_id", "status"],
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
          project_id: { type: "string" },
          status: { type: "string", enum: ["active", "paused", "done"] },
        },
        required: ["project_id", "status"],
      },
    },
  },
];