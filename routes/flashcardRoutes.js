import express from "express";
import {
    getFlashcards,
    getAllFlashcardSet,
    reviewFlashcards,
    toggleFlashcard,
    deleteFlashcardSet,
    getFlashcardSetById,
    generateFlashcards,
} from "../controllers/flashcardController.js";
import { protect } from "../middleware/auth.js";
const router = express.Router();
router.use(protect);
router.get('/', getAllFlashcardSet);
router.get('/:documentId', getFlashcards);
router.post('/generate', generateFlashcards);
router.post('/:cardId/review', reviewFlashcards);
router.put('/:cardId/star', toggleFlashcard);
router.get('/set/:id', getFlashcardSetById);
router.delete('/:Id', deleteFlashcardSet);

export default router;



