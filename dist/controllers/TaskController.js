"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.toggleTaskStatus = exports.updateTask = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
const TaskModel_1 = __importDefault(require("../models/TaskModel"));
// CREATE TASK
const createTask = async (req, res) => {
    try {
        const { title, description, dueDate, category } = req.body;
        if (!title || !description || !dueDate || !category) {
            res.status(400).json({
                success: false,
                message: "All fields are required",
            });
            return;
        }
        const task = await TaskModel_1.default.create({
            title,
            description,
            dueDate,
            category,
        });
        res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: task,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.createTask = createTask;
// GET ALL TASKS
const getTasks = async (req, res) => {
    try {
        const { category, completed } = req.query;
        const filter = {};
        if (category) {
            filter.category = category;
        }
        if (completed !== undefined) {
            filter.completed = completed === "true";
        }
        const tasks = await TaskModel_1.default.find(filter).sort({
            createdAt: -1,
        });
        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.getTasks = getTasks;
// GET SINGLE TASK
const getTaskById = async (req, res) => {
    try {
        const task = await TaskModel_1.default.findById(req.params.id);
        if (!task) {
            res.status(404).json({
                success: false,
                message: "Task not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: task,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.getTaskById = getTaskById;
// UPDATE TASK
const updateTask = async (req, res) => {
    try {
        const task = await TaskModel_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!task) {
            res.status(404).json({
                success: false,
                message: "Task not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: task,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.updateTask = updateTask;
// TOGGLE TASK COMPLETION STATUS
const toggleTaskStatus = async (req, res) => {
    try {
        const task = await TaskModel_1.default.findById(req.params.id);
        if (!task) {
            res.status(404).json({
                success: false,
                message: "Task not found",
            });
            return;
        }
        task.completed = !task.completed;
        await task.save();
        res.status(200).json({
            success: true,
            message: "Task status updated successfully",
            data: task,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.toggleTaskStatus = toggleTaskStatus;
// DELETE TASK
const deleteTask = async (req, res) => {
    try {
        const task = await TaskModel_1.default.findByIdAndDelete(req.params.id);
        if (!task) {
            res.status(404).json({
                success: false,
                message: "Task not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Task deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Server Error",
        });
    }
};
exports.deleteTask = deleteTask;
