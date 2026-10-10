import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { Ending, Final, Intro, Title } from "@/game/scenes/Opening";
import { Ch1, Ch2Dining, Ch2Kitchen } from "@/game/scenes/Ch1Ch2";
import { Ch3, Ch4, Ch5 } from "@/game/scenes/Ch3Ch5";

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
  const screen = useGame((s) => s.screen);
  const phaseKey = useGame((s) => s.phaseKey);
  useEffect(() => {
    const prevent = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);
  const k = `${screen}-${phaseKey}`;
  return (
    <main className="grid h-[100dvh] w-screen place-items-center overflow-hidden bg-void">
      {screen === "title" && <Title />}
      {screen === "intro" && <Intro />}
      {screen === "ch1" && <Ch1 key={k} />}
      {screen === "ch2k" && <Ch2Kitchen key={k} />}
      {screen === "ch2d" && <Ch2Dining key={k} />}
      {screen === "ch3" && <Ch3 key={k} />}
      {screen === "ch4" && <Ch4 key={k} />}
      {screen === "ch5" && <Ch5 key={k} />}
      {screen === "final" && <Final />}
      {screen === "ending" && <Ending />}
    </main>
  );
}
