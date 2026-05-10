const nodemailer = require("nodemailer");
const dns = require("dns");
const { google } = require("googleapis");

// Force Node/Nodemailer to use IPv4
dns.setDefaultResultOrder("ipv4first");

const sendEmail = async (options) => {
    // Enhanced debugging
    console.log("=== Email Configuration Debug ===");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("GMAIL_USER loaded:", !!process.env.GMAIL_USER);
    console.log("GMAIL_APP_PASSWORD loaded:", !!process.env.GMAIL_APP_PASSWORD);
    console.log("GMAIL_CLIENT_ID loaded:", !!process.env.GMAIL_CLIENT_ID);
    console.log("GMAIL_CLIENT_SECRET loaded:", !!process.env.GMAIL_CLIENT_SECRET);
    console.log("GMAIL_REFRESH_TOKEN loaded:", !!process.env.GMAIL_REFRESH_TOKEN);
    console.log("================================");
    
    // Production detection - use Gmail API OAuth2 in production
    if (process.env.NODE_ENV === "production") {
        console.log("🚀 Production environment detected - Using Gmail API OAuth2");
        try {
            return await sendEmailWithGmailAPI(options);
        } catch (apiError) {
            console.error("❌ Gmail API failed, attempting SMTP fallback:", apiError.message);
            // Fallback to SMTP if API fails (though this will likely fail on Render)
            try {
                return await sendEmailWithSMTP(options);
            } catch (smtpError) {
                console.error("❌ SMTP fallback also failed:", smtpError.message);
                throw new Error("Email service temporarily unavailable. Please try again.");
            }
        }
    }
    
    console.log("🔗 Using Gmail SMTP for local development");
    return await sendEmailWithSMTP(options);
};

// Gmail API OAuth2 function for production email sending
const sendEmailWithGmailAPI = async (options) => {
    try {
        console.log("🚀 Using Gmail API OAuth2 for production email");
        
        // Validate required Gmail API credentials
        const requiredVars = ['GMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error("❌ Missing Gmail API credentials:", missingVars.join(', '));
            throw new Error("Gmail API credentials not configured");
        }

        console.log("✓ Gmail API credentials loaded successfully");

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET
        );

        // Set refresh token
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Create email message with proper headers
        const emailMessage = [
            `From: RideShare <${process.env.GMAIL_USER}>`,
            `To: ${options.email}`,
            `Subject: ${options.subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            '',
            options.html
        ].join('\n');

        // Convert to base64url format for Gmail API
        const base64Email = Buffer.from(emailMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send email using Gmail API
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: base64Email
            }
        });

        console.log("✅ Email sent successfully via Gmail API");
        console.log("📧 To:", options.email);
        console.log("📧 Message ID:", response.data.id);
        
        return { messageId: response.data.id };

    } catch (error) {
        console.error("❌ Gmail API error:", error.message);
        console.error("❌ Error code:", error.code);
        
        // Log specific error details for debugging
        if (error.response) {
            console.error("❌ Gmail API response:", error.response.data);
        }
        
        throw new Error("Email service temporarily unavailable. Please try again.");
    }
};

// SMTP function for local development
const sendEmailWithSMTP = async (options) => {
    console.log("🔗 Using Gmail SMTP for local development");
    
    // Check for SMTP credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("❌ Missing Gmail SMTP credentials");
        throw new Error("Gmail SMTP credentials not configured");
    }

    const mailOptions = {
        from: `"RideShare" <${process.env.GMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    // Timeout protection wrapper with port 465 fallback
    // NOTE: This code works perfectly in local development but fails on Render due to network restrictions
    // Render blocks outbound SMTP connections (ports 587, 465) causing ETIMEDOUT errors
    const sendWithTimeout = async (mailOptions, useFallback = false) => {
        // Create transporter inside send attempt function
        let currentTransporter;
        
        if (useFallback) {
            // Fallback to port 465 if 587 times out (also blocked on Render)
            console.log("🔄 Trying port 465 fallback...");
            currentTransporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                family: 4,
                pool: false,
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 15000,
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD,
                },
            });
        } else {
            // Primary port 587 with IPv4 (blocked on Render - works locally)
            console.log("📧 Using port 587 primary...");
            currentTransporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                requireTLS: true,
                family: 4,
                pool: false,
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 15000,
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD,
                },
            });
        }
        
        return Promise.race([
            currentTransporter.sendMail(mailOptions),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Email timeout")), 20000)
            )
        ]);
    };

    try {
        const info = await sendWithTimeout(mailOptions);
        console.log("✅ Email sent successfully via Gmail SMTP");
        console.log("📧 To:", options.email);
        return info;
    } catch (error) {
        console.error("❌ Gmail SMTP error:", error.message);
        console.error("❌ Error code:", error.code);
        
        // If timeout and not already using fallback, try port 465
        if (error.message === "Email timeout" || error.code === 'ETIMEDOUT') {
            try {
                const info = await sendWithTimeout(mailOptions, true);
                console.log("✅ Email sent successfully via Gmail SMTP (fallback)");
                console.log("📧 To:", options.email);
                return info;
            } catch (fallbackError) {
                console.error("❌ Fallback SMTP error:", fallbackError.message);
                throw new Error("Email service temporarily unavailable. Please try again.");
            }
        }
        
        // Always throw to ensure function doesn't hang
        throw error;
    }
};

module.exports = sendEmail;