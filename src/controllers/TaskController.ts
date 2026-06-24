import { Request, Response } from "express";
import Task from "../models/TaskModel";

// ── CREATE TASK ───────────────────────────────────────────────
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, dueDate, category } = req.body;

    if (!title || !description || !dueDate || !category) {
      res.status(400).json({ success: false, message: "All fields are required" });
      return;
    }

    const task = await Task.create({
      user: req.user!._id,
      title, description, dueDate, category,
    });

    res.status(201).json({ success: true, message: "Task created successfully", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── GET ALL TASKS — excludes soft-deleted ─────────────────────
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, completed } = req.query;

    const filter: Record<string, unknown> = {
      user: req.user!._id,
      // Include tasks where deleted is false OR field doesn't exist (old tasks)
      $or: [{ deleted: false }, { deleted: { $exists: false } }],
    };

    if (category)           filter.category  = category;
    if (completed !== undefined) filter.completed = completed === "true";

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── GET SINGLE TASK ───────────────────────────────────────────
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── UPDATE TASK ───────────────────────────────────────────────
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    res.status(200).json({ success: true, message: "Task updated successfully", data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── TOGGLE COMPLETE STATUS ────────────────────────────────────
export const toggleTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }

    task.completed = !task.completed;
    await task.save();

    res.status(200).json({ success: true, message: "Task status updated", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── SOFT DELETE — moves task to trash ────────────────────────
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }

    // Mark as deleted instead of removing from DB
    task.deleted   = true;
    task.deletedAt = new Date();
    await task.save();

    res.status(200).json({ success: true, message: "Task moved to trash" });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── GET TRASHED TASKS ─────────────────────────────────────────
export const getTrashedTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find({
      user: req.user!._id,
      deleted: true,         // only explicitly trashed tasks
    }).sort({ deletedAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── RESTORE TASK from trash ───────────────────────────────────
export const restoreTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }
    if (!task.deleted) {
      res.status(400).json({ success: false, message: "Task is not in trash" }); return;
    }

    task.deleted   = false;
    task.deletedAt = null;
    await task.save();

    res.status(200).json({ success: true, message: "Task restored successfully", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── PERMANENT DELETE — removes from DB forever ────────────────
export const permanentDeleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) { res.status(404).json({ success: false, message: "Task not found" }); return; }
    if (task.user.toString() !== req.user!._id!.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" }); return;
    }

    await task.deleteOne();

    res.status(200).json({ success: true, message: "Task permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server Error" });
  }
};
