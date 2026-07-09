import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const maxFileSize = 10 * 1024 * 1024;
const maxFiles = 5;
const DEFAULT_SUPPORT_EMAIL = "info@hikigai.ai";

function formatSender(name: string, email: string) {
  const safeName = name.replace(/"/g, "'");
  return `"${safeName}" <${email}>`;
}

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseAddress(value: string) {
  const email = value.trim();
  return /^\S+@\S+\.\S+$/.test(email);
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = toText(formData.get("name"));
    const email = toText(formData.get("email"));
    const category = toText(formData.get("category"));
    const subject = toText(formData.get("subject"));
    const description = toText(formData.get("description"));
    const message = toText(formData.get("message")) || description;

    if (!name || !email || !message || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!parseAddress(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const incomingAttachments = formData.getAll("attachments").filter(isFile);
    if (incomingAttachments.length > maxFiles) {
      return NextResponse.json(
        { error: `You can upload up to ${maxFiles} files.` },
        { status: 400 }
      );
    }

    for (const file of incomingAttachments) {
      if (!allowedTypes.has(file.type)) {
        return NextResponse.json(
          { error: `${file.name}: unsupported file type.` },
          { status: 400 }
        );
      }

      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `${file.name}: exceeds 10MB limit.` },
          { status: 400 }
        );
      }
    }

    const host = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";

    const supportEmail = process.env.HELP_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
    const senderEmail = formatSender(name, email);

    if (!host || !user || !pass) {
      return NextResponse.json(
        {
          error:
            "Support email is not configured on the server. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: smtpPort,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const attachments = await Promise.all(
      incomingAttachments.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
      }))
    );

    const html = `
      <h2>New Help Center Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Subject:</strong> ${subject || "N/A"}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;

    const text = [
      "New Help Center Message",
      `Name: ${name}`,
      `Email: ${email}`,
      `Category: ${category}`,
      `Subject: ${subject || "N/A"}`,
      "",
      "Message:",
      message,
    ].join("\n");

    await transporter.sendMail({
      from: senderEmail,
      to: supportEmail,
      replyTo: email,
      subject: `[Help] ${category}${subject ? ` - ${subject}` : ""} - ${name}`,
      text,
      html,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Help contact API error:", error);
    return NextResponse.json(
      { error: "Failed to send your message. Please try again." },
      { status: 500 }
    );
  }
}
