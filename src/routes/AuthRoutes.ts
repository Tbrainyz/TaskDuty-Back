import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updatePassword,
} from "../controllers/AuthController";
import protect from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register",         registerUser);
router.post("/login",            loginUser);
router.post("/forgot-password",  forgotPassword);   // sends OTP
router.post("/verify-otp",       verifyOtp);        // verifies OTP → returns resetToken
router.post("/reset-password",   resetPassword);    // resets password using resetToken
router.put("/update-password",   protect, updatePassword);

export default router;
