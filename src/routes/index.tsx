import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { StudioSplash } from "@/game/StudioSplash";
import { restoreSettings, useGame } from "@/game/store";
import { useSubtitles } from "@/game/Shell";
import { preloadArt } from "@/game/assets";
import { Final, Intro, Title } from "@/game/scenes/Opening";
import { Ending } from "@/game/scenes/Endings";
import { Ch1, Ch2Dining, Ch2Kitchen } from "@/game/scenes/Ch1Ch2";
import { Ch3, Ch4, Ch5 } from "@/game/scenes/Ch3Ch5";
import { Prologue } from "@/game/scenes/Prologue";
import { Corridor, useCorridorTransitions } from "@/game/scenes/Corridor";
import { HOLD_MS, TransitionVeil, useChapterJump } from "@/game/fx";
import { useDialogueVoice } from "@/game/DialogueVoice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mommy Will Be Back — a miniature psychological horror" },
      { name: "description", content: "Mommy went out for groceries. Tidy up, set the table, get ready for bed. Something in the little house is watching." },
      { property: "og:title", content: "Mommy Will Be Back" },
      { property: "og:description", content: "A handcrafted, mobile-first psychological horror game set inside a miniature house." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  const [studioOpening, setStudioOpening] = useState(true);
  const finishStudioOpening = useCallback(() => setStudioOpening(false), []);
  const screen = useGame((s) => s.screen);
  const phaseKey = useGame((s) => s.phaseKey);
  useSubtitles();
  useDialogueVoice();
  useEffect(() => {
    restoreSettings();
    preloadArt();
    const prevent = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);
  const holding = useChapterJump();
  // Between chapters the child walks down the hall first; the next room mounts on arrival.
  const { corridor, veilScreen, endCorridor } = useCorridorTransitions();
  const shown = corridor ? null : screen;
  const k = `${screen}-${phaseKey}`;
  if (studioOpening) return <StudioSplash onComplete={finishStudioOpening} />;
  return (
    <main className="grid h-[100dvh] w-screen place-items-center overflow-hidden bg-void pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {shown === "title" && <Title />}
      {shown === "intro" && <Intro />}
      {shown === "prologue" && <Prologue />}
      {shown === "ch1" && <Ch1 key={k} />}
      {shown === "ch2k" && <Ch2Kitchen key={k} />}
      {shown === "ch2d" && <Ch2Dining key={k} />}
      {shown === "ch3" && <Ch3 key={k} />}
      {shown === "ch4" && <Ch4 key={k} />}
      {shown === "ch5" && <Ch5 key={k} />}
      {shown === "final" && <Final />}
      {shown === "ending" && <Ending />}
      {corridor && <Corridor key={corridor.to} to={corridor.to} onDone={endCorridor} />}
      <TransitionVeil screen={veilScreen} />
      {holding && (
        <div className="paper fixed bottom-4 left-1/2 z-[110] -translate-x-1/2 px-4 py-2 text-sm">
          Skipping to chapter {holding}…
          <div className="mt-1 h-1 bg-crimson" style={{ animation: `grow ${HOLD_MS}ms linear forwards`, transformOrigin: "left" }} />
        </div>
      )}
    </main>
  );
}
