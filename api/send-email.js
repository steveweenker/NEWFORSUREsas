// api/send-email.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, name, rollno, password } = req.body;

        // 2. Connect to Gmail Server (Translating your Python smtplib logic)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465, // Secure SSL port
            secure: true, 
            auth: {
                // Pulling securely from Vercel Environment Variables
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_APP_PASSWORD, 
            },
        });

        // 3. Prepare the Message
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Your Academic Portal Login Credentials',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Welcome to the Academic Management System</h2>
                    <p>Hey <strong>${name}</strong>,</p>
                    <p>Your portal access has been generated. Please use the following credentials to log in:</p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 0;"><strong>Registration No:</strong> ${rollno}</p>
                        <p style="margin: 5px 0 0 0;"><strong>Password:</strong> <span style="font-family: monospace; font-size: 16px; color: #d35400;">${password}</span></p>
                    </div>
                    <p>Please keep this password secure. You can log in immediately.</p>
                    <p>Regards,<br>Examination Department</p>
                </div>
            `,
        };

        // 4. Send the Email
        await transporter.sendMail(mailOptions);
        console.log(`🚀 Sent credentials to: ${email}`);

        return res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error(`❌ Failed to send email:`, error);
        return res.status(500).json({ success: false, error: 'Failed to send email' });
    }
}
