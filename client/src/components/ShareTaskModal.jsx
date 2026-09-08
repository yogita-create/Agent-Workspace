import { useEffect, useState } from "react";
import {
  Share2,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import "./ShareTaskModal.css";

const API_URL = "http://localhost:5000";

function ShareTaskModal({ task, onClose, onTaskUpdated, availableMembers = [] }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [role, setRole] = useState("Collaborator");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [collaborators, setCollaborators] = useState([]);

  // Fetch collaborators if available
  useEffect(() => {
    if (availableMembers.length === 0) {
      fetch(`${API_URL}/api/tasks/collaborators/all`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.collaborators)) {
            setCollaborators(data.collaborators);
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

      const response = await fetch(`${API_URL}/api/tasks/${task._id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: recipientName.trim(),
          email: recipientEmail.trim(),
          role: role,
          note: note.trim(),
          sharedBy: "Yogita",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to share task");
      }

      setSuccessMsg(`Task successfully shared with ${recipientName}!`);
      if (onTaskUpdated && data.task) {
        onTaskUpdated(data.task);
      }

      // Reset form fields
      setRecipientName("");
      setRecipientEmail("");
      setNote("");

      // Auto close after 1.2s or keep open
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Share task error:", err);
      setError(err.message || "Failed to share task.");
    } finally {
      setLoading(false);
    }
  };

  const existingShared = Array.isArray(task.sharedWith) ? task.sharedWith : [];

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
              <Share2 size={20} color="#16a34a" />
              Share Task with Collaborators
            </h2>
            <p className="share-task-context">
              Task: <strong>{task.taskKey || "TSK"}</strong> — {task.title}
            </p>
          </div>

          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* FEEDBACK NOTICES */}
        {error && <div className="share-error-msg">{error}</div>}
        {successMsg && (
          <div className="share-success-msg">
            <CheckCircle size={15} style={{ display: "inline", marginRight: 6 }} />
            {successMsg}
          </div>
        )}

        {/* QUICK MEMBER SELECTION CHIPS */}
        {collaborators.length > 0 && (
          <div className="share-form-group">
            <label>
              <Users size={14} style={{ display: "inline", marginRight: 4 }} />
              Quick Select Team Member:
            </label>
            <div className="quick-member-select">
              {collaborators.map((c, i) => (
                <button
                  key={`${c.email}-${i}`}
                  type="button"
                  className={`quick-member-chip ${
                    recipientEmail.toLowerCase() === c.email.toLowerCase()
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleSelectMember(c)}
                >
                  <span>{c.name}</span>
                  <small style={{ opacity: 0.8 }}>({c.role || "Member"})</small>
                </button>
              ))}
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
            <label>
              <MessageSquare size={14} style={{ display: "inline", marginRight: 4 }} />
              Collaboration Note / Instructions (Optional)
            </label>
            <textarea
              placeholder="e.g. Please review the authentication endpoints and test edge cases by Friday."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
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
              {loading ? "Sharing..." : "Share Task"}
            </button>
          </div>
        </form>

        {/* EXISTING COLLABORATORS */}
        {existingShared.length > 0 && (
          <div className="existing-collaborators-section">
            <h4>Currently Shared With ({existingShared.length})</h4>
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

                  <span className="collaborator-role-badge">
                    {collab.role || "Collaborator"}
                  </span>
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
