import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, CheckCircle2, Clock, AlertTriangle, Layers } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ShareTaskModal from "./ShareTaskModal";

import "./ProjectDetails.css";

const API_URL = "http://localhost:5000";

const emptyMember = {
  name: "",
  email: "",
  role: "",
};

function ProjectDetails() {
  const { projectId } = useParams();

  const navigate = useNavigate();

  // ==========================================
  // PROJECT STATE
  // ==========================================

  const [project, setProject] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================
  // EDIT STATE
  // ==========================================

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editProject, setEditProject] =
    useState({
      name: "",
      description: "",
      techStack: "",
      goal: "",
      status: "Active",
    });

  const [editMembers, setEditMembers] =
    useState([]);

  const [newMember, setNewMember] =
    useState(emptyMember);

  const [editError, setEditError] =
    useState("");

  // ==========================================
  // PROJECT TASKS STATE
  // ==========================================

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToShare, setTaskToShare] = useState(null);

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

        const data =
          await response.json();

        if (ignore) return;

        if (data.success) {
          setProject(data.project);
        } else {
          throw new Error(
            data.message ||
              "Project not found"
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
      fetchProjectTasks();
    }

    return () => {
      ignore = true;
    };
  }, [projectId]);

  // ==========================================
  // FETCH PROJECT TASKS
  // ==========================================

  const fetchProjectTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await fetch(`${API_URL}/api/tasks?projectId=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Fetch project tasks error:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Update task status error:", err);
      fetchProjectTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      await fetch(`${API_URL}/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete task error:", err);
      fetchProjectTasks();
    }
  };

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

  const handleTaskShared = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
    );
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = () => {
    if (!project) return;

    setEditProject({
      name: project.name || "",
      description:
        project.description || "",
      techStack:
        project.techStack || "",
      goal: project.goal || "",
      status:
        project.status || "Active",
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

  // ==========================================
  // CLOSE EDIT MODAL
  // ==========================================

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);

    setEditError("");

    setNewMember(emptyMember);
  };

  // ==========================================
  // HANDLE EDIT PROJECT INPUT
  // ==========================================

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditProject((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // HANDLE MEMBER INPUT
  // ==========================================

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;

    setNewMember((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // ADD MEMBER
  // ==========================================

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
        name:
          newMember.name.trim(),
        email:
          newMember.email.trim(),
        role:
          newMember.role.trim(),
      },
    ]);

    setNewMember(emptyMember);

    setEditError("");
  };

  // ==========================================
  // REMOVE MEMBER
  // ==========================================

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

      // Update project UI immediately
      setProject(data.project);

      // Close modal
      setShowEditModal(false);

      console.log(
        "Project updated:",
        data.project
      );
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
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="project-details-page">
        <div className="project-details-message">
          <p>
            Loading project...
          </p>
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
  // PROJECT DETAILS
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
            {project.status ||
              "Active"}
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
          PROJECT TASKS & WORKSPACE BOARD
      ===================================== */}

      <section className="project-workspace-section">
        <div className="project-workspace-header">
          <div className="project-workspace-title">
            <h2>Project Tasks & Board</h2>
            <p>
              Manage, assign, and share tasks specific to {project.name}
            </p>
          </div>

          <button
            type="button"
            className="project-add-task-btn"
            onClick={() => setShowCreateTaskModal(true)}
          >
            <Plus size={15} />
            <span>+ Add Task</span>
          </button>
        </div>

        {loadingTasks ? (
          <p style={{ color: "#64748b", padding: "20px 0" }}>Loading project tasks...</p>
        ) : (
          <div className="project-tasks-grid">
            {[
              { id: "todo", title: "To Do" },
              { id: "in_progress", title: "In Progress" },
              { id: "in_review", title: "In Review" },
              { id: "done", title: "Done" },
            ].map((col) => {
              const colTasks = tasks.filter(
                (t) => (t.status || "todo") === col.id
              );

              return (
                <div key={col.id} className="project-kanban-col">
                  <div className="project-kanban-col-header">
                    <h4>{col.title}</h4>
                    <span className="col-badge">{colTasks.length}</span>
                  </div>

                  {colTasks.length === 0 ? (
                    <div className="project-col-empty">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <TaskCard
                        key={t._id}
                        task={t}
                        showProject={false}
                        onShare={(task) => setTaskToShare(task)}
                        onEdit={(task) => setTaskToEdit(task)}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleTaskStatusChange}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>


      {/* =====================================
          EDIT PROJECT MODAL
      ===================================== */}

      {showEditModal && (

        <div
          className="edit-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeEditModal();
            }
          }}
        >

          <div className="edit-project-modal">

            {/* MODAL HEADER */}

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


            {/* FORM */}

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

              {/* PROJECT NAME */}
              <div className="edit-form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editProject.name}
                  onChange={handleEditChange}
                  placeholder="Enter project name"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div className="edit-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editProject.description}
                  onChange={handleEditChange}
                  placeholder="Describe your project"
                  rows="3"
                />
              </div>

              {/* TECH STACK & STATUS ROW */}
              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label>Tech Stack</label>
                  <input
                    type="text"
                    name="techStack"
                    value={editProject.techStack}
                    onChange={handleEditChange}
                    placeholder="React, Node.js, MongoDB"
                  />
                </div>

                <div className="edit-form-group">
                  <label>Project Status</label>
                  <select
                    name="status"
                    value={editProject.status}
                    onChange={handleEditChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* GOAL */}
              <div className="edit-form-group">
                <label>Project Goal</label>
                <textarea
                  name="goal"
                  value={editProject.goal}
                  onChange={handleEditChange}
                  placeholder="What is the goal of this project?"
                  rows="2"
                />
              </div>

              {/* MEMBERS */}
              <div className="edit-form-group">
                <label>Project Members</label>
                <div className="edit-member-input-row">
                  <input
                    type="text"
                    name="name"
                    value={newMember.name}
                    onChange={handleNewMemberChange}
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    name="email"
                    value={newMember.email}
                    onChange={handleNewMemberChange}
                    placeholder="Email"
                  />
                  <input
                    type="text"
                    name="role"
                    value={newMember.role}
                    onChange={handleNewMemberChange}
                    placeholder="Role"
                  />
                  <button
                    type="button"
                    className="edit-add-member-btn"
                    onClick={addMember}
                  >
                    + Add
                  </button>
                </div>

                {/* EXISTING MEMBERS */}
                {editMembers.length > 0 && (
                  <div className="edit-members-list">
                    {editMembers.map((member, index) => (
                      <div
                        className="edit-member-item"
                        key={`${member.email}-${index}`}
                      >
                        <div className="edit-member-info">
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                          <small>{member.role}</small>
                        </div>
                        <button
                          type="button"
                          className="edit-remove-member-btn"
                          onClick={() => removeMember(index)}
                          title="Remove member"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MODAL ACTIONS */}
              <div className="edit-modal-actions">
                <button
                  type="button"
                  className="edit-cancel-btn"
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <TaskModal
          defaultProjectId={projectId}
          projects={[project]}
          onClose={() => setShowCreateTaskModal(false)}
          onTaskSaved={handleTaskSaved}
        />
      )}

      {/* EDIT TASK MODAL */}
      {taskToEdit && (
        <TaskModal
          taskToEdit={taskToEdit}
          defaultProjectId={projectId}
          projects={[project]}
          onClose={() => setTaskToEdit(null)}
          onTaskSaved={handleTaskSaved}
        />
      )}

      {/* SHARE TASK MODAL */}
      {taskToShare && (
        <ShareTaskModal
          task={taskToShare}
          availableMembers={project?.members || []}
          onClose={() => setTaskToShare(null)}
          onTaskUpdated={handleTaskShared}
        />
      )}

    </main>
  );
}

export default ProjectDetails;