import Quiz from "../models/Quiz.js";

//@desc Get all quizzes for a document
//@route GET /api/quiz/:documentId
//@access Private

export const getQuizzes = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({
            documentId: req.params.documentId,
            userId: req.user.id
        })
            .populate('documentId', 'title fileName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: quizzes.length,
            data: quizzes,
        })
    } catch (error) {
        next(error)
    }
}

//@desc Get all quizzes for current user
//@route GET /api/quizzes
//@access Private
export const getUserQuizzes = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({
            userId: req.user.id
        })
            .populate('documentId', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: quizzes.length,
            data: quizzes,
        })
    } catch (error) {
        next(error)
    }
}

//@desc Get a single quiz by ID
//@route GET /api/quizzes/quiz/:id
//@access Private

export const getQuizId = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404,
            })
        }

        res.status(200).json({
            success: true,
            data: quiz,
        })
    } catch (error) {
        next(error)
    }
}

//@desc Submit a quiz answer
//@route POST /api/quizzes/:id/submit
//@access Private

export const submitQuiz = async (req, res, next) => {
    try {
        const { answers } = req.body;

        if (!Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid answer format',
                statusCode: 400,
            })
        }
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404,
            })
        }

        // Allowing re-submission to update scores, or you can create a new attempt record if needed.
        // For now, we'll just allow overwriting the previous attempt.

        //Process answer
        let correctCount = 0;
        const userAnswers = [];

        answers.forEach((selectedAnswer, index) => {
            if (index < quiz.questions.length) {
                const question = quiz.questions[index];
                const isCorrect = selectedAnswer === question.correctAnswer;

                if (isCorrect) correctCount++;

                userAnswers.push({
                    questionIndex: index,
                    selectedAnswer: selectedAnswer,
                    isCorrect,
                    answeredAt: new Date(),
                })
            }
        })

        //Calculate score
        const score = Math.round((correctCount / quiz.totalQuestions) * 100);

        //Update quiz
        quiz.userAnswers = userAnswers;
        quiz.score = score;
        quiz.completedAt = new Date();

        await quiz.save();

        res.status(200).json({
            success: true,
            data: {
                score,
                correctCount,
                totalQuestions: quiz.totalQuestions,
                percentage: score,
                userAnswers,
            },
            message: 'Quiz submitted successfully',
        })
    } catch (error) {
        console.error('Error detail in submitQuiz:', error);
        next(error)
    }
}

//@desc Get quiz results
//@route GET /api/quizzes/:id/results
//@access Private

export const getQuizResults = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user.id
        }).populate('documentId', 'title');

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404,
            })
        }
        // We allow viewing results even if not completed, though answers will be empty/null
        // This prevents 400 errors if the user navigates here via history or direct URL

        //Build detailed results
        const detailedResults = quiz.questions.map((question, index) => {
            const userAnswer = quiz.userAnswers?.find(a => a.questionIndex === index);
            return {
                questionIndex: index,
                question: question.question,
                options: question.options,
                correctAnswer: question.correctAnswer,
                selectedAnswer: userAnswer?.selectedAnswer || null,
                isCorrect: userAnswer?.isCorrect || false,
                explanation: question.explanation,
            }
        })

        res.status(200).json({
            success: true,
            data: {
                quiz: {
                    id: quiz._id,
                    title: quiz.title,
                    document: quiz.documentId,
                    score: quiz.score,
                    totalQuestions: quiz.totalQuestions,
                    completedAt: quiz.completedAt,

                },
                results: detailedResults,
            },
        })
    } catch (error) {
        next(error)
    }
}

//@desc Delete a quiz
//@route DELETE /api/quizzes/:id
//@access Private

export const deleteQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404,
            })
        }

        await quiz.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Quiz deleted successfully',
        })

    } catch (error) {
        next(error)
    }
}

