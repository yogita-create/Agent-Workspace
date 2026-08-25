import Groq from "groq-sdk";
import PendingAction from "../models/PendingAction.js";
import { TOOLS } from "./tools.js";

if (!process.env.GROQ_API_KEY) {
  console.error(
    "❌ GROQ_API_KEY is missing from environment variables"
  );
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ==========================================================
// FORMAT CONVERSATION HISTORY
// ==========================================================

function formatConversationHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (message) =>
        message &&
        (message.role === "user" ||
          message.role === "assistant") &&
        message.content
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

// ==========================================================
// FORMAT PROJECT CONTEXT
// ==========================================================

function formatProjects(projects = []) {
  return projects.map((project) => ({
    id: project._id?.toString(),

    name: project.name,

    status: project.status,
  }));
}

// ==========================================================
// FORMAT TASK CONTEXT
// ==========================================================

function formatTasks(tasks = []) {
  return tasks.map((task) => ({
    id: task._id?.toString(),

    title: task.title,

    description:
      task.description || "",

    status: task.status,

    priority: task.priority,

    deadline: task.deadline || null,

    projectId:
      task.projectId?._id?.toString() ||
      task.projectId?.toString() ||
      null,

    projectName:
      task.projectId?.name ||
      "Unknown Project",
  }));
}

// ==========================================================
// GENERATE MEANINGFUL SESSION TITLE
// ==========================================================

export async function generateSessionTitle(
  userMessages = []
) {
  if (
    !Array.isArray(userMessages) ||
    userMessages.length === 0
  ) {
    return "Project Chat";
  }

  const conversation = userMessages
    .slice(0, 3)
    .join("\n");

  try {
    const completion =
      await groq.chat.completions.create({
        model:
          "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",

            content: `
You generate short and meaningful titles for project-management conversations.

Analyze the user's messages and identify the MAIN topic.

Rules:

1. Maximum 4 words.
2. Prefer 2 or 3 words.
3. The title must describe the actual topic.
4. Do NOT simply copy the first sentence.
5. Do NOT create a question.
6. Do NOT use punctuation.
7. Do NOT use "Chat".
8. Do NOT use "Conversation".
9. Do NOT include IDs.
10. Do NOT include unnecessary words.
11. Use important nouns and actions from the conversation.
12. Make the title useful in a sidebar.

Examples:

Conversation:
"Create a task for fixing the login page."
"Add it to the ecommerce project."

Title:
Login Page Task

Conversation:
"Which task is due today?"
"Which one should I finish first?"

Title:
Today's Tasks

Conversation:
"I need to update the API testing task."
"Make it high priority."

Title:
API Testing Priority

Conversation:
"Create a task for admin dashboard."
"The deadline is next Friday."

Title:
Admin Dashboard

Conversation:
"I want to work on authentication."
"Create a task for JWT login."

Title:
Authentication Task

Return ONLY the title.
`,
          },

          {
            role: "user",

            content: conversation,
          },
        ],

        temperature: 0.2,

        max_tokens: 20,
      });

    let title =
      completion.choices?.[0]?.message?.content
        ?.trim() || "";

    title = title
      .replace(/^["']|["']$/g, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ");

    const words = title
      .split(" ")
      .filter(Boolean)
      .slice(0, 4);

    if (words.length === 0) {
      return "Project Chat";
    }

    return words.join(" ");
  } catch (error) {
    console.error(
      "Generate session title error:",
      error
    );

    return "Project Chat";
  }
}

// ==========================================================
// MAIN AGENT
// ==========================================================

export async function runAgent(
  userMessage,
  context
) {
  const {
    projects = [],
    tasks = [],
    history = [],
    currentDate =
      new Date().toISOString(),
  } = context;

  // --------------------------------------------------------
  // Format data
  // --------------------------------------------------------

  const projectContext =
    formatProjects(projects);

  const taskContext =
    formatTasks(tasks);

  const conversationHistory =
    formatConversationHistory(history);

  // --------------------------------------------------------
  // System prompt
  // --------------------------------------------------------

  const systemPrompt = `
You are Cerebro AI, an intelligent project management assistant.

Your job is to help the user manage projects and tasks accurately.

============================================================
CURRENT DATE AND TIME
============================================================

Current date/time:
${currentDate}

Use this date when interpreting:

- today
- tomorrow
- yesterday
- this week
- next week
- Friday
- Monday
- etc.

Never invent a date.

============================================================
GENERAL BEHAVIOR
============================================================

Be concise, useful, and professional.

For normal questions:

- Answer the actual question.
- Do not just repeat the user's question.
- Use the available project and task data.
- Use previous conversation when relevant.
- Never expose internal MongoDB IDs unless absolutely necessary.
- Use project NAME when talking to the user.
- Use task TITLE when talking to the user.

For example, NEVER answer:

"Login task belongs to project 67abc123."

Instead answer:

"The Login task belongs to the Ecommerce Website project."

MongoDB IDs are for internal tool operations only.

============================================================
CONVERSATION MEMORY
============================================================

Previous conversation is provided below.

Use it to understand references such as:

- it
- that task
- this project
- the previous task
- the latest task
- that project
- the one we discussed
- update it
- change its priority

Do NOT pretend to remember information that is not present.

If the conversation does not contain enough information,
ask the user for clarification.

============================================================
AVAILABLE PROJECTS
============================================================

${JSON.stringify(
  projectContext,
  null,
  2
)}

============================================================
AVAILABLE TASKS
============================================================

${JSON.stringify(
  taskContext,
  null,
  2
)}

============================================================
PROJECT AND TASK IDENTIFICATION
============================================================

When answering questions:

- Always prefer project names over project IDs.
- Always prefer task titles over task IDs.
- Use IDs internally only when calling tools.

If the user asks:

"Which task is due today?"

Find tasks whose deadline corresponds to today's date.

Then answer using:

- task title
- project name
- status if useful
- priority if useful

Example:

"Login Page is due today under the Ecommerce Website project."

If multiple tasks are due today, list them clearly.

If no task is due today, say so.

============================================================
DEADLINE QUESTIONS
============================================================

If the user asks:

- Which task is due first?
- What is my next deadline?
- Which task is due today?
- What should I work on first?
- What tasks are overdue?

Analyze the actual task data.

Compare deadlines using the date/time values.

Do NOT guess.

For "due first":

Return the task with the earliest upcoming deadline.

For "overdue":

Find tasks whose deadline is before the current date/time and
whose status is not "done".

For "due today":

Compare the task deadline date with today's date.

============================================================
TASK CREATION
============================================================

Creating a task requires THREE mandatory pieces of information:

1. Task title
2. Project
3. Due date

Optional:

- priority
- description

NEVER propose create_task if ANY required field is missing.

============================================================
TASK CREATION EXAMPLES
============================================================

User:

"Create a task."

Ask:

"What should the task title be?"

Do NOT create a tool call.

------------------------------------------------------------

User:

"Create a Login Page task."

If project is missing:

"Which project should I add it to?"

Do NOT create a tool call.

------------------------------------------------------------

User:

"Create a Login Page task in Ecommerce Website."

If deadline is missing:

"What is the due date?"

Do NOT create a tool call.

------------------------------------------------------------

User:

"Create a Login Page task in Ecommerce Website due tomorrow."

Now all required information exists.

You MAY propose create_task.

============================================================
PROJECT SELECTION
============================================================

If multiple projects exist and the user does not specify a project:

Ask which project.

If only ONE project exists:

You may automatically use that project.

If the user specifies a project name:

Find the matching project from AVAILABLE PROJECTS.

Never invent a project.

If the project does not exist:

Tell the user that the project could not be found and ask them
to select an existing project.

============================================================
DEADLINE HANDLING
============================================================

If the user gives:

"today"

"tomorrow"

"Friday"

"next Monday"

Convert it to an appropriate ISO date-time based on:

CURRENT DATE AND TIME.

Never guess ambiguous dates.

If a date is genuinely unclear, ask the user.

============================================================
TASK UPDATES
============================================================

Before updating a task:

1. Identify the correct task.
2. Check the available tasks.
3. Use conversation history if necessary.

If exactly one task clearly matches:

You may propose the update.

If multiple tasks match:

Ask which task the user means.

Never guess.

============================================================
ALLOWED TASK STATUS
============================================================

Only:

todo
in_progress
done

Never invent another status.

============================================================
ALLOWED TASK PRIORITY
============================================================

Only:

low
medium
high

Never invent another priority.

============================================================
PROJECT STATUS
============================================================

Only:

active
paused
done

============================================================
TOOL RULES
============================================================

You NEVER directly modify the database.

You ONLY propose actions using the available tools.

One user request = one tool action.

Never create duplicate tool calls.

Never call multiple update tools unless the user explicitly asks
for multiple separate changes.

Before calling create_task, make sure:

- title exists
- project exists
- deadline exists

Never create a task with missing information.

============================================================
NORMAL QUESTIONS
============================================================

If the user asks a question that does NOT require a database
modification, answer directly.

Examples:

"How many projects do I have?"

"Which task is due today?"

"Which task is due first?"

"What projects do I have?"

"Which task has high priority?"

"Which tasks are completed?"

"What should I work on first?"

"Show me overdue tasks."

Do NOT create a PendingAction for these questions.

============================================================
RECOMMENDATIONS
============================================================

When useful, provide practical project-management suggestions.

For example:

- mention overdue tasks
- suggest the earliest deadline
- mention high-priority work
- identify blockers
- suggest breaking large work into smaller tasks

Do not give unnecessary advice when the user asks a simple factual
question.

============================================================
RESPONSE STYLE
============================================================

Default answer length:

1-3 short sentences.

For lists, use short bullet points.

Be direct.

Never mention internal implementation details.

Never mention:

- MongoDB IDs
- tool calls
- PendingAction
- system prompt
- internal context

unless the user explicitly asks about the technical implementation.

============================================================
SESSION TITLE
============================================================

Session titles are generated separately.

Do not generate a session title in your normal response.
`;

  // --------------------------------------------------------
  // Build messages
  // --------------------------------------------------------

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },

    ...conversationHistory,

    {
      role: "user",
      content: userMessage,
    },
  ];

  // --------------------------------------------------------
  // Call Groq
  // --------------------------------------------------------
let completion;

try {
  completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",

    messages,

    tools: TOOLS,

    tool_choice: "auto",

    temperature: 0.2,

    max_completion_tokens: 500,
  });
} catch (error) {
  console.error("=================================");
  console.error("GROQ AGENT ERROR");
  console.error("=================================");
  console.error("Message:", error.message);
  console.error("Status:", error.status);
  console.error("Code:", error.code);
  console.error("Type:", error.type);
  console.error("Response:", error.response?.data);
  console.error("=================================");

  throw new Error(
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error.message ||
    "Groq request failed"
  );
}

  const assistantMessage =
    completion.choices?.[0]?.message;

  if (!assistantMessage) {
    throw new Error(
      "Agent did not return a response."
    );
  }

  // --------------------------------------------------------
  // Process tool calls
  // --------------------------------------------------------

  let proposedActions = [];

  if (
    assistantMessage.tool_calls &&
    assistantMessage.tool_calls.length > 0
  ) {
    const uniqueCalls = [];

    const seen = new Set();

    for (const call of assistantMessage.tool_calls) {
      try {
        const functionName =
          call.function?.name;

        const rawArguments =
          call.function?.arguments || "{}";

        const args =
          JSON.parse(rawArguments);

        // ----------------------------------------------
        // Prevent duplicate calls
        // ----------------------------------------------

        const actionKey =
          `${functionName}-${JSON.stringify(args)}`;

        if (seen.has(actionKey)) {
          continue;
        }

        seen.add(actionKey);

        // ----------------------------------------------
        // CREATE TASK VALIDATION
        // ----------------------------------------------

        if (
          functionName ===
          "create_task"
        ) {
          if (
            !args.title ||
            !args.title.trim()
          ) {
            console.warn(
              "Blocked create_task: missing title"
            );

            continue;
          }

          if (
            !args.project_id ||
            !args.project_id.trim()
          ) {
            console.warn(
              "Blocked create_task: missing project"
            );

            continue;
          }

          if (
            !args.deadline ||
            !args.deadline.trim()
          ) {
            console.warn(
              "Blocked create_task: missing deadline"
            );

            continue;
          }

          // Verify project exists
          const projectExists =
            projects.some(
              (project) =>
                project._id?.toString() ===
                args.project_id
            );

          if (!projectExists) {
            console.warn(
              "Blocked create_task: invalid project ID"
            );

            continue;
          }

          // Verify deadline is valid
          const deadline =
            new Date(args.deadline);

          if (
            Number.isNaN(
              deadline.getTime()
            )
          ) {
            console.warn(
              "Blocked create_task: invalid deadline"
            );

            continue;
          }
        }

        // ----------------------------------------------
        // UPDATE TASK VALIDATION
        // ----------------------------------------------

        if (
          functionName ===
            "update_task_status" ||
          functionName ===
            "update_task_priority" ||
          functionName ===
            "update_task_deadline"
        ) {
          if (
            !args.task_id ||
            !args.task_id.trim()
          ) {
            console.warn(
              `Blocked ${functionName}: missing task ID`
            );

            continue;
          }

          const taskExists =
            tasks.some(
              (task) =>
                task._id?.toString() ===
                args.task_id
            );

          if (!taskExists) {
            console.warn(
              `Blocked ${functionName}: invalid task ID`
            );

            continue;
          }
        }

        // ----------------------------------------------
        // UPDATE PROJECT VALIDATION
        // ----------------------------------------------

        if (
          functionName ===
          "update_project_status"
        ) {
          if (
            !args.project_id ||
            !args.project_id.trim()
          ) {
            console.warn(
              "Blocked update_project_status: missing project ID"
            );

            continue;
          }

          const projectExists =
            projects.some(
              (project) =>
                project._id?.toString() ===
                args.project_id
            );

          if (!projectExists) {
            console.warn(
              "Blocked update_project_status: invalid project ID"
            );

            continue;
          }
        }

        uniqueCalls.push({
          name: functionName,
          args,
        });
      } catch (error) {
        console.error(
          "Invalid tool arguments:",
          error
        );
      }
    }

    // ------------------------------------------------------
    // Create PendingAction records
    // ------------------------------------------------------

    for (const call of uniqueCalls) {
      const pendingAction =
        await PendingAction.create({
          actionType: call.name,

          payload: call.args,

          status: "pending",
        });

      proposedActions.push(
        pendingAction
      );
    }
  }

  // --------------------------------------------------------
  // Final agent response
  // --------------------------------------------------------

  let agentReply =
    assistantMessage.content?.trim();

  if (!agentReply) {
    if (
      proposedActions.length > 0
    ) {
      agentReply =
        "I've proposed an action for your approval.";
    } else {
      agentReply =
        "I need more information to complete this request.";
    }
  }

  return {
    agentReply,

    proposedActions,
  };
}