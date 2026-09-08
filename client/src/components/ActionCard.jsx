import { useState } from "react";
import "./ChatPanel.css";

function ActionCard({ action }) {
  const [status, setStatus] = useState(action.status || "pending");
  const [loading, setLoading] = useState(false);

  const actionLabels = {
    create_task: "Create a new task",
    assign_task: "Assign task to team member",
    share_task: "Share task with collaborator",
    update_task_status: "Update task status",
    update_task_priority: "Update task priority",
    update_task_deadline: "Update task deadline",
    update_project_status: "Update project status",
  };

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

  // Approved state
  if (status === "approved") {
    return (
      <div className="action-card success">
        <p>✅ Action approved and executed successfully.</p>
      </div>
    );
  }

  // Rejected state
  if (status === "rejected") {
    return (
      <div className="action-card rejected">
        <p>❌ Action rejected.</p>
      </div>
    );
  }

  // Pending state
  return (
    <div className="action-card">
      <h4>⚡ Agent wants to make a change</h4>

      <p className="action-type">
        {actionLabels[action.actionType] || action.actionType}
      </p>

      {/* Create Task */}
      {action.actionType === "create_task" && action.payload && (
        <div className="action-payload-info">
          <p>
            <strong>Task Title:</strong> {action.payload.title}
          </p>
          {action.payload.assignee_name && (
            <p>
              <strong>Assignee:</strong> {action.payload.assignee_name}
            </p>
          )}
          {action.payload.priority && (
            <p>
              <strong>Priority:</strong> {action.payload.priority}
            </p>
          )}
          {action.payload.deadline && (
            <p>
              <strong>Due Date:</strong>{" "}
              {new Date(action.payload.deadline).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Assign Task */}
      {action.actionType === "assign_task" && action.payload && (
        <div className="action-payload-info">
          <p>
            <strong>Assign To:</strong> {action.payload.assignee_name}
          </p>
          {action.payload.assignee_email && (
            <p>
              <strong>Email:</strong> {action.payload.assignee_email}
            </p>
          )}
        </div>
      )}

      {/* Share Task */}
      {action.actionType === "share_task" && action.payload && (
        <div className="action-payload-info">
          <p>
            <strong>Share With:</strong> {action.payload.recipient_name} ({action.payload.recipient_email})
          </p>
          <p>
            <strong>Role:</strong> {action.payload.role || "Collaborator"}
          </p>
          {action.payload.note && (
            <p>
              <strong>Note:</strong> "{action.payload.note}"
            </p>
          )}
        </div>
      )}

      {/* Update Task Status */}
      {action.actionType === "update_task_status" &&
        action.payload?.status && (
          <p>
            <strong>New Status:</strong> {action.payload.status}
          </p>
        )}

      {/* Update Task Priority */}
      {action.actionType === "update_task_priority" &&
        action.payload?.priority && (
          <p>
            <strong>New Priority:</strong> {action.payload.priority}
          </p>
        )}

      {/* Update Task Deadline */}
      {action.actionType === "update_task_deadline" &&
        action.payload?.deadline && (
          <p>
            <strong>New Deadline:</strong>{" "}
            {new Date(action.payload.deadline).toLocaleDateString()}
          </p>
        )}

      {/* Update Project Status */}
      {action.actionType === "update_project_status" &&
        action.payload?.status && (
          <p>
            <strong>New Status:</strong> {action.payload.status}
          </p>
        )}

      <p className="pending-status">
        <strong>Status:</strong> Pending approval
      </p>

      <div className="action-buttons">
        <button
          className="approve-btn"
          onClick={approveAction}
          disabled={loading}
        >
          {loading ? "Processing..." : "✅ Approve"}
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