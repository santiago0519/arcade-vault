// Aviso en línea cuando falla una lectura de Supabase. Ocupa solo su
// sección: la nav y el footer siguen visibles.
// REINTENTAR es un <a> normal para forzar una petición nueva al servidor.
export default function LoadError({
  detail,
  retryHref,
  compact = false,
}: {
  detail: string;
  retryHref: string;
  compact?: boolean;
}) {
  return (
    <div className={'load-error' + (compact ? ' compact' : '')} role="alert">
      <div className="load-error-title pixel">NO SE PUDO CARGAR</div>
      <p className="load-error-detail">{detail}</p>
      <a className="btn magenta" href={retryHref}>
        REINTENTAR
      </a>
    </div>
  );
}
