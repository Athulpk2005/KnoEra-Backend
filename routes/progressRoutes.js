import express from "express";
import {
    getDashboard,
    clearActivity
} from "../controllers/progressController.js";
import { protect } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = express.Router();
router.use(protect);
router.get("/dashboard", cacheMiddleware(180), getDashboard); // 3 minutes cache
router.delete("/activity", clearActivity);
export default router;