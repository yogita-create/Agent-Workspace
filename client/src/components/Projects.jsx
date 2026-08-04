import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


import "./Projects.css";

const emptyProject = {
  name: "",
  description: "",
  techStack: "",
  goal: "",
};

const emptyMember = {
  name: "",
  email: "",
  role: "",
};

function Projects() {
  

  // ==========================================
  // STATE
  // ==========================================
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);

  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [project, setProject] = useState(emptyProject);

  const [members, setMembers] = useState([]);

  const [member, setMember] =
    useState(emptyMember);


  // ==========================================
  // LOAD ALL PROJECTS
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/projects"
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load projects: ${response.status}`
          );
        }

        const data = await response.json();

        if (!ignore && data.success) {
          setProjects(
            Array.isArray(data.projects)
              ? data.projects
              : []
          );
        }
      } catch (error) {
        if (!ignore) {
          console.error(
            "Load projects error:",
            error
          );

          setError(
            "Failed to load projects. Please try again."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      ignore = true;
    };
  }, []);


  // ==========================================
  // HANDLE PROJECT INPUT
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProject((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // ==========================================
  // HANDLE MEMBER INPUT
  // ==========================================

  const handleMemberChange = (e) => {
    const { name, value } = e.target;

    setMember((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // ==========================================
  // ADD MEMBER
  // ==========================================

  const addMember = () => {
    if (
      !member.name.trim() ||
      !member.email.trim() ||
      !member.role.trim()
    ) {
      alert(
        "Please enter member name, email and role."
      );

      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        name: member.name.trim(),
        email: member.email.trim(),
        role: member.role.trim(),
      },
    ]);

    setMember(emptyMember);
  };


  // ==========================================
  // REMOVE MEMBER
  // ==========================================

  const removeMember = (indexToRemove) => {
    setMembers((prev) =>
      prev.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );
  };


  // ==========================================
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setProject(emptyProject);

    setMembers([]);

    setMember(emptyMember);

    setShowForm(false);

    setError("");
  };


  // ==========================================
  // CREATE PROJECT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!project.name.trim()) {
      alert("Project name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/projects",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: project.name.trim(),

            description:
              project.description.trim(),

            techStack:
              project.techStack.trim(),

            goal: project.goal.trim(),

            members: members,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to create project"
        );
      }

      console.log(
        "Project created:",
        data.project
      );

      // Add newly created project
      // immediately to the list

      setProjects((prev) => [
        data.project,
        ...prev,
      ]);

      // Reset form

      resetForm();

    } catch (error) {
      console.error(
        "Create project error:",
        error
      );

      setError(
        error.message ||
          "Failed to create project."
      );
    } finally {
      setSaving(false);
    }
  };


  // ==========================================
  // VIEW PROJECT DASHBOARD
  // ==========================================

  const handleViewProject = (projectId) => {
    if (!projectId) {
      console.error(
        "Project ID is missing"
      );

      return;
    }

    console.log(
      "Opening project:",
      projectId
    );

    navigate(
      `/projects/${projectId}`
    );
  };


  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="projects-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="projects-header">

        <div>
          <h1>Projects</h1>

          <p>
            Manage and track your projects
          </p>
        </div>

        <button
          type="button"
          className="create-project-btn"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Create New Project
        </button>

      </header>


      {/* =====================================
          ERROR
      ===================================== */}

      {error && (
        <div className="projects-error">
          {error}
        </div>
      )}


      {/* =====================================
          PROJECT LIST
      ===================================== */}

      <section className="projects-list">

        {loading ? (

          <p className="projects-message">
            Loading projects...
          </p>

        ) : projects.length === 0 ? (

          <div className="empty-projects">

            <h2>
              No projects yet
            </h2>

            <p>
              Create your first project
              to get started.
            </p>

          </div>

        ) : (

          projects.map((item) => (

            <div
              className="project-card"
              key={item._id}
            >

              {/* PROJECT HEADER */}

              <div className="project-card-header">

                <h2>
                  {item.name}
                </h2>

                <span className="project-status">
                  {item.status ||
                    "Active"}
                </span>

              </div>


              {/* DESCRIPTION */}

              <p>
                {item.description ||
                  "No description provided."}
              </p>


              {/* TECH STACK */}

              <div className="project-tech">

                <strong>
                  Tech Stack:
                </strong>{" "}

                {item.techStack ||
                  "Not specified"}

              </div>


              {/* PROJECT FOOTER */}

              <div className="project-card-footer">

                <span>
                  {item.members?.length || 0}{" "}
                  member
                  {item.members?.length === 1
                    ? ""
                    : "s"}
                </span>

                <button
                  type="button"
                  className="view-project-btn"
                  onClick={() =>
                    handleViewProject(
                      item._id
                    )
                  }
                >
                  View Project
                </button>

              </div>

            </div>

          ))

        )}

      </section>


      {/* =====================================
          CREATE PROJECT MODAL
      ===================================== */}

      {showForm && (

        <div className="modal-overlay">

          <div className="project-modal">

            {/* MODAL HEADER */}

            <div className="modal-header">

              <h2>
                Create New Project
              </h2>

              <button
                type="button"
                className="close-btn"
                onClick={resetForm}
                disabled={saving}
              >
                ×
              </button>

            </div>


            {/* PROJECT FORM */}

            <form onSubmit={handleSubmit}>

              {/* PROJECT NAME */}

              <label>
                Project Name *
              </label>

              <input
                type="text"
                name="name"
                value={project.name}
                onChange={handleChange}
                placeholder="Enter project name"
                required
              />


              {/* DESCRIPTION */}

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  project.description
                }
                onChange={handleChange}
                placeholder="Describe your project"
                rows="3"
              />


              {/* TECH STACK */}

              <label>
                Tech Stack
              </label>

              <input
                type="text"
                name="techStack"
                value={
                  project.techStack
                }
                onChange={handleChange}
                placeholder="e.g. React, Node.js, MongoDB"
              />


              {/* PROJECT GOAL */}

              <label>
                Project Goal
              </label>

              <textarea
                name="goal"
                value={project.goal}
                onChange={handleChange}
                placeholder="What is the goal of this project?"
                rows="3"
              />


              {/* =================================
                  PROJECT MEMBERS
              ================================= */}

              <label>
                Project Members
              </label>

              <div className="member-input-row">

                <input
                  type="text"
                  name="name"
                  value={member.name}
                  onChange={
                    handleMemberChange
                  }
                  placeholder="Member name"
                />

                <input
                  type="email"
                  name="email"
                  value={member.email}
                  onChange={
                    handleMemberChange
                  }
                  placeholder="Email"
                />

                <input
                  type="text"
                  name="role"
                  value={member.role}
                  onChange={
                    handleMemberChange
                  }
                  placeholder="Role"
                />

                <button
                  type="button"
                  className="add-member-btn"
                  onClick={addMember}
                >
                  + Add
                </button>

              </div>


              {/* =================================
                  ADDED MEMBERS
              ================================= */}

              {members.length > 0 && (

                <div className="members-list">

                  <h4>
                    Added Members
                  </h4>

                  {members.map(
                    (item, index) => (

                      <div
                        className="member-item"
                        key={`${item.email}-${index}`}
                      >

                        <div>

                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            {item.email}
                          </span>

                          <small>
                            {item.role}
                          </small>

                        </div>

                        <button
                          type="button"
                          className="remove-member-btn"
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


              {/* =================================
                  MODAL ACTIONS
              ================================= */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-project-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Creating..."
                    : "Create Project"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}

export default Projects;