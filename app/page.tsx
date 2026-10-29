import Link from "next/link";
import ActivitySection from "./components/home/ActivitySection";
import FinalCta from "./components/home/FinalCta";
import FloatingSilhouettes from "./components/home/FloatingSilhouettes";
import GamesPreview from "./components/home/GamesPreview";
import PricingSection from "./components/home/PricingSection";
import StatsStrip from "./components/home/StatsStrip";
import WhySection from "./components/home/WhySection";

export default function Home() {
  return (
    <div className="home fade-in">
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/juegos" className="btn xl pulse">
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link href="/acceso" className="btn xl magenta">
              ✦ CREAR CUENTA
            </Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      <WhySection />
      <GamesPreview />
      <StatsStrip />
      <ActivitySection />
      <PricingSection />
      <FinalCta />
    </div>
  );
}
