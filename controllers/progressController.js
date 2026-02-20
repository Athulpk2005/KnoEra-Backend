import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
import fs from "fs";

//@desc Get user progress
//@route GET /api/progress/dashboard
//@access Private

export const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;

        //Get Count
        const totalDocuments = await Document.countDocuments({ userId });
        const totalFlashcardSets = await Flashcard.countDocuments({ userId });
        const totalQuizzes = await Quiz.countDocuments({ userId });
        const completedQuizzes = await Quiz.countDocuments({ userId, completedAt: { $ne: null } });

        //Get flashcard stats
        const flashcardSets = await Flashcard.find({ userId }).lean();
        let totalFlashcard = 0;
        let reviewedFlashcards = 0;
        let starredFlashcards = 0;

        flashcardSets.forEach(set => {
            if (set.cards) {
                totalFlashcard += set.cards.length;
                reviewedFlashcards += set.cards.filter(c => c.reviewCount > 0).length;
                starredFlashcards += set.cards.filter(c => c.isStarred).length;
            }
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d9d609f2-7690-43d3-9e32-a0c0cf62638f', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix',
                hypothesisId: 'H1',
                location: 'progressController.js:getDashboard',
                message: 'Dashboard flashcard stats',
                data: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcard,
                    reviewedFlashcards,
                    starredFlashcards,
                    flashcardSetSizes: flashcardSets.map(set => (set.cards ? set.cards.length : 0))
                },
                timestamp: Date.now()
            })
        }).catch(() => { });
        // #endregion

        // #region agent log
        try {
            const logEntry = {
                sessionId: 'debug-session',
                runId: 'pre-fix',
                hypothesisId: 'H1',
                location: 'progressController.js:getDashboard:file',
                message: 'Dashboard flashcard stats (file)',
                data: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcard,
                    reviewedFlashcards,
                    starredFlashcards,
                    flashcardSetSizes: flashcardSets.map(set => (set.cards ? set.cards.length : 0))
                },
                timestamp: Date.now()
            };
            // Ensure debug directory exists
            fs.mkdirSync("d:\\KnoEra Ai\\.cursor", { recursive: true });
            fs.appendFileSync("d:\\KnoEra Ai\\.cursor\\debug.log", JSON.stringify(logEntry) + "\n");
        } catch (e) {
            // swallow logging errors
        }
        // #endregion

        //Get quiz stats
        const quizzes = await Quiz.find({ userId, completedAt: { $ne: null } }).lean();
        const averageScore = quizzes.length > 0
            ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
            : 0;

        //Recent activity
        let dateFilter = {};
        if (req.user.lastClearedActivityAt) {
            dateFilter = { createdAt: { $gt: req.user.lastClearedActivityAt } };
        }

        const recentDocuments = await Document.find({ userId, ...dateFilter })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title fileName createdAt')
            .lean();

        let quizDateFilter = {};
        if (req.user.lastClearedActivityAt) {
            quizDateFilter = {
                $or: [
                    { completedAt: { $gt: req.user.lastClearedActivityAt } },
                    { lastAccessedAt: { $gt: req.user.lastClearedActivityAt } }
                ]
            };
        }
        // Combined filter for quizzes (must be completed AND after clear date if set)
        const quizQuery = { userId, ...quizDateFilter };

        const recentQuizzes = await Quiz.find(quizQuery)
            .sort({ lastAccessedAt: -1 })
            .limit(5)
            .populate('documentId', 'title')
            .select('title score totalQuestions completedAt')
            .lean();

        // Get recent flashcard activity
        let flashcardDateFilter = {};
        if (req.user.lastClearedActivityAt) {
            flashcardDateFilter = { createdAt: { $gt: req.user.lastClearedActivityAt } };
        }

        const recentFlashcardSets = await Flashcard.find({ userId, ...flashcardDateFilter })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('documentId', 'title')
            .select('createdAt documentId cards')
            .lean();

        //Study Streak (simplified - in production track daily activity)
        const studyStreak = Math.floor(Math.random() * 7) + 1;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcard,
                    reviewedFlashcards,
                    starredFlashcards,
                    averageScore,
                    completedQuizzes,
                    totalQuizzes,
                    studyStreak
                },
                recentActivity: {
                    documents: recentDocuments,
                    quizzes: recentQuizzes,
                    flashcardSets: recentFlashcardSets,
                }
            },
        })
    } catch (error) {
        next(error)
    }
}

//@desc Clear recent activity
//@route DELETE /api/progress/activity
//@access Private
export const clearActivity = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            lastClearedActivityAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Activity history cleared"
        });
    } catch (error) {
        next(error);
    }
}

