import Groq from "groq-sdk";
import PendingAction from "../models/PendingAction.js";
import { TOOLS } from "./tools.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function runAgent(userMessage, context) {
  const systemPrompt = `You are a project management assistant. You can see existing projects and tasks.
You NEVER modify data directly — you only propose actions using the available tools.
Context: ${JSON.stringify(context)}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    tools: TOOLS,
    tool_choice: "auto",
  });

  const message = completion.choices[0].message;
  const proposedActions = [];

  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments);
      const pendingAction = await PendingAction.create({
        actionType: call.function.name,
        payload: args,
        status: "pending",
      });
      proposedActions.push(pendingAction);
    }
  }

  return {
    agentReply: message.content || "I've proposed some actions for your approval.",
    proposedActions,
  };
}