import { useEffect, useState } from "react";
import "./TaskModal.css";

const API_URL = "http://localhost:5000";

function TaskModal({
  taskToEdit = null,
  defaultProjectId = "",
  projects = [],
  onClose,
  onTaskSaved,
}) {
  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [description, setDescription] = useState(taskToEdit?.description || "");
  const [projectId, setProjectId] = useState(
    taskToEdit?.projectId?._id ||
      taskToEdit?.projectId ||
      defaultProjectId ||
      (projects.length > 0 ? projects[0]._id : "")
  );
  const [priority, setPriority] = useState(taskToEdit?.priority || "medium");
  const [status, setStatus] = useState(taskToEdit?.status || "todo");
  const [deadline, setDeadline] = useState(
    taskToEdit?.deadline
      ? new Date(taskToEdit.deadline).toISOString().split("T")[0]
      : ""
  );
  const [assigneeName, setAssigneeName] = useState(
    taskToEdit?.assignee?.name || ""
  );
  const [assigneeEmail, setAssigneeEmail] = useState(
    taskToEdit?.assignee?.email || ""
  );

  const [availableMembers, setAvailableMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update members list whenever projectId changes
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0]._id);
    }

    const selectedProj = projects.find((p) => p._id === projectId);
    if (selectedProj && Array.isArray(selectedProj.members)) {
      setAvailableMembers(selectedProj.members);
    } else {
      // Fetch all collaborators
      fetch(`${API_URL}/api/tasks/collaborators/all`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAvailableMembers(data.collaborators || []);
          }
        })
        .catch(() => {});
    }
  }, [projectId, projects]);

  const handleMemberSelect = (e) => {
    const email = e.target.value;
    if (!email) {
      setAssigneeName("Unassigned");
      setAssigneeEmail("");
      return;
    }

    const found = availableMembers.find((m) => m.email === email);
    if (found) {
      setAssigneeName(found.name);
      setAssigneeEmail(found.email);
    } else {
      setAssigneeName(email.split("@")[0]);
      setAssigneeEmail(email);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!projectId) {
      setError("Please select a project for this task.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        title: title.trim(),
        description: description.trim(),
        projectId,
        priority,
        status,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assignee: {
          name: assigneeName.trim() || "Unassigned",
          email: assigneeEmail.trim(),
        },
      };

      const url = taskToEdit
        ? `${API_URL}/api/tasks/${taskToEdit._id}`
        : `${API_URL}/api/tasks`;
      const method = taskToEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save task");
      }

      if (onTaskSaved && data.task) {
        onTaskSaved(data.task);
      }
      onClose();
    } catch (err) {
      console.error("Save task error:", err);
      setError(err.message || "Failed to save task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="task-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="task-modal-content">
        <div className="task-modal-header">
          <div>
            <h2>{taskToEdit ? "Edit Task" : "Create New Task"}</h2>
            <p>
              {taskToEdit
                ? `Update details for ${taskToEdit.taskKey || "task"}`
                : "Add a Jira-like collaborative task to your workspace"}
            </p>
          </div>

          <button
            type="button"
            className="task-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && <div className="task-form-error">{error}</div>}

        <form className="task-form" onSubmit={handleSubmit}>
          {/* TITLE */}
          <div className="task-form-group">
            <label>Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Implement user authentication flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* PROJECT & ASSIGNEE */}
          <div className="task-form-row">
            <div className="task-form-group">
              <label>Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select Project
                </option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>Assignee</label>
              <select
                value={assigneeEmail}
                onChange={handleMemberSelect}
              >
                <option value="">Unassigned</option>
                {availableMembers.map((m, idx) => (
                  <option key={`${m.email}-${idx}`} value={m.email}>
                    {m.name} ({m.role || m.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STATUS, PRIORITY & DEADLINE */}
          <div className="task-form-row">
            <div className="task-form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent ⚡</option>
              </select>
            </div>

            <div className="task-form-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="task-form-group">
            <label>Due Date / Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* DESCRIPTION */}
          <div className="task-form-group">
            <label>Description</label>
            <textarea
              placeholder="Provide context, acceptance criteria or steps for this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          {/* ACTIONS */}
          <div className="task-modal-actions">
            <button
              type="button"
              className="task-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="task-submit-btn"
              disabled={loading || !title.trim()}
            >
              {loading
                ? "Saving..."
                : taskToEdit
                ? "Update Task"
                : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
