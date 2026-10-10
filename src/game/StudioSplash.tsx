import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import studioLogo from "@/assets/studio-mufi.png.asset.json";

/** One studio introduction per app opening, never on chapter changes. */
export function StudioSplash({ onComplete }: { onComplete: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const fallback = window.setTimeout(onComplete, 7000);
    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(timer.current);
    };
  }, [onComplete]);
  return (
    <div className="studio-splash fixed inset-0 z-[150] grid place-items-center">
      <Button
        variant="ghost"
        aria-label="Continue to Mommy Will Be Back"
        onClick={onComplete}
        className="h-full w-full rounded-none p-0 hover:bg-transparent focus-visible:ring-inset"
      >
        <img
          src={studioLogo.url}
          alt="M.U.F.I studio"
          className="studio-logo h-auto w-64 max-w-[70vw] object-contain sm:w-80"
          onLoad={() => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(onComplete, 2600);
          }}
          onError={onComplete}
        />
      </Button>
    </div>
  );
}