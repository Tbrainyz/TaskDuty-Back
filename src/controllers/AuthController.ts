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
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
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
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── FORGOT PASSWORD — sends 6-digit OTP ──────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await User.findOne({ email });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      res.status(200).json({ message: "If that email exists, an OTP has been sent" });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // Save hashed OTP + 10 min expiry
    user.resetToken = hashedOtp;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Send OTP email via Brevo
    await sendEmail({
      to: user.email,
      toName: user.username,
      subject: "TaskDuty — Your Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">Password Reset OTP</h2>
          <p>Hi <strong>${user.username}</strong>,</p>
          <p>Use the OTP below to reset your TaskDuty password.</p>
          <p>This code expires in <strong>10 minutes</strong>.</p>

          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 12px; padding: 20px 40px;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #2D0050;">
                ${otp}
              </span>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 13px;">
            If you did not request this, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">TaskDuty — Task Manager App</p>
        </div>
      `,
    });

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required" });
      return;
    }

    // Hash the OTP from request to compare with stored hash
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      resetToken: hashedOtp,
      resetTokenExpiry: { $gt: Date.now() },
    }).select("+resetToken +resetTokenExpiry");

    if (!user) {
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    // OTP is valid — generate a short-lived reset token to use on reset page
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Replace OTP with reset token (5 min window to reset password)
    user.resetToken = hashedResetToken;
    user.resetTokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save({ validateBeforeSave: false });

    // Return token to frontend — frontend stores it temporarily to use on reset page
    res.status(200).json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetToken, password, confirmPassword } = req.body;

    if (!resetToken || !password || !confirmPassword) {
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

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset session. Please request a new OTP." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
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
    res.status(500).json({ message: error instanceof Error ? error.message : "Server Error" });
  }
};
