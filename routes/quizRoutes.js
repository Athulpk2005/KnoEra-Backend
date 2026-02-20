import express from "express";
import {
    getQuizzes,
    getUserQuizzes,
    getQuizId,
    submitQuiz,
    getQuizResults,
    deleteQuiz
} from "../controllers/quizController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get('/', getUserQuizzes);
router.get('/:documentId', getQuizzes);
router.get('/quiz/:id', getQuizId);
router.post('/:id/submit', submitQuiz);
router.get('/:id/results', getQuizResults);
router.delete('/:id', deleteQuiz);

export default router;