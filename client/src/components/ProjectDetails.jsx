import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SquarePen, Trash2, X } from "lucide-react";

import "./ProjectDetails.css";

const API_URL = "http://localhost:5000";

const emptyMember = {
  name: "",
  email: "",
  role: "",
};

const emptyTask = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  deadline: "",
};

// ==========================================
// FORMAT STATUS
// ==========================================

const formatTaskStatus = (status) => {
  switch (status) {
    case "todo":
      return "To Do";

    case "in_progress":
      return "In Progress";

    case "done":
      return "Done";

    default:
      return "Not Specified";
  }
};

// ==========================================
// FORMAT PRIORITY
// ==========================================

const formatTaskPriority = (priority) => {
  switch (priority) {
    case "low":
      return "Low";

    case "medium":
      return "Medium";

    case "high":
      return "High";

    default:
      return "Not Specified";
  }
};

// ==========================================
// STATUS CLASS
// ==========================================

const getStatusClass = (status) => {
  switch (status) {
    case "todo":
      return "status-todo";

    case "in_progress":
      return "status-in-progress";

    case "done":
      return "status-done";

    default:
      return "status-default";
  }
};

// ==========================================
// PRIORITY CLASS
// ==========================================

const getPriorityClass = (priority) => {
  switch (priority) {
    case "low":
      return "priority-low";

    case "medium":
      return "priority-medium";

    case "high":
      return "priority-high";

    default:
      return "priority-default";
  }
};

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // ==========================================
  // PROJECT STATE
  // ==========================================

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // PROJECT EDIT STATE
  // ==========================================

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    techStack: "",
    goal: "",
    status: "Active",
  });

  const [editMembers, setEditMembers] = useState([]);
  const [newMember, setNewMember] = useState(emptyMember);
  const [editError, setEditError] = useState("");

  // ==========================================
  // TASK EDIT STATE
  // ==========================================

  const [showTaskEditModal, setShowTaskEditModal] =
    useState(false);

  const [editingTask, setEditingTask] = useState(null);

  const [editTask, setEditTask] = useState(emptyTask);

  const [savingTask, setSavingTask] = useState(false);

  const [deletingTaskId, setDeletingTaskId] =
    useState(null);

  const [taskEditError, setTaskEditError] = useState("");

  // ==========================================
  // LOAD PROJECT
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const fetchProject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/projects/${projectId}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load project: ${response.status}`
          );
        }

        const data = await response.json();

        if (ignore) return;

        if (data.success) {
          setProject(data.project);
        } else {
          throw new Error(
            data.message || "Project not found"
          );
        }
      } catch (error) {
        if (!ignore) {
          console.error(
            "Load project error:",
            error
          );

          setError(
            error.message ||
              "Failed to load project."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    if (projectId) {
      fetchProject();
    }

    return () => {
      ignore = true;
    };
  }, [projectId]);

  // ==========================================
  // LOAD PROJECT TASKS
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const fetchProjectTasks = async () => {
      try {
        setLoadingTasks(true);

        const response = await fetch(
          `${API_URL}/api/projects/${projectId}/tasks`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load tasks: ${response.status}`
          );
        }

        const data = await response.json();

        if (ignore) return;

        if (data.success) {
          setTasks(data.tasks || []);
        } else {
          setTasks([]);
        }
      } catch (error) {
        if (!ignore) {
          console.error(
            "Load project tasks error:",
            error
          );

          setTasks([]);
        }
      } finally {
        if (!ignore) {
          setLoadingTasks(false);
        }
      }
    };

    if (projectId) {
      fetchProjectTasks();
    }

    return () => {
      ignore = true;
    };
  }, [projectId]);

  // ==========================================
  // PROJECT EDIT
  // ==========================================

  const openEditModal = () => {
    if (!project) return;

    setEditProject({
      name: project.name || "",
      description: project.description || "",
      techStack: project.techStack || "",
      goal: project.goal || "",
      status: project.status || "Active",
    });

    setEditMembers(
      project.members
        ? [...project.members]
        : []
    );

    setNewMember(emptyMember);
    setEditError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);
    setEditError("");
    setNewMember(emptyMember);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditProject((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // MEMBER INPUT
  // ==========================================

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;

    setNewMember((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addMember = () => {
    if (
      !newMember.name.trim() ||
      !newMember.email.trim() ||
      !newMember.role.trim()
    ) {
      setEditError(
        "Please enter member name, email and role."
      );

      return;
    }

    setEditMembers((prev) => [
      ...prev,
      {
        name: newMember.name.trim(),
        email: newMember.email.trim(),
        role: newMember.role.trim(),
      },
    ]);

    setNewMember(emptyMember);
    setEditError("");
  };

  const removeMember = (indexToRemove) => {
    setEditMembers((prev) =>
      prev.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );
  };

  // ==========================================
  // SAVE PROJECT CHANGES
  // ==========================================

  const handleSaveChanges = async (e) => {
    e.preventDefault();

    if (!editProject.name.trim()) {
      setEditError(
        "Project name is required."
      );

      return;
    }

    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(
        `${API_URL}/api/projects/${projectId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name:
              editProject.name.trim(),

            description:
              editProject.description.trim(),

            techStack:
              editProject.techStack.trim(),

            goal:
              editProject.goal.trim(),

            status:
              editProject.status,

            members:
              editMembers,
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
            "Failed to update project"
        );
      }

      setProject(data.project);

      setShowEditModal(false);

    } catch (error) {
      console.error(
        "Update project error:",
        error
      );

      setEditError(
        error.message ||
          "Failed to update project."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // OPEN TASK EDIT MODAL
  // ==========================================

  const openTaskEditModal = (task) => {
    setEditingTask(task);

    setEditTask({
      title: task.title || "",

      description:
        task.description || "",

      priority:
        task.priority || "medium",

      status:
        task.status || "todo",

      deadline:
        task.deadline
          ? new Date(task.deadline)
              .toISOString()
              .split("T")[0]
          : "",
    });

    setTaskEditError("");

    setShowTaskEditModal(true);
  };

  // ==========================================
  // CLOSE TASK EDIT MODAL
  // ==========================================

  const closeTaskEditModal = () => {
    if (savingTask) return;

    setShowTaskEditModal(false);

    setEditingTask(null);

    setEditTask(emptyTask);

    setTaskEditError("");
  };

  // ==========================================
  // HANDLE TASK EDIT INPUT
  // ==========================================

  const handleTaskEditChange = (e) => {
    const { name, value } = e.target;

    setEditTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // SAVE TASK
  // PUT /api/tasks/:taskId
  // ==========================================

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!editingTask?._id) {
      return;
    }

    if (!editTask.title.trim()) {
      setTaskEditError(
        "Task title is required."
      );

      return;
    }

    try {
      setSavingTask(true);
      setTaskEditError("");

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

      // UPDATE TASK IN PROJECT TASK LIST

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === editingTask._id
            ? {
                ...task,
                ...data.task,
              }
            : task
        )
      );

      closeTaskEditModal();

    } catch (error) {
      console.error(
        "Update task error:",
        error
      );

      setTaskEditError(
        error.message ||
          "Failed to update task."
      );
    } finally {
      setSavingTask(false);
    }
  };

  // ==========================================
  // DELETE TASK
  // DELETE /api/tasks/:taskId
  // ==========================================

  const handleDeleteTask = async (task) => {
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
      <main className="project-details-page">
        <div className="project-details-message">
          <p>Loading project...</p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <main className="project-details-page">
        <div className="project-details-error">
          <h2>
            Unable to load project
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate("/projects")
            }
          >
            ← Back to Projects
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // PROJECT NOT FOUND
  // ==========================================

  if (!project) {
    return (
      <main className="project-details-page">
        <div className="project-details-error">
          <h2>
            Project Not Found
          </h2>

          <p>
            The requested project
            could not be found.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/projects")
            }
          >
            ← Back to Projects
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="project-details-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="project-details-header">

        <div>

          <button
            type="button"
            className="back-project-btn"
            onClick={() =>
              navigate("/projects")
            }
          >
            ← Back to Projects
          </button>

          <h1>
            {project.name}
          </h1>

          <p>
            Project details and information
          </p>

        </div>

        <div className="project-header-actions">

          <span className="project-details-status">
            {project.status || "Active"}
          </span>

          <button
            type="button"
            className="edit-project-btn"
            onClick={openEditModal}
          >
            ✏️ Edit Project
          </button>

        </div>

      </header>


      {/* =====================================
          PROJECT OVERVIEW
      ===================================== */}

      <section className="project-overview">

        <div className="project-info-card">

          <h2>
            Project Overview
          </h2>

          <p className="project-description">
            {project.description ||
              "No description provided."}
          </p>

        </div>

        <div className="project-info-card">

          <h3>
            Tech Stack
          </h3>

          <p>
            {project.techStack ||
              "Not specified"}
          </p>

        </div>

        <div className="project-info-card">

          <h3>
            Project Goal
          </h3>

          <p>
            {project.goal ||
              "No project goal provided."}
          </p>

        </div>

      </section>


      {/* =====================================
          PROJECT MEMBERS
      ===================================== */}

      <section className="project-members-section">

        <div className="section-header">

          <div>

            <h2>
              Project Members
            </h2>

            <p>
              People working on this project
            </p>

          </div>

          <span>
            {project.members?.length || 0}{" "}
            member
            {project.members?.length === 1
              ? ""
              : "s"}
          </span>

        </div>

        {project.members &&
        project.members.length > 0 ? (

          <div className="project-members-grid">

            {project.members.map(
              (member, index) => (

                <div
                  className="project-member-card"
                  key={`${member.email}-${index}`}
                >

                  <div className="member-avatar">
                    {member.name
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="member-details">

                    <h3>
                      {member.name}
                    </h3>

                    <p>
                      {member.email}
                    </p>

                    <span>
                      {member.role}
                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        ) : (

          <div className="no-members">

            <p>
              No members have been added
              to this project yet.
            </p>

          </div>

        )}

      </section>


      {/* =====================================
          PROJECT WORKSPACE
      ===================================== */}

      <section className="project-workspace-section">

        <h2>
          Project Workspace
        </h2>

        <div className="project-tasks-section">

          <div className="section-header">

            <div>

              <h3>
                Project Tasks
              </h3>

              <p>
                Tasks associated with this project
              </p>

            </div>

            <span>
              {tasks.length}{" "}
              {tasks.length === 1
                ? "Task"
                : "Tasks"}
            </span>

          </div>


          {loadingTasks ? (

            <div className="tasks-loading">

              <p>
                Loading tasks...
              </p>

            </div>

          ) : tasks.length === 0 ? (

            <div className="no-members">

              <p>
                No tasks have been added
                to this project yet.
              </p>

            </div>

          ) : (

            <div className="project-tasks-grid">

              {tasks.map((task) => (

                <div
                  className="project-task-card"
                  key={task._id}
                >

                  {/* TASK HEADER */}

                  <div className="task-card-header">

                    <h3>
                      {task.title}
                    </h3>

                    <div className="task-card-actions">

                      <button
                        type="button"
                        className="task-edit-btn"
                        onClick={() =>
                          openTaskEditModal(task)
                        }
                        title="Edit task"
                      >
                        <SquarePen
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        className="task-delete-btn"
                        onClick={() =>
                          handleDeleteTask(task)
                        }
                        disabled={
                          deletingTaskId ===
                          task._id
                        }
                        title="Delete task"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                    </div>

                  </div>


                  {/* TASK DESCRIPTION */}

                  <div className="task-description">

                    {task.description ? (

                      <p>
                        {task.description}
                      </p>

                    ) : (

                      <p className="no-description">
                        No description provided.
                      </p>

                    )}

                  </div>


                  {/* TASK STATUS + PRIORITY */}

                  <div className="task-card-meta">

                    <div className="task-meta-item">

                      <span className="task-meta-label">
                        Status
                      </span>

                      <span
                        className={`task-status-badge ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {formatTaskStatus(
                          task.status
                        )}
                      </span>

                    </div>


                    <div className="task-meta-item">

                      <span className="task-meta-label">
                        Priority
                      </span>

                      <span
                        className={`task-priority-badge ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {formatTaskPriority(
                          task.priority
                        )}
                      </span>

                    </div>

                  </div>


                  {/* DEADLINE */}

                  <div className="task-deadline">

                    {task.deadline ? (

                      <p>
                        <strong>
                          Deadline:
                        </strong>{" "}

                        {new Date(
                          task.deadline
                        ).toLocaleDateString()}

                      </p>

                    ) : (

                      <p className="no-deadline">
                        No deadline set
                      </p>

                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>


      {/* =====================================
          EDIT PROJECT MODAL
      ===================================== */}

      {showEditModal && (

        <div
          className="edit-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeEditModal();
            }

          }}
        >

          <div className="edit-project-modal">

            <div className="edit-modal-header">

              <div>

                <h2>
                  Edit Project
                </h2>

                <p>
                  Update your project
                  information
                </p>

              </div>

              <button
                type="button"
                className="edit-modal-close"
                onClick={closeEditModal}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleSaveChanges
              }
            >

              {editError && (

                <div className="edit-form-error">
                  {editError}
                </div>

              )}


              <label>
                Project Name *
              </label>

              <input
                type="text"
                name="name"
                value={
                  editProject.name
                }
                onChange={
                  handleEditChange
                }
                placeholder="Enter project name"
                required
              />


              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  editProject.description
                }
                onChange={
                  handleEditChange
                }
                placeholder="Describe your project"
                rows="3"
              />


              <label>
                Tech Stack
              </label>

              <input
                type="text"
                name="techStack"
                value={
                  editProject.techStack
                }
                onChange={
                  handleEditChange
                }
                placeholder="React, Node.js, MongoDB"
              />


              <label>
                Project Goal
              </label>

              <textarea
                name="goal"
                value={
                  editProject.goal
                }
                onChange={
                  handleEditChange
                }
                placeholder="What is the goal of this project?"
                rows="3"
              />


              <label>
                Project Status
              </label>

              <select
                name="status"
                value={
                  editProject.status
                }
                onChange={
                  handleEditChange
                }
              >

                <option value="Active">
                  Active
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="On Hold">
                  On Hold
                </option>

              </select>


              <label>
                Project Members
              </label>

              <div className="edit-member-input-row">

                <input
                  type="text"
                  name="name"
                  value={
                    newMember.name
                  }
                  onChange={
                    handleNewMemberChange
                  }
                  placeholder="Name"
                />

                <input
                  type="email"
                  name="email"
                  value={
                    newMember.email
                  }
                  onChange={
                    handleNewMemberChange
                  }
                  placeholder="Email"
                />

                <input
                  type="text"
                  name="role"
                  value={
                    newMember.role
                  }
                  onChange={
                    handleNewMemberChange
                  }
                  placeholder="Role"
                />

                <button
                  type="button"
                  className="edit-add-member-btn"
                  onClick={
                    addMember
                  }
                >
                  + Add
                </button>

              </div>


              {editMembers.length > 0 && (

                <div className="edit-members-list">

                  {editMembers.map(
                    (member, index) => (

                      <div
                        className="edit-member-item"
                        key={`${member.email}-${index}`}
                      >

                        <div>

                          <strong>
                            {member.name}
                          </strong>

                          <span>
                            {member.email}
                          </span>

                          <small>
                            {member.role}
                          </small>

                        </div>

                        <button
                          type="button"
                          className="edit-remove-member-btn"
                          onClick={() =>
                            removeMember(
                              index
                            )
                          }
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}


              <div className="edit-modal-actions">

                <button
                  type="button"
                  className="edit-cancel-btn"
                  onClick={
                    closeEditModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-save-btn"
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


      {/* =====================================
          EDIT TASK MODAL
      ===================================== */}

      {showTaskEditModal && (

        <div
          className="task-edit-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeTaskEditModal();
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
                  closeTaskEditModal
                }
                disabled={savingTask}
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleSaveTask
              }
            >

              {taskEditError && (

                <div className="task-edit-error">
                  {taskEditError}
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
                  handleTaskEditChange
                }
                placeholder="Enter task title"
                required
              />


              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  editTask.description
                }
                onChange={
                  handleTaskEditChange
                }
                placeholder="Enter task description"
                rows="4"
              />


              <div className="task-edit-meta-row">

                <div className="task-edit-field">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      editTask.status
                    }
                    onChange={
                      handleTaskEditChange
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

                </div>


                <div className="task-edit-field">

                  <label>
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      editTask.priority
                    }
                    onChange={
                      handleTaskEditChange
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

                </div>

              </div>


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
                  handleTaskEditChange
                }
              />


              <div className="task-edit-modal-actions">

                <button
                  type="button"
                  className="task-cancel-btn"
                  onClick={
                    closeTaskEditModal
                  }
                  disabled={savingTask}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="task-save-btn"
                  disabled={savingTask}
                >
                  {savingTask
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}

export default ProjectDetails;