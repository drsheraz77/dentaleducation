/** Loading, error and no-WebGL states for the 3D model viewer. Every button here does something. */
export function ModelLoadingFallback({
  kind,
  progress = 0,
  message,
  onRetry,
  onFallback,
}: {
  kind: 'loading' | 'error' | 'no-webgl';
  progress?: number;
  message?: string;
  onRetry?: () => void;
  onFallback?: () => void;
}) {
  if (kind === 'loading') {
    const pct = Math.round(progress * 100);
    return (
      <div className="scene-message scene-message--light" role="status" aria-live="polite">
        <div className="spinner" aria-hidden />
        <p>Loading the 3D tooth model… {pct > 0 ? `${pct}%` : ''}</p>
        <progress max={100} value={pct} aria-label="Model download progress" />
      </div>
    );
  }
  return (
    <div className="scene-message scene-message--light" role="alert">
      <h3>{kind === 'no-webgl' ? 'WebGL is not available' : 'The 3D model is unavailable'}</h3>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            Try again
          </button>
        )}
        {onFallback && (
          <button type="button" className="btn btn--ghost" onClick={onFallback}>
            Open the schematic caries module instead
          </button>
        )}
      </div>
    </div>
  );
}
