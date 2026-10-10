import { useEffect } from "react";
import studioLogo from "@/assets/studio-mufi.webp.asset.json";

/** Total time the studio card stays up. The game mounts underneath, so this never adds loading time. */
export const SPLASH_MS = 1600;

/** One automatic studio fade per app opening, never on chapter changes. Tapping skips it. */
export function StudioSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const done = window.setTimeout(onComplete, SPLASH_MS);
    return () => window.clearTimeout(done);
  }, [onComplete]);
  return (
    <div
      className="studio-splash fixed inset-0 z-[150] grid place-items-center"
      onPointerDown={onComplete}
      aria-hidden="true"
      data-testid="studio-splash"
    >
      <img
        src={studioLogo.url}
        alt="M.U.F.I studio"
        decoding="async"
        fetchPriority="high"
        className="studio-logo h-auto w-56 max-w-[60vw] object-contain sm:w-72"
      />
    </div>
  );
}
