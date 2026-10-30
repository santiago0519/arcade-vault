"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CONTACT_LIMITS, validateContact } from "@/app/lib/contact";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { ok } = validateContact({
      name: form.name,
      email: form.email,
      message: form.msg,
    });
    if (!ok) {
      setShake(true);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(false), 400);
      return;
    }
    // El envío real a /api/contact se conecta en el paso 7
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
        <button className="btn xl press" type="submit" style={{ width: "100%" }}>
          ▶&nbsp; ENVIAR MENSAJE
        </button>
      </form>
    </div>
  );
}
