import { useState } from "react";
import "./ChatPanel.css";

function ActionCard({ action, projects = [], onActionComplete }) {
  const [status, setStatus] = useState(
    action.status === "executed"
      ? "approved"
      : action.status || "pending"
  );

  const [loading, setLoading] = useState(false);

  const actionLabels = {
    create_task: "Create a new task",
    update_task_status: "Update task status",
    update_task_priority: "Update task priority",
    update_task_deadline: "Update task deadline",
    update_project_status: "Update project status",
  };

  // Find project for action
  const project = projects.find(
    (item) =>
      item._id?.toString() ===
      action.payload?.project_id?.toString()
  );

  const approveAction = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/actions/${action._id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus("approved");

        // Refresh projects/tasks in parent
        if (onActionComplete) {
          onActionComplete();
        }
      } else {
        alert(data.message || "Action failed");
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Failed to approve action");
    } finally {
      setLoading(false);
    }
  };

  const rejectAction = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/actions/${action._id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus("rejected");
      } else {
        alert(data.message || "Action failed");
      }
    } catch (error) {
      console.error("Reject error:", error);
      alert("Failed to reject action");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // APPROVED STATE
  // ==========================================

  if (status === "approved") {
    return (
      <div className="action-card success">
        <p>✅ Action approved and executed successfully.</p>

        {project && (
          <p>
            <strong>Project:</strong> {project.name}
          </p>
        )}
      </div>
    );
  }

  // ==========================================
  // REJECTED STATE
  // ==========================================

  if (status === "rejected") {
    return (
      <div className="action-card rejected">
        <p>❌ Action rejected.</p>
      </div>
    );
  }

  // ==========================================
  // PENDING STATE
  // ==========================================

  return (
    <div className="action-card">
      <h4>⚡ Agent wants to make a change</h4>

      <p className="action-type">
        {actionLabels[action.actionType] ||
          action.actionType}
      </p>

      {/* PROJECT NAME */}
      {project && (
        <p>
          <strong>Project:</strong> {project.name}
        </p>
      )}

      {/* CREATE TASK */}
      {action.actionType === "create_task" &&
        action.payload?.title && (
          <>
            <p>
              <strong>Task:</strong>{" "}
              {action.payload.title}
            </p>

            {action.payload?.description && (
              <p>
                <strong>Description:</strong>{" "}
                {action.payload.description}
              </p>
            )}
          </>
        )}

      {/* UPDATE TASK STATUS */}
      {action.actionType === "update_task_status" &&
        action.payload?.status && (
          <p>
            <strong>New Status:</strong>{" "}
            {action.payload.status}
          </p>
        )}

      {/* UPDATE TASK PRIORITY */}
      {action.actionType === "update_task_priority" &&
        action.payload?.priority && (
          <p>
            <strong>New Priority:</strong>{" "}
            {action.payload.priority}
          </p>
        )}

      {/* UPDATE TASK DEADLINE */}
      {action.actionType === "update_task_deadline" &&
        action.payload?.deadline && (
          <p>
            <strong>New Deadline:</strong>{" "}
            {new Date(
              action.payload.deadline
            ).toLocaleDateString()}
          </p>
        )}

      {/* UPDATE PROJECT STATUS */}
      {action.actionType ===
        "update_project_status" &&
        action.payload?.status && (
          <p>
            <strong>New Status:</strong>{" "}
            {action.payload.status}
          </p>
        )}

      <p className="pending-status">
        <strong>Status:</strong>{" "}
        Pending approval
      </p>

      <div className="action-buttons">
        <button
          className="approve-btn"
          onClick={approveAction}
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : "✅ Approve"}
        </button>

        <button
          className="reject-btn"
          onClick={rejectAction}
          disabled={loading}
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}

export default ActionCard;