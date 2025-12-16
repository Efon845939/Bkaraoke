import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-karaoke-secret");
    if (!process.env.KARAOKE_ADMIN_SECRET || secret !== process.env.KARAOKE_ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { subject, text } = await req.json();

    if (!subject || !text) {
      return NextResponse.json({ ok: false, error: "Missing subject or text" }, { status: 400 });
    }

    const { error, data } = await resend.emails.send({
      from: process.env.MAIL_FROM!,
      to: process.env.MAIL_TO!,
      subject,
      text,
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}