/**
 * Modern, Professional HTML Email Templates
 */

const baseStyle = `
    background-color: #f4f7f9;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 40px 0;
    margin: 0;
`;

const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
`;

const headerStyle = `
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: #ffffff;
    padding: 30px;
    text-align: center;
`;

const bodyStyle = `
    padding: 40px 30px;
    color: #455a64;
    line-height: 1.6;
`;

const footerStyle = `
    padding: 20px;
    text-align: center;
    background-color: #f8f9fa;
    color: #90a4ae;
    font-size: 13px;
`;

const buttonStyle = `
    display: inline-block;
    padding: 12px 30px;
    background-color: #2e7d32;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    margin-top: 20px;
`;

const layout = (title, content) => `
    <div style="${baseStyle}">
        <div style="${containerStyle}">
            <div style="${headerStyle}">
                <h1 style="margin: 0; font-size: 24px;">Sarva Solution Vision</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">${title}</p>
            </div>
            <div style="${bodyStyle}">
                ${content}
            </div>
            <div style="${footerStyle}">
                <p>from sarvasolutionvision team.</p>
                <p style="margin: 5px 0 0;">&copy; 2026 Sarva Solution Vision. All rights reserved.</p>
            </div>
        </div>
    </div>
`;

export const templates = {
    welcome: (name, memberId, password) => layout('Welcome to the Family!', `
        <p style="font-size: 18px; margin-top: 0;">Dear ${name},</p>
        
        <p>welcome to Sarva Solution Vision</p>
        
        <p>we are happy to have you join our growing community of digital entrepreneurs.</p>
        
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #c8e6c9;">
            <p style="margin: 0; color: #1b5e20; font-weight: bold;">Here is your id no and password for login purpose:</p>
            <div style="margin-top: 15px;">
                <p style="margin: 5px 0; font-size: 16px; color: #2e7d32;"><strong>ID No:</strong> ${memberId}</p>
                <p style="margin: 5px 0; font-size: 16px; color: #2e7d32;"><strong>Password:</strong> ${password || 'As set during registration'}</p>
            </div>
        </div>
        
        <p>Log in now to start your journey:</p>
        <a href="https://www.sarvasolutionvision.com/login" style="${buttonStyle}">Login Now</a>
    `),

    profileUpdate: (name, updatedFields) => layout('Profile Updated', `
        <h2 style="color: #1a237e; margin-top: 0;">Hello, ${name}</h2>
        <p>This is to inform you that your profile has been successfully updated. Security and transparency are our priorities.</p>
        <p>The following fields were modified:</p>
        <ul style="padding-left: 20px;">
            ${updatedFields.map(field => `<li style="margin-bottom: 5px; font-weight: bold;">${field}</li>`).join('')}
        </ul>
        <p>If you did not authorize these changes, please contact our support team immediately.</p>
    `),

    kycSubmitted: (name) => layout('KYC Documents Received', `
        <h2 style="color: #1a237e; margin-top: 0;">KYC Submission Successful</h2>
        <p>Dear ${name}, we have received your KYC documents (Aadhaar, PAN, and Bank Details).</p>
        <p>Our team is currently reviewing your application. This process typically takes **24-48 hours**.</p>
        <p>You will receive another email once the verification is complete.</p>
    `),

    kycStatus: (name, status, reason = '') => {
        const isVerified = status === 'verified';
        const color = isVerified ? '#2e7d32' : '#c62828';
        const title = isVerified ? 'KYC Verified Successfully' : 'KYC Document Rejected';

        return layout('KYC Verification Update', `
            <h2 style="color: ${color}; margin-top: 0;">${title}</h2>
            <p>Dear ${name},</p>
            <p>The verification process for your submitted documents has been completed.</p>
            <div style="border-left: 4px solid ${color}; padding: 15px 20px; background-color: ${isVerified ? '#f1f8e9' : '#ffebee'}; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Status: <span style="text-transform: uppercase;">${status}</span></p>
                ${!isVerified && reason ? `<p style="margin: 10px 0 0; font-size: 14px;">Reason: ${reason}</p>` : ''}
            </div>
            ${isVerified
                ? '<p>Your account is now fully active. You can now enjoy all premium features and payouts.</p>'
                : '<p>Please log in to your dashboard, review the rejection reason, and resubmit correct documents.</p>'}
            <a href="https://www.sarvasolutionvision.com/dashboard" style="${buttonStyle}">Go to Dashboard</a>
        `);
    },

    fundAchievement: (name, fundName, units) => layout('Achievement Awarded!', `
        <h2 style="color: #1a237e; margin-top: 0;">Congratulations, ${name}!</h2>
        <p>You have successfully achieved a milestone in the SSVPL system.</p>
        <div style="background: #fff9c4; padding: 25px; border-radius: 12px; border: 2px solid #fbc02d; text-align: center; margin: 25px 0;">
            <p style="margin: 0; font-size: 18px; color: #f57f17; font-weight: bold;">New Benefit Achieved:</p>
            <h1 style="margin: 10px 0; color: #1a237e;">${fundName}</h1>
            <p style="margin: 0; font-size: 16px;">Total Units: <strong>${units}</strong></p>
        </div>
        <p>Your hard work and dedication are paying off. Keep up the momentum to reach the next goal!</p>
    `),

    rankUpgrade: (name, newRank, nextGoal) => layout('New Rank Achieved!', `
        <h2 style="color: #1a237e; margin-top: 0;">🎉 Promoted to ${newRank}!</h2>
        <p>Dear ${name}, your leadership and consistency have earned you a new rank in the SSVPL Legend hierarchy.</p>
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0;">
            <p style="margin: 0; opacity: 0.8;">Current Rank:</p>
            <h1 style="margin: 5px 0;">${newRank}</h1>
        </div>
        <p>Your next target is: <strong>${nextGoal}</strong>. Our entire team is cheering for your success!</p>
    `),

    payoutProcessed: (name, amount, type) => layout('Earnings Credited', `
        <h2 style="color: #2e7d32; margin-top: 0;">Payment Processed</h2>
        <p>Hello ${name}, your earnings for <strong>${type}</strong> have been successfully processed and credited to your wallet.</p>
        <div style="background-color: #f1f8e9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; color: #388e3c; font-weight: bold;">Amount Credited:</p>
            <p style="margin: 5px 0 0; font-size: 28px; color: #1b5e20;">₹${amount}</p>
            <p style="margin: 10px 0 0; font-size: 12px; color: #4caf50;">(After 5% Admin Charge + TDS deduction)</p>
        </div>
        <p>Keep growing your network to unlock more incentives!</p>
    `)
};
