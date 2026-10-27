import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const RELAY_SECRET = process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
const SMTP_USER = process.env.SMTP_USERNAME || 'jinofc.ytb@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASSWORD || 'myyrozdzpyfcemax').replace(/\s+/g, '');
const FROM_NAME = process.env.SMTP_FROM_NAME || 'CHIPCOIN | Xác thực tài khoản';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== RELAY_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (err: any) {
    console.error('Email relay error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'relay_failed',
      },
      { status: 500 }
    );
  }
}
