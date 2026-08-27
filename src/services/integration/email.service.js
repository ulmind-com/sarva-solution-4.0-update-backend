import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.MAIL_ADDRESS || 'SSVPL Franchise <onboarding@resend.dev>';

// ... (Existing Templates omitted for brevity, keeping them implicitly part of file or re-declaring if overwriting full file)
// To be safe, I will re-declare the templates since I am overwriting, OR I should use replace_file_content.
// Given I want to append a function, replace_file_content or append is better.
// But `write_to_file` is safer if I provide full content. I'll provide full content to avoid missing pieces.

const welcomeTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #2e7d32; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .credentials { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
        .button { background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Sarva Solution Vision</h1>
        </div>
        <div class="content">
            <p>Dear <strong>${data.name}</strong>,</p>
            <p>We are thrilled to welcome you as an official franchise partner!</p>
            <p>Your shop, <strong>${data.shopName}</strong>, has been successfully registered in our system.</p>
            
            <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Vendor ID:</strong> ${data.vendorId}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Password:</strong> ${data.password}</p>
            </div>

            <p><em>Please login immediately and change your password for security.</em></p>

            <p style="text-align: center;">
                <a href="${process.env.FRANCHISE_LOGIN_URL || 'https://www.sarvasolutionvision.com/franchise-login'}" class="button">Login to Dashboard</a>
            </p>

            <p><strong>Shop Details:</strong><br>
            ${data.shopAddress.street}, ${data.city}, ${data.shopAddress.state} - ${data.shopAddress.pincode}</p>
        </div>
        <div class="footer">
            <p>For support, contact: ${process.env.SUPPORT_EMAIL || 'support@sarvasolutionvision.com'}</p>
            <p>&copy; ${new Date().getFullYear()} Sarva Solution Vision. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const statusTemplate = (data, type) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
        .alert { padding: 15px; margin: 20px 0; border-radius: 5px; color: white; }
        .blocked { background-color: #c62828; }
        .active { background-color: #2e7d32; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Your Account Status Update</h2>
        <p>Dear ${data.name} (${data.vendorId}),</p>
        
        ${type === 'blocked' ? `
            <div class="alert blocked">
                <strong>⚠️ Account Suspended</strong><br>
                Your franchise account has been temporarily blocked.
            </div>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p>Please contact support immediately.</p>
        ` : `
            <div class="alert active">
                <strong>✅ Account Restored</strong><br>
                Your franchise account has been unblocked and is fully active.
            </div>
            <p>You can now resume your operations.</p>
        `}
        
        <p>Best Regards,<br>Sarva Solution Vision Team</p>
    </div>
</body>
</html>
`;

const invoiceTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
        .header { background-color: #2e7d32; color: white; padding: 20px; text-align: center; }
        .details { margin: 20px 0; }
        .total { font-size: 18px; font-weight: bold; color: #2e7d32; }
        .button { background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice Generated: ${data.invoiceNo}</h1>
        </div>
        <div class="details">
            <p>Dear <strong>${data.franchiseName}</strong>,</p>
            <p>A new invoice has been generated for your recent purchase.</p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
            <p class="total">Grand Total: ₹${data.grandTotal}</p>
            ${data.pdfUrl ? `
            <p style="text-align: center;">
                <a href="${data.pdfUrl}" class="button" target="_blank">📄 Download Invoice PDF</a>
            </p>
            ` : '<p>Invoice PDF is being generated and will be available shortly.</p>'}
        </div>
        <p>Best Regards,<br>Sarva Solution Vision Accounts Team</p>
    </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (franchiseData) => {
    if (!process.env.RESEND_API_KEY) return false;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [franchiseData.email],
            subject: 'Welcome to Sarva Solution Vision - Your Credentials',
            html: welcomeTemplate(franchiseData)
        });
        return true;
    } catch (err) {
        console.error('Email Send Error:', err.message);
        return false;
    }
};

export const sendStatusEmail = async (franchiseData, type, reason = '') => {
    if (!process.env.RESEND_API_KEY) return false;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [franchiseData.email],
            subject: `Important: Account ${type === 'blocked' ? 'Suspended' : 'Restored'}`,
            html: statusTemplate({ ...franchiseData, reason }, type)
        });
        return true;
    } catch (err) {
        console.error('Status Email Error:', err.message);
        return false;
    }
};

export const sendInvoiceEmail = async (invoiceData) => {
    if (!process.env.RESEND_API_KEY) return false;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [invoiceData.email],
            subject: `SSVPL Invoice ${invoiceData.invoiceNo}`,
            html: invoiceTemplate(invoiceData)
        });
        return true;
    } catch (err) {
        console.error('Invoice Email Error:', err.message);
        return false;
    }
};

export const sendInvoiceEmailWithAttachment = async (data) => {
    if (!process.env.RESEND_API_KEY) return false;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.email],
            subject: `SSVPL Invoice ${data.invoiceNo}`,
            html: invoiceTemplate(data),
            attachments: [
                {
                    filename: data.pdfFilename,
                    content: data.pdfBuffer
                }
            ]
        });
        return true;
    } catch (err) {
        console.error('Invoice Email Error:', err.message);
        return false;
    }
};

