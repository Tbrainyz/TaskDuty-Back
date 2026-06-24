import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  toggleTaskStatus,
  deleteTask,
  getTrashedTasks,
  restoreTask,
  permanentDeleteTask,
} from "../controllers/TaskController";
import protect from "../middleware/authMiddleware";

const router = express.Router();

// All routes protected
router.use(protect);

// ── Active task routes ────────────────────────────────────────
router.get("/",              getTasks);
router.get("/trash",         getTrashedTasks);     // ← get trashed tasks
router.get("/:id",           getTaskById);
router.post("/",             createTask);
router.put("/:id",           updateTask);
router.patch("/:id/toggle",  toggleTaskStatus);
router.delete("/:id",        deleteTask);           // ← soft delete

// ── Trash management routes ───────────────────────────────────
router.put("/:id/restore",           restoreTask);          // ← restore from trash
router.delete("/:id/permanent",      permanentDeleteTask);  // ← delete forever

export default router;
