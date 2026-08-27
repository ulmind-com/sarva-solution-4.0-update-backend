
export const templates = {
    welcome: (name, memberId) => `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #2563EB;">Welcome to SarvaSolution!</h1>
            <p>Dear ${name},</p>
            <p>We are thrilled to have you on board. Your Member ID is <strong>${memberId}</strong>.</p>
            <p>Please find your Membership Certificate attached.</p>
            <br>
            <p>Best Regards,<br>SarvaSolution Team</p>
        </div>
    `,
    profileUpdate: (name, fields) => `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #F59E0B;">Security Alert: Profile Updated</h2>
            <p>Dear ${name},</p>
            <p>The following fields in your profile were recently updated:</p>
            <ul>
                ${fields.map(field => `<li>${field}</li>`).join('')}
            </ul>
            <p>If you did not make these changes, please contact support immediately.</p>
            <br>
            <p>Best Regards,<br>SarvaSolution Security Team</p>
        </div>
    `,
    kycSubmitted: (name) => `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #10B981;">KYC Documents Received</h2>
            <p>Dear ${name},</p>
            <p>We have received your KYC documents (Aadhaar/PAN). Our team will verify them shortly.</p>
            <p>You will be notified once the verification is complete.</p>
            <br>
            <p>Best Regards,<br>SarvaSolution Compliance Team</p>
        </div>
    `,
    kycStatus: (name, status, reason) => `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: ${status === 'verified' ? '#10B981' : '#EF4444'};">KYC Verification Update</h2>
            <p>Dear ${name},</p>
            <p>Your KYC verification status is now: <strong>${status.toUpperCase()}</strong>.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <br>
            <p>Best Regards,<br>SarvaSolution Admin Team</p>
        </div>
    `,
    payoutProcessed: (name, amount, type) => `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #10B981;">Payout Processed</h2>
            <p>Dear ${name},</p>
            <p>We are happy to inform you that your payout of <strong>₹${amount}</strong> (${type}) has been processed successfully.</p>
            <p>The amount should reflect in your bank account shortly.</p>
            <br>
            <p>Best Regards,<br>SarvaSolution Accounts Team</p>
        </div>
    `
};
