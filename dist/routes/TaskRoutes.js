"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TaskController_1 = require("../controllers/TaskController");
const router = express_1.default.Router();
router.get("/", TaskController_1.getTasks);
router.get("/:id", TaskController_1.getTaskById);
router.post("/", TaskController_1.createTask);
router.put("/:id", TaskController_1.updateTask);
router.patch("/:id/toggle", TaskController_1.toggleTaskStatus);
router.delete("/:id", TaskController_1.deleteTask);
exports.default = router;
