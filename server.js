const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const nodemailer = require("nodemailer");
require("dotenv").config();

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "pixelsiders71@gmail.com";
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_BODY_SIZE = 1024 * 1024;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

const ipRequests = new Map();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket.remoteAddress || "unknown";
}

function cleanupOldRateLimitEntries(now) {
  for (const [ip, timestamps] of ipRequests.entries()) {
    const freshTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (freshTimestamps.length === 0) {
      ipRequests.delete(ip);
      continue;
    }

    ipRequests.set(ip, freshTimestamps);
  }
}

function isRateLimited(ipAddress) {
  const now = Date.now();
  cleanupOldRateLimitEntries(now);

  const timestamps = ipRequests.get(ipAddress) || [];
  const freshTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (freshTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequests.set(ipAddress, freshTimestamps);
    return true;
  }

  freshTimestamps.push(now);
  ipRequests.set(ipAddress, freshTimestamps);
  return false;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, "utf8") > MAX_BODY_SIZE) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function sendContactEmail({ name, email, subject, message }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  if (!CONTACT_FROM_EMAIL) {
    throw new Error("FROM_EMAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || "Demande de contact");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  await transporter.sendMail({
    from: `"Formulaire Siders Pixel" <${CONTACT_FROM_EMAIL}>`,
    to: CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `[Site Siders Pixel] ${subject || "Nouvelle demande de contact"}`,
    text: [
      "Nouvelle demande de contact",
      "",
      `Nom : ${name}`,
      `E-mail : ${email}`,
      `Sujet : ${subject || "Non renseigné"}`,
      "",
      "Message :",
      message
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 16px;">Nouvelle demande de contact</h2>
        <p style="margin: 0 0 8px;"><strong>Nom :</strong> ${safeName}</p>
        <p style="margin: 0 0 8px;"><strong>E-mail :</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p style="margin: 0 0 16px;"><strong>Sujet :</strong> ${safeSubject}</p>
        <div style="padding: 16px; border-radius: 12px; background: #f3f4f6;">
          <p style="margin: 0 0 8px;"><strong>Message :</strong></p>
          <p style="margin: 0;">${safeMessage}</p>
        </div>
      </div>
    `
  });
}

async function handleContactRequest(request, response) {
  const ipAddress = getClientIp(request);

  if (isRateLimited(ipAddress)) {
    sendJson(response, 429, {
      success: false,
      message: "Trop de tentatives ont ete detectees. Merci de reessayer un peu plus tard."
    });
    return;
  }

  let rawBody;

  try {
    rawBody = await readRequestBody(request);
  } catch (error) {
    if (error.message === "PAYLOAD_TOO_LARGE") {
      sendJson(response, 413, {
        success: false,
        message: "Le message est trop volumineux."
      });
      return;
    }

    sendJson(response, 400, {
      success: false,
      message: "Impossible de lire la demande."
    });
    return;
  }

  let payload;

  try {
    payload = JSON.parse(rawBody || "{}");
  } catch (error) {
    sendJson(response, 400, {
      success: false,
      message: "Le format de la demande est invalide."
    });
    return;
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const subject = String(payload.subject || "").trim();
  const message = String(payload.message || "").trim();
  const companyWebsite = String(payload.companyWebsite || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (companyWebsite) {
    sendJson(response, 400, {
      success: false,
      message: "La demande n'a pas pu etre envoyee."
    });
    return;
  }

  if (!name || !email || !message) {
    sendJson(response, 400, {
      success: false,
      message: "Merci de renseigner votre nom, votre e-mail et votre message."
    });
    return;
  }

  if (!emailPattern.test(email)) {
    sendJson(response, 400, {
      success: false,
      message: "Merci de renseigner une adresse e-mail valide."
    });
    return;
  }

  if (name.length > 120 || email.length > 160 || subject.length > 160 || message.length > 5000) {
    sendJson(response, 400, {
      success: false,
      message: "Certaines informations depassent la longueur autorisee."
    });
    return;
  }

  try {
    await sendContactEmail({
      name,
      email,
      subject,
      message
    });

    sendJson(response, 200, {
      success: true,
      message: "Votre message a bien ete envoye. Nous revenons vers vous au plus vite."
    });
  } catch (error) {
    console.error("Erreur d'envoi du formulaire de contact :", error);

    const configurationError =
      error.message === "SMTP_NOT_CONFIGURED" || error.message === "FROM_EMAIL_NOT_CONFIGURED";

    sendJson(response, 500, {
      success: false,
      message: configurationError
        ? "Le service d'envoi d'e-mail n'est pas encore configure sur le serveur."
        : "Une erreur est survenue pendant l'envoi. Merci de reessayer dans quelques instants."
    });
  }
}

function serveStaticFile(requestPath, response) {
  const sanitizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(ROOT_DIR, sanitizedPath);

  if (requestPath === "/" || requestPath === "") {
    filePath = path.join(ROOT_DIR, "html", "index.html");
  }

  if (!filePath.startsWith(ROOT_DIR)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acces refuse.");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Page introuvable.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "POST" && parsedUrl.pathname === "/api/contact") {
    await handleContactRequest(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Methode non autorisee.");
    return;
  }

  serveStaticFile(parsedUrl.pathname, response);
});

server.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
