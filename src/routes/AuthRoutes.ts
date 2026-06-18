import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/AuthController";
import protect from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register",              registerUser);
router.post("/login",                 loginUser);
router.post("/forgot-password",       forgotPassword);
router.put("/reset-password/:token",  resetPassword);
router.put("/update-password",        protect, updatePassword);  // protected

export default router;
