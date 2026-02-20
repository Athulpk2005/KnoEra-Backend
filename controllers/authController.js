import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import { sendPasswordResetEmail, sendPasswordResetSuccessEmail } from "../utils/emailService.js";

//Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES || "7d",
    });
};

//@desc Register new user
//@route POST /api/auth/register
//@access Public

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        //check if user already exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: userExists.email === email ? "Email already exists" : "Username already exists",
            });
        }
        //Create User

        const user = await User.create({ username, email, password });

        // generate token
        const token = generateToken(user._id);

        // send response
        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
            },
            token,
            message: "User registered successfully",
        });
    } catch (error) {
        next(error);
    }
};

//@desc Login user
//@route POST /api/auth/login
//@access Public

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        //Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required",
                statusCode: 400,
            });
        }
        //Check for user (include password for comparison)
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found",
                statusCode: 401,
            });
        }
        //Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
                statusCode: 401,
            });
        }
        //Generate token
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            },
            token,
            message: "User logged in successfully",
        });
    } catch (error) {
        next(error);
    }
}

//@desc Get user profile
//@route GET /api/auth/profile
//@access Private

export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });

    } catch (error) {
        next(error);
    }
}

//@desc Update user profile
//@route PUT /api/auth/profile
//@access Private

export const updateProfile = async (req, res, next) => {
    try {

        const { username, email, profileImage } = req.body;
        const user = await User.findById(req.user._id);
        if (username) {
            user.username = username;
        }
        if (email) {
            user.email = email;
        }
        if (profileImage) {
            user.profileImage = profileImage;
        }
        await user.save();
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
            },
            message: "User profile updated successfully",
        });
    } catch (error) {
        next(error);
    }
}

//@desc Change user password
//@route PUT /api/auth/change-password
//@access Private

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Current password and new password are required",
                statusCode: 400,
            });
        }
        //check current password
        const user = await User.findById(req.user.id).select("+password");
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Current password is incorrect",
                statusCode: 401,
            });
        }
        //update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        next(error);
    }
}

//@desc Forgot password - send reset email
//@route POST /api/auth/forgot-password
//@access Public

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Please provide your email address",
                statusCode: 400,
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        // Don't reveal if user exists or not - for security
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, you will receive a password reset link shortly.",
            });
        }

        // Generate reset token
        const resetToken = user.getResetPasswordToken();
        await user.save();

        // Send reset email
        try {
            await sendPasswordResetEmail(user.email, resetToken, user.username);
        } catch (emailError) {
            // If email fails, clear the reset token
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            console.error("Email error:", emailError);
            return res.status(500).json({
                success: false,
                error: "Failed to send reset email. Please try again later.",
                statusCode: 500,
            });
        }

        res.status(200).json({
            success: true,
            message: "If an account exists with this email, you will receive a password reset link shortly.",
        });

    } catch (error) {
        next(error);
    }
};

//@desc Reset password
//@route POST /api/auth/reset-password/:resetToken
//@access Public

export const resetPassword = async (req, res, next) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        // Find user with matching token and valid expiration
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired reset token",
                statusCode: 400,
            });
        }

        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "Please provide both password and confirm password",
                statusCode: 400,
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "Passwords do not match",
                statusCode: 400,
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters",
                statusCode: 400,
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Send confirmation email
        try {
            await sendPasswordResetSuccessEmail(user.email, user.username);
        } catch (emailError) {
            console.error("Confirmation email failed:", emailError);
            // Don't fail the request - password was already reset
        }

        res.status(200).json({
            success: true,
            message: "Password reset successful. You can now login with your new password.",
        });

    } catch (error) {
        next(error);
    }
};


