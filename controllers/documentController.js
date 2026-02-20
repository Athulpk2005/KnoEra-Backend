import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chunkText } from "../utils/textChunker.js";
import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from "path";

//@desc Upload Document
//@route POST /api/documents/upload
//@access Private
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Please upload a PDF file',
                statusCode: 400
            });
        }
        const { title } = req.body;

        if (!title) {
            //delete uploaded file if no title is provided
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Please provide a title for the document',
                statusCode: 400
            });
        }

        //construct the URL for the uploaded file
        const baseUrl = `http://localhost:${process.env.PORT || 8000}`;
        const fileNameEncoded = encodeURIComponent(req.file.filename);
        const fileUrl = `${baseUrl}/uploads/documents/${fileNameEncoded}`;

        //Create document record
        const document = await Document.create({
            userId: req.user.id,
            title,
            filePath: req.file.path,
            fileUrl: fileUrl,
            fileSize: req.file.size,
            status: 'processing',
        });

        //process PDF in background(in production use queue like bull)

        processPDF(document.id, req.file.path).catch(err => {
            console.error('Error processing PDF:', err);

        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully.Processing document...',
            data: document
        });

    } catch (error) {
        //Clean up uploaded file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        next(error);
    }
};

//Helper function to process PDF
const processPDF = async (documentId, filePath) => {
    try {
        const { text } = await extractTextFromPDF(filePath);

        //Create chunks
        const chunks = chunkText(text, 500, 50);

        //Update document
        await Document.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks: chunks,
            status: 'completed',
        });

        console.log(`Document ${documentId} processed successfully`);


    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        await Document.findByIdAndUpdate(documentId, {
            status: 'failed',
        });
    }
}

//@desc Get Documents
//@route GET /api/documents
//@access Private

export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(req.user.id) }
            },
            {
                $lookup: {
                    from: 'flashcards',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'flashcards'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'quizzes'
                }
            },
            {
                $addFields: {
                    flashcardCount: { $size: '$flashcards' },
                    quizCount: { $size: '$quizzes' }
                }
            },
            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashcards: 0,
                    quizzes: 0,
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });

    } catch (error) {
        next(error);
    }
}

//@desc Get Single Document
//@route GET /api/documents/:id
//@access Private

export const getDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user.id
        })

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }
        //Get count associated flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user.id });
        const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user.id });
        //Update last accessed
        document.lastAccessedAt = Date.now();
        await document.save();

        //combine document data with count
        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;

        res.status(200).json({
            success: true,
            data: documentData
        });

    } catch (error) {
        next(error);
    }
}

//@desc Delete Document
//@route DELETE /api/documents/:id
//@access Private

export const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        //Delete file from filesytem
        await fs.unlink(document.filePath).catch(() => { });

        //Delete document
        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        next(error);
    }
}

//@desc Update Document
//@route PUT /api/documents/:id
//@access Private

export const updateDocument = async (req, res, next) => {
    try {

    } catch (error) {
        next(error);
    }
}

