"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CONTACT_LIMITS,
  validateContact,
  type ContactResponse,
} from "@/app/lib/contact";

const EMPTY = { name: "", email: "", msg: "" };
const GENERIC_ERROR = "No se pudo enviar el mensaje. Inténtalo de nuevo.";

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState(""); // honeypot
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );

  const vibrate = () => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;

    const empty = !form.name.trim() || !form.email.trim() || !form.msg.trim();
    const result = validateContact({
      name: form.name,
      email: form.email,
      message: form.msg,
    });
    if (!result.ok || !result.data) {
      // Campo vacío: solo vibra. Correo o longitud inválidos: además se explica
      setError(
        empty
          ? null
          : (result.errors.name ??
              result.errors.email ??
              result.errors.message ??
              null),
      );
      vibrate();
      return;
    }

    inFlight.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.data, website }),
      });
      const body = (await res.json().catch(() => null)) as ContactResponse | null;
      if (res.ok && body?.ok) {
        setSent(result.data.name);
      } else {
        setError(body && !body.ok ? body.error : GENERIC_ERROR);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const reset = () => {
    setSent(null);
    setForm(EMPTY);
    setWebsite("");
    setError(null);
  };

  return (
    <div className="contact-grid">
      <div className="contact-intro">
        <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
        <h2 className="contact-title">CONTÁCTANOS</h2>
        <p className="contact-sub">
          ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente
          quieres saludar? Escríbenos.
        </p>
        <div className="contact-tips">
          <div className="tip">
            <span className="tip-led"></span>RESPUESTA EN 24-48H
          </div>
          <div className="tip">
            <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
          </div>
          <div className="tip">
            <span className="tip-led m"></span>SIN SPAM, JAMÁS
          </div>
        </div>
      </div>

      <form
        className={"contact-form" + (shake ? " shake" : "")}
        onSubmit={onSubmit}
        noValidate
      >
        {!sent ? (
          <>
            <div className="field">
              <label htmlFor="contact-name">NOMBRE</label>
              <input
                id="contact-name"
                name="name"
                autoComplete="name"
                maxLength={CONTACT_LIMITS.name}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="px_kai"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={CONTACT_LIMITS.email}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jugador@vault.gg"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-message">MENSAJE</label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                maxLength={CONTACT_LIMITS.message}
                value={form.msg}
                onChange={(e) => setForm({ ...form, msg: e.target.value })}
                placeholder="Cuéntanos qué tienes en mente…"
              ></textarea>
            </div>

            {/* Honeypot: fuera de pantalla y fuera del orden de tabulación */}
            <div className="contact-hp" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <div className="contact-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="btn xl press"
              type="submit"
              style={{ width: "100%" }}
              disabled={sending}
            >
              {sending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
            </button>
          </>
        ) : (
          <div className="terminal-success">
            <div className="term-bar">
              <span className="dot r"></span>
              <span className="dot y"></span>
              <span className="dot g"></span>
              <span className="term-title">VAULT-OS // TERMINAL</span>
            </div>
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message
                --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line dim">[OK] Transmitiendo paquete…</div>
              <div className="line success" role="status">
                &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
                {sent.toUpperCase()}.<span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={reset}>
                  ENVIAR OTRO MENSAJE
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
