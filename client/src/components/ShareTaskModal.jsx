import { useEffect, useState } from "react";
import {
  Share2,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  MessageSquare,
  Sparkles,
  UserCheck,
  Trash2,
  Shield,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import "./ShareTaskModal.css";

function ShareTaskModal({ task, onClose, onTaskUpdated, availableMembers = [] }) {
  const { user } = useAuth();
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [role, setRole] = useState("Collaborator");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [unsharingEmail, setUnsharingEmail] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [currentTask, setCurrentTask] = useState(task);

  // Sync task state
  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  // Fetch collaborators if available
  useEffect(() => {
    if (availableMembers.length === 0) {
      axiosInstance
        .get("/api/tasks/collaborators/all")
        .then((res) => {
          if (res.data.success && Array.isArray(res.data.collaborators)) {
            setCollaborators(res.data.collaborators);
          }
        })
        .catch((err) => console.error("Error fetching collaborators:", err));
    } else {
      setCollaborators(availableMembers);
    }
  }, [availableMembers]);

  const handleSelectMember = (member) => {
    setRecipientName(member.name || "");
    setRecipientEmail(member.email || "");
    if (member.role) {
      // Map display roles to task collaboration role if relevant
      if (["Reviewer", "Assignee", "Watcher", "Collaborator"].includes(member.role)) {
        setRole(member.role);
      }
    }
    setError("");
  };

  const handleShare = async (e) => {
    e.preventDefault();

    if (!recipientName.trim() || !recipientEmail.trim()) {
      setError("Please provide both name and email of the collaborator.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const response = await axiosInstance.post(`/api/tasks/${currentTask._id}/share`, {
        name: recipientName.trim(),
        email: recipientEmail.trim(),
        role: role,
        note: note.trim(),
        sharedBy: user?.name || user?.email || "Workspace Member",
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to share task");
      }

      setSuccessMsg(`Task successfully shared with ${recipientName}!`);
      if (data.task) {
        setCurrentTask(data.task);
        if (onTaskUpdated) {
          onTaskUpdated(data.task);
        }
      }

      // Reset form fields
      setRecipientName("");
      setRecipientEmail("");
      setNote("");

      // Auto close after 1.2s
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Share task error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to share task.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (collabEmail) => {
    if (!collabEmail) return;

    try {
      setUnsharingEmail(collabEmail);
      setError("");

      const response = await axiosInstance.delete(
        `/api/tasks/${currentTask._id}/share/${encodeURIComponent(collabEmail)}`
      );

      const data = response.data;
      if (data.success && data.task) {
        setCurrentTask(data.task);
        if (onTaskUpdated) {
          onTaskUpdated(data.task);
        }
      }
    } catch (err) {
      console.error("Unshare error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to remove collaborator.";
      setError(msg);
    } finally {
      setUnsharingEmail(null);
    }
  };

  const existingShared = Array.isArray(currentTask.sharedWith) ? currentTask.sharedWith : [];

  return (
    <div
      className="share-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="share-task-modal">
        {/* HEADER */}
        <div className="share-modal-header">
          <div className="share-modal-title-wrap">
            <h2>
              <Share2 size={20} className="share-header-icon" />
              Share Task with Collaborators
            </h2>
            <p className="share-task-context">
              Task: <strong>{currentTask.taskKey || "TSK"}</strong> — {currentTask.title}
            </p>
          </div>

          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* FEEDBACK NOTICES */}
        {error && <div className="share-error-msg">{error}</div>}
        {successMsg && (
          <div className="share-success-msg">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* QUICK MEMBER SELECTION CHIPS */}
        {collaborators.length > 0 && (
          <div className="share-form-group">
            <label className="quick-select-label">
              <Users size={14} />
              <span>Quick Select Team Member:</span>
            </label>
            <div className="quick-member-select">
              {collaborators.map((c, i) => {
                const isSelected =
                  recipientEmail.toLowerCase() === (c.email || "").toLowerCase();
                return (
                  <button
                    key={`${c.email}-${i}`}
                    type="button"
                    className={`quick-member-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectMember(c)}
                  >
                    <span className="quick-chip-avatar">
                      {c.name ? c.name.charAt(0).toUpperCase() : "U"}
                    </span>
                    <span className="quick-chip-name">{c.name}</span>
                    {c.role && (
                      <span className="quick-chip-role">{c.role}</span>
                    )}
                    {isSelected && <UserCheck size={14} className="quick-chip-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FORM */}
        <form className="share-form" onSubmit={handleShare}>
          <div className="share-input-row">
            <div className="share-form-group">
              <label>Collaborator Name *</label>
              <input
                type="text"
                placeholder="e.g. Alex Rivera"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>

            <div className="share-form-group">
              <label>Collaborator Email *</label>
              <input
                type="email"
                placeholder="alex@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="share-form-group">
            <label>Collaboration Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Collaborator">Collaborator (Work on task together)</option>
              <option value="Reviewer">Reviewer (Code/Quality Review)</option>
              <option value="Assignee">Assignee (Direct responsibility)</option>
              <option value="Watcher">Watcher (Follow progress notifications)</option>
            </select>
          </div>

          <div className="share-form-group">
            <label className="note-label">
              <MessageSquare size={14} />
              <span>Collaboration Note / Instructions (Optional)</span>
            </label>
            <textarea
              placeholder="e.g. Please review the authentication endpoints and test edge cases by Friday."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
            />
          </div>

          <div className="share-modal-actions">
            <button
              type="button"
              className="share-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="share-submit-btn"
              disabled={loading || !recipientName.trim() || !recipientEmail.trim()}
            >
              <UserPlus size={16} />
              <span>{loading ? "Sharing..." : "Share Task"}</span>
            </button>
          </div>
        </form>

        {/* EXISTING COLLABORATORS */}
        {existingShared.length > 0 && (
          <div className="existing-collaborators-section">
            <h4>
              <Shield size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Currently Shared With ({existingShared.length})
            </h4>
            <div className="collaborators-list">
              {existingShared.map((collab, index) => (
                <div className="collaborator-item" key={index}>
                  <div className="collaborator-item-info">
                    <div className="collaborator-avatar-badge">
                      {collab.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="collaborator-text">
                      <strong>{collab.name}</strong>
                      <span>{collab.email}</span>
                      {collab.note && (
                        <div className="collaborator-note-text">
                          "{collab.note}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="collaborator-item-actions">
                    <span className={`collaborator-role-badge role-${(collab.role || "collaborator").toLowerCase()}`}>
                      {collab.role || "Collaborator"}
                    </span>
                    <button
                      type="button"
                      className="collab-remove-btn"
                      title="Remove collaborator"
                      onClick={() => handleUnshare(collab.email)}
                      disabled={unsharingEmail === collab.email}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareTaskModal;
