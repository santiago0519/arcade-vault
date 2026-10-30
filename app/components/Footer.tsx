import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "20px 32px",
        textAlign: "center",
        color: "var(--ink-faint)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.16em",
      }}
    >
      <Link
        href="/acerca-de"
        style={{ color: "var(--ink-dim)", textDecoration: "underline" }}
      >
        ACERCA DE
      </Link>
      <div style={{ marginTop: 10 }}>
        © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
      </div>
    </footer>
  );
}
