import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";
import ActionCard from "./ActionCard";
import {
  Bell,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000";

const welcomeMessage = {
  role: "assistant",
  content: "Hi! What would you like to manage?",
};

// ======================================================
// CHAT TITLE SETTINGS
// ======================================================

// Title will be generated after 2 user messages.
const TITLE_MESSAGE_COUNT = 2;

// ======================================================
// GENERATE MEANINGFUL SHORT CHAT TITLE
// ======================================================
//
// This function uses the first 2 user messages together.
// It does NOT simply use the first line of the conversation.
//
// Later, this can easily be replaced with an LLM-based
// title generator from your backend.
// ======================================================

const generateChatTitle = (userMessages) => {
  if (!userMessages || userMessages.length === 0) {
    return "New Chat";
  }

  const combinedText = userMessages
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!combinedText) {
    return "New Chat";
  }

  const text = combinedText.toLowerCase();

  // ====================================================
  // TASK RELATED TITLES
  // ====================================================

  if (
    text.includes("create task") ||
    text.includes("new task") ||
    text.includes("add task")
  ) {
    if (
      text.includes("login") ||
      text.includes("authentication") ||
      text.includes("auth")
    ) {
      return "Create Login Task";
    }

    if (
      text.includes("frontend") ||
      text.includes("react") ||
      text.includes("ui")
    ) {
      return "Create Frontend Task";
    }

    if (
      text.includes("backend") ||
      text.includes("api") ||
      text.includes("server")
    ) {
      return "Create Backend Task";
    }

    return "Create New Task";
  }

  if (
    text.includes("update task") ||
    text.includes("change task") ||
    text.includes("modify task")
  ) {
    return "Update Task";
  }

  if (
    text.includes("delete task") ||
    text.includes("remove task")
  ) {
    return "Delete Task";
  }

  if (
    text.includes("assign task") ||
    text.includes("assign the task") ||
    text.includes("assigned")
  ) {
    return "Assign Task";
  }

  if (
    text.includes("complete task") ||
    text.includes("mark task") ||
    text.includes("finish task")
  ) {
    return "Complete Task";
  }

  // ====================================================
  // PROJECT RELATED TITLES
  // ====================================================

  if (
    text.includes("create project") ||
    text.includes("new project") ||
    text.includes("add project")
  ) {
    return "Create New Project";
  }

  if (
    text.includes("update project") ||
    text.includes("change project") ||
    text.includes("modify project")
  ) {
    return "Update Project";
  }

  if (
    text.includes("delete project") ||
    text.includes("remove project")
  ) {
    return "Delete Project";
  }

  if (
    text.includes("project status") ||
    text.includes("status of project")
  ) {
    return "Project Status";
  }

  // ====================================================
  // AUTHENTICATION
  // ====================================================

  if (
    text.includes("login") ||
    text.includes("authentication") ||
    text.includes("jwt") ||
    text.includes("signup") ||
    text.includes("sign up") ||
    text.includes("password")
  ) {
    if (
      text.includes("error") ||
      text.includes("issue") ||
      text.includes("bug") ||
      text.includes("not working") ||
      text.includes("problem")
    ) {
      return "Fix Authentication Issue";
    }

    return "Authentication";
  }

  // ====================================================
  // DATABASE
  // ====================================================

  if (
    text.includes("mongodb") ||
    text.includes("mongo db") ||
    text.includes("database") ||
    text.includes("mysql") ||
    text.includes("sql")
  ) {
    if (
      text.includes("error") ||
      text.includes("issue") ||
      text.includes("problem") ||
      text.includes("not working") ||
      text.includes("connection")
    ) {
      return "Fix Database Issue";
    }

    return "Database Management";
  }

  // ====================================================
  // API / BACKEND
  // ====================================================

  if (
    text.includes("api") ||
    text.includes("endpoint") ||
    text.includes("express") ||
    text.includes("node.js") ||
    text.includes("nodejs")
  ) {
    if (
      text.includes("error") ||
      text.includes("issue") ||
      text.includes("bug") ||
      text.includes("not working")
    ) {
      return "Fix API Issue";
    }

    return "Backend API";
  }

  // ====================================================
  // REACT / FRONTEND
  // ====================================================

  if (
    text.includes("react") ||
    text.includes("frontend") ||
    text.includes("component") ||
    text.includes("css") ||
    text.includes("ui") ||
    text.includes("user interface")
  ) {
    if (
      text.includes("error") ||
      text.includes("issue") ||
      text.includes("bug") ||
      text.includes("not working")
    ) {
      return "Fix Frontend Issue";
    }

    return "Frontend Development";
  }

  // ====================================================
  // BUG / ERROR
  // ====================================================

  if (
    text.includes("bug") ||
    text.includes("error") ||
    text.includes("not working") ||
    text.includes("issue") ||
    text.includes("problem")
  ) {
    return "Fix Development Issue";
  }

  // ====================================================
  // DASHBOARD
  // ====================================================

  if (text.includes("dashboard")) {
    return "Dashboard Development";
  }

  // ====================================================
  // DEPLOYMENT
  // ====================================================

  if (
    text.includes("deploy") ||
    text.includes("deployment") ||
    text.includes("vercel") ||
    text.includes("render") ||
    text.includes("hosting")
  ) {
    return "Deployment Setup";
  }

  // ====================================================
  // GIT / GITHUB
  // ====================================================

  if (
    text.includes("github") ||
    text.includes("git ") ||
    text.includes("commit") ||
    text.includes("branch")
  ) {
    return "Git & GitHub";
  }

  // ====================================================
  // MEETING
  // ====================================================

  if (
    text.includes("meeting") ||
    text.includes("huddle")
  ) {
    return "Meeting Discussion";
  }

  // ====================================================
  // FALLBACK
  // ====================================================

  // Remove common conversational words.
  const cleanedWords = combinedText
    .replace(
      /\b(please|can|could|would|you|help|me|i|want|need|to|the|a|an|with|for|my|how|what|is|are|this|that)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedWords) {
    return "Workspace Discussion";
  }

  const words = cleanedWords.split(" ");

  const shortTitle = words
    .slice(0, 5)
    .join(" ");

  return (
    shortTitle.charAt(0).toUpperCase() +
    shortTitle.slice(1)
  );
};

// ======================================================
// CHECK WHETHER SESSION HAS A REAL TITLE
// ======================================================

const hasMeaningfulTitle = (title) => {
  if (!title) {
    return false;
  }

  const normalizedTitle = title.trim().toLowerCase();

  return (
    normalizedTitle !== "" &&
    normalizedTitle !== "new chat"
  );
};

function ChatPanel({ onActionCompleted }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] =
    useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [projects, setProjects] = useState([]);

  const [loadingChats, setLoadingChats] =
    useState(false);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [menuOpen, setMenuOpen] = useState(null);

  const [renameModal, setRenameModal] =
    useState(false);

  const [deleteModal, setDeleteModal] =
    useState(false);

  const [selectedSession, setSelectedSession] =
    useState(null);

  const [newTitle, setNewTitle] = useState("");

  const messagesEndRef = useRef(null);

  const activeSession = sessions.find(
    (session) =>
      session._id === activeSessionId
  );

  // ======================================================
  // LOAD PROJECTS
  // ======================================================

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

  // ======================================================
  // LOAD ALL CHAT SESSIONS
  // ======================================================

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

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadSessions(true);
    loadProjects();
  }, []);

  // ======================================================
  // LOAD MESSAGES FOR ACTIVE SESSION
  // ======================================================

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

  // ======================================================
  // AUTO SCROLL
  // ======================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  // ======================================================
  // CREATE NEW CHAT
  // ======================================================
  //
  // IMPORTANT:
  //
  // Clicking "+ New Chat" does NOT create a database
  // session.
  //
  // It only prepares a fresh chat UI.
  //
  // The actual session will be created when the user
  // sends their first message.
  //
  // ======================================================

  const createNewChat = () => {
    setActiveSessionId(null);
    setMessages([welcomeMessage]);
    setMessage("");

    setMenuOpen(null);

    setRenameModal(false);
    setDeleteModal(false);

    setSelectedSession(null);
    setNewTitle("");
  };

  // ======================================================
  // RENAME SESSION
  // ======================================================

  const renameSession = async () => {
    if (
      !newTitle.trim() ||
      !selectedSession
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions/${selectedSession}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: newTitle.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      await loadSessions();

      setRenameModal(false);
      setMenuOpen(null);
      setSelectedSession(null);
      setNewTitle("");
    } catch (error) {
      console.error(
        "Rename session error:",
        error
      );
    }
  };

  // ======================================================
  // DELETE SESSION
  // ======================================================

  const deleteSession = async () => {
    if (!selectedSession) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions/${selectedSession}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      if (
        activeSessionId === selectedSession
      ) {
        setActiveSessionId(null);
        setMessages([welcomeMessage]);
      }

      await loadSessions();

      setDeleteModal(false);
      setMenuOpen(null);
      setSelectedSession(null);
    } catch (error) {
      console.error(
        "Delete session error:",
        error
      );
    }
  };

  // ======================================================
  // SELECT CHAT
  // ======================================================

  const selectSession = (sessionId) => {
    if (
      sessionId === activeSessionId
    ) {
      return;
    }

    setMenuOpen(null);
    setActiveSessionId(sessionId);
  };

  // ======================================================
  // ACTION COMPLETED
  // Refresh Projects + Notify Parent
  // ======================================================

  const handleActionCompleted = async () => {
    await loadProjects();

    if (onActionCompleted) {
      onActionCompleted();
    }
  };

  // ======================================================
  // UPDATE CHAT TITLE
  // ======================================================

  const updateChatTitle = async (
    sessionId,
    userMessages
  ) => {
    try {
      if (
        !userMessages ||
        userMessages.length <
          TITLE_MESSAGE_COUNT
      ) {
        return;
      }

      const title =
        generateChatTitle(
          userMessages
        );

      if (
        !title ||
        title === "New Chat"
      ) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/chat/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to update chat title"
        );
      }

      // Update sidebar immediately
      setSessions((prev) =>
        prev.map((session) =>
          session._id === sessionId
            ? {
                ...session,
                title,
              }
            : session
        )
      );
    } catch (error) {
      console.error(
        "Update chat title error:",
        error
      );
    }
  };

  // ======================================================
  // SEND MESSAGE
  // ======================================================

  const sendMessage = async () => {
    if (
      !message.trim() ||
      sending
    ) {
      return;
    }

    const userMessage =
      message.trim();

    let currentSessionId =
      activeSessionId;

    // ==================================================
    // CREATE SESSION ONLY WHEN USER SENDS FIRST MESSAGE
    // ==================================================

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

        // Add the session internally.
        //
        // It will NOT be displayed in the
        // sidebar because the UI filters
        // "New Chat".
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

    // ==================================================
    // SHOW USER MESSAGE
    // ==================================================

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
      // ==================================================
      // SEND MESSAGE TO AGENT
      // ==================================================

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

      // ==================================================
      // ADD AGENT RESPONSE
      // ==================================================

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

      // ==================================================
      // DETERMINE USER MESSAGE COUNT
      // ==================================================
      //
      // We use the existing messages plus the
      // current message because React state is
      // asynchronous.
      //
      // ==================================================

      const previousUserMessages =
        messages
          .filter(
            (msg) =>
              msg.role === "user"
          )
          .map(
            (msg) => msg.content
          );

      const allUserMessages = [
        ...previousUserMessages,
        userMessage,
      ];

      // ==================================================
      // GENERATE TITLE AFTER 2 USER MESSAGES
      // ==================================================
      //
      // Only generate it if the session still has
      // "New Chat" as its title.
      //
      // Existing renamed chats will not be changed.
      //
      // ==================================================

      const currentSession =
        sessions.find(
          (session) =>
            session._id ===
            currentSessionId
        );

      const sessionNeedsTitle =
        !currentSession ||
        !hasMeaningfulTitle(
          currentSession.title
        );

      if (
        allUserMessages.length >=
          TITLE_MESSAGE_COUNT &&
        sessionNeedsTitle
      ) {
        await updateChatTitle(
          currentSessionId,
          allUserMessages
        );
      }

      // ==================================================
      // REFRESH CHAT SESSIONS
      // ==================================================

      await loadSessions();

      // ==================================================
      // REFRESH PROJECT DATA
      // ==================================================

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

  // ======================================================
  // ENTER KEY
  // ======================================================

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage();
    }
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <main className="ai-agent-page">

      {/* ==================================================
          AI AGENT INTERNAL SIDEBAR
      ================================================== */}

      <aside className="agent-chat-sidebar">

        <div className="agent-sidebar-header">

          <h2>AI Agent</h2>

          <p>
            Manage your workspace with AI
          </p>

        </div>

        {/* ==================================================
            NEW CHAT
        ================================================== */}

        <button
          type="button"
          className="new-chat-button"
          onClick={createNewChat}
        >
          + New Chat
        </button>

        {/* ==================================================
            CHAT HISTORY
        ================================================== */}

        <div className="chat-history">

          <h3>
            Recent Chats
          </h3>

          {loadingChats ? (

            <p className="chat-history-message">
              Loading chats...
            </p>

          ) : (

            (() => {
              // --------------------------------------------
              // NEVER SHOW "New Chat" IN SIDEBAR
              // --------------------------------------------

              const visibleSessions =
                sessions.filter(
                  (session) =>
                    hasMeaningfulTitle(
                      session.title
                    )
                );

              if (
                visibleSessions.length ===
                0
              ) {
                return (
                  <p className="chat-history-message">
                    No chats yet
                  </p>
                );
              }

              return (
                <div className="session-list">

                  {visibleSessions.map(
                    (session) => (

                      <div
                        key={session._id}
                        className="session-wrapper"
                      >

                        {/* CHAT BUTTON */}

                        <button
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

                          <div className="session-left">

                            <span className="session-title">
                              {session.title}
                            </span>

                          </div>

                        </button>

                        {/* ==================================================
                            THREE DOT MENU
                        ================================================== */}

                        <button
                          type="button"
                          className="menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();

                            setMenuOpen(
                              menuOpen ===
                                session._id
                                ? null
                                : session._id
                            );
                          }}
                        >
                          <MoreVertical
                            size={18}
                          />
                        </button>

                        {/* ==================================================
                            SESSION MENU
                        ================================================== */}

                        {menuOpen ===
                          session._id && (

                          <div className="session-menu">

                            {/* RENAME */}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSession(
                                  session._id
                                );

                                setNewTitle(
                                  session.title
                                );

                                setRenameModal(
                                  true
                                );

                                setMenuOpen(
                                  null
                                );
                              }}
                            >
                              <Pencil
                                size={16}
                              />

                              Rename
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              className="delete"
                              onClick={() => {
                                setSelectedSession(
                                  session._id
                                );

                                setDeleteModal(
                                  true
                                );

                                setMenuOpen(
                                  null
                                );
                              }}
                            >
                              <Trash2
                                size={16}
                              />

                              Delete
                            </button>

                          </div>
                        )}

                      </div>

                    )
                  )}

                </div>
              );
            })()
          )}

        </div>

      </aside>

      {/* ==================================================
          CHAT AREA
      ================================================== */}

      <section className="chat-panel">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="chat-header">

          <div>

            <h1>
              {hasMeaningfulTitle(
                activeSession?.title
              )
                ? activeSession.title
                : "New Chat"}
            </h1>

            <p>
              {hasMeaningfulTitle(
                activeSession?.title
              )
                ? "AI-powered project management assistant"
                : "Start a conversation with your AI assistant"}
            </p>

          </div>

          <button
            type="button"
            className="notification-btn"
          >
            <Bell />
          </button>

        </header>

        {/* ==================================================
            MESSAGES
        ================================================== */}

        <div className="messages">

          {loadingMessages ? (

            <div className="chat-loading">
              Loading conversation...
            </div>

          ) : (

            messages.map(
              (msg, index) => (

                <div
                  key={`${activeSessionId || "new"}-${index}`}
                  className={`message ${
                    msg.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >

                  {/* AGENT AVATAR */}

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

                    {/* ==================================================
                        ACTION CARDS
                    ================================================== */}

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

          {/* ==================================================
              THINKING
          ================================================== */}

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

        {/* ==================================================
            INPUT
        ================================================== */}

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

      {/* ==================================================
          RENAME MODAL
      ================================================== */}

      {renameModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h3>
                Rename Chat
              </h3>

              <button
                type="button"
                className="close"
                onClick={() => {
                  setRenameModal(false);
                  setSelectedSession(null);
                }}
              >
                <X />
              </button>

            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) =>
                setNewTitle(
                  e.target.value
                )
              }
              placeholder="Enter chat title"
              autoFocus
            />

            <div className="modal-footer">

              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setRenameModal(false);
                  setSelectedSession(null);
                  setNewTitle("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="savebutton"
                onClick={
                  renameSession
                }
                disabled={
                  !newTitle.trim()
                }
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ==================================================
          DELETE MODAL
      ================================================== */}

      {deleteModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h3>
                Delete Chat
              </h3>

              <button
                type="button"
                className="close"
                onClick={() => {
                  setDeleteModal(false);
                  setSelectedSession(null);
                }}
              >
                <X />
              </button>

            </div>

            <p>
              This action cannot be undone.
            </p>

            <div className="modal-footer">

              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setDeleteModal(false);
                  setSelectedSession(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={
                  deleteSession
                }
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

export default ChatPanel;

