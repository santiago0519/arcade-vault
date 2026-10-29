import Link from "next/link";
import { GAMES, type Game } from "@/app/data/games";

function MiniCard({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}

export default function GamesPreview() {
  return (
    <section className="home-section reveal">
      <div className="section-head">
        <div className="kicker pixel neon-cyan">{"// 02"}</div>
        <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
        <div className="section-rule"></div>
      </div>
      <div className="mini-rail">
        {GAMES.slice(0, 6).map((g) => (
          <MiniCard key={g.id} game={g} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/juegos" className="btn lg">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </section>
  );
}
