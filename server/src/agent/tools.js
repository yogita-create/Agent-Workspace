export const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",

      description:
        "Propose creating a new task inside an existing project. A project, task title, and deadline are mandatory.",

      parameters: {
        type: "object",

        properties: {
          project_id: {
            type: "string",
            description:
              "The MongoDB _id of an existing project",
          },

          title: {
            type: "string",
            description:
              "The title of the task",
          },

          description: {
            type: "string",
            description:
              "Optional description of the task",
          },

          deadline: {
            type: "string",
            format: "date-time",
            description:
              "The task deadline in ISO 8601 date-time format",
          },

          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description:
              "Optional task priority",
          },
        },

        required: [
          "project_id",
          "title",
          "deadline",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_task_status",

      description:
        "Propose changing an existing task's status",

      parameters: {
        type: "object",

        properties: {
          task_id: {
            type: "string",
            description:
              "The MongoDB _id of the task",
          },

          status: {
            type: "string",
            enum: [
              "todo",
              "in_progress",
              "done",
            ],
          },
        },

        required: [
          "task_id",
          "status",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_task_priority",

      description:
        "Propose changing an existing task's priority",

      parameters: {
        type: "object",

        properties: {
          task_id: {
            type: "string",
            description:
              "The MongoDB _id of the task",
          },

          priority: {
            type: "string",
            enum: [
              "low",
              "medium",
              "high",
            ],
          },
        },

        required: [
          "task_id",
          "priority",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_task_deadline",

      description:
        "Propose changing an existing task's deadline",

      parameters: {
        type: "object",

        properties: {
          task_id: {
            type: "string",
            description:
              "The MongoDB _id of the task",
          },

          deadline: {
            type: "string",
            format: "date-time",
            description:
              "The new task deadline in ISO 8601 format",
          },
        },

        required: [
          "task_id",
          "deadline",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_project_status",

      description:
        "Propose changing an existing project's status",

      parameters: {
        type: "object",

        properties: {
          project_id: {
            type: "string",
            description:
              "The MongoDB _id of the project",
          },

          status: {
            type: "string",
            enum: [
              "active",
              "paused",
              "done",
            ],
          },
        },

        required: [
          "project_id",
          "status",
        ],
      },
    },
  },
];
