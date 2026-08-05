import Groq from "groq-sdk";
import PendingAction from "../models/PendingAction.js";
import { TOOLS } from "./tools.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function runAgent(userMessage, context) {
  const { projects = [], tasks = [] } = context;

  const projectContext = projects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
    status: project.status,
  }));

  const taskContext = tasks.map((task) => ({
    id: task._id.toString(),
    projectId: task.projectId?._id?.toString() || task.projectId?.toString(),
    projectName: task.projectId?.name || "Unknown Project",
    title: task.title,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
  }));

  const systemPrompt = `
You are a project management assistant.

You can see existing projects and tasks.

You NEVER modify database data directly.
You ONLY propose actions using the available tools.

IMPORTANT RULES:

1. For one user request, create only ONE action unless the user explicitly requests multiple different changes.

2. If the user asks to update the status of ONE task, call update_task_status exactly ONCE.

3. If the user asks to update the priority of ONE task, call update_task_priority exactly ONCE.

4. If the user asks to update the deadline of ONE task, call update_task_deadline exactly ONCE.

5. Before calling a tool, find the correct existing task from AVAILABLE TASKS.

6. Use the exact task ID from AVAILABLE TASKS.

7. Never invent task IDs or project IDs.

8. If multiple tasks have the same or similar title and you cannot confidently identify the correct task, DO NOT call a tool. Ask the user to clarify.

9. If the user asks to create a task, identify the correct project from AVAILABLE PROJECTS.

10. If the user does not specify a project and there are multiple projects, ask the user which project the task belongs to.

11. If only one project exists and the user asks to create a task without specifying a project, you may use that project's ID.

12. Never create duplicate tool calls for the same requested action.

13. Do not propose actions for projects or tasks that do not exist.

14. Answer the questions of the user ragarding to the all history based.
15. You need to memorise the past task or project if user ask for it.

AVAILABLE PROJECTS:
${JSON.stringify(projectContext, null, 2)}

AVAILABLE TASKS:
${JSON.stringify(taskContext, null, 2)}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],

    tools: TOOLS,
    tool_choice: "auto",
  });

  const message = completion.choices[0].message;

  let proposedActions = [];

  if (message.tool_calls?.length) {
    // Remove duplicate tool calls
    const uniqueCalls = [];
    const seen = new Set();

    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments);

      const actionKey = `${call.function.name}-${JSON.stringify(args)}`;

      if (!seen.has(actionKey)) {
        seen.add(actionKey);
        uniqueCalls.push({
          name: call.function.name,
          args,
        });
      }
    }

    // Create PendingAction only for unique actions
    for (const call of uniqueCalls) {
      const pendingAction = await PendingAction.create({
        actionType: call.name,
        payload: call.args,
        status: "pending",
      });

      proposedActions.push(pendingAction);
    }
  }

  return {
    agentReply:
      message.content ||
      (proposedActions.length > 0
        ? "I've proposed an action for your approval."
        : "I need more information to complete this request."),

    proposedActions,
  };
}