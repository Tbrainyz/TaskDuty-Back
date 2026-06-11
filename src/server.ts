import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db";
import taskRoutes from "./routes/TaskRoutes";

dotenv.config();

connectDB();

const app: Application = express();

// CORS — allow your frontend origin
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://task-duty-front.vercel.app",
      process.env.FRONTEND_URL || "",
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Task Manager API Running",
  });
});

app.use("/api/tasks", taskRoutes);

app.all("/{*any}", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});