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
  
  if (showProject && (t.projectId?.name || t.projectId)) {
    metaParts.push(`Project: **${t.projectId?.name || "Workspace"}**`);
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
      .map((s) => `${s.name} (${s.role || "Collaborator"})`)
      .join(", ");
    lines.push(`  🤝 *Shared with:* ${shares}`);
  }

  return lines.join("\n");
}

function formatTaskList(tasks, opts = {}) {
  return tasks.map((t) => formatTaskBlock(t, opts)).join("\n\n");
}

// ---------- System prompt builder ----------

const buildSystemPrompt = (context) => {
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are Workspace Bot, an expert AI Project Management & Workflow Assistant for Agent Workspace (a modern collaborative agile workspace).
You help developers, project managers, and team leads track projects, manage tasks, monitor deadlines, organize priorities, and collaborate seamlessly.

CURRENT DATE & TIME:
- Today: ${todayFormatted} (${todayISO})
- Use this reference date to accurately calculate overdue tasks, tasks due today, tasks due this week, and upcoming deadlines.

WORKSPACE CONTEXT:
Projects:
${JSON.stringify(context.projects || [], null, 2)}

Tasks:
${JSON.stringify(context.tasks || [], null, 2)}

Available Team Members & Collaborators:
${JSON.stringify(context.collaborators || [], null, 2)}

CORE RESPONSIBILITIES & CAPABILITIES:
1. **Assignee Queries**: Accurately list tasks assigned to any team member (e.g. Yogita, unassigned, etc.). Match by exact or partial name or email.
2. **Deadlines & Overdue**: Compare task deadlines against today's date (${todayISO}). If deadline < today and status is not "done", it is Overdue. Identify tasks due today, due this week, or without deadlines.
3. **Priority & Urgency**: Identify high-priority and urgent tasks, bottlenecks, and critical path items.
4. **Project Status & Analytics**: Provide comprehensive project summaries, total task counts, completion percentages, breakdown by status (To-Do, In Progress, In Review, Done), and active members.
5. **Sharing & Collaboration**: Detail who tasks are shared with, their roles (Collaborator, Reviewer, Watcher, Assignee), notes, and guide users on how to share tasks.
6. **Action Execution & Tool Proposals**:
   - When the user asks to create, assign, reassign, share, update status, change priority, or set deadlines for any task or project, you MUST invoke the matching tool function.
   - In your text response, explain what action you have prepared and inform the user that a confirmation/action card has been created below for their 1-click approval.

RESPONSE FORMATTING GUIDELINES (Use clean GitHub-Flavored Markdown):
- Structure your answers with clear markdown headings (e.g., \`### 📋 Task Summary\`, \`### ⚠️ Overdue Items\`).
- Use bullet points (\`- \`) and bold text (\`**item**\`) for clarity and readability.
- Display task keys (\`TSK-xxx\`) in inline code blocks like \`\`TSK-101\`\`.
- Use clean status badges with emojis:
  - Statuses: \`✅ Done\`, \`🚧 In Progress\`, \`🕒 To-Do\`, \`👀 In Review\`
  - Priorities: \`🔥 Urgent\`, \`⚡ High\`, \`🔷 Medium\`, \`☕ Low\`
  - Overdue alerts: \`⚠️ Overdue\`
- When listing multiple tasks, format each as a neat block with title, key, status, priority, assignee, and due date.
- Keep tone professional, encouraging, collaborative, and concise.
- If a query finds no matching items (e.g. no overdue tasks), celebrate it warmly!`;
};

// ---------- Fallback (Offline / No GROQ_API_KEY) intent handling ----------

function fallbackResponse(userMessage, context) {
  const lowerMsg = userMessage.toLowerCase();
  const tasks = context.tasks || [];
  const projects = context.projects || [];

  // High priority / urgent
  if (lowerMsg.includes("high priority") || lowerMsg.includes("urgent") || lowerMsg.includes("priority")) {
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
        : "\nNone of these high-priority items are overdue yet.";
    return {
      agentReply: `### ⚡ High-Priority & Urgent Tasks (${highTasks.length})\n\n${formatTaskList(
        highTasks
      )}${closing}`,
      proposedActions: [],
    };
  }

  // Assigned to me / Yogita
  if (
    lowerMsg.includes("assigned to me") ||
    lowerMsg.includes("my task") ||
    lowerMsg.includes("assigned to yogita") ||
    lowerMsg.includes("yogita's task")
  ) {
    const myTasks = tasks.filter(
      (t) =>
        t.assignee?.name?.toLowerCase().includes("yogita") ||
        t.assignee?.email?.toLowerCase().includes("yogita")
    );
    if (myTasks.length === 0) {
      return {
        agentReply:
          "### 👤 Assigned Tasks\n\nYou currently have **0** tasks assigned. Check the **To-Do** column on your board to pick up open tasks!",
        proposedActions: [],
      };
    }
    const overdueCount = myTasks.filter(isOverdue).length;
    const closing =
      overdueCount > 0
        ? `\n> ⚠️ **Attention:** **${overdueCount}** task${
            overdueCount === 1 ? " is" : "s are"
          } overdue. Consider prioritizing ${overdueCount === 1 ? "it" : "them"} first.`
        : "\n✨ Everything is currently on schedule!";
    return {
      agentReply: `### 👤 Tasks Assigned to You (${myTasks.length})\n\n${formatTaskList(
        myTasks
      )}${closing}`,
      proposedActions: [],
    };
  }

  // Overdue tasks
  if (lowerMsg.includes("overdue") || lowerMsg.includes("due this week") || lowerMsg.includes("deadline")) {
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

  // Project status / workspace summary
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

  // How to share
  if (lowerMsg.includes("share") || lowerMsg.includes("collaborat")) {
    return {
      agentReply: `### 🤝 How to Share Tasks in Agent Workspace\n\nYou can collaborate and delegate tasks to teammates in a few simple steps:\n\n1. **Open the Task**: Find the task on the **Tasks Board** and click the **Share (🤝)** button.\n2. **Select Collaborator**: Choose a team member from the dropdown list.\n3. **Assign Role**: Select their role:\n   - **Collaborator**: Works on sub-tasks and code.\n   - **Reviewer**: Reviews PRs and verifies implementation.\n   - **Watcher**: Receives updates and notifications.\n4. **Add Context Note**: (Optional) Write a note detailing what is needed.\n5. **Confirm**: Click **Share Task**. The collaborator will be attached to the task card immediately!`,
      proposedActions: [],
    };
  }

  // Default / greeting
  return {
    agentReply: `### 👋 Hello! I'm Workspace Bot, your AI Workspace Assistant.\n\nI'm actively monitoring **${projects.length}** project${
      projects.length === 1 ? "" : "s"
    } and **${tasks.length}** task${
      tasks.length === 1 ? "" : "s"
    }.\n\nHere are some things you can ask me:\n- ⚡ *"What tasks are high priority or urgent?"*\n- 👤 *"Show tasks assigned to Yogita"*\n- ⚠️ *"Which tasks are overdue?"*\n- 📊 *"Summarize the status of our projects"*\n- ➕ *"Create a task called 'Setup Auth' in high priority"*`,
    proposedActions: [],
  };
}

// ---------- Main entry ----------

export async function runAgent(userMessage, context, history = []) {
  const systemPrompt = buildSystemPrompt(context);

  if (!groq || !process.env.GROQ_API_KEY) {
    return fallbackResponse(userMessage, context);
  }

  const modelToUse = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  // Build message list with system prompt and recent history
  const messages = [{ role: "system", content: systemPrompt }];

  // Include recent chat history (max 8 messages)
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-8);
    for (const h of recentHistory) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({
          role: h.role,
          content: h.content || "",
        });
      }
    }
  }

  // Append current user message
  messages.push({ role: "user", content: userMessage });

  try {
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const message = choice.message;
    const proposedActions = [];

    if (message.tool_calls && message.tool_calls.length > 0) {
      const actionSummaries = [];

      for (const call of message.tool_calls) {
        try {
          const args = JSON.parse(call.function.arguments);
          const pendingAction = await PendingAction.create({
            actionType: call.function.name,
            payload: args,
            status: "pending",
          });
          proposedActions.push(pendingAction);

          // Build descriptive text summary
          if (call.function.name === "create_task") {
            actionSummaries.push(`create task **"${args.title}"**`);
          } else if (call.function.name === "assign_task") {
            actionSummaries.push(`assign task to **${args.assignee_name}**`);
          } else if (call.function.name === "share_task") {
            actionSummaries.push(`share task with **${args.recipient_name}** as *${args.role || "Collaborator"}*`);
          } else if (call.function.name === "update_task_status") {
            actionSummaries.push(`update task status to \`${args.status}\``);
          } else if (call.function.name === "update_task_priority") {
            actionSummaries.push(`set task priority to \`${args.priority}\``);
          } else if (call.function.name === "update_task_deadline") {
            actionSummaries.push(`set task deadline to \`${args.deadline}\``);
          } else if (call.function.name === "update_project_status") {
            actionSummaries.push(`update project status to \`${args.status}\``);
          }
        } catch (e) {
          console.error("Failed to parse tool call:", e);
        }
      }

      let reply = message.content;
      if (!reply || !reply.trim()) {
        const actionText = actionSummaries.join(" and ");
        reply = `I've prepared a proposal to ${actionText || "perform the requested action"}.\n\nPlease review and approve the action card below to apply this change to your workspace.`;
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
    console.error("Groq agent error:", err);
    // If API fails, fall back smoothly to the deterministic intent engine
    const fallback = fallbackResponse(userMessage, context);
    return {
      agentReply: fallback.agentReply,
      proposedActions: fallback.proposedActions || [],
    };
  }
}