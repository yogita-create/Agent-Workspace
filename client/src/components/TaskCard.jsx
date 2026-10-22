import { useState } from "react";
import {
  Share2,
  Calendar,
  AlertCircle,
  Clock,
  User,
  Trash2,
  Edit3,
  Folder,
  Sparkles,
} from "lucide-react";
import "./TaskCard.css";

function TaskCard({
  task,
  onShare,
  onEdit,
  onDelete,
  onStatusChange,
  showProject = true,
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const priorityClasses = {
    urgent: "priority-urgent",
    high: "priority-high",
    medium: "priority-medium",
    low: "priority-low",
  };

  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "done";

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === task.status) return;

    try {
      setUpdatingStatus(true);
      if (onStatusChange) {
        await onStatusChange(task._id, newStatus);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Assignee initial
  const assigneeName = task.assignee?.name || "Unassigned";
  const assigneeInitial = assigneeName.charAt(0).toUpperCase();

  // Due date format
  const formattedDate = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className={`jira-task-card ${isOverdue ? "is-overdue" : ""}`}>
      {/* CARD TOP ROW */}
      <div className="task-card-top">
        <span className="task-key-badge">
          {task.taskKey || `TSK-${task._id.slice(-4)}`}
        </span>

        <div className="task-top-badges">
          {task.createdByAgent && (
            <span
              className="task-key-badge"
              title="Created by AI Agent"
              style={{ background: "#ede9fe", color: "#6d28d9" }}
            >
              <Sparkles size={11} style={{ display: "inline", marginRight: 2 }} />
              AI
            </span>
          )}

          <span
            className={`priority-badge ${
              priorityClasses[task.priority] || "priority-medium"
            }`}
          >
            {task.priority === "urgent" && <AlertCircle size={11} />}
            {task.priority || "medium"}
          </span>
        </div>
      </div>

      {/* PROJECT PILL */}
      {showProject && task.projectId && (
        <div className="task-project-pill">
          <Folder size={11} />
          <span>{task.projectId.name || "Project"}</span>
        </div>
      )}

      {/* TITLE & DESCRIPTION */}
      <h3 className="task-card-title">{task.title}</h3>
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* META ROW: STATUS & DUE DATE */}
      <div className="task-meta-row">
        {/* Status Dropdown */}
        <div className="status-select-wrapper">
          <select
            value={task.status || "todo"}
            onChange={handleStatusChange}
            disabled={updatingStatus}
            aria-label="Change task status"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Due Date */}
        {formattedDate ? (
          <div
            className={`task-deadline ${isOverdue ? "overdue-text" : ""}`}
            title={isOverdue ? "Overdue deadline!" : `Due: ${formattedDate}`}
          >
            <Calendar size={12} />
            <span>{formattedDate}</span>
            {isOverdue && <Clock size={11} />}
          </div>
        ) : (
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No deadline</span>
        )}
      </div>

      {/* FOOTER: ASSIGNEE, COLLABORATORS & SHARE BUTTON */}
      <div className="task-card-footer">
        {/* Assignee */}
        <div className="task-assignee-info" title={`Assignee: ${assigneeName}`}>
          <div className="assignee-avatar">{assigneeInitial}</div>
          <span className="assignee-name">{assigneeName}</span>
        </div>

        {/* Shared Collaborators Stack */}
        <div className="task-collaborators-preview">
          {Array.isArray(task.sharedWith) && task.sharedWith.length > 0 && (
            <div
              className="collaborator-avatar-stack"
              title={`Shared with ${task.sharedWith.length} collaborator(s)`}
            >
              {task.sharedWith.slice(0, 3).map((collab, i) => (
                <div
                  key={i}
                  className="collab-avatar"
                  title={`${collab.name} (${collab.role || "Collaborator"})`}
                >
                  {collab.name?.charAt(0).toUpperCase() || "U"}
                </div>
              ))}
              {task.sharedWith.length > 3 && (
                <span className="shared-count-badge">
                  +{task.sharedWith.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Quick Actions: Share, Edit, Delete */}
          <div className="task-card-actions">
            <button
              type="button"
              className="task-action-btn task-share-btn"
              onClick={() => onShare && onShare(task)}
              title="Share task with a team member"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>

            {onEdit && (
              <button
                type="button"
                className="task-action-btn"
                onClick={() => onEdit(task)}
                title="Edit task"
              >
                <Edit3 size={13} />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="task-action-btn task-delete-btn"
                onClick={() => onDelete(task._id)}
                title="Delete task"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
