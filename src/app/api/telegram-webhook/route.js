import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const update = await req.json();

    // Only process messages
    if (!update.message) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const chatId = update.message.chat.id;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("Missing TELEGRAM_BOT_TOKEN");
      return NextResponse.json({ error: 'Missing token' }, { status: 500 });
    }

    const telegramApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // 1. If user sends /start, ask for their phone number
    if (update.message.text && update.message.text.startsWith('/start')) {
      const text = "Welcome! To activate your account and receive coupons, please share your phone number by clicking the button below.";
      
      await fetch(`${telegramApi}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          reply_markup: {
            keyboard: [
              [{ text: "Share My Phone Number", request_contact: true }]
            ],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        })
      });

      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // 2. If user shares their contact (phone number)
    if (update.message.contact) {
      let phone = update.message.contact.phone_number;
      // Normalize phone number (remove + sign or spaces if needed, adjust to your needs)
      if (phone.startsWith('+')) {
        phone = phone.substring(1); 
      }

      // Save to Google Sheet 2
      const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
      const SHEET_ID_2 = '1uw7abz2I7212Y_cIiXgylT3JOrdB5xdmlv1Dqnrnda0'; // Sheet2

      if (GOOGLE_PRIVATE_KEY && GOOGLE_CLIENT_EMAIL) {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: GOOGLE_CLIENT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Append Phone and ChatID to Sheet 2
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID_2,
          range: 'Sheet1!A:B',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[phone, chatId]]
          }
        });

        // Send confirmation to user
        await fetch(`${telegramApi}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Thank you! Your number is now registered. You will receive reward notifications here.",
            reply_markup: { remove_keyboard: true }
          })
        });

      } else {
         console.error("Missing Google Credentials");
      }

      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Acknowledge other messages
    return NextResponse.json({ status: 'ignored' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    // Telegram will retry if we return 500, so we return 200 even on error unless we want retries
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
