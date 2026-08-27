import { Resend } from 'resend';
import { templates } from './emailTemplates.js';
import chalk from 'chalk';
import PDFDocument from 'pdfkit';

/**
 * Generate a Modern Welcome PDF as a Buffer
 */
export const generateWelcomePDF = async (user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- Design Constants ---
        const primaryColor = '#2e7d32'; // Green
        const secondaryColor = '#1b5e20'; // Dark Green
        const lightGray = '#F1F5F9'; // Slate 100

        // 1. Header Background
        doc.rect(0, 0, 595.28, 120).fill(primaryColor);

        // 2. Header Text
        doc.fillColor('#FFFFFF')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('SARVA SOLUTION VISION', 50, 45, { align: 'left' });

        doc.fontSize(12)
            .font('Helvetica')
            .text('Empowering Digital Entrepreneurs', 50, 75, { align: 'left' });

        // 3. Title Section
        doc.moveDown(5);
        doc.fillColor(secondaryColor)
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('Certificate of Membership', { align: 'center', characterSpacing: 1 });

        doc.moveDown(0.5);
        doc.lineWidth(2).strokeColor(primaryColor).moveTo(200, doc.y).lineTo(395, doc.y).stroke();
        doc.moveDown(2);

        // 4. Welcome Body
        doc.fillColor('#334155') // Slate 700
            .fontSize(12)
            .font('Helvetica')
            .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });

        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica').text(`Dear ${user.fullName},`, { align: 'left' });
        doc.moveDown();
        doc.fontSize(12).text(
            'We are honored to officially welcome you to Sarva Solution Vision. This document certifies your membership and confirms your commitment to building a successful digital future with us.',
            { align: 'justify', lineGap: 5 }
        );
        doc.moveDown(2);

        // 5. Membership Details Box
        const startY = doc.y;
        doc.roundedRect(50, startY, 495, 120, 10).fillAndStroke(lightGray, primaryColor);

        doc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold')
            .text('MEMBERSHIP DETAILS', 50, startY + 20, { align: 'center', width: 495 });

        doc.fillColor('#475569').fontSize(12).font('Helvetica-Bold');

        const labelX = 150;
        const valueX = 300;
        const lineY = startY + 50;
        const step = 20;

        doc.text('Member ID:', labelX, lineY);
        doc.font('Helvetica').text(user.memberId, valueX, lineY);

        doc.font('Helvetica-Bold').text('Joining Date:', labelX, lineY + step);
        doc.font('Helvetica').text(new Date(user.createdAt || Date.now()).toLocaleDateString(), valueX, lineY + step);

        // Status field removed as per request

        // 6. Footer
        const footerY = 700;
        doc.fontSize(10).fillColor('#94A3B8').text('Authorized & Verified', 50, footerY, { align: 'center' });
        doc.moveDown();
        doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('Sarva Solution Team', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Official Management', { align: 'center' });

        doc.rect(0, 780, 595.28, 62).fill(secondaryColor);
        doc.fillColor('#FFFFFF').fontSize(10)
            .text('www.sarvasolutionvision.com  |  support@sarvasolutionvision.com', 50, 795, { align: 'center' });

        doc.end();
    });
};

// Resend Configuration
// const resend = new Resend(process.env.RESEND_API_KEY); // Moved inside function to avoid ESM hoisting issues

/**
 * Core Send Email Function
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY); // Initialize here to ensure env vars are loaded
        const { data, error } = await resend.emails.send({
            from: process.env.MAIL_ADDRESS || 'onboarding@resend.dev',
            to: to,
            subject: subject,
            html: html,
            attachments: attachments.map(att => ({
                filename: att.filename,
                content: att.content
            }))
        });

        if (error) {
            console.error(chalk.red('Resend Error:'), error);
            return null;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.green(`Email sent: ${subject} to ${to}`));
        }

        return data?.id;
    } catch (err) {
        console.error(chalk.red('Unexpected Mail Error:'), err);
        return null;
    }
};

/**
 * Export specialized mailers
 */
export const mailer = {
    sendWelcome: async (user, password) => {
        try {
            const pdfBuffer = await generateWelcomePDF(user);
            return await sendEmail({
                to: user.email,
                subject: 'Welcome to Sarva Solution Vision - Your Membership Details',
                html: templates.welcome(user.fullName, user.memberId, password),
                attachments: [
                    {
                        filename: `Membership_Certificate_${user.memberId}.pdf`,
                        content: pdfBuffer
                    }
                ]
            });
        } catch (e) {
            console.error('Welcome Mailer Error:', e);
        }
    },

    sendUpdateNotification: async (user, fields) => {
        return await sendEmail({
            to: user.email,
            subject: 'Security Alert: Your Profile Was Updated',
            html: templates.profileUpdate(user.fullName, fields)
        });
    },

    sendKYCSubmission: async (user) => {
        return await sendEmail({
            to: user.email,
            subject: 'KYC Documents Received',
            html: templates.kycSubmitted(user.fullName)
        });
    },

    sendKYCStatusUpdate: async (user, status, reason) => {
        return await sendEmail({
            to: user.email,
            subject: `KYC Verification Update: ${status.toUpperCase()}`,
            html: templates.kycStatus(user.fullName, status, reason)
        });
    },

    payoutProcessed: async (user, amount, type) => {
        return await sendEmail({
            to: user.email,
            subject: 'Payout Processed Successfully',
            html: templates.payoutProcessed(user.fullName, amount, type)
        });
    }
};
