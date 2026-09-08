import { useEffect, useState } from "react";
import "./AgentSidebar.css";

const API_URL = "http://localhost:5000";

function AgentSidebar({
  activeSessionId,
  onNewChat,
  onSelectSession,
  refreshChats,
}) {
  const [sessions, setSessions] = useState([]);

  const [loadingChats, setLoadingChats] =
    useState(false);

  // ==========================================
  // LOAD CHAT SESSIONS
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const loadSessions = async () => {
      try {
        setLoadingChats(true);

        const response = await fetch(
          `${API_URL}/api/chat/sessions`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load chats: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          !ignore &&
          data.success
        ) {
          setSessions(
            data.sessions || []
          );
        }

      } catch (error) {

        if (!ignore) {
          console.error(
            "Load sessions error:",
            error
          );
        }

      } finally {

        if (!ignore) {
          setLoadingChats(false);
        }

      }
    };

    loadSessions();

    return () => {
      ignore = true;
    };

  }, [refreshChats]);


  return (
    <aside className="agent-sidebar">

      {/* =====================================
          AGENT SIDEBAR HEADER
      ===================================== */}

      <div className="agent-sidebar-header">

        <div className="agent-sidebar-icon">
          🤖
        </div>

        <div>
          <h2>
            AI Agent
          </h2>

          <p>
            Your AI workspace assistant
          </p>
        </div>

      </div>


      {/* =====================================
          NEW CHAT
      ===================================== */}

      <button
        type="button"
        className="agent-new-chat-btn"
        onClick={onNewChat}
      >
        <span>＋</span>

        <span>
          New Chat
        </span>
      </button>


      {/* =====================================
          CHAT HISTORY
      ===================================== */}

      <div className="agent-chat-history">

        <div className="chat-history-header">

          <h3>
            Recent Chats
          </h3>

          {sessions.length > 0 && (
            <span>
              {sessions.length}
            </span>
          )}

        </div>

          
        <div className="chat-session-list">

          {loadingChats ? (

            <div className="chat-history-message">
              Loading chats...
            </div>

          ) : sessions.length === 0 ? (

            <div className="chat-history-empty">

              <div>
                💬
              </div>

              <p>
                No chats yet
              </p>

              <small>
                Start a new conversation
                with your AI agent.
              </small>

            </div>

          ) : (

            sessions.map((session) => (

              <button
                key={session._id}
                type="button"
                className={
                  activeSessionId ===
                  session._id
                    ? "agent-session-item active"
                    : "agent-session-item"
                }
                onClick={() =>
                  onSelectSession(
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

            ))

          )}

        </div>

      </div>

    </aside>
  );
}

export default AgentSidebar;