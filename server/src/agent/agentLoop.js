import Groq from "groq-sdk";
import PendingAction from "../models/PendingAction.js";
import { TOOLS } from "./tools.js";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ---------- Formatting helpers ----------

function statusLabel(status) {
  return (
    {
      done: "✅ Done",
      in_progress: "🚧 In Progress",
      todo: "🕒 To-Do",
      in_review: "👀 In Review",
    }[status] || "🕒 To-Do"
  );
}

function priorityLabel(priority) {
  return (
    {
      urgent: "🔥 Urgent",
      high: "⚡ High",
      medium: "🔷 Medium",
      low: "☕ Low",
    }[priority] || "🔷 Medium"
  );
}

function isOverdue(t) {
  return (
    t.deadline && new Date(t.deadline) < new Date() && t.status !== "done"
  );
}

function formatDeadline(t) {
  if (!t.deadline) return "No deadline set";
  const date = new Date(t.deadline).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return isOverdue(t) ? `${date} (⚠️ **Overdue**)` : date;
}

// Renders a single task as a clean, readable markdown block
function formatTaskBlock(t, { showProject = true } = {}) {
  const taskKeyStr = t.taskKey ? `\`${t.taskKey}\` ` : "";
  const lines = [`- ${taskKeyStr}**${t.title}**`];

  const metaParts = [
    `Status: ${statusLabel(t.status)}`,
    `Priority: ${priorityLabel(t.priority)}`,
  ];

  const projName = t.projectId?.name || (typeof t.projectId === "string" ? t.projectId : null);
  if (showProject && projName) {
    metaParts.push(`Project: **${projName}**`);
  }

  if (t.assignee?.name) {
    metaParts.push(`Assignee: **${t.assignee.name}**`);
  }

  metaParts.push(`Due: ${formatDeadline(t)}`);
  lines.push(`  ${metaParts.join(" • ")}`);

  if (t.description && t.description.trim()) {
    lines.push(`  > ${t.description.trim()}`);
  }

  if (Array.isArray(t.sharedWith) && t.sharedWith.length > 0) {
    const shares = t.sharedWith
      .map((s) => `${s.name || s.email} (${s.role || "Collaborator"})`)
      .join(", ");
    lines.push(`  🤝 *Shared with:* ${shares}`);
  }

  return lines.join("\n");
}

function formatTaskList(tasks, opts = {}) {
  return tasks.map((t) => formatTaskBlock(t, opts)).join("\n\n");
}

// ---------- Compact Context & System Prompt Builder ----------

function buildSystemPrompt(context) {
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const projects = context.projects || [];
  const tasks = context.tasks || [];
  const collaborators = context.collaborators || [];

  // Compact project summaries (avoids large schema dumps)
  const projectLines = projects.map((p) => {
    const pid = (p._id || p.id || "").toString();
    const members = Array.isArray(p.members) && p.members.length > 0
      ? ` | Members: ${p.members.map((m) => m.name || m.email).join(", ")}`
      : "";
    return `- [Project ID: ${pid}] "${p.name}" (Status: ${p.status || "Active"}${members})`;
  });

  // Compact task summaries (avoids thousands of tokens of internal properties)
  const taskLines = tasks.map((t) => {
    const tid = (t._id || t.id || "").toString();
    const key = t.taskKey ? `[Key: ${t.taskKey}] ` : "";
    const projName = t.projectId?.name || "Workspace";
    const projId = (t.projectId?._id || t.projectId || "").toString();
    const assignee = t.assignee?.name || t.assignee?.email || "Unassigned";
    const due = t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : "none";
    const shared = Array.isArray(t.sharedWith) && t.sharedWith.length > 0
      ? ` | Shared: ${t.sharedWith.map((s) => s.name || s.email).join(", ")}`
      : "";
    return `- [Task ID: ${tid}] ${key}"${t.title}" | Proj: "${projName}" (ID: ${projId}) | Status: ${t.status} | Priority: ${t.priority} | Assignee: ${assignee} | Due: ${due}${shared}`;
  });

  // Compact collaborators list
  const memberLines = collaborators.map(
    (c) => `- ${c.name} (${c.email || "no-email"}) - ${c.role || "Member"}`
  );

  return `You are Workspace Bot, an expert AI Project Management & Agile Workflow Assistant for Agent Workspace.
You help developers, managers, and teams monitor projects, manage tasks, track deadlines, assign tasks, and collaborate smoothly.

CURRENT DATE & TIME:
- Reference Date: ${todayFormatted} (${todayISO})
- Tasks with deadline < "${todayISO}" and status not "done" are strictly Overdue.

WORKSPACE CONTEXT:
Active Projects (${projects.length}):
${projectLines.join("\n") || "No projects available."}

Tasks (${tasks.length}):
${taskLines.join("\n") || "No tasks available."}

Team Members & Collaborators:
${memberLines.join("\n") || "None specified."}

CORE BEHAVIOR & RULES:
1. **Accurate Task & Project Answers**:
   - Answer queries regarding tasks (assigned to users, overdue, due soon, priorities, statuses) based on the exact context above.
   - For queries like "Which tasks are assigned to Yogita?", list all tasks where the assignee is Yogita or her email.
   - For "What tasks are high priority or urgent?", list tasks with high or urgent priority.
   - For "Which tasks are overdue?", identify tasks where deadline < "${todayISO}" and status != "done".
   - For "Summarize projects", break down completion count, in-progress, and status for each project.

2. **Actions & Tool Usage**:
   - When the user asks to create, assign, share, update status, update priority, or set deadlines, you MUST invoke the corresponding tool function.
   - **Crucial**: Always use the exact MongoDB 24-character hexadecimal "_id" for "project_id" and "task_id" (as provided in the brackets above).
   - If the user asks to create a task and did NOT specify a project, use the first active project ID from the list as default.
   - If the user asks to create a task vaguely without a title (e.g. "hey create the new task"), ask politely for the title, project, and priority so you can draft it properly.
   - When you call a tool, also write a concise, friendly text message explaining that you've prepared the proposal and that an action card is displayed below for their 1-click confirmation.

3. **Response Formatting**:
   - Use clean GitHub-flavored markdown with emojis for status and priority.
   - Use headings (###), bold text, and bullet points.
   - Display task keys in inline code blocks like \`TSK-101\`.
   - Keep answers clear, supportive, and professional.`;
}

// ---------- Tool Arguments Normalizer ----------

function normalizeToolArgs(actionType, args, context) {
  const projects = context.projects || [];
  const tasks = context.tasks || [];
  const collaborators = context.collaborators || [];

  const normalized = { ...args };

  // Normalize project_id
  if (actionType === "create_task" || actionType === "update_project_status") {
    let matchedProject = null;
    if (normalized.project_id) {
      matchedProject = projects.find(
        (p) =>
          (p._id || p.id)?.toString() === normalized.project_id ||
          p.name?.toLowerCase() === normalized.project_id.toLowerCase()
      );
    }
    if (!matchedProject && projects.length > 0) {
      matchedProject = projects[0];
    }
    if (matchedProject) {
      normalized.project_id = (matchedProject._id || matchedProject.id).toString();
      normalized.project_name = matchedProject.name;
    }
  }

  // Normalize task_id
  if (
    actionType === "assign_task" ||
    actionType === "share_task" ||
    actionType === "update_task_status" ||
    actionType === "update_task_priority" ||
    actionType === "update_task_deadline"
  ) {
    let matchedTask = null;
    if (normalized.task_id) {
      matchedTask = tasks.find(
        (t) =>
          (t._id || t.id)?.toString() === normalized.task_id ||
          t.taskKey?.toLowerCase() === normalized.task_id.toLowerCase() ||
          t.title?.toLowerCase().includes(normalized.task_id.toLowerCase())
      );
    }
    if (matchedTask) {
      normalized.task_id = (matchedTask._id || matchedTask.id).toString();
      normalized.task_title = matchedTask.title;
      normalized.task_key = matchedTask.taskKey;
    }
  }

  // Normalize assignee email
  if (actionType === "assign_task" && !normalized.assignee_email && normalized.assignee_name) {
    const foundCollab = collaborators.find(
      (c) => c.name?.toLowerCase().includes(normalized.assignee_name.toLowerCase())
    );
    if (foundCollab && foundCollab.email) {
      normalized.assignee_email = foundCollab.email;
    }
  }

  // Normalize recipient email for share_task
  if (actionType === "share_task" && !normalized.recipient_email && normalized.recipient_name) {
    const foundCollab = collaborators.find(
      (c) => c.name?.toLowerCase().includes(normalized.recipient_name.toLowerCase())
    );
    if (foundCollab && foundCollab.email) {
      normalized.recipient_email = foundCollab.email;
    }
  }

  return normalized;
}

// ---------- Fallback (Deterministic & Offline) Intent Engine ----------

export async function fallbackResponse(userMessage, context) {
  const lowerMsg = userMessage.toLowerCase().trim();
  const tasks = context.tasks || [];
  const projects = context.projects || [];
  const collaborators = context.collaborators || [];

  // 1. CREATE TASK INTENT
  const isCreateTask =
    lowerMsg.includes("create task") ||
    lowerMsg.includes("create a task") ||
    lowerMsg.includes("add task") ||
    lowerMsg.includes("add a task") ||
    lowerMsg.includes("new task");

  if (isCreateTask) {
    // Attempt to extract title from quotes: "title" or 'title'
    let titleMatch = userMessage.match(/["']([^"']+)["']/);
    let title = titleMatch ? titleMatch[1].trim() : "";

    if (!title) {
      // Try pattern like: create task called <name> or create a task <name>
      const calledMatch = userMessage.match(
        /(?:called|named|task)\s+([a-zA-Z0-9\s_-]+?)(?:\s+(?:in|with|for|at|under|priority)|$)/i
      );
      if (calledMatch && calledMatch[1] && !["new", "a", "the"].includes(calledMatch[1].trim().toLowerCase())) {
        title = calledMatch[1].trim();
      }
    }

    // Extract priority
    let priority = "medium";
    if (lowerMsg.includes("urgent")) priority = "urgent";
    else if (lowerMsg.includes("high")) priority = "high";
    else if (lowerMsg.includes("low")) priority = "low";

    // Extract project
    let targetProject = projects.find((p) =>
      lowerMsg.includes(p.name.toLowerCase())
    );
    if (!targetProject && projects.length > 0) {
      targetProject = projects[0];
    }

    // If we have a title, propose the creation action!
    if (title && title.length > 1) {
      try {
        const payload = {
          project_id: (targetProject?._id || targetProject?.id || "").toString(),
          title,
          priority,
          status: "todo",
        };

        const pendingAction = await PendingAction.create({
          actionType: "create_task",
          payload,
          status: "pending",
        });

        return {
          agentReply: `### ⚡ Action Prepared: Create Task\n\nI have prepared a proposal to create task **"${title}"** in project **${targetProject?.name || "Workspace"}** with **${priorityLabel(priority)}** priority.\n\nPlease review and approve the action card below to add it to your board.`,
          proposedActions: [pendingAction],
        };
      } catch (e) {
        console.error("Fallback create task error:", e);
      }
    }

    // If no title provided (e.g. "hey create the new task"), guide the user nicely
    const projectOptions = projects.slice(0, 4).map((p) => `\`${p.name}\``).join(", ");
    return {
      agentReply: `### ➕ Create a New Task\n\nI'd be glad to help you create a new task! Could you please share a few details:\n\n1. **Title** — What is the name of the task?\n2. **Project** — Which project does it belong to? ${projectOptions ? `(e.g., ${projectOptions})` : ""}\n3. **Priority** — \`urgent\`, \`high\`, \`medium\`, or \`low\`\n4. **Assignee** — (Optional) Who should work on it?\n\n*Quick example:* *"Create a task called 'Setup Auth' in high priority"*`,
      proposedActions: [],
    };
  }

  // 2. ASSIGN TASK INTENT
  if (lowerMsg.includes("assign ") || lowerMsg.includes("reassign ")) {
    const keyMatch = userMessage.match(/TSK-\d+/i);
    const targetKey = keyMatch ? keyMatch[0].toUpperCase() : null;
    const matchedTask = targetKey
      ? tasks.find((t) => t.taskKey?.toUpperCase() === targetKey)
      : null;

    let matchedMember = collaborators.find((c) =>
      lowerMsg.includes(c.name.toLowerCase())
    );

    if (matchedTask && matchedMember) {
      try {
        const pendingAction = await PendingAction.create({
          actionType: "assign_task",
          payload: {
            task_id: (matchedTask._id || matchedTask.id).toString(),
            assignee_name: matchedMember.name,
            assignee_email: matchedMember.email || "",
          },
          status: "pending",
        });

        return {
          agentReply: `### ⚡ Action Prepared: Assign Task\n\nI've prepared a proposal to assign task \`${matchedTask.taskKey}\` (**${matchedTask.title}**) to **${matchedMember.name}**.\n\nPlease review and approve the action card below.`,
          proposedActions: [pendingAction],
        };
      } catch (e) {
        console.error("Fallback assign task error:", e);
      }
    }
  }

  // 3. UPDATE TASK STATUS INTENT
  if (
    lowerMsg.includes("mark as done") ||
    lowerMsg.includes("set to done") ||
    lowerMsg.includes("move to done") ||
    lowerMsg.includes("update status")
  ) {
    const keyMatch = userMessage.match(/TSK-\d+/i);
    const targetKey = keyMatch ? keyMatch[0].toUpperCase() : null;
    const matchedTask = targetKey
      ? tasks.find((t) => t.taskKey?.toUpperCase() === targetKey)
      : null;

    let targetStatus = "done";
    if (lowerMsg.includes("in progress")) targetStatus = "in_progress";
    else if (lowerMsg.includes("review")) targetStatus = "in_review";
    else if (lowerMsg.includes("to-do") || lowerMsg.includes("todo")) targetStatus = "todo";

    if (matchedTask) {
      try {
        const pendingAction = await PendingAction.create({
          actionType: "update_task_status",
          payload: {
            task_id: (matchedTask._id || matchedTask.id).toString(),
            status: targetStatus,
          },
          status: "pending",
        });

        return {
          agentReply: `### ⚡ Action Prepared: Update Status\n\nI've prepared a proposal to update task \`${matchedTask.taskKey}\` (**${matchedTask.title}**) status to **${statusLabel(targetStatus)}**.\n\nPlease review and approve the action card below.`,
          proposedActions: [pendingAction],
        };
      } catch (e) {
        console.error("Fallback update status error:", e);
      }
    }
  }

  // 4. HIGH PRIORITY / URGENT QUERY
  if (
    lowerMsg.includes("high priority") ||
    lowerMsg.includes("urgent") ||
    lowerMsg.includes("priority")
  ) {
    const highTasks = tasks.filter(
      (t) => t.priority === "high" || t.priority === "urgent"
    );
    if (highTasks.length === 0) {
      return {
        agentReply:
          "### ⚡ Priority Overview\n\nGood news! There are no **high-priority** or **urgent** tasks pending in your workspace right now. 🎉",
        proposedActions: [],
      };
    }
    const overdueCount = highTasks.filter(isOverdue).length;
    const closing =
      overdueCount > 0
        ? `\n> ⚠️ **Heads up:** **${overdueCount}** of these critical tasks ${
            overdueCount === 1 ? "is" : "are"
          } currently overdue and need immediate attention.`
        : "\n✨ None of these high-priority items are overdue yet.";
    return {
      agentReply: `### ⚡ High-Priority & Urgent Tasks (${highTasks.length})\n\n${formatTaskList(
        highTasks
      )}${closing}`,
      proposedActions: [],
    };
  }

  // 5. ASSIGNED TO QUERY
  if (
    lowerMsg.includes("assigned to") ||
    lowerMsg.includes("my task") ||
    lowerMsg.includes("tasks for")
  ) {
    let searchName = "yogita";
    if (lowerMsg.includes("assigned to")) {
      const match = lowerMsg.match(/assigned to\s+([a-zA-Z]+)/);
      if (match && match[1]) searchName = match[1];
    }

    const matchedTasks = tasks.filter(
      (t) =>
        t.assignee?.name?.toLowerCase().includes(searchName) ||
        t.assignee?.email?.toLowerCase().includes(searchName)
    );

    const displayName = searchName.charAt(0).toUpperCase() + searchName.slice(1);

    if (matchedTasks.length === 0) {
      return {
        agentReply: `### 👤 Assigned Tasks (${displayName})\n\nThere are currently **0** tasks assigned to **${displayName}**.`,
        proposedActions: [],
      };
    }
    const overdueCount = matchedTasks.filter(isOverdue).length;
    const closing =
      overdueCount > 0
        ? `\n> ⚠️ **Attention:** **${overdueCount}** task${
            overdueCount === 1 ? " is" : "s are"
          } overdue.`
        : "\n✨ All tasks are on schedule!";
    return {
      agentReply: `### 👤 Tasks Assigned to ${displayName} (${matchedTasks.length})\n\n${formatTaskList(
        matchedTasks
      )}${closing}`,
      proposedActions: [],
    };
  }

  // 6. OVERDUE TASKS QUERY
  if (
    lowerMsg.includes("overdue") ||
    lowerMsg.includes("due this week") ||
    lowerMsg.includes("deadline") ||
    lowerMsg.includes("due date")
  ) {
    const overdueTasks = tasks.filter(isOverdue);
    if (overdueTasks.length === 0) {
      return {
        agentReply:
          "### 📅 Deadlines & Schedule\n\n🎉 **All caught up!** There are no overdue tasks in your workspace at this moment.",
        proposedActions: [],
      };
    }
    return {
      agentReply: `### ⚠️ Overdue Tasks (${overdueTasks.length})\n\nThe following tasks have passed their due dates and need action:\n\n${formatTaskList(
        overdueTasks
      )}`,
      proposedActions: [],
    };
  }

  // 7. TASKS BY STATUS (in progress, done, review, todo)
  if (lowerMsg.includes("in progress") || lowerMsg.includes("working on")) {
    const inProgTasks = tasks.filter((t) => t.status === "in_progress");
    return {
      agentReply: `### 🚧 In-Progress Tasks (${inProgTasks.length})\n\n${
        inProgTasks.length > 0
          ? formatTaskList(inProgTasks)
          : "No tasks are currently marked *In Progress*."
      }`,
      proposedActions: [],
    };
  }

  // 8. PROJECT STATUS / WORKSPACE SUMMARY
  if (
    lowerMsg.includes("status of") ||
    lowerMsg.includes("project status") ||
    lowerMsg.includes("summar") ||
    lowerMsg.includes("workspace") ||
    lowerMsg.includes("overview")
  ) {
    if (projects.length === 0) {
      return {
        agentReply: "### 📊 Workspace Summary\n\nNo active projects found in this workspace.",
        proposedActions: [],
      };
    }

    const matchedProject = projects.find((p) =>
      lowerMsg.includes(p.name.toLowerCase())
    );

    if (matchedProject) {
      const pTasks = tasks.filter(
        (t) => (t.projectId?._id || t.projectId) === matchedProject._id
      );
      const done = pTasks.filter((t) => t.status === "done").length;
      const inProgress = pTasks.filter((t) => t.status === "in_progress").length;
      const todo = pTasks.filter((t) => t.status === "todo").length;
      const inReview = pTasks.filter((t) => t.status === "in_review").length;
      const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

      return {
        agentReply: `### 📁 Project: **${matchedProject.name}**\n\n- **Status:** \`${matchedProject.status}\`\n- **Progress:** **${pct}%** (${done}/${pTasks.length} tasks completed)\n- **Breakdown:** ${done} Done • ${inProgress} In Progress • ${inReview} In Review • ${todo} To-Do\n- **Tech Stack:** ${matchedProject.techStack || "Not specified"}\n\n#### Tasks in this project:\n${formatTaskList(
          pTasks,
          { showProject: false }
        )}`,
        proposedActions: [],
      };
    }

    // Workspace overall summary
    const doneTotal = tasks.filter((t) => t.status === "done").length;
    const inProgressTotal = tasks.filter((t) => t.status === "in_progress").length;
    const overdueTotal = tasks.filter(isOverdue).length;

    const projectLines = projects
      .map((p) => {
        const pTasks = tasks.filter(
          (t) => (t.projectId?._id || t.projectId) === p._id
        );
        const pDone = pTasks.filter((t) => t.status === "done").length;
        const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
        return `- **${p.name}** (\`${p.status}\`): ${pct}% complete (${pDone}/${pTasks.length} tasks)`;
      })
      .join("\n");

    return {
      agentReply: `### 📊 Workspace Overview\n\n- **Total Projects:** **${projects.length}**\n- **Total Tasks:** **${tasks.length}** (${doneTotal} Done, ${inProgressTotal} In Progress, ${overdueTotal} Overdue ⚠️)\n\n#### Projects:\n${projectLines}\n\n*Ask me about any specific project or person to get deeper insights!*`,
      proposedActions: [],
    };
  }

  // 9. HOW TO SHARE GUIDE
  if (lowerMsg.includes("share") || lowerMsg.includes("collaborat")) {
    return {
      agentReply: `### 🤝 How to Share Tasks in Agent Workspace\n\nYou can collaborate and delegate tasks to teammates in a few simple steps:\n\n1. **Open the Task**: Find the task on the **Tasks Board** and click the **Share (🤝)** button.\n2. **Select Collaborator**: Choose a team member from the dropdown list.\n3. **Assign Role**: Select their role:\n   - **Collaborator**: Works on sub-tasks and code.\n   - **Reviewer**: Reviews PRs and verifies implementation.\n   - **Watcher**: Receives updates and notifications.\n4. **Add Context Note**: (Optional) Write a note detailing what is needed.\n5. **Confirm**: Click **Share Task**. The collaborator will be attached to the task card immediately!`,
      proposedActions: [],
    };
  }

  // 10. DEFAULT / GREETING
  return {
    agentReply: `### 👋 Hello! I'm Workspace Bot, your AI Workspace Assistant.\n\nI'm actively monitoring **${projects.length}** project${
      projects.length === 1 ? "" : "s"
    } and **${tasks.length}** task${
      tasks.length === 1 ? "" : "s"
    }.\n\nHere are some things you can ask me:\n- ⚡ *"What tasks are high priority or urgent?"*\n- 👤 *"Show tasks assigned to Yogita"*\n- ⚠️ *"Which tasks are overdue?"*\n- 📊 *"Summarize the status of our projects"*\n- ➕ *"Create a task called 'Setup Auth' in high priority"*`,
    proposedActions: [],
  };
}

// ---------- Main Run Agent Entry Point ----------

export async function runAgent(userMessage, context, history = []) {
  if (!groq || !process.env.GROQ_API_KEY) {
    return await fallbackResponse(userMessage, context);
  }

  const systemPrompt = buildSystemPrompt(context);

  // Models to attempt: primary first, fallback model second
  const primaryModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const fallbackModel = "openai/gpt-oss-20b";
  const modelsToTry = [primaryModel];
  if (fallbackModel !== primaryModel) {
    modelsToTry.push(fallbackModel);
  }

  // Build clean message list
  const messages = [{ role: "system", content: systemPrompt }];

  // Include recent chat history, trimming long messages to prevent token blowout
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      if (h.role === "user" || h.role === "assistant") {
        let content = h.content || "";
        // Truncate long past responses so they don't consume rate limit tokens
        if (content.length > 300) {
          content = content.substring(0, 300) + "...";
        }
        messages.push({
          role: h.role,
          content,
        });
      }
    }
  }

  // Append current user message
  messages.push({ role: "user", content: userMessage });

  let completion = null;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      completion = await groq.chat.completions.create({
        model,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
      });
      if (completion && completion.choices && completion.choices.length > 0) {
        break; // Successfully got response
      }
    } catch (err) {
      console.warn(`Groq model ${model} attempt failed:`, err.message);
      lastError = err;
    }
  }

  // If all Groq models failed, use our comprehensive fallback intent engine
  if (!completion || !completion.choices || completion.choices.length === 0) {
    console.error("All Groq models failed. Falling back to deterministic engine. Error:", lastError?.message);
    return await fallbackResponse(userMessage, context);
  }

  try {
    const choice = completion.choices[0];
    const message = choice.message;
    const proposedActions = [];

    // Process tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const actionSummaries = [];

      for (const call of message.tool_calls) {
        try {
          const rawArgs = JSON.parse(call.function.arguments);
          const normalizedArgs = normalizeToolArgs(call.function.name, rawArgs, context);

          const pendingAction = await PendingAction.create({
            actionType: call.function.name,
            payload: normalizedArgs,
            status: "pending",
          });
          proposedActions.push(pendingAction);

          // Build descriptive text summary
          if (call.function.name === "create_task") {
            const projStr = normalizedArgs.project_name ? ` in **${normalizedArgs.project_name}**` : "";
            actionSummaries.push(`create task **"${normalizedArgs.title}"**${projStr}`);
          } else if (call.function.name === "assign_task") {
            actionSummaries.push(`assign task to **${normalizedArgs.assignee_name}**`);
          } else if (call.function.name === "share_task") {
            actionSummaries.push(
              `share task with **${normalizedArgs.recipient_name}** as *${normalizedArgs.role || "Collaborator"}*`
            );
          } else if (call.function.name === "update_task_status") {
            actionSummaries.push(`update task status to \`${normalizedArgs.status}\``);
          } else if (call.function.name === "update_task_priority") {
            actionSummaries.push(`set task priority to \`${normalizedArgs.priority}\``);
          } else if (call.function.name === "update_task_deadline") {
            actionSummaries.push(`set task deadline to \`${normalizedArgs.deadline}\``);
          } else if (call.function.name === "update_project_status") {
            actionSummaries.push(`update project status to \`${normalizedArgs.status}\``);
          }
        } catch (e) {
          console.error("Failed to parse tool call:", e);
        }
      }

      let reply = message.content;
      if (!reply || !reply.trim()) {
        const actionText = actionSummaries.join(" and ");
        reply = `### ⚡ Action Prepared\n\nI have prepared a proposal to ${actionText || "perform the requested action"}.\n\nPlease review and approve the action card below to apply this change to your workspace.`;
      }

      return {
        agentReply: reply,
        proposedActions,
      };
    }

    return {
      agentReply:
        message.content ||
        "I've analyzed your workspace. Let me know if you need more details or specific task updates!",
      proposedActions: [],
    };
  } catch (err) {
    console.error("Groq agent processing error:", err);
    return await fallbackResponse(userMessage, context);
  }
}