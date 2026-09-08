import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Kanban,
  List,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Share2,
} from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ShareTaskModal from "./ShareTaskModal";
import "./Tasks.css";

const API_URL = "http://localhost:5000";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & View State
  const [viewMode, setViewMode] = useState("board"); // 'board' | 'list'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all"); // 'all' | 'my_tasks' | 'shared_with_me' | 'overdue'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToShare, setTaskToShare] = useState(null);

  // Load Tasks and Projects
  const fetchTasksAndProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks`),
        fetch(`${API_URL}/api/projects`),
      ]);

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }
      if (projectsData.success) {
        setProjects(projectsData.projects || []);
      }
    } catch (err) {
      console.error("Load tasks error:", err);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndProjects();
  }, []);

  // Update Status handler
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );

      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Revert on error
        fetchTasksAndProjects();
      }
    } catch (err) {
      console.error("Status update error:", err);
      fetchTasksAndProjects();
    }
  };

  // Delete Task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      await fetch(`${API_URL}/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete task error:", err);
      fetchTasksAndProjects();
    }
  };

  // Saved task handler (create/edit)
  const handleTaskSaved = (savedTask) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t._id === savedTask._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedTask;
        return next;
      }
      return [savedTask, ...prev];
    });
  };

  // Shared task updated
  const handleTaskShared = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
    );
  };

  // Filtered tasks calculation
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchKey = task.taskKey?.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchAssignee = task.assignee?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchKey && !matchDesc && !matchAssignee) {
          return false;
        }
      }

      // Project filter
      if (selectedProjectId !== "all") {
        const pId = task.projectId?._id || task.projectId;
        if (pId !== selectedProjectId) return false;
      }

      // Priority filter
      if (selectedPriority !== "all" && task.priority !== selectedPriority) {
        return false;
      }

      // Quick filter
      if (quickFilter === "my_tasks") {
        const isMine =
          task.assignee?.name?.toLowerCase().includes("yogita") ||
          task.assignee?.email?.toLowerCase().includes("yogita");
        if (!isMine) return false;
      } else if (quickFilter === "shared_with_me") {
        const isShared =
          Array.isArray(task.sharedWith) &&
          task.sharedWith.some(
            (s) =>
              s.name?.toLowerCase().includes("yogita") ||
              s.email?.toLowerCase().includes("yogita")
          );
        if (!isShared) return false;
      } else if (quickFilter === "overdue") {
        const isOverdue =
          task.deadline &&
          new Date(task.deadline) < new Date() &&
          task.status !== "done";
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedProjectId, selectedPriority, quickFilter]);

  // Statistics
  const totalTasksCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const inReviewCount = tasks.filter((t) => t.status === "in_review").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter(
    (t) =>
      t.deadline && new Date(t.deadline) < new Date() && t.status !== "done"
  ).length;

  const columns = [
    { id: "todo", title: "To Do", dotClass: "dot-todo" },
    { id: "in_progress", title: "In Progress", dotClass: "dot-in_progress" },
    { id: "in_review", title: "In Review", dotClass: "dot-in_review" },
    { id: "done", title: "Done", dotClass: "dot-done" },
  ];

  return (
    <main className="tasks-page">
      {/* HEADER */}
      <header className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p>Collaborate, assign, share, and track tasks in real time</p>
        </div>

        <div className="tasks-header-actions">
          {/* View switcher */}
          <div className="view-switcher">
            <button
              type="button"
              className={`view-switch-btn ${viewMode === "board" ? "active" : ""}`}
              onClick={() => setViewMode("board")}
            >
              <Kanban size={15} />
             
              <span>Board</span>
            </button>
            <button
              type="button"
              className={`view-switch-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List size={15} />
              <span className="listscroll">List</span>
            </button>
          </div>


          {/* Create button */}
          <button
            type="button"
            className="create-task-primary-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </header>

      {/* STATS BAR */}
      <section className="tasks-stats-bar">
        <div className="stat-chip">
          <div className="stat-chip-info">
            <span className="stat-chip-label">Total Tasks</span>
            <span className="stat-chip-value">{totalTasksCount}</span>
          </div>
          <Layers size={22} color="#6366f1" />
        </div>

        <div className="stat-chip">
          <div className="stat-chip-info">
            <span className="stat-chip-label">In Progress</span>
            <span className="stat-chip-value">{inProgressCount}</span>
          </div>
          <Clock size={22} color="#3b82f6" />
        </div>

        <div className="stat-chip">
          <div className="stat-chip-info">
            <span className="stat-chip-label">In Review</span>
            <span className="stat-chip-value">{inReviewCount}</span>
          </div>
          <AlertTriangle size={22} color="#f59e0b" />
        </div>

        <div className="stat-chip">
          <div className="stat-chip-info">
            <span className="stat-chip-label">Completed</span>
            <span className="stat-chip-value">{doneCount}</span>
          </div>
          <CheckCircle2 size={22} color="#10b981" />
        </div>

        <div className="stat-chip overdue-stat">
          <div className="stat-chip-info">
            <span className="stat-chip-label">Overdue</span>
            <span className="stat-chip-value">{overdueCount}</span>
          </div>
          <Clock size={22} color="#ef4444" />
        </div>
      </section>

      {/* TOOLBAR & FILTERS */}
      <section className="tasks-toolbar">
        {/* Search */}
        <div className="toolbar-search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by title, key (#TSK-101) or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="toolbar-filters">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Quick Filter Pills */}
          <div className="quick-filter-pills">
            <button
              type="button"
              className={`filter-pill ${quickFilter === "all" ? "active" : ""}`}
              onClick={() => setQuickFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-pill ${
                quickFilter === "my_tasks" ? "active" : ""
              }`}
              onClick={() => setQuickFilter("my_tasks")}
            >
              Assigned to Me
            </button>
            <button
              type="button"
              className={`filter-pill ${
                quickFilter === "shared_with_me" ? "active" : ""
              }`}
              onClick={() => setQuickFilter("shared_with_me")}
            >
              Shared with Me
            </button>
            <button
              type="button"
              className={`filter-pill ${
                quickFilter === "overdue" ? "active" : ""
              }`}
              onClick={() => setQuickFilter("overdue")}
            >
              Overdue
            </button>
          </div>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && <div className="task-form-error">{error}</div>}

      {/* KANBAN BOARD VIEW */}
      {viewMode === "board" ? (
        <section className="kanban-board">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(
              (t) => (t.status || "todo") === col.id
            );

            return (
              <div key={col.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="column-title-wrap">
                    <span className={`column-dot ${col.dotClass}`} />
                    <h3>{col.title}</h3>
                  </div>
                  <span className="column-count-badge">{colTasks.length}</span>
                </div>

                <div className="kanban-cards-list">
                  {colTasks.length === 0 ? (
                    <div className="column-empty">No tasks in {col.title}</div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onShare={(t) => setTaskToShare(t)}
                        onEdit={(t) => setTaskToEdit(t)}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        /* TABLE / LIST VIEW */
        <section className="tasks-table-container">
        <div className="tasks-table-scroll">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Collaboration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: 30 }}>
                    No tasks match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <span className="task-key-badge">
                        {task.taskKey || "TSK"}
                      </span>
                    </td>
                    <td>
                      <strong>{task.title}</strong>
                    </td>
                    <td>{task.projectId?.name || "—"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span className="assignee-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>
                          {task.assignee?.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                        <span>{task.assignee?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${task.priority || "medium"}`}>
                        {task.priority || "medium"}
                      </span>
                    </td>
                    <td>
                      <select
                        value={task.status || "todo"}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="in_review">In Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {Array.isArray(task.sharedWith) && task.sharedWith.length > 0 ? (
                          <span className="shared-count-badge">
                            {task.sharedWith.length} shared
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                            Private
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="task-action-btn task-share-btn"
                        onClick={() => setTaskToShare(task)}
                        title="Share Task"
                      >
                        <Share2 size={13} />
                        Share
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <TaskModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onTaskSaved={handleTaskSaved}
        />
      )}

      {/* EDIT TASK MODAL */}
      {taskToEdit && (
        <TaskModal
          taskToEdit={taskToEdit}
          projects={projects}
          onClose={() => setTaskToEdit(null)}
          onTaskSaved={handleTaskSaved}
        />
      )}

      {/* SHARE TASK MODAL */}
      {taskToShare && (
        <ShareTaskModal
          task={taskToShare}
          onClose={() => setTaskToShare(null)}
          onTaskUpdated={handleTaskShared}
        />
      )}
    </main>
  );
}

export default Tasks;
