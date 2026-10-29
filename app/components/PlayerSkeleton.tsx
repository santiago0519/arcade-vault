// Silueta del reproductor mientras llega el contenido del juego
export default function PlayerSkeleton() {
  return (
    <div className="av-player" aria-busy="true">
      <div className="player-hud" aria-hidden="true">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="hud-stat">
              <div className="skel skel-line short" style={{ width: 56 }}></div>
              <div className="skel skel-line" style={{ width: 72, height: 16 }}></div>
            </div>
          ))}
        </div>
        <div className="hud-actions">
          <div className="skel skel-btn sm"></div>
          <div className="skel skel-btn sm"></div>
          <div className="skel skel-btn sm"></div>
        </div>
      </div>

      <div className="crt" aria-hidden="true">
        <div className="crt-screen"></div>
        <div className="crt-bottom">
          <div className="skel skel-line" style={{ width: "100%" }}></div>
        </div>
      </div>
    </div>
  );
}
