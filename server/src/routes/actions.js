import express from "express";
import PendingAction from "../models/PendingAction.js";
import AuditLog from "../models/AuditLog.js";
import { executeAction } from "../services/actionExecuter.js";

const router = express.Router();

// Approve pending action
router.post("/:id/approve", async (req, res) => {
  try {
    const action = await PendingAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Pending action not found",
      });
    }

    if (action.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Action is already ${action.status}`,
      });
    }

    // Execute the approved action
    const result = await executeAction(action);

    // Update pending action
    action.status = "executed";
    action.resolvedAt = new Date();
    await action.save();

    // Create audit log
    const auditLog = await AuditLog.create({
      actionId: action._id,
      actionType: action.actionType,
      payload: action.payload,
      result: "executed",
    });

    res.status(200).json({
      success: true,
      message: "Action approved and executed successfully",
      result,
      auditLog,
    });
  } catch (error) {
    console.error("Approval error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reject pending action
router.post("/:id/reject", async (req, res) => {
  try {
    const action = await PendingAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Pending action not found",
      });
    }

    if (action.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Action is already ${action.status}`,
      });
    }

    action.status = "rejected";
    action.resolvedAt = new Date();

    await action.save();

    res.status(200).json({
      success: true,
      message: "Action rejected successfully",
      action,
    });
  } catch (error) {
    console.error("Reject error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;