import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) {
    console.error('Error loading .env:', result.error);
}

console.log('ENV Loaded:', result.parsed ? 'Yes' : 'No');
console.log('MAIL_ADDRESS:', process.env.MAIL_ADDRESS);
console.log('MAIL_PASSWORD (First 4 chars):', process.env.MAIL_PASSWORD ? process.env.MAIL_PASSWORD.substring(0, 4) : 'UNDEFINED');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_PASSWORD
    }
});

const sendTest = async () => {
    try {
        console.log('Attempting to send email...');
        const info = await transporter.sendMail({
            from: process.env.MAIL_ADDRESS,
            to: process.env.MAIL_ADDRESS, // Send to self
            subject: 'SMTP Test',
            text: 'If you see this, SMTP is working.'
        });
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('SMTP Failed:', error);
    }
};

sendTest();
