import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // Used for generating unique random tokens

export async function POST(req) {
  try {
    const { appreciated_by, dept, entries, isContractorGlobal, globalContractor } = await req.json(); // dept is global for all entries and contractor handling
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ message: 'No entries provided.' }, { status: 400 });
    }
    if (!dept) {
      return NextResponse.json({ message: 'Department (dept) is required.' }, { status: 400 });
    }
    if (entries.length > 10) {
      return NextResponse.json({ message: 'Maximum 10 entries allowed per bulk submit.' }, { status: 400 });
    }

    // Env vars
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    const SHEET_ID_1 = '1OZUgBc6RoR206QuEzOAWVKY3t_nzlsMG3b6f6RdTpQk'; // Sheet1
    const SHEET_ID_2 = '1uw7abz2I7212Y_cIiXgylT3JOrdB5xdmlv1Dqnrnda0'; // Sheet2
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL) {
      return NextResponse.json({ error: 'Missing Google credentials.' }, { status: 500 });
    }
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: GOOGLE_CLIENT_EMAIL, private_key: GOOGLE_PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Load existing rows once - Extended range to A:L to capture Token & Date columns
    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_1,
      range: 'Sheet1!A:M',
    });
    const existingRows = sheet1Data.data.values || [];

    const sheet2Data = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_2,
      range: 'Sheet1!A:B',
    });
    const chatMapping = sheet2Data.data.values || [];

    // All times in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const month = istNow.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
    const year = istNow.getUTCFullYear().toString();
    const monthYear = `${month} ${year}`;

    const normalizePhone = (num) => {
      if (!num) return '';
      const clean = num.toString().replace(/\D/g, '');
      return clean.length >= 10 ? clean.slice(-10) : clean;
    };

    const deptCountMap = {};
    for (let i = 1; i < existingRows.length; i++) {
      const r = existingRows[i];
      const d = r[1];  // dept column B
      const my = r[9]; // monthYear column J
      if (my === monthYear) {
        deptCountMap[d] = (deptCountMap[d] || 0) + 1;
      }
    }

    const results = [];
    const rowsToAppend = [];

    for (const entry of entries) {
      const {
        name,
        empid,
        contractor = '',
        pno,
        appreciated_for,
        award_type,
      } = entry;

      // Basic validation
      if (!name || !dept || !pno || !appreciated_for || !award_type || !empid) {
        results.push({ name, message: 'Missing required fields.' });
        continue;
      }

      const normalizedPno = normalizePhone(pno);

      // Department limit check (including this entry)
      const currentDeptCount = deptCountMap[dept] || 0;
      if (currentDeptCount >= 100) {
        results.push({ name, message: `Department ${dept} already reached the 100 limit for ${monthYear}.` });
        continue;
      }

      // Find chat id for telegram message
      let chatId = null;
      if (pno) {
        const mapping = chatMapping.find(row => normalizePhone(row[0]) === normalizedPno);
        if (mapping) chatId = mapping[1];
      }
      if (!chatId) {
        results.push({ name, message: 'Phone not registered with Telegram bot. Register using this link: https://telegram.me/ai_coupontoken_bot?start=hello' });
        continue;
      }

      // Generate token and IST timestamp for this entry
      const entryIstNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
      const currentDateTime = entryIstNow.toISOString().replace('T', ' ').substring(0, 19);
      const randomToken = `NUV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // All checks passed – stage for append (Includes Token as K and Date as L)
      rowsToAppend.push([
        name,
        dept,
        isContractorGlobal ? globalContractor : contractor,
        pno,
        appreciated_for,
        appreciated_by,
        award_type,
        month,
        year,
        monthYear,
        randomToken,     // Column K
        currentDateTime,  // Column L
        empid
      ]);

      // Update in-memory counters for subsequent entries in same bulk
      deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;

      // Send telegram notification
      if (TELEGRAM_BOT_TOKEN && chatId) {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const text = `🎉 New Reward Submitted!\n\nCongratulations ${name}! Emp Id: ${empid}\nYou have received Rs 100 ${award_type.toUpperCase()} award.\nAppreciated by: ${appreciated_by}\nFor: ${appreciated_for} (${monthYear})\n\n🎟️ Coupon Token: ${randomToken}\n📅 Generated On: ${currentDateTime}`;
        try {
          const tgRes = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
          });
          const tgJson = await tgRes.json();
          if (!tgJson.ok) {
            console.error(`Telegram API error for ${name}:`, JSON.stringify(tgJson));
          } else {
            console.log(`Telegram message sent to chatId ${chatId} for ${name}`);
          }
        } catch (e) {
          console.error(`Telegram fetch failed for ${name}:`, e);
        }
      } else {
        console.warn(`Telegram skipped for ${name} — missing bot token or chatId.`);
      }

      // Include token and dateTime properties in individual result response items
      results.push({ name, status: 'added', reason: 'Successfully added.', token: randomToken, dateTime: currentDateTime });
    }

    // Append all successful rows in one batch (if any)
    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_1,
        range: 'Sheet1!A:M', // Extended from A:J to A:L
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToAppend },
      });
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Bulk API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}