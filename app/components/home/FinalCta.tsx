import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="home-final reveal">
      <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
      <Link href="/juegos" className="btn xl pulse final-cta">
        INSERTAR MONEDA →
      </Link>
      <div className="final-tag">Gratis. Sin registro obligatorio. Empieza en segundos.</div>
    </section>
  );
}
