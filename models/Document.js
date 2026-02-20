import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    extractedText: {
        type: String,
        default: ''
    },
    chunks: [{
        content: {
            type: String,
            required: true,
        },
        pageNumber: {
            type: Number,
            default: 0,
        },
        chunkIndex: {
            type: Number,
            required: true,
        },
    }],
    uploadDate: {
        type: Date,
        default: Date.now,
    },
    lastAccessedDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["processing", "completed", "failed"],
        default: "processing",
    },
}, {
    timestamps: true,
});

//Index for faster queries
documentSchema.index({ userId: 1, uploadDate: -1 });
documentSchema.index({ userId: 1, status: 1 });

// Instance methods
documentSchema.methods = {
    // Update last accessed date
    async updateLastAccessed() {
        this.lastAccessedDate = new Date();
        return this.save();
    },
    
    // Get document summary
    toSummaryJSON() {
        return {
            id: this._id,
            title: this.title,
            fileSize: this.fileSize,
            uploadDate: this.uploadDate,
            lastAccessedDate: this.lastAccessedDate,
            status: this.status,
            chunkCount: this.chunks?.length || 0
        };
    },
    
    // Add chunk
    addChunk(content, pageNumber = 0) {
        const chunkIndex = this.chunks.length;
        this.chunks.push({
            content,
            pageNumber,
            chunkIndex
        });
        return this.save();
    }
};

// Static methods
documentSchema.statics = {
    // Get user's documents by status
    async getByStatus(userId, status, limit = 20) {
        return this.find({ userId, status })
            .sort({ uploadDate: -1 })
            .limit(limit)
            .select('title fileSize uploadDate status');
    },
    
    // Search documents by title
    async searchByTitle(userId, query, limit = 20) {
        return this.find({
            userId,
            title: { $regex: query, $options: 'i' }
        })
        .sort({ uploadDate: -1 })
        .limit(limit)
        .select('title fileSize uploadDate status');
    }
};

const Document = mongoose.model("Document", documentSchema);

export default Document;