import { useEffect, useState } from "react";
import { SquarePen, Trash2, X, Plus } from "lucide-react";
import "./Tasks.css";

const API_URL = "http://localhost:5000";

const emptyTask = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  deadline: "",
  projectId: "",
};

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  // ==========================================
  // CREATE MODAL STATE
  // ==========================================

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [newTask, setNewTask] =
    useState(emptyTask);

  const [creating, setCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  // ==========================================
  // EDIT MODAL STATE
  // ==========================================

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [editTask, setEditTask] =
    useState(emptyTask);

  const [saving, setSaving] =
    useState(false);

  const [deletingTaskId, setDeletingTaskId] =
    useState(null);

  const [editError, setEditError] =
    useState("");

  // ==========================================
  // LOAD TASKS
  // ==========================================

  const loadTasks = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/tasks`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load tasks: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error(
        "Load tasks error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

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
          "Failed to load projects"
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
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  // ==========================================
  // CREATE TASK
  // ==========================================

  const openCreateModal = () => {
    setNewTask(emptyTask);
    setCreateError("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creating) return;

    setShowCreateModal(false);
    setNewTask(emptyTask);
    setCreateError("");
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;

    setNewTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setCreateError(
        "Task title is required."
      );
      return;
    }

    if (!newTask.projectId) {
      setCreateError(
        "Please select a project."
      );
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            title: newTask.title.trim(),

            description:
              newTask.description.trim(),

            priority: newTask.priority,

            status: newTask.status,

            projectId: newTask.projectId,

            deadline: newTask.deadline
              ? newTask.deadline
              : null,
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
            "Failed to create task"
        );
      }

      // Add newly created task
      // at the beginning of the list

      setTasks((prevTasks) => [
        data.task,
        ...prevTasks,
      ]);

      closeCreateModal();
    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      setCreateError(
        error.message ||
          "Failed to create task."
      );
    } finally {
      setCreating(false);
    }
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (task) => {
    setEditingTask(task);

    setEditTask({
      title: task.title || "",

      description:
        task.description || "",

      priority:
        task.priority || "medium",

      status:
        task.status || "todo",

      deadline: task.deadline
        ? new Date(task.deadline)
            .toISOString()
            .split("T")[0]
        : "",

      projectId:
        task.projectId?._id ||
        task.projectId ||
        "",
    });

    setEditError("");
    setShowEditModal(true);
  };

  // ==========================================
  // CLOSE EDIT MODAL
  // ==========================================

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);
    setEditingTask(null);
    setEditTask(emptyTask);
    setEditError("");
  };

  // ==========================================
  // HANDLE EDIT INPUT
  // ==========================================

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // UPDATE TASK
  // ==========================================

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!editingTask?._id) {
      return;
    }

    if (!editTask.title.trim()) {
      setEditError(
        "Task title is required."
      );
      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(
        `${API_URL}/api/tasks/${editingTask._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title:
              editTask.title.trim(),

            description:
              editTask.description.trim(),

            priority:
              editTask.priority,

            status:
              editTask.status,

            projectId:
              editTask.projectId,

            deadline:
              editTask.deadline
                ? editTask.deadline
                : null,
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
            "Failed to update task"
        );
      }

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id ===
          editingTask._id
            ? {
                ...task,
                ...data.task,

                projectId:
                  data.task
                    .projectId ||
                  task.projectId,
              }
            : task
        )
      );

      closeEditModal();
    } catch (error) {
      console.error(
        "Update task error:",
        error
      );

      setEditError(
        error.message ||
          "Failed to update task."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE TASK
  // ==========================================

  const handleDeleteTask = async (
    task
  ) => {
    if (!task?._id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${task.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingTaskId(task._id);

      const response = await fetch(
        `${API_URL}/api/tasks/${task._id}`,
        {
          method: "DELETE",
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
            "Failed to delete task"
        );
      }

      setTasks((prevTasks) =>
        prevTasks.filter(
          (item) =>
            item._id !== task._id
        )
      );
    } catch (error) {
      console.error(
        "Delete task error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete task."
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="tasks-page">
        <div className="tasks-page-header">
          <h1>My Tasks</h1>
        </div>

        <div className="tasks-loading">
          Loading tasks...
        </div>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="tasks-page">

      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="tasks-page-header">

        <div>
          <h1>My Tasks</h1>

          <p>
            Manage and track your tasks
          </p>
        </div>

        <button
          type="button"
          className="create-task-btn"
          onClick={openCreateModal}
        >
          <Plus size={19} />

          <span>
            Create New Task
          </span>
        </button>

      </div>


      {/* =====================================
          TASK LIST
      ====================================== */}

      {tasks.length === 0 ? (

        <div className="tasks-empty-state">

          <h3>
            No tasks found
          </h3>

          <p>
            Create your first task
            to get started.
          </p>

          <button
            type="button"
            className="create-task-btn"
            onClick={openCreateModal}
          >
            <Plus size={18} />

            Create New Task
          </button>

        </div>

      ) : (

        <div className="tasks-list">

          {tasks.map((task) => (

            <div
              className="task-card"
              key={task._id}
            >

              {/* TASK HEADER */}

              <div className="task-card-top">

                <h3>
                  {task.title}
                </h3>

                <div className="task-actions">

                  <button
                    type="button"
                    className="edit-task-btn"
                    onClick={() =>
                      openEditModal(task)
                    }
                    title="Edit task"
                  >
                    <SquarePen
                      size={17}
                    />
                  </button>

                  <button
                    type="button"
                    className="delete-task-btn"
                    onClick={() =>
                      handleDeleteTask(
                        task
                      )
                    }
                    disabled={
                      deletingTaskId ===
                      task._id
                    }
                    title="Delete task"
                  >
                    <Trash2
                      size={17}
                    />
                  </button>

                </div>

              </div>


              {/* PROJECT */}

              <div className="task-project">

                <span className="task-label">
                  Project
                </span>

                <span className="task-project-name">
                  {task.projectId?.name ||
                    "Unknown Project"}
                </span>

              </div>


              {/* DESCRIPTION */}

              <div className="task-description-wrapper">

                <span className="task-label">
                  Description
                </span>

                <p className="task-description">

                  {task.description ||
                    "No description provided."}

                </p>

              </div>


              {/* STATUS + PRIORITY */}

              <div className="task-meta-row">

                <div className="task-meta-item">

                  <span className="task-label">
                    Status
                  </span>

                  <span
                    className={`status-badge status-${(
                      task.status ||
                      "todo"
                    ).toLowerCase()}`}
                  >
                    {task.status ===
                    "in_progress"
                      ? "In Progress"
                      : task.status ||
                        "Todo"}
                  </span>

                </div>


                <div className="task-meta-item">

                  <span className="task-label">
                    Priority
                  </span>

                  <span
                    className={`priority-badge priority-${(
                      task.priority ||
                      "medium"
                    ).toLowerCase()}`}
                  >
                    {task.priority ||
                      "Medium"}
                  </span>

                </div>

              </div>


              {/* DEADLINE */}

              <div className="task-deadline">

                <span className="task-label">
        
                </span>

                <span>
                  {task.deadline
                    ? new Date(
                        task.deadline
                      ).toLocaleDateString()
                    : "No deadline"}
                </span>

              </div>


              {/* AI AGENT */}

              {task.createdByAgent && (

                <span className="ai-agent-badge">
                  🤖 Created by AI Agent
                </span>

              )}

            </div>

          ))}

        </div>

      )}


      {/* ========================================
          CREATE TASK MODAL
      ======================================== */}

      {showCreateModal && (

        <div
          className="task-edit-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeCreateModal();
            }

          }}
        >

          <div className="task-edit-modal">

            <div className="task-edit-modal-header">

              <div>

                <h2>
                  Create New Task
                </h2>

                <p>
                  Add a new task to
                  your project
                </p>

              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={
                  closeCreateModal
                }
                disabled={creating}
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleCreateTask
              }
            >

              {createError && (

                <div className="task-edit-error">
                  {createError}
                </div>

              )}


              <label>
                Task Title *
              </label>

              <input
                type="text"
                name="title"
                value={
                  newTask.title
                }
                onChange={
                  handleCreateChange
                }
                placeholder="Enter task title"
                required
              />


              <label>
                Project *
              </label>

              <select
                name="projectId"
                value={
                  newTask.projectId
                }
                onChange={
                  handleCreateChange
                }
                required
              >

                <option value="">
                  Select a project
                </option>

                {projects.map(
                  (project) => (

                    <option
                      key={
                        project._id
                      }
                      value={
                        project._id
                      }
                    >
                      {project.name}
                    </option>

                  )
                )}

              </select>


              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  newTask.description
                }
                onChange={
                  handleCreateChange
                }
                placeholder="Enter task description"
                rows="4"
              />


              <label>
                Status
              </label>

              <select
                name="status"
                value={
                  newTask.status
                }
                onChange={
                  handleCreateChange
                }
              >

                <option value="todo">
                  To Do
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="done">
                  Done
                </option>

              </select>


              <label>
                Priority
              </label>

              <select
                name="priority"
                value={
                  newTask.priority
                }
                onChange={
                  handleCreateChange
                }
              >

                <option value="low">
                  Low
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="high">
                  High
                </option>

              </select>


              <label>
                Deadline
              </label>

              <input
                type="date"
                name="deadline"
                value={
                  newTask.deadline
                }
                onChange={
                  handleCreateChange
                }
              />


              <div className="task-edit-modal-actions">

                <button
                  type="button"
                  className="task-cancel-btn"
                  onClick={
                    closeCreateModal
                  }
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="task-save-btn"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ========================================
          EDIT TASK MODAL
      ======================================== */}

      {showEditModal && (

        <div
          className="task-edit-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeEditModal();
            }

          }}
        >

          <div className="task-edit-modal">

            <div className="task-edit-modal-header">

              <div>

                <h2>
                  Edit Task
                </h2>

                <p>
                  Update task information
                </p>

              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={
                  closeEditModal
                }
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleSaveTask
              }
            >

              {editError && (

                <div className="task-edit-error">
                  {editError}
                </div>

              )}


              <label>
                Task Title *
              </label>

              <input
                type="text"
                name="title"
                value={
                  editTask.title
                }
                onChange={
                  handleEditChange
                }
                placeholder="Enter task title"
                required
              />


              <label>
                Project *
              </label>

              <select
                name="projectId"
                value={
                  editTask.projectId
                }
                onChange={
                  handleEditChange
                }
                required
              >

                <option value="">
                  Select a project
                </option>

                {projects.map(
                  (project) => (

                    <option
                      key={
                        project._id
                      }
                      value={
                        project._id
                      }
                    >
                      {project.name}
                    </option>

                  )
                )}

              </select>


              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  editTask.description
                }
                onChange={
                  handleEditChange
                }
                placeholder="Enter task description"
                rows="4"
              />


              <label>
                Status
              </label>

              <select
                name="status"
                value={
                  editTask.status
                }
                onChange={
                  handleEditChange
                }
              >

                <option value="todo">
                  To Do
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="done">
                  Done
                </option>

              </select>


              <label>
                Priority
              </label>

              <select
                name="priority"
                value={
                  editTask.priority
                }
                onChange={
                  handleEditChange
                }
              >

                <option value="low">
                  Low
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="high">
                  High
                </option>

              </select>


              <label>
                Deadline
              </label>

              <input
                type="date"
                name="deadline"
                value={
                  editTask.deadline
                }
                onChange={
                  handleEditChange
                }
              />


              <div className="task-edit-modal-actions">

                <button
                  type="button"
                  className="task-cancel-btn"
                  onClick={
                    closeEditModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="task-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Tasks;