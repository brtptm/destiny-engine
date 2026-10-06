import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

const CosmosScene = lazy(() => import('./CosmosScene.jsx'));

function hasWebGL() {
  try { return Boolean(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); }
  catch { return false; }
}

/**
 * Lazy three.js backdrop. Loads the 3D chunk only where it's used, pauses
 * rendering when off-screen, and falls back to a static glow without WebGL.
 */
export default function Cosmos({ variant = 'hero', progress, className = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(true);
  const [ready, setReady] = useState(false);
  const webgl = useMemo(hasWebGL, []);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' });
    io.observe(ref.current);
    const t = setTimeout(() => setReady(true), 60);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(600px 380px at 70% 40%, color-mix(in srgb, var(--gold) 14%, transparent), transparent 70%)' }} />
      {webgl && (
        <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: ready ? 1 : 0 }}>
          <Suspense fallback={null}>
            <CosmosScene variant={variant} progress={progress} paused={!inView} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
