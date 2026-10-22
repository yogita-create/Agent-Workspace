import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Layers,
  Bookmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Sparkles,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import "./EpicView.css";

function EpicView({
  projectId = "all",
  projects = [],
  refreshTrigger = 0,
  onOpenCreateEpic,
  onOpenCreateTask,
}) {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Expand state per epic
  const [expandedEpics, setExpandedEpics] = useState({});
  // Stories mapped by epicId: { [epicId]: Story[] }
  const [storiesByEpic, setStoriesByEpic] = useState({});
  // Loading state per epic's stories
  const [loadingStories, setLoadingStories] = useState({});

  // Expand state per story: { [storyId]: boolean }
  const [expandedStories, setExpandedStories] = useState({});
  // Tasks mapped by storyId: { [storyId]: Task[] }
  const [storyTasks, setStoryTasks] = useState({});
  // Loading state per story's tasks
  const [loadingStoryTasks, setLoadingStoryTasks] = useState({});

  // Inline story creation form state
  const [addingStoryForEpic, setAddingStoryForEpic] = useState(null); // epicId or null
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDescription, setStoryDescription] = useState("");
  const [storyPriority, setStoryPriority] = useState("medium");
  const [storyPoints, setStoryPoints] = useState("");
  const [submittingStory, setSubmittingStory] = useState(false);
  const [storyError, setStoryError] = useState("");

  // Fetch stories for a specific epic
  const fetchStoriesForEpic = useCallback(async (epicId) => {
    if (!epicId) return;
    try {
      setLoadingStories((prev) => ({ ...prev, [epicId]: true }));
      const res = await axiosInstance.get("/api/stories", {
        params: { epicId },
      });
      const data = res.data;
      const list =
        data?.stories || data?.data || (Array.isArray(data) ? data : []);
      setStoriesByEpic((prev) => ({
        ...prev,
        [epicId]: list,
      }));
    } catch (err) {
      console.error(`Error fetching stories for epic ${epicId}:`, err);
    } finally {
      setLoadingStories((prev) => ({ ...prev, [epicId]: false }));
    }
  }, []);

  // Fetch tasks for a specific story
  const fetchTasksForStory = useCallback(async (storyId) => {
    if (!storyId) return;
    try {
      setLoadingStoryTasks((prev) => ({ ...prev, [storyId]: true }));
      const res = await axiosInstance.get(`/api/stories/${storyId}/tasks`);
      const data = res.data;
      const list =
        data?.tasks || data?.data || (Array.isArray(data) ? data : []);
      setStoryTasks((prev) => ({
        ...prev,
        [storyId]: list,
      }));
    } catch (err) {
      console.error(`Error fetching tasks for story ${storyId}:`, err);
    } finally {
      setLoadingStoryTasks((prev) => ({ ...prev, [storyId]: false }));
    }
  }, []);

  // Fetch epics for selected projectId
  const fetchEpics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (projectId && projectId !== "all") {
        params.projectId = projectId;
      }

      const res = await axiosInstance.get("/api/epics", { params });
      const data = res.data;
      const list =
        data?.epics || data?.data || (Array.isArray(data) ? data : []);
      setEpics(list);

      // Preload stories for accurate sub-lists
      list.forEach((epic) => {
        fetchStoriesForEpic(epic._id);
      });
    } catch (err) {
      console.error("Load epics error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load epics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchStoriesForEpic]);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics, refreshTrigger]);

  // Refetch open stories' tasks when refreshTrigger updates
  useEffect(() => {
    Object.keys(expandedStories).forEach((sId) => {
      if (expandedStories[sId]) {
        fetchTasksForStory(sId);
      }
    });
  }, [refreshTrigger, expandedStories, fetchTasksForStory]);

  // Toggle expanding an epic
  const toggleEpic = (epicId) => {
    setExpandedEpics((prev) => {
      const willExpand = !prev[epicId];
      if (willExpand && !storiesByEpic[epicId]) {
        fetchStoriesForEpic(epicId);
      }
      return { ...prev, [epicId]: willExpand };
    });
  };

  // Toggle expanding a story
  const toggleStory = (storyId) => {
    setExpandedStories((prev) => {
      const willExpand = !prev[storyId];
      if (willExpand && !storyTasks[storyId]) {
        fetchTasksForStory(storyId);
      }
      return { ...prev, [storyId]: willExpand };
    });
  };

  // Submit new story for an epic
  const handleAddStorySubmit = async (e, epicId) => {
    e.preventDefault();
    if (!storyTitle.trim()) {
      setStoryError("Story title is required.");
      return;
    }

    try {
      setSubmittingStory(true);
      setStoryError("");

      const payload = {
        title: storyTitle.trim(),
        description: storyDescription.trim(),
        priority: storyPriority,
        epicId,
      };

      if (storyPoints.trim()) {
        payload.storyPoints = Number(storyPoints) || 0;
      }

      if (projectId && projectId !== "all") {
        payload.projectId = projectId;
      }

      const res = await axiosInstance.post("/api/stories", payload);
      const data = res.data;
      const newStory = data?.story || data;

      // Update local state
      setStoriesByEpic((prev) => {
        const existing = prev[epicId] || [];
        return {
          ...prev,
          [epicId]: [...existing, newStory],
        };
      });

      // Reset form
      setStoryTitle("");
      setStoryDescription("");
      setStoryPriority("medium");
      setStoryPoints("");
      setAddingStoryForEpic(null);
    } catch (err) {
      console.error("Create story error:", err);
      setStoryError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create story."
      );
    } finally {
      setSubmittingStory(false);
    }
  };

  // Helper for status styling
  const formatStatus = (status = "todo") => {
    switch (status.toLowerCase()) {
      case "in_progress":
        return { label: "In Progress", className: "status-in-progress" };
      case "in_review":
        return { label: "In Review", className: "status-in-review" };
      case "done":
      case "completed":
        return { label: "Done", className: "status-done" };
      default:
        return { label: "To Do", className: "status-todo" };
    }
  };

  if (loading) {
    return (
      <div className="epic-view-loading">
        <div className="epic-view-spinner" />
        <p>Loading epics and stories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="epic-view-error">
        <p>{error}</p>
        <button type="button" onClick={fetchEpics}>
          Retry
        </button>
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="epic-view-empty">
        <div className="epic-empty-icon-wrap">
          <Layers size={36} color="#7c3aed" />
        </div>
        <h3>No epics yet</h3>
        <p>
          Epics let you group related user stories and track major deliverables.
          Create your first epic to get started.
        </p>
        {onOpenCreateEpic && (
          <button
            type="button"
            className="create-epic-empty-btn"
            onClick={onOpenCreateEpic}
          >
            <Plus size={16} />
            <span>Create First Epic</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="epic-view-container">
      <div className="epics-list">
        {epics.map((epic) => {
          const isExpanded = !!expandedEpics[epic._id];
          const stories = storiesByEpic[epic._id] || epic.stories || [];
          const isLoadingThisStories = !!loadingStories[epic._id];

          // Use computed server progress values if available; fall back to loaded stories
          const totalStories =
            epic.totalStories !== undefined ? epic.totalStories : stories.length;
          const doneStories =
            epic.doneStories !== undefined
              ? epic.doneStories
              : stories.filter(
                  (s) =>
                    (s.taskCount > 0 && s.doneCount === s.taskCount) ||
                    s.status === "done" ||
                    s.status === "completed"
                ).length;

          const statusInfo = formatStatus(epic.status);
          const epicColor = epic.color || "#6366f1";

          return (
            <div
              key={epic._id}
              className={`epic-card ${isExpanded ? "expanded" : ""}`}
            >
              {/* COLLAPSIBLE HEADER */}
              <div
                className="epic-card-header"
                onClick={() => toggleEpic(epic._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleEpic(epic._id);
                  }
                }}
              >
                <div className="epic-header-left">
                  <button
                    type="button"
                    className="epic-expand-toggle"
                    aria-label={isExpanded ? "Collapse epic" : "Expand epic"}
                    tabIndex={-1}
                  >
                    {isExpanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>

                  <span
                    className="epic-color-dot"
                    style={{ background: epicColor }}
                  />

                  <div className="epic-title-group">
                    <h3 className="epic-title">{epic.title || epic.name}</h3>
                    {epic.description && (
                      <p className="epic-subtitle">{epic.description}</p>
                    )}
                  </div>
                </div>

                <div
                  className="epic-header-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Status Badge */}
                  <span className={`epic-status-badge ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>

                  {/* Summary: X of Y stories done (Using server progress values) */}
                  <div
                    className="epic-progress-summary"
                    title={`${doneStories} of ${totalStories} stories completed`}
                  >
                    <span className="epic-progress-text">
                      {totalStories === 0
                        ? "0 stories"
                        : `${doneStories} of ${totalStories} stories done`}
                    </span>
                    <div className="epic-progress-bar-bg">
                      <div
                        className="epic-progress-bar-fill"
                        style={{
                          width: `${
                            totalStories > 0
                              ? Math.round((doneStories / totalStories) * 100)
                              : 0
                          }%`,
                          backgroundColor: epicColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Add story action button */}
                  <button
                    type="button"
                    className="epic-add-story-btn"
                    onClick={() => {
                      if (!isExpanded) toggleEpic(epic._id);
                      setAddingStoryForEpic(
                        addingStoryForEpic === epic._id ? null : epic._id
                      );
                      setStoryError("");
                    }}
                    title="Add User Story to this Epic"
                  >
                    <Plus size={14} />
                    <span>Add Story</span>
                  </button>
                </div>
              </div>

              {/* EXPANDED STORIES SECTION */}
              {isExpanded && (
                <div className="epic-stories-content">
                  {/* INLINE ADD STORY FORM */}
                  {addingStoryForEpic === epic._id && (
                    <form
                      className="inline-add-story-form"
                      onSubmit={(e) => handleAddStorySubmit(e, epic._id)}
                    >
                      <h4>+ New User Story</h4>
                      {storyError && (
                        <div className="task-form-error" style={{ marginBottom: 10 }}>
                          {storyError}
                        </div>
                      )}

                      <div className="story-form-row">
                        <div className="story-form-field" style={{ flex: 3 }}>
                          <label>Story Title *</label>
                          <input
                            type="text"
                            placeholder="As a user, I want to..."
                            value={storyTitle}
                            onChange={(e) => setStoryTitle(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>

                        <div className="story-form-field" style={{ flex: 1.5 }}>
                          <label>Priority</label>
                          <select
                            value={storyPriority}
                            onChange={(e) => setStoryPriority(e.target.value)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                        <div className="story-form-field" style={{ flex: 1 }}>
                          <label>Story Points</label>
                          <input
                            type="number"
                            placeholder="pts"
                            min="0"
                            max="100"
                            value={storyPoints}
                            onChange={(e) => setStoryPoints(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="story-form-field">
                        <label>Description / Acceptance Criteria</label>
                        <textarea
                          placeholder="Acceptance criteria, user persona context..."
                          value={storyDescription}
                          onChange={(e) => setStoryDescription(e.target.value)}
                          rows="2"
                        />
                      </div>

                      <div className="story-form-actions">
                        <button
                          type="button"
                          className="story-cancel-btn"
                          onClick={() => {
                            setAddingStoryForEpic(null);
                            setStoryError("");
                          }}
                          disabled={submittingStory}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="story-submit-btn"
                          disabled={submittingStory || !storyTitle.trim()}
                        >
                          {submittingStory ? "Adding..." : "Add Story"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STORIES LIST */}
                  {isLoadingThisStories && stories.length === 0 ? (
                    <div className="epic-stories-loading">
                      <span>Loading user stories...</span>
                    </div>
                  ) : stories.length === 0 ? (
                    <div className="epic-stories-empty">
                      <Bookmark size={20} color="#94a3b8" />
                      <span>
                        No stories in this epic yet. Click &quot;+ Add Story&quot; above to
                        add one.
                      </span>
                    </div>
                  ) : (
                    <div className="stories-list">
                      {stories.map((story) => {
                        const sStatus = formatStatus(story.status);
                        const sPriority = story.priority || "medium";
                        const assigneeName =
                          story.assignee?.name || story.assignee || "Unassigned";

                        const taskCount =
                          story.taskCount !== undefined && story.taskCount !== null
                            ? story.taskCount
                            : (Array.isArray(story.tasks) ? story.tasks.length : 0);

                        const isStoryExpanded = !!expandedStories[story._id];
                        const tasksForStory = storyTasks[story._id] || [];
                        const isLoadingTasks = !!loadingStoryTasks[story._id];

                        return (
                          <div
                            key={story._id}
                            className={`story-item-card-wrapper ${
                              isStoryExpanded ? "story-expanded" : ""
                            }`}
                          >
                            {/* STORY HEADER ROW (Click to toggle expand) */}
                            <div
                              className="story-item-card-header"
                              onClick={() => toggleStory(story._id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleStory(story._id);
                                }
                              }}
                            >
                              <div className="story-item-left">
                                <button
                                  type="button"
                                  className="story-expand-btn"
                                  tabIndex={-1}
                                  aria-label={
                                    isStoryExpanded
                                      ? "Collapse story tasks"
                                      : "Expand story tasks"
                                  }
                                >
                                  {isStoryExpanded ? (
                                    <ChevronDown size={15} />
                                  ) : (
                                    <ChevronRight size={15} />
                                  )}
                                </button>

                                <Bookmark
                                  size={15}
                                  color={epicColor}
                                  className="story-icon"
                                />

                                <div className="story-info">
                                  <span className="story-title">
                                    {story.title || story.name}
                                  </span>
                                  {story.description && (
                                    <span className="story-desc">
                                      {story.description}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className="story-item-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Points */}
                                {story.storyPoints !== undefined &&
                                  story.storyPoints !== null && (
                                    <span
                                      className="story-points-pill"
                                      title="Story points"
                                    >
                                      {story.storyPoints} pts
                                    </span>
                                  )}

                                {/* Priority Badge */}
                                <span
                                  className={`priority-badge priority-${sPriority}`}
                                >
                                  {sPriority}
                                </span>

                                {/* Status Badge */}
                                <span
                                  className={`epic-status-badge ${sStatus.className}`}
                                >
                                  {sStatus.label}
                                </span>

                                {/* Assignee */}
                                <div
                                  className="story-assignee"
                                  title={`Assignee: ${assigneeName}`}
                                >
                                  <span className="story-avatar">
                                    {assigneeName.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="story-assignee-name">
                                    {assigneeName}
                                  </span>
                                </div>

                                {/* Real Task count pill */}
                                <span
                                  className="story-tasks-pill"
                                  title="Linked tasks count"
                                  onClick={() => toggleStory(story._id)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {taskCount} task{taskCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>

                            {/* EXPANDED TASKS DRAWER */}
                            {isStoryExpanded && (
                              <div className="story-tasks-drawer">
                                <div className="story-tasks-drawer-header">
                                  <span className="story-tasks-drawer-title">
                                    Tasks in this Story ({tasksForStory.length})
                                  </span>

                                  {/* Add Task Button inside story */}
                                  {onOpenCreateTask && (
                                    <button
                                      type="button"
                                      className="story-add-task-btn"
                                      onClick={() =>
                                        onOpenCreateTask({
                                          storyId: story._id,
                                          projectId:
                                            story.projectId?._id ||
                                            story.projectId ||
                                            epic.projectId?._id ||
                                            epic.projectId,
                                        })
                                      }
                                      title="Add Task to this User Story"
                                    >
                                      <Plus size={13} />
                                      <span>Add Task</span>
                                    </button>
                                  )}
                                </div>

                                {isLoadingTasks && tasksForStory.length === 0 ? (
                                  <div className="story-task-empty">
                                    Loading story tasks...
                                  </div>
                                ) : tasksForStory.length === 0 ? (
                                  <div className="story-task-empty">
                                    No tasks linked to this story yet. Click &quot;+ Add Task&quot; above to create one.
                                  </div>
                                ) : (
                                  <div className="story-tasks-list">
                                    {tasksForStory.map((t) => {
                                      const tStatus = formatStatus(t.status);
                                      const tPriority = t.priority || "medium";
                                      const tAssignee =
                                        t.assignee?.name || "Unassigned";

                                      return (
                                        <div
                                          key={t._id}
                                          className="story-task-item"
                                        >
                                          <div className="story-task-left">
                                            <span className="story-task-key">
                                              {t.taskKey || `TSK-${t._id.slice(-4)}`}
                                            </span>
                                            <span className="story-task-title">
                                              {t.title}
                                            </span>
                                          </div>

                                          <div className="story-task-right">
                                            <span
                                              className={`priority-badge priority-${tPriority}`}
                                            >
                                              {tPriority}
                                            </span>

                                            <span
                                              className={`epic-status-badge ${tStatus.className}`}
                                              style={{ fontSize: 11, padding: "2px 8px" }}
                                            >
                                              {tStatus.label}
                                            </span>

                                            <div
                                              className="story-assignee"
                                              title={`Assignee: ${tAssignee}`}
                                              style={{ gap: 4 }}
                                            >
                                              <span
                                                className="story-avatar"
                                                style={{ width: 18, height: 18, fontSize: 9 }}
                                              >
                                                {tAssignee.charAt(0).toUpperCase()}
                                              </span>
                                              <span
                                                className="story-assignee-name"
                                                style={{ fontSize: 11.5 }}
                                              >
                                                {tAssignee}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default EpicView;
