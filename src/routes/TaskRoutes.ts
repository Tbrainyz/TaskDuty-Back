import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  toggleTaskStatus,
  deleteTask,
} from "../controllers/TaskController";

const router = express.Router();

router.get("/", getTasks);

router.get("/:id", getTaskById);

router.post("/", createTask);

router.put("/:id", updateTask);

router.patch("/:id/toggle", toggleTaskStatus);

router.delete("/:id", deleteTask);

export default router;