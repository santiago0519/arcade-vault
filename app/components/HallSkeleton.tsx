// Silueta del salón de la fama mientras llega el ranking desde Supabase.
export default function HallSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Cargando ranking…</span>
      <div className="hall-tabs" aria-hidden="true">
        <div className="skel skel-chip"></div>
      </div>
      <div className="podium" aria-hidden="true">
        <div className="podium-slot skel-podium silver"></div>
        <div className="podium-slot skel-podium gold"></div>
        <div className="podium-slot skel-podium bronze"></div>
      </div>
      <div className="hall-table" aria-hidden="true">
        <div className="skel-head">
          <div className="skel skel-line short"></div>
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="tr skel-row">
            <div className="skel skel-line"></div>
            <div className="skel skel-line"></div>
            <div className="skel skel-line"></div>
            <div className="skel skel-line"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
