import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/UserModel";
import generateToken from "../utils/generateToken";
import sendEmail from "../utils/sendEmail";

// ── REGISTER ─────────────────────────────────────────────────
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      res.status(400).json({ message: "Username or email already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, password: hashedPassword });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Server Error",
    });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Allow login with username OR email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password");

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Server Error",
    });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await User.findOne({ email });

    // Always return success even if email not found (security best practice)
    if (!user) {
      res.status(200).json({
        message: "If that email exists, a reset link has been sent",
      });
      return;
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token + 1 hour expiry
    user.resetToken = hashedToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      toName: user.username,
      subject: "TaskDuty — Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Reset Your Password</h2>
          <p>Hi <strong>${user.username}</strong>,</p>
          <p>You requested a password reset for your TaskDuty account. Click the button below to set a new password.</p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
            style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#9ca3af;font-size:12px;">TaskDuty — Task Manager App</p>
        </div>
      `,
    });

    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Server Error",
    });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    // Hash token from URL to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token as string)
      .digest("hex");

    // Find user with matching valid token
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Server Error",
    });
  }
};

// ── UPDATE PASSWORD (logged-in user) ─────────────────────────
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const user = await User.findById(req.user!._id).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Server Error",
    });
  }
};
