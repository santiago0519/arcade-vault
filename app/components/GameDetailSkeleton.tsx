// Silueta del detalle mientras llega el contenido del juego
export default function GameDetailSkeleton() {
  return (
    <div className="av-detail" aria-busy="true">
      <div>
        <div className="detail-cover skel" aria-hidden="true"></div>
        <div style={{ marginTop: 20 }} className="detail-info" aria-hidden="true">
          <div className="detail-tags">
            <span className="skel skel-tag"></span>
            <span className="skel skel-tag"></span>
            <span className="skel skel-tag"></span>
            <span className="skel skel-tag"></span>
          </div>
          <div className="skel skel-title"></div>
          <div>
            <div className="skel skel-line"></div>
            <div className="skel skel-line"></div>
            <div className="skel skel-line short"></div>
          </div>
          <div className="stat-strip">
            <div><div className="skel skel-line"></div></div>
            <div><div className="skel skel-line"></div></div>
            <div><div className="skel skel-line"></div></div>
          </div>
          <div className="detail-actions">
            <div className="skel skel-btn"></div>
            <div className="skel skel-btn"></div>
          </div>
        </div>
      </div>

      <aside aria-hidden="true">
        <div className="leaderboard">
          <div className="skel-head">
            <div className="skel skel-line short"></div>
          </div>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="lb-row">
              <div className="skel skel-line"></div>
              <div className="skel skel-line"></div>
              <div className="skel skel-line"></div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
