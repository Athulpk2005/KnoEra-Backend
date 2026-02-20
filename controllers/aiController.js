import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from "../utils/geminiService.js";
import { findRelevantChunks } from "../utils/textChunker.js";

//@desc Generate flashcards from document
//@route POST /api/ai/generate-flashcards
//@access Private

export const generateFlashcards = async (req, res, next) => {
    try {
        const { documentId, count = 10 } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or you do not have permission to access it.',
                statusCode: 404
            });
        }

        // Auto-fix status if chunks exist but status is not completed
        if (document.status !== 'completed' && document.chunks && document.chunks.length > 0) {
            document.status = 'completed';
            await document.save();
        }

        if (document.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'AI is still reading this document. Please wait 10-20 seconds.',
                statusCode: 400
            });
        }

        if (document.status === 'failed') {
            return res.status(400).json({
                success: false,
                error: 'Analysis failed for this document. Try re-uploading it.',
                statusCode: 400
            });
        }

        // Check if text exists, fallback to chunks if needed
        let textToAnalyze = document.extractedText;
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            if (document.chunks && document.chunks.length > 0) {
                textToAnalyze = document.chunks.map(c => c.content).join('\n\n');
            }
        }

        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document content is empty or could not be read.',
                statusCode: 400
            });
        }

        //Generate flashcards using Gemini
        const cards = await geminiService.generateFlashcards(
            textToAnalyze,
            parseInt(count)
        );

        //Save to database
        const flashcardSet = await Flashcard.create({
            userId: req.user.id,
            documentId: document._id,
            cards: cards.map(card => ({
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                reviewCount: 0,
                isStarred: false,
            }))
        });

        return res.status(200).json({
            success: true,
            data: flashcardSet,
            message: 'Flashcards generated successfully',
        });

    } catch (error) {
        console.error('Error detail in generateFlashcards:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error generating flashcards',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            statusCode: 500
        });
    }
}


//@desc Generate quiz from document
//@route POST /api/ai/generate-quiz
//@access Private

export const generateQuiz = async (req, res, next) => {
    try {
        const { documentId, numQuestions = 10, title } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or you do not have permission to access it.',
                statusCode: 404
            });
        }

        // Auto-fix status if chunks exist but status is not completed
        if (document.status !== 'completed' && document.chunks && document.chunks.length > 0) {
            document.status = 'completed';
            await document.save();
        }

        if (document.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'AI is still reading this document. Please wait 10-20 seconds.',
                statusCode: 400
            });
        }

        if (document.status === 'failed') {
            return res.status(400).json({
                success: false,
                error: 'Analysis failed for this document. Try re-uploading it.',
                statusCode: 400
            });
        }

        // Check if text exists, fallback to chunks if needed
        let textToAnalyze = document.extractedText;
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            if (document.chunks && document.chunks.length > 0) {
                textToAnalyze = document.chunks.map(c => c.content).join('\n\n');
            }
        }

        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document content is empty or could not be read.',
                statusCode: 400
            });
        }

        //Generate quiz using Gemini
        const questions = await geminiService.generateQuiz(
            textToAnalyze,
            parseInt(numQuestions)
        );

        //Save to database
        const quiz = await Quiz.create({
            userId: req.user.id,
            documentId: document._id,
            title: title || `${document.title} - Quiz`,
            questions: questions,
            totalQuestions: questions.length,
            userAnswers: [],
            score: 0,
        });

        return res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully',
        })

    } catch (error) {
        console.error('Error detail in generateQuiz:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error generating quiz',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            statusCode: 500
        });
    }
}

//@Desc Generate Document summary
//@route POST /api/ai/generate-summary
//@access Private

export const generateSummary = async (req, res, next) => {
    try {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or you do not have permission to access it.',
                statusCode: 404
            });
        }

        if (document.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'AI is still reading this document. Please wait 10-20 seconds.',
                statusCode: 400
            });
        }

        if (document.status === 'failed') {
            return res.status(400).json({
                success: false,
                error: 'Analysis failed for this document. Try re-uploading it.',
                statusCode: 400
            });
        }

        // Check if text exists, fallback to chunks if needed
        let textToSummarize = document.extractedText;
        if (!textToSummarize || textToSummarize.trim().length === 0) {
            if (document.chunks && document.chunks.length > 0) {
                textToSummarize = document.chunks.map(c => c.content).join('\n\n');
            }
        }

        if (!textToSummarize || textToSummarize.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document content is empty or could not be read.',
                statusCode: 400
            });
        }

        //Generate summary using Gemini
        const summary = await geminiService.generateSummary(textToSummarize);

        res.status(200).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully',
        })

    } catch (error) {
        console.error('Error detail in generateSummary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error generating summary',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            statusCode: 500
        });
    }
}


//@desc Chat with Document
//@route POST /api/ai/chat
//@access Private

export const chat = async (req, res, next) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and question',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or you do not have permission to access it.',
                statusCode: 404
            });
        }

        // Auto-fix status if chunks exist but status is not completed
        if (document.status !== 'completed' && document.chunks && document.chunks.length > 0) {
            document.status = 'completed';
            await document.save();
        }

        if (document.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'AI is still reading this document. Please wait 10-20 seconds.',
                statusCode: 400
            });
        }

        if (document.status === 'failed') {
            return res.status(400).json({
                success: false,
                error: 'Analysis failed for this document. Try re-uploading it.',
                statusCode: 400
            });
        }

        if (document.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: `Document status is ${document.status}. Analysis must be complete before chatting.`,
                statusCode: 400
            });
        }

        // Check if chunks exist
        if (!document.chunks || document.chunks.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document has no content chunks. Please re-upload the document.',
                statusCode: 400
            });
        }

        //Find relevant chunks
        const relevantChunks = findRelevantChunks(document.chunks, question, 3);
        const chunkIndices = relevantChunks.map(c => c.chunkIndex);

        //Get or create chat history
        let chatHistory = await ChatHistory.findOne({
            documentId: document._id,
            userId: req.user.id
        })

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                documentId: document._id,
                userId: req.user.id,
                messages: []
            })
        }

        //Generate response using Gemini
        const answer = await geminiService.generateResponse(question, relevantChunks);

        //Save chat history
        chatHistory.messages.push({
            role: 'user',
            content: question,
            timestamp: new Date(),
            relevantChunks: []
        },
            {
                role: 'assistant',
                content: answer,
                timestamp: new Date(),
                relevantChunks: chunkIndices
            }
        );
        await chatHistory.save();

        return res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                relevantChunks: chunkIndices,
                chatHistoryId: chatHistory._id
            },
            message: 'Answer generated successfully',
        })
    } catch (error) {
        console.error('Chat service error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Error in chat service',
            statusCode: 500
        });
    }
}

//@desc explain concept from document
//@route POST /api/ai/explain-concept
//@access Private

export const explainConcept = async (req, res, next) => {
    try {
        const { documentId, concept } = req.body;

        if (!documentId || !concept) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and concept',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or you do not have permission to access it.',
                statusCode: 404
            });
        }

        if (document.status === 'processing') {
            return res.status(400).json({
                success: false,
                error: 'AI is still reading this document. Please wait 10-20 seconds.',
                statusCode: 400
            });
        }

        if (document.status === 'failed') {
            return res.status(400).json({
                success: false,
                error: 'Analysis failed for this document. Try re-uploading it.',
                statusCode: 400
            });
        }

        //Find relevant chunks
        const relevantChunks = findRelevantChunks(document.chunks, concept, 3);
        const context = relevantChunks.map(c => c.content).join('\n\n');

        //Generate explanation using Gemini
        const explanation = await geminiService.explainConcept(concept, context);

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                relevantChunks: relevantChunks.map(c => c.chunkIndex),
            },
            message: 'Explanation generated successfully',
        })

    } catch (error) {
        console.error('Error detail in explainConcept:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error explaining concept',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            statusCode: 500
        });
    }
}

//@desc Get chat history for a document
//@route GET /api/ai/chat-history/:documentId
//@access Private

export const getChatHistory = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const chatHistory = await ChatHistory.findOne({
            documentId: documentId,
            userId: req.user.id,
        }).select('messages');

        if (!chatHistory) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Chat history not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrieved successfully',
        })

    } catch (error) {
        console.error('Error in getChatHistory:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error retrieving chat history',
            statusCode: 500
        });
    }
}
