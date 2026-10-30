export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot, debe llegar vacío
}

export type ContactErrors = Partial<
  Record<"name" | "email" | "message", string>
>;

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: string; fields?: ContactErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateContact(input: unknown): {
  ok: boolean;
  data?: ContactPayload;
  errors: ContactErrors;
} {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  // El nombre va al asunto del correo: se colapsan espacios y saltos de línea
  const name = field(raw.name).replace(/\s+/g, " ").trim();
  const email = field(raw.email).trim();
  const message = field(raw.message).trim();
  const website = field(raw.website);

  const errors: ContactErrors = {};

  if (!name) errors.name = "Escribe tu nombre.";
  else if (name.length > CONTACT_LIMITS.name)
    errors.name = `Máximo ${CONTACT_LIMITS.name} caracteres.`;

  if (!email) errors.email = "Escribe tu correo electrónico.";
  else if (email.length > CONTACT_LIMITS.email)
    errors.email = `Máximo ${CONTACT_LIMITS.email} caracteres.`;
  else if (!EMAIL_RE.test(email))
    errors.email = "El correo electrónico no es válido.";

  if (!message) errors.message = "Escribe un mensaje.";
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = `Máximo ${CONTACT_LIMITS.message} caracteres.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { name, email, message, website }, errors };
}
