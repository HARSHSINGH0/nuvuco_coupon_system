import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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

    // Load existing rows once
    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_1,
      range: 'Sheet1!A:J',
    });
    const existingRows = sheet1Data.data.values || [];

    const sheet2Data = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_2,
      range: 'Sheet1!A:B',
    });
    const chatMapping = sheet2Data.data.values || [];

    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear().toString();
    const monthYear = `${month} ${year}`;

    const normalizePhone = (num) => {
      if (!num) return '';
      const clean = num.toString().replace(/\D/g, '');
      return clean.length >= 10 ? clean.slice(-10) : clean;
    };

    // Helper maps for fast lookup
    const phoneMonthSet = new Set(); // "phone|monthYear"
    const deptCountMap = {};
    for (let i = 1; i < existingRows.length; i++) {
      const r = existingRows[i];
      const p = r[3]; // phone column D
      const d = r[1]; // dept column B
      const my = r[9]; // monthYear column J
      if (p) phoneMonthSet.add(`${normalizePhone(p)}|${my}`);
      if (my === monthYear) {
        deptCountMap[d] = (deptCountMap[d] || 0) + 1;
      }
    }

    const results = [];
    const rowsToAppend = [];

    for (const entry of entries) {
      const {
        name,
        contractor = '',
        pno,
        appreciated_for,
        award_type,
      } = entry;

      // Basic validation
      if (!name || !dept || !pno || !appreciated_for || !award_type) {
        results.push({ name, message: 'Missing required fields.' });
        continue;
      }

      const normalizedPno = normalizePhone(pno);

      // Duplicate phone check for the same month
      if (phoneMonthSet.has(`${normalizedPno}|${monthYear}`)) {
        results.push({ name, message: 'Phone already submitted for this month.' });
        continue;
      }

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

      // All checks passed – stage for append
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
      ]);


      // Update in‑memory counters for subsequent entries in same bulk
      phoneMonthSet.add(`${pno}|${monthYear}`);
      deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;

      // Send telegram notification
      if (TELEGRAM_BOT_TOKEN) {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const text = `New Reward Submitted!\n\nCongratulations ${name}!\nYou have received a ${award_type.toUpperCase()} award.\nAppreciated by: ${appreciated_by}\nFor: ${appreciated_for} (${monthYear})`;
        try {
          await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
          });
        } catch (e) {
          // Telegram failure should not block whole bulk – record it
          results.push({ name, status: 'partial', reason: 'Telegram message failed.' });
        }
      }

      results.push({ name, status: 'added', reason: 'Successfully added.' });
    }

    // Append all successful rows in one batch (if any)
    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_1,
        range: 'Sheet1!A:J',
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
