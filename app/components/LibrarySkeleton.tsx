// Silueta de la biblioteca mientras llega el catálogo desde Supabase.
export default function LibrarySkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Cargando juegos…</span>
      <div className="av-filters" aria-hidden="true">
        <div className="skel skel-search"></div>
        <div className="av-chips">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skel skel-chip"></div>
          ))}
        </div>
      </div>
      <div className="av-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skel-card">
            <div className="skel skel-cover"></div>
            <div className="skel skel-line short"></div>
            <div className="skel skel-line"></div>
            <div className="skel skel-btn sm"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
