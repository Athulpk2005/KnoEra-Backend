import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter based on email service
const createTransporter = () => {
    // If using Gmail with App Password
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // App password, not regular password
            },
        });
    }

    // If using custom SMTP server
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - The unhashed reset token
 * @param {string} username - User's username
 */
export const sendPasswordResetEmail = async (email, resetToken, username) => {
    try {
        const transporter = createTransporter();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const mailOptions = {
            from: {
                name: 'KnoEra Ai',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Password Reset Request',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                        }
                        .content {
                            padding: 30px;
                            color: #333;
                        }
                        .button {
                            display: inline-block;
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white !important;
                            text-decoration: none;
                            padding: 14px 28px;
                            border-radius: 8px;
                            margin: 20px 0;
                            font-weight: bold;
                        }
                        .footer {
                            background-color: #f9fafb;
                            padding: 20px;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                        .warning {
                            background-color: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 12px;
                            margin: 20px 0;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello <strong>${username}</strong>,</p>
                            
                            <p>We received a request to reset your password for your <strong>KnoEra Ai</strong> account.</p>
                            
                            <p>Click the button below to reset your password:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #10b981;">${resetUrl}</p>
                            
                            <div class="warning">
                                ⚠️ <strong>Important:</strong> This link will expire in <strong>10 minutes</strong> for security reasons.
                            </div>
                            
                            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} KnoEra Ai. All rights reserved.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Password Reset Request\n\n
                Hello ${username},\n\n
                We received a request to reset your password for your KnoEra Ai account.\n\n
                Click the link below to reset your password:\n
                ${resetUrl}\n\n
                This link will expire in 10 minutes for security reasons.\n\n
                If you didn't request this password reset, please ignore this email.\n\n
                © ${new Date().getFullYear()} KnoEra Ai
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Send password reset success confirmation email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 */
export const sendPasswordResetSuccessEmail = async (email, username) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: {
                name: 'KnoEra Ai',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Password Changed Successfully',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .content {
                            padding: 30px;
                            color: #333;
                        }
                        .footer {
                            background-color: #f9fafb;
                            padding: 20px;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Password Changed Successfully</h1>
                        </div>
                        <div class="content">
                            <p>Hello <strong>${username}</strong>,</p>
                            
                            <p>Your password has been successfully reset.</p>
                            
                            <p>If you did not make this change, please contact us immediately.</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} KnoEra Ai. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Don't throw error - this is a confirmation email
        return false;
    }
};
