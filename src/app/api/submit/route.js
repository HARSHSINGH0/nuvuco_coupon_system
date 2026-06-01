import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // Used for generating a secure random token

export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Get credentials from environment variables
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.split('\\n').join('\n');
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    const SHEET_ID_1 = '1OZUgBc6RoR206QuEzOAWVKY3t_nzlsMG3b6f6RdTpQk'; // Sheet1 (Nuvoco Coupon Distribution)
    const SHEET_ID_2 = '1uw7abz2I7212Y_cIiXgylT3JOrdB5xdmlv1Dqnrnda0'; // Sheet2 (Telegram Chatid NUVUCO)
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL) {
      return NextResponse.json({ error: 'Missing Google credentials in server config. Please set GOOGLE_PRIVATE_KEY and GOOGLE_CLIENT_EMAIL in .env.local.' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Date and Token formatting — all times in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
    const istNow = new Date(now.getTime() + istOffset);
    const month = istNow.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
    const year = istNow.getUTCFullYear().toString();
    const monthYear = `${month} ${year}`; // e.g. "June 2026"

    // Formats date as YYYY-MM-DD HH:MM:SS in IST
    const currentDateTime = istNow.toISOString().replace('T', ' ').substring(0, 19);

    // Generates a random 8-character uppercase alphanumeric token (e.g., "NUV-A1B2C3")
    const randomToken = `NUV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Prepare data
    const rowData = {
      name: body.name,
      dept: body.dept,
      contractor: body.contractor || '',
      phone: body.pno,
      appreciated_for: body.appreciated_for,
      appreciated_by: body.appreciated_by,
      award_type: body.award_type,
      month,
      year,
      monthYear,
      token: randomToken,       // New field
      dateTime: currentDateTime  // New field
    };

    // --- LOGIC FROM N8N ---
    // 2. Check Sheet 1 for limits (100 limit per department per monthYear)
    // Range extended to A:L to account for Token and Date columns
    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_1,
      range: 'Sheet1!A:L',
    });

    const rows1 = sheet1Data.data.values || [];
    let count = 0;

    // Check department limit (100 per month)
    for (let i = 1; i < rows1.length; i++) {
      const row = rows1[i];
      const rowDept = row[1];
      const rowMonthYear = row[9];
      if (rowDept === rowData.dept && rowMonthYear === rowData.monthYear) {
        count++;
      }
    }

    if (count >= 100) {
      return NextResponse.json({ message: "This department has already reached the 100-limit." }, { status: 400 });
    }

    // 3. Check Sheet 2 for Telegram chatid mapping
    let chatId = null;
    if (rowData.phone) {
      const sheet2Data = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_2,
        range: 'Sheet1!A:B', // A = Phone, B = ChatId
      });
      const rows2 = sheet2Data.data.values || [];
      const normalizePhone = (num) => {
        if (!num) return '';
        const clean = num.toString().replace(/\D/g, '');
        return clean.length >= 10 ? clean.slice(-10) : clean;
      };
      const targetPhone = normalizePhone(rowData.phone);
      for (let i = 1; i < rows2.length; i++) {
        const row = rows2[i];
        if (normalizePhone(row[0]) === targetPhone) {
          chatId = row[1];
          break;
        }
      }
      if (!chatId) {
        return NextResponse.json({ message: "Phone not registered with Telegram bot. Please register using this link: https://telegram.me/ai_coupontoken_bot?start=hello" }, { status: 400 });
      }
    }

    // 4. Append row to Sheet 1 (Including Token as K and Date as L)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_1,
      range: 'Sheet1!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            rowData.name,
            rowData.dept,
            rowData.contractor,
            rowData.phone,
            rowData.appreciated_for,
            rowData.appreciated_by,
            rowData.award_type,
            rowData.month,
            rowData.year,
            rowData.monthYear,
            rowData.token,     // Column K
            rowData.dateTime   // Column L
          ]
        ]
      }
    });

    // 5. Send Telegram Message
    if (chatId && TELEGRAM_BOT_TOKEN) {
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const text = `New Reward Submitted!\n\nCongratulations ${rowData.name}!\nYou have received Rs 100 ${rowData.award_type.toUpperCase()} award.\nAppreciated by: ${rowData.appreciated_by}\nFor: ${rowData.appreciated_for} for the month ${rowData.monthYear}\n\n🎟️ Coupon Token: ${rowData.token}\n📅 Generated On: ${rowData.dateTime}`;

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text
        })
      });
    } else {
      console.warn("Telegram bot token or Chat ID is missing, skipping telegram message.");
    }

    // Returning token and datetime to pass metadata along the frontend/next flow
    return NextResponse.json({
      message: "Form submitted successfully.",
      token: rowData.token,
      dateTime: rowData.dateTime
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}