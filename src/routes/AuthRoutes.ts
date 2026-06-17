import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../controllers/AuthController";

const router = express.Router();

router.post("/register",              registerUser);
router.post("/login",                 loginUser);
router.post("/forgot-password",       forgotPassword);
router.put("/reset-password/:token",  resetPassword);
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
  });
});

export default router;
