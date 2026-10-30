import { Resend } from "resend";
import {
  validateContact,
  type ContactResponse,
} from "@/app/lib/contact";

const DEFAULT_FROM = "ARCADE VAULT <onboarding@resend.dev>";

function respond(body: ContactResponse, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ ok: false, error: "Cuerpo de la solicitud inválido." }, 400);
  }

  // Honeypot: un humano no rellena `website`. Se responde éxito sin enviar.
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { website?: unknown }).website === "string" &&
    (body as { website: string }).website !== ""
  ) {
    return respond({ ok: true }, 200);
  }

  const { ok, data, errors } = validateContact(body);
  if (!ok || !data) {
    return respond(
      { ok: false, error: "Revisa los campos del formulario.", fields: errors },
      400,
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return respond(
      { ok: false, error: "El envío de mensajes no está configurado." },
      502,
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to,
      replyTo: data.email,
      subject: `[ARCADE VAULT] Mensaje de ${data.name}`,
      text: `Nombre: ${data.name}\nCorreo: ${data.email}\n\n${data.message}`,
    });
    if (error) {
      return respond(
        { ok: false, error: "No se pudo enviar el mensaje. Inténtalo de nuevo." },
        502,
      );
    }
  } catch {
    return respond(
      { ok: false, error: "No se pudo enviar el mensaje. Inténtalo de nuevo." },
      502,
    );
  }

  return respond({ ok: true }, 200);
}
