import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs"; // edge olmasın, garantiye al

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Build sırasında da import edilse bile burada patlamaz,
    // çünkü bu fonksiyon çağrılmadıkça çalışmaz.
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html } = body ?? {};

    if (!to || !subject || !html) {
      return NextResponse.json(
        { ok: false, error: "Missing fields: to, subject, html" },
        { status: 400 }
      );
    }

    const from = process.env.RESEND_FROM || "BKaraoke <onboarding@resend.dev>";
    const resend = getResend();

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Mail send failed" },
      { status: 500 }
    );
  }
}
