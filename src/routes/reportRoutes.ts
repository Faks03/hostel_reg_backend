import express from "express";
// import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { 
    getCombinedReport,
    exportReport
} from "../controllers/reportController";

const router = express.Router();

// router.use(authenticateToken, requireAdmin);

router.get("/", getCombinedReport);
router.get("/export", exportReport);

export default router;