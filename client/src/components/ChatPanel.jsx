import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  Bot,
  User,
  Bell,
} from "lucide-react";
import "./ChatPanel.css";
import ActionCard from "./ActionCard";

const API_URL = "http://localhost:5000";

const welcomeMessage = {
  role: "assistant",
  content:
    "### 👋 Hello! I'm Workspace Bot\n\nI'm your AI Project Management Assistant for Agent Workspace. I can help you track tasks, check deadlines, monitor priorities, analyze project status, and collaborate with your team.\n\nTry asking me:\n- *\"What tasks are high priority or urgent?\"*\n- *\"Which tasks are assigned to Yogita?\"*\n- *\"Show me overdue tasks\"*\n- *\"Summarize our projects\"*\n- *\"How do I share a task with a teammate?\"*",
};

function ChatPanel({ sessionId: propSessionId }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(propSessionId || null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Sidebar visibility toggle (drawer/panel)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Session rename state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const messagesEndRef = useRef(null);

  // Sync activeSessionId with propSessionId if changed
  useEffect(() => {
    if (propSessionId) {
      setActiveSessionId(propSessionId);
    }
  }, [propSessionId]);

  // Adjust sidebar default for mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // ==========================================
  // LOAD ALL CHAT SESSIONS
  // ==========================================

  const loadSessions = async (selectLatest = false) => {
    try {
      setLoadingChats(true);

      const response = await fetch(`${API_URL}/api/chat/sessions`);

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const loadedSessions = data.sessions || [];
        setSessions(loadedSessions);

        if (selectLatest && loadedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(loadedSessions[0]._id);
        }
      }
    } catch (error) {
      console.error("Load chat sessions error:", error);
    } finally {
      setLoadingChats(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadSessions(!propSessionId);
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
          throw new Error(`Failed to load messages: ${response.status}`);
        }

        const data = await response.json();

        if (ignore) return;

        if (data.success && data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
              proposedActions: msg.proposedActions || [],
            }))
          );
        } else {
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Load messages error:", error);
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
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Chat",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create chat");
      }

      const newSession = data.session;

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession._id);
      setMessages([welcomeMessage]);
      setMessage("");

      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Create new chat error:", error);
    }
  };

  // ==========================================
  // SELECT CHAT
  // ==========================================

  const selectSession = (sessionId) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // ==========================================
  // RENAME CHAT SESSION
  // ==========================================

  const startRenameSession = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session._id);
    setEditingTitle(session.title || "New Chat");
  };

  const cancelRenameSession = (e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const saveRenameSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!editingTitle.trim()) {
      cancelRenameSession();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editingTitle.trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSessions((prev) =>
          prev.map((s) =>
            s._id === sessionId ? { ...s, title: editingTitle.trim() } : s
          )
        );
        setEditingSessionId(null);
        setEditingTitle("");
      } else {
        alert(data.message || "Failed to rename session");
      }
    } catch (error) {
      console.error("Rename session error:", error);
      alert("Failed to rename session");
    }
  };

  // ==========================================
  // DELETE CHAT SESSION
  // ==========================================

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions/${sessionId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        const remainingSessions = sessions.filter((s) => s._id !== sessionId);
        setSessions(remainingSessions);

        if (activeSessionId === sessionId) {
          if (remainingSessions.length > 0) {
            setActiveSessionId(remainingSessions[0]._id);
          } else {
            // If no sessions remain, create a new clean session
            createNewChat();
          }
        }
      } else {
        alert(data.message || "Failed to delete session");
      }
    } catch (error) {
      console.error("Delete session error:", error);
      alert("Failed to delete session");
    }
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSendPrompt = async (textToSend) => {
    const userMessage = (textToSend || message).trim();
    if (!userMessage || sending) return;

    let currentSessionId = activeSessionId;

    // CREATE SESSION IF NONE EXISTS
    if (!currentSessionId) {
      try {
        const response = await fetch(`${API_URL}/api/chat/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "New Chat",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to create session");
        }

        currentSessionId = data.session._id;
        setActiveSessionId(currentSessionId);
        setSessions((prev) => [data.session, ...prev]);
      } catch (error) {
        console.error("Create session error:", error);
        return;
      }
    }

    // Show user message immediately
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
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Chat request failed");
      }

      // Add agent response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.agentReply ||
            "I've processed your request. See below for details.",
          proposedActions: data.proposedActions || [],
        },
      ]);

      // Refresh sessions to update title if changed
      await loadSessions();
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ **Error:** Unable to connect to Workspace Bot. Please ensure the server is running and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = () => {
    handleSendPrompt(message);
  };

  // ==========================================
  // ENTER KEY
  // ==========================================

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
          AI AGENT INTERNAL SIDEBAR (SESSIONS DRAWER)
      ===================================== */}
      <aside
        className={`agent-chat-sidebar ${sidebarOpen ? "open" : "collapsed"}`}
      >
        <div className="agent-sidebar-header">
          <div className="agent-title-row">
            <div className="agent-avatar-icon">
              <Bot size={22} />
            </div>
            <div>
              <h2>Workspace Bot</h2>
              <p>AI Project Assistant</p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close session list"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* NEW CHAT BUTTON */}
        <button
          type="button"
          className="new-chat-button"
          onClick={createNewChat}
        >
          <Plus size={16} />
          <span>New Conversation</span>
        </button>

        {/* CHAT HISTORY */}
        <div className="chat-history">
          <div className="chat-history-header">
            <h3>Recent Chats</h3>
            {sessions.length > 0 && (
              <span className="session-count">{sessions.length}</span>
            )}
          </div>

          {loadingChats ? (
            <p className="chat-history-message">Loading chats...</p>
          ) : sessions.length === 0 ? (
            <div className="empty-history">
              <MessageSquare size={24} />
              <p>No chat history yet</p>
              <small>Start a new conversation with Workspace Bot.</small>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => {
                const isEditing = editingSessionId === session._id;
                const isActive = activeSessionId === session._id;

                return (
                  <div
                    key={session._id}
                    className={`session-item-wrapper ${
                      isActive ? "active-wrapper" : ""
                    }`}
                  >
                    {isEditing ? (
                      <div className="session-edit-form">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveRenameSession(session._id, e);
                            } else if (e.key === "Escape") {
                              cancelRenameSession(e);
                            }
                          }}
                          autoFocus
                          className="session-rename-input"
                        />
                        <button
                          type="button"
                          className="edit-action-btn save"
                          onClick={(e) => saveRenameSession(session._id, e)}
                          title="Save title"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="edit-action-btn cancel"
                          onClick={cancelRenameSession}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`session-item ${
                          isActive ? "active-session" : ""
                        }`}
                        onClick={() => selectSession(session._id)}
                      >
                        <span className="session-icon">
                          <MessageSquare size={16} />
                        </span>
                        <span className="session-title">
                          {session.title || "New Chat"}
                        </span>

                        <div className="session-actions">
                          <span
                            role="button"
                            tabIndex={0}
                            className="session-action-btn rename"
                            onClick={(e) => startRenameSession(session, e)}
                            title="Rename chat"
                          >
                            <Edit2 size={13} />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="session-action-btn delete"
                            onClick={(e) => deleteSession(session._id, e)}
                            title="Delete chat"
                          >
                            <Trash2 size={13} />
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="agent-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================
          CHAT AREA
      ===================================== */}
      <section className="chat-panel">
        {/* HEADER */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              type="button"
              className="toggle-sidebar-trigger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Hide chat sessions" : "Show chat sessions"}
            >
              {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
              <span className="toggle-btn-label">Chats</span>
            </button>

            <div>
              <h1>Workspace Bot</h1>
              <p>AI Project Management & Agile Workflow Assistant</p>
            </div>
          </div>

          <div className="chat-header-actions">
            <span className="agent-model-badge">
              <Sparkles size={13} /> Active Assistant
            </span>
          </div>
        </header>

        {/* MESSAGES */}
        <div className="messages">
          {loadingMessages ? (
            <div className="chat-loading">Loading conversation...</div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={`${activeSessionId || "temp"}-${index}`}
                className={`message ${
                  msg.role === "user" ? "user-message" : "assistant-message"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="message-avatar bot-avatar">
                    <Bot size={18} />
                  </div>
                ) : null}

                <div className="message-content">
                  <div className="message-author">
                    <strong>{msg.role === "user" ? "You" : "Workspace Bot"}</strong>
                  </div>

                  {msg.role === "user" ? (
                    <div className="user-message-text">{msg.content}</div>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* ACTION CARDS */}
                  {msg.proposedActions &&
                    msg.proposedActions.length > 0 &&
                    msg.proposedActions.map((action) => (
                      <ActionCard
                        key={action._id || action}
                        action={
                          typeof action === "string" ? { _id: action } : action
                        }
                      />
                    ))}
                </div>
              </div>
            ))
          )}

          {/* THINKING INDICATOR */}
          {sending && (
            <div className="message assistant-message">
              <div className="message-avatar bot-avatar">
                <Bot size={18} />
              </div>
              <div className="message-content">
                <div className="message-author">
                  <strong>Workspace Bot</strong>
                </div>
                <div className="thinking-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="thinking-text">
                    Analyzing workspace & project data...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTIONS */}
        <div className="chat-suggestions">
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSendPrompt("What tasks are high priority or urgent?")}
          >
            🔥 High priority tasks
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSendPrompt("Which tasks are assigned to Yogita?")}
          >
            👤 Assigned to Yogita
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSendPrompt("Which tasks are overdue?")}
          >
            ⚠️ Overdue tasks
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSendPrompt("Summarize all projects and current progress.")}
          >
            📊 Workspace summary
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSendPrompt("How do I share a task with another collaborator?")}
          >
            🤝 How to share a task
          </button>
        </div>

        {/* INPUT CONTAINER */}
        <div className="chat-input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Workspace Bot about tasks, deadlines, assignees, or propose new actions..."
            disabled={sending}
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !message.trim()}
            title="Send Message"
            className="send-message-btn"
          >
            {sending ? "..." : <Send size={18} />}
          </button>
        </div>
      </section>
    </main>
  );
}

export default ChatPanel;