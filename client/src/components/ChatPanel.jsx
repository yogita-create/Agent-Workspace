import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";
import ActionCard from "./ActionCard";
import {Bell} from 'lucide-react';

const API_URL = "http://localhost:5000";

const welcomeMessage = {
  role: "assistant",
  content:
    "Hello! I can help you manage your projects and tasks. What would you like to do?",
};

function ChatPanel({ onActionCompleted }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [projects, setProjects] = useState([]);

  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // ==========================================
  // LOAD PROJECTS
  // ==========================================

  const loadProjects = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/projects`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load projects: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error(
        "Load projects error:",
        error
      );
    }
  };

  // ==========================================
  // LOAD ALL CHAT SESSIONS
  // ==========================================

  const loadSessions = async (
    selectLatest = false
  ) => {
    try {
      setLoadingChats(true);

      const response = await fetch(
        `${API_URL}/api/chat/sessions`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load sessions: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        const loadedSessions =
          data.sessions || [];

        setSessions(loadedSessions);

        if (
          selectLatest &&
          loadedSessions.length > 0
        ) {
          setActiveSessionId(
            loadedSessions[0]._id
          );
        }
      }
    } catch (error) {
      console.error(
        "Load chat sessions error:",
        error
      );
    } finally {
      setLoadingChats(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadSessions(true);
    loadProjects();
  }, []);

  // ==========================================
  // LOAD MESSAGES FOR ACTIVE SESSION
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      if (!activeSessionId) {
        setMessages([welcomeMessage]);
        return;
      }

      try {
        setLoadingMessages(true);

        setMessages([]);

        const response = await fetch(
          `${API_URL}/api/chat/sessions/${activeSessionId}/messages`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load messages: ${response.status}`
          );
        }

        const data = await response.json();

        if (ignore) return;

        if (
          data.success &&
          data.messages &&
          data.messages.length > 0
        ) {
          setMessages(
            data.messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              proposedActions:
                msg.proposedActions || [],
            }))
          );
        } else {
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        if (!ignore) {
          console.error(
            "Load messages error:",
            error
          );

          setMessages([welcomeMessage]);
        }
      } finally {
        if (!ignore) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [activeSessionId]);

  // ==========================================
  // AUTO SCROLL
  // ==========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  // ==========================================
  // CREATE NEW CHAT
  // ==========================================

  const createNewChat = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Chat",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to create chat: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to create chat"
        );
      }

      const newSession = data.session;

      setSessions((prev) => [
        newSession,
        ...prev,
      ]);

      setActiveSessionId(
        newSession._id
      );

      setMessages([welcomeMessage]);

      setMessage("");
    } catch (error) {
      console.error(
        "Create new chat error:",
        error
      );
    }
  };

  // ==========================================
  // SELECT CHAT
  // ==========================================

  const selectSession = (sessionId) => {
    if (
      sessionId === activeSessionId
    ) {
      return;
    }

    setActiveSessionId(sessionId);
  };

  // ==========================================
  // ACTION COMPLETED
  // Refresh Projects + Notify Parent
  // ==========================================

  const handleActionCompleted = async () => {
    // Refresh project data
    await loadProjects();

    // Notify parent App component
    if (onActionCompleted) {
      onActionCompleted();
    }
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = async () => {
    if (
      !message.trim() ||
      sending
    ) {
      return;
    }

    let currentSessionId =
      activeSessionId;

    // ========================================
    // CREATE SESSION IF NONE EXISTS
    // ========================================

    if (!currentSessionId) {
      try {
        const response = await fetch(
          `${API_URL}/api/chat/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title: "New Chat",
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to create session"
          );
        }

        currentSessionId =
          data.session._id;

        setActiveSessionId(
          currentSessionId
        );

        setSessions((prev) => [
          data.session,
          ...prev,
        ]);
      } catch (error) {
        console.error(
          "Create session error:",
          error
        );

        return;
      }
    }

    const userMessage =
      message.trim();

    // ========================================
    // SHOW USER MESSAGE
    // ========================================

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setSending(true);

    try {
      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sessionId:
              currentSessionId,
            message: userMessage,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            data.message ||
            "Chat request failed"
        );
      }

      // ======================================
      // ADD AGENT RESPONSE
      // ======================================

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",

          content:
            data.agentReply ||
            "I've proposed some actions for your approval.",

          proposedActions:
            data.proposedActions ||
            [],
        },
      ]);

      // ======================================
      // REFRESH CHAT SESSIONS
      // ======================================

      await loadSessions();

      // ======================================
      // REFRESH PROJECT DATA
      // ======================================

      await loadProjects();

    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // ENTER KEY
  // ==========================================

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage();
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="ai-agent-page">

      {/* =====================================
          AI AGENT INTERNAL SIDEBAR
      ===================================== */}

      <aside className="agent-chat-sidebar">

        <div className="agent-sidebar-header">

          <h2>AI Agent</h2>

          <p>
            Manage your workspace with AI
          </p>

        </div>

        {/* NEW CHAT */}

        <button
          type="button"
          className="new-chat-button"
          onClick={createNewChat}
        >
          + New Chat
        </button>

        {/* CHAT HISTORY */}

        <div className="chat-history">

          <h3>
            Recent Chats
          </h3>

          {loadingChats ? (

            <p className="chat-history-message">
              Loading chats...
            </p>

          ) : sessions.length === 0 ? (

            <p className="chat-history-message">
              No chats yet
            </p>

          ) : (

            <div className="session-list">

              {sessions.map(
                (session) => (

                  <button
                    key={
                      session._id
                    }
                    type="button"
                    className={
                      activeSessionId ===
                      session._id
                        ? "session-item active-session"
                        : "session-item"
                    }
                    onClick={() =>
                      selectSession(
                        session._id
                      )
                    }
                  >

                    <span className="session-icon">
                      💬
                    </span>

                    <span className="session-title">
                      {session.title ||
                        "New Chat"}
                    </span>

                  </button>

                )
              )}

            </div>

          )}

        </div>

      </aside>


      {/* =====================================
          CHAT AREA
      ===================================== */}

      <section className="chat-panel">

        {/* HEADER */}

        <header className="chat-header">

          <div>

            <h1>
              Agent Workspace
            </h1>

            <p>
              AI-powered project management
              assistant
            </p>

          </div>

          <button
            type="button"
            className="notification-btn"
          >
            <Bell/>
          </button>

        </header>


        {/* MESSAGES */}

        <div className="messages">

          {loadingMessages ? (

            <div className="chat-loading">
              Loading conversation...
            </div>

          ) : (

            messages.map(
              (msg, index) => (

                <div
                  key={`${activeSessionId}-${index}`}
                  className={`message ${
                    msg.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >

                  {msg.role ===
                    "assistant" && (

                    <div className="message-avatar">
                      🤖
                    </div>

                  )}

                  <div className="message-content">

                    <strong>
                      {msg.role ===
                      "user"
                        ? "You"
                        : "Agent"}
                    </strong>

                    <p>
                      {msg.content}
                    </p>


                    {/* ACTION CARDS */}

                    {msg.proposedActions &&
                      msg.proposedActions
                        .length > 0 &&
                      msg.proposedActions.map(
                        (action) => (

                          <ActionCard
                            key={
                              action._id
                            }
                            action={
                              action
                            }
                            projects={
                              projects
                            }
                            onActionCompleted={
                              handleActionCompleted
                            }
                          />

                        )
                      )}

                  </div>

                </div>

              )
            )

          )}


          {/* THINKING */}

          {sending && (

            <div className="message assistant-message">

              <div className="message-avatar">
                🤖
              </div>

              <div className="message-content">

                <strong>
                  Agent
                </strong>

                <p>
                  Thinking...
                </p>

              </div>

            </div>

          )}

          <div
            ref={messagesEndRef}
          />

        </div>


        {/* INPUT */}

        <div className="chat-input-container">

          <input
            type="text"
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Ask the agent about your project..."
            disabled={sending}
          />

          <button
            type="button"
            onClick={
              sendMessage
            }
            disabled={
              sending ||
              !message.trim()
            }
          >
            {sending
              ? "..."
              : "➤"}
          </button>

        </div>

      </section>

    </main>
  );
}

export default ChatPanel;