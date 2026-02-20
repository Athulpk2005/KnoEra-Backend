// Load env variables FIRST
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";

import mongoose from "mongoose";
import connectDB from "./config/Db.js";
import errorHandler from "./middleware/errorHandler.js";
import performanceMonitor from "./middleware/performanceMonitor.js";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Initialize app
const app = express();

// Security - Helmet (HTTP headers)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images/PDFs to be loaded
}));

// Monitoring
app.use(performanceMonitor);

// Trust Proxy (Required for Render/Proxies to work with rate limiting)
app.set('trust proxy', 1);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Environment validation
const requiredEnv = [
  'MONGO_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'EMAIL_USER',
  'EMAIL_PASS',
  'FRONTEND_URL'
];
const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
  console.error(`❌ FATAL: Missing Environment Variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Compression middleware
app.use(compression());

// Connect Database
connectDB();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
    statusCode: 429,
  },
});

app.use(limiter);

// CORS (DEV + PROD SAFE)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081", // Expo Web
  "http://192.168.1.70:8081", // Expo Go
  "exp://192.168.1.70:8081", // Expo Go
  "http://127.0.0.1:8081", // Localhost alternative
  "http://localhost:19006", // Expo Metro
  "exp://localhost:19006", // Expo Metro
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body Parsers & Sanitization
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(mongoSanitize()); // Prevent NoSQL injection

// Uploads Folder (AUTO CREATE)
const uploadsPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(
  "/uploads",
  express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

// Basic Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to KnoEra Ai API",
    version: "1.0.0",
    status: "Healthy"
  });
});

// API Routes
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/progress", progressRoutes);

// Error Handler (must be AFTER routes)
app.use(errorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found - ${req.originalUrl}`,
    statusCode: 404,
  });
});

// Start Server
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
});

// Graceful Shutdown
const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('⛔ HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('💾 MongoDB connection closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
