const errorHandler = (err, req, res, next) => {
    let statusCodes = err.statusCode || 500;
    let message = err.message || "Something went wrong";


    //Mongoose bad ObjectId 
    if (err.name === `CastError`) {
        message = "Resource not Found";
        statusCodes = 404;
    }

    //Mongoose duplicate key 
    if (err.code == 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
        statusCodes = 400;
    }

    //Mongoose validation error
    if (err.name === `ValidationError`) {
        message = Object.values(err.errors).map((val) => val.message).join(", ");
        statusCodes = 400;
    }

    //Multer file size error
    if (err.code === `LIMIT_FILE_SIZE`) {
        message = "File size is too large";
        statusCodes = 400;
    }

    //JWT error
    if (err.name === `JsonWebTokenError`) {
        message = "Invalid token";
        statusCodes = 401;
    }

    //JWT expired error
    if (err.name === `TokenExpiredError`) {
        message = "Token expired";
        statusCodes = 401;
    }

    // Safe logging - avoid serializing Mongoose documents
    const logInfo = {
        message: err.message,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
        logInfo.stack = err.stack;
    }

    console.error(`Error:`, logInfo);

    res.status(statusCodes).json({
        success: false,
        error: message,
        statusCode: statusCodes,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });

};

export default errorHandler;