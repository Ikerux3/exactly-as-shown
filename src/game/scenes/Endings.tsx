// The two endings as short films, in the prologue's collage vocabulary: the photomontage hallway,
// cardboard cut-outs, ransom-note captions. Mommy comes back in both; Cordura decides how she
// finds you (Brave < 65 ≤ Tears). Then the camera turns to the dark room next door, where the
// Guest kept your toy. Lines go through the store, so they get subtitles and voices.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BG, CUT, toyImageFor } from "../assets";
import { TOY_LABEL, loadMemory, saveMemory, useGame, type Line } from "../store";
import { sfx, unlockAudio } from "../audio";
import { GAMEPLAY_RULES } from "../gameplayRules";
import { ChildCutout, ChildDoll, MotherCutout } from "../Props";
import { loadProfile } from "../profile";
import { Ransom } from "../fx";
import { resetOnce } from "../kit";
import { DialogueBar, Shell } from "../Shell";

type Kind = "brave" | "tears";
type Shot = "card" | "enter" | "run" | "hug" | "hold" | "pan" | "guest" | "close" | "done";
type Ctx = { name: string; toy: string };
type Step = { shot: Shot; ms: number; line?: (c: Ctx) => Line };

const SCRIPT: Record<Kind, Step[]> = {
  brave: [
    { shot: "card", ms: 2800 },
    {
      shot: "enter",
      ms: 3200,
      line: (c) => ({ speaker: "mother", text: `There you are, ${c.name}.` }),
    },
    { shot: "run", ms: 2600 },
    {
      shot: "hug",
      ms: 3800,
      line: () => ({ speaker: "mother", text: "Were you good while I was gone?" }),
    },
    {
      shot: "hold",
      ms: 3600,
      line: () => ({
        speaker: "narrator",
        text: "You nod. You don't tell her about the room upstairs.",
      }),
    },
    { shot: "pan", ms: 3200 },
    {
      shot: "guest",
      ms: 4600,
      line: (c) => ({
        speaker: "guest",
        text: `Brave little ${c.name}. I'll keep your ${c.toy} warm until next time.`,
      }),
    },
    { shot: "close", ms: 2400 },
  ],
  tears: [
    { shot: "card", ms: 2800 },
    {
      shot: "enter",
      ms: 3000,
      line: (c) => ({ speaker: "mother", text: `${c.name}? Oh, sweetheart…` }),
    },
    { shot: "run", ms: 2000 },
    {
      shot: "hug",
      ms: 4000,
      line: () => ({ speaker: "mother", text: "Shh… don't cry. I'm here now. I'm here." }),
    },
    {
      shot: "hold",
      ms: 3800,
      line: () => ({
        speaker: "narrator",
        text: "You can't stop shaking. She holds on and doesn't ask.",
      }),
    },
    { shot: "pan", ms: 3200 },
    {
      shot: "guest",
      ms: 4800,
      line: (c) => ({
        speaker: "guest",
        text: `Cry all you like. I kept your ${c.toy}. I'll bring it back… one night.`,
      }),
    },
    { shot: "close", ms: 2400 },
  ],
};

/**
 * The hallway photo is laid out as a "set" twice the frame's width, so cut-outs live in photo
 * coordinates (x: % of the photo's width, y: % of its height) and move with the camera pan.
 */
type Pose = { x: number; feet: number; h: number; rot?: number; fade?: boolean; ms?: number };

const MOTHER: Partial<Record<Shot, Pose>> = {
  card: { x: 59.5, feet: 66, h: 38, fade: true },
  enter: { x: 50, feet: 90, h: 54, ms: 2800 },
  run: { x: 50, feet: 90, h: 54 },
  hug: { x: 50.5, feet: 91, h: 44, rot: -9, ms: 900 },
};
const CHILD: Record<Kind, Partial<Record<Shot, Pose>>> = {
  brave: {
    card: { x: 37, feet: 106, h: 38 },
    run: { x: 46.5, feet: 96, h: 33, ms: 2400 },
    hug: { x: 46.2, feet: 95, h: 32, ms: 700 },
  },
  tears: {
    card: { x: 37, feet: 106, h: 38 },
    run: { x: 46.5, feet: 96, h: 33, ms: 1500 },
    hug: { x: 46.4, feet: 95, h: 32, ms: 500 },
  },
};
/** Later shots keep the last pose that was set. */
function poseAt(table: Partial<Record<Shot, Pose>>, shot: Shot): Pose | undefined {
  const order: Shot[] = ["card", "enter", "run", "hug", "hold", "pan", "guest", "close", "done"];
  for (let i = order.indexOf(shot); i >= 0; i--) {
    const p = table[order[i]!];
    if (p) return p.ms !== undefined && order[i] !== shot ? { ...p, ms: 0 } : p;
  }
  return undefined;
}

/** Camera: `pan` 0..1 across the photo, then a gentle push-in. */
const CAMERA: Record<Shot, { pan: number; scale: number; origin: string; ms: number }> = {
  card: { pan: 0.6, scale: 1, origin: "50% 60%", ms: 0 },
  enter: { pan: 0.6, scale: 1.05, origin: "50% 60%", ms: 3000 },
  run: { pan: 0.58, scale: 1.1, origin: "35% 70%", ms: 2400 },
  hug: { pan: 0.58, scale: 1.18, origin: "33% 72%", ms: 3800 },
  hold: { pan: 0.56, scale: 1.14, origin: "33% 70%", ms: 3600 },
  pan: { pan: 0.12, scale: 1.04, origin: "50% 55%", ms: 3200 },
  guest: { pan: 0.12, scale: 1.2, origin: "22% 48%", ms: 4600 },
  close: { pan: 0.12, scale: 1.28, origin: "22% 48%", ms: 2400 },
  done: { pan: 0.12, scale: 1.28, origin: "22% 48%", ms: 0 },
};

function poseStyle(p: Pose | undefined, aspect: string): CSSProperties {
  if (!p) return { display: "none" };
  return {
    left: `${p.x}%`,
    top: `${p.feet - p.h}%`,
    height: `${p.h}%`,
    aspectRatio: aspect,
    opacity: p.fade ? 0 : 1,
    filter: p.fade ? "brightness(2.4) blur(1px)" : undefined,
    transitionProperty: "left, top, height, opacity, filter",
    transitionDuration: `${p.ms ?? 0}ms`,
    transitionTimingFunction: "ease-in-out",
  };
}

export function Ending() {
  const s = useGame();
  const c = s.finalCordura ?? s.cordura;
  const kind: Kind = c >= GAMEPLAY_RULES.cryingFrom ? "tears" : "brave";
  const steps = SCRIPT[kind];
  const toyId = s.favToyVisualSlot ?? s.favToyId ?? s.facts.firstToy ?? s.toyOrder[0];
  const toyImage = toyImageFor(toyId, s.favToyVisualSlot, s.favToyImage);
  const toyName = s.favToy ?? TOY_LABEL[toyId];
  const [look] = useState(() => loadProfile()?.look);
  const line = useGame((st) => st.line);

  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const said = useRef<Line | null>(null);
  const seen = useRef(false);
  const shot: Shot = steps[i]?.shot ?? "done";
  const advance = useCallback((from: number) => setI((cur) => (cur === from ? cur + 1 : cur)), []);
  const skip = useCallback(() => {
    useGame.getState().set({ line: undefined, queue: [] });
    said.current = null;
    setI(steps.length);
  }, [steps.length]);

  // The house remembers how this night ended.
  useEffect(() => {
    const m = loadMemory();
    saveMemory({
      runs: (m.runs || 0) + 1,
      lastName: s.name,
      lastToy: toyId,
      lastEnding: kind === "tears" ? "crying" : "composed",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run the shot list; a shot with a line also ends early if the subtitle is tapped away.
  useEffect(() => {
    iRef.current = i;
    const step = steps[i];
    if (!step) return;
    const l = step.line?.({ name: s.name || "sweetheart", toy: toyName });
    said.current = l ? { ...l, ms: step.ms - 200 } : null;
    seen.current = false;
    if (said.current) {
      const st = useGame.getState();
      st.set({ line: undefined, queue: [] });
      st.say(said.current);
    }
    if (step.shot === "enter") sfx("open");
    if (step.shot === "hug") sfx(kind === "brave" ? "chime" : "heartbeat");
    if (step.shot === "pan") sfx("creak");
    if (step.shot === "guest") sfx("whisper");
    if (step.shot === "close" && kind === "tears") sfx("switch");
    if (said.current) return;
    const t = window.setTimeout(() => advance(i), step.ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const mine = said.current;
    if (!mine) return;
    if (line === mine) {
      seen.current = true;
      return;
    }
    if (seen.current) {
      seen.current = false;
      said.current = null;
      advance(iRef.current);
    }
  }, [line, advance]);

  // Footsteps and, in the Tears ending, a heart that slows down in her arms.
  useEffect(() => {
    const beats: number[] = [];
    if (shot === "enter") beats.push(window.setInterval(() => sfx("step"), 520));
    if (shot === "run")
      beats.push(window.setInterval(() => sfx("step"), kind === "tears" ? 240 : 420));
    if (kind === "tears" && (shot === "run" || shot === "hug" || shot === "hold")) {
      beats.push(window.setInterval(() => sfx("heartbeat"), shot === "hold" ? 1250 : 820));
    }
    return () => beats.forEach((b) => window.clearInterval(b));
  }, [shot, kind]);

  // Escape skips to the end card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  const cam = CAMERA[shot];
  const mother = poseAt(MOTHER, shot);
  const child = poseAt(CHILD[kind], shot);
  const hugging = ["hug", "hold", "pan", "guest", "close", "done"].includes(shot);
  const guestOn = shot === "guest" || shot === "close" || shot === "done";
  const crying = kind === "tears";
  const childAnim =
    crying && (shot === "run" || shot === "hug" || shot === "hold")
      ? "cut-shiver"
      : !crying && shot === "hold"
        ? "cut-nod"
        : shot === "run"
          ? "cut-walk"
          : "";

  const again = () => {
    unlockAudio();
    sfx("chime");
    resetOnce();
    s.newRun();
    s.go("intro");
  };

  return (
    <Shell
      top={
        <>
          <p className="min-w-0 flex-1 truncate font-display text-[13px] text-paper/70">
            Ending · {crying ? "Tears" : "Brave"}
          </p>
          {shot !== "done" && (
            <button
              type="button"
              className="chip shrink-0 px-3 py-1.5 font-display text-sm"
              onClick={skip}
            >
              Skip ›
            </button>
          )}
        </>
      }
      bottom={<DialogueBar />}
    >
      <div className="absolute inset-0 bg-void" />

      {shot !== "card" && (
        <div
          className={`absolute inset-0 animate-in fade-in duration-700 ${crying && shot === "close" ? "cine-shake" : ""}`}
        >
          {/* camera push */}
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${cam.scale})`,
              transformOrigin: cam.origin,
              transition: `transform ${cam.ms}ms ease-in-out`,
            }}
          >
            {/* camera pan: the set is twice as wide as the frame */}
            <div
              className="absolute inset-y-0 left-0 w-[200%]"
              style={{
                transform: `translateX(-${cam.pan * 50}%)`,
                transition: `transform ${cam.ms}ms ease-in-out`,
              }}
            >
              <img src={BG.bgHallway} alt="The hallway, the front door open" className="scene-bg" />
              {/* warm light from the open front door, and around the two of them */}
              <div
                className="pointer-events-none absolute left-[46%] top-[4%] h-[72%] w-[28%]"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 62%, oklch(0.92 0.11 80 / .5), transparent 68%)",
                  mixBlendMode: "screen",
                }}
              />
              <div
                className="pointer-events-none absolute left-[36%] top-[40%] h-[60%] w-[24%] transition-opacity duration-1000"
                style={{
                  background: `radial-gradient(ellipse at 50% 60%, oklch(0.9 0.12 75 / ${crying ? 0.25 : 0.42}), transparent 70%)`,
                  mixBlendMode: "screen",
                  opacity: hugging ? 1 : 0,
                }}
              />

              {/* the dark room next door: your toy, the Guest, its eyes */}
              <div className="absolute left-[7%] top-[7%] h-[76%] w-[14%] overflow-hidden">
                <img
                  src={CUT.guest}
                  alt=""
                  className="guest-cut absolute bottom-[-6%] left-1/2 h-[92%] max-w-none -translate-x-1/2 transition-[opacity,scale] duration-[2400ms]"
                  style={{
                    opacity: guestOn ? (crying ? 0.62 : 0.4) : 0,
                    scale: guestOn && crying ? "1.14" : "1",
                    transformOrigin: "50% 100%",
                    filter: "brightness(.5) contrast(1.2)",
                  }}
                />
              </div>
              <img
                src={toyImage}
                alt=""
                className="absolute left-[14%] top-[71%] w-[4.5%] -translate-x-1/2 rotate-[8deg]"
                style={{
                  filter: "brightness(.5) saturate(.6) drop-shadow(2px 3px 0 oklch(0 0 0 / .55))",
                }}
              />
              <img
                src={CUT.eyes}
                alt=""
                className="absolute left-[14%] top-[27%] w-[7%] -translate-x-1/2 transition-opacity duration-700"
                style={{
                  mixBlendMode: "screen",
                  filter: `grayscale(1) contrast(1.6) ${crying ? "sepia(1) saturate(4) hue-rotate(-30deg)" : ""}`,
                  opacity: shot === "guest" ? 1 : shot === "close" ? 0.35 : 0,
                }}
              />

              {/* Mommy, home */}
              <div className="absolute -translate-x-1/2" style={poseStyle(mother, "60 / 170")}>
                <div
                  className={`h-full w-full origin-bottom ${shot === "enter" ? "cut-walk" : ""}`}
                  style={{ rotate: `${mother?.rot ?? 0}deg`, transition: "rotate .8s ease-in-out" }}
                >
                  <MotherCutout color={`var(--c-${s.motherColor})`} className="h-full w-full" />
                </div>
              </div>

              {/* you */}
              <div
                className="absolute -translate-x-1/2"
                style={poseStyle(child, look ? "60 / 140" : "44 / 100")}
              >
                <div className={`relative h-full w-full origin-bottom ${childAnim}`}>
                  {look ? (
                    <ChildDoll
                      look={look}
                      view="back"
                      clothes={`var(--c-${s.favColor})`}
                      className="relative h-full"
                    />
                  ) : (
                    <ChildCutout color={`var(--c-${s.favColor})`} className="relative h-full" />
                  )}
                  {crying && (shot === "run" || shot === "hug" || shot === "hold") && (
                    <>
                      {[
                        [18, 14, 0],
                        [78, 16, 0.45],
                        [30, 18, 0.8],
                      ].map(([x, y, d]) => (
                        <svg
                          key={`${x}`}
                          viewBox="0 0 20 30"
                          className="paper-tear"
                          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
                          aria-hidden
                        >
                          <path
                            d="M10 1 C14 10 18 15 18 20 A8 8 0 0 1 2 20 C2 15 6 10 10 1 Z"
                            fill="oklch(0.78 0.08 230)"
                            stroke="oklch(0.95 0.02 85)"
                            strokeWidth="1.6"
                          />
                        </svg>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* the Guest's ending: darker for Tears, the hall light catches once */}
              {crying && shot === "close" && (
                <div
                  className="pointer-events-none absolute inset-0 bg-void"
                  style={{ animation: "flicker 1.2s steps(1) forwards" }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* title card */}
      {shot === "card" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="animate-float-up">
            <p className="font-crayon text-xl text-paper/70">saturday · 9:58 pm</p>
            <div className="mt-3 text-[8cqw]">
              <Ransom text="she came back" seed={9} />
            </div>
          </div>
        </div>
      )}

      {/* last word */}
      {shot === "close" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-[13cqw] animate-float-up">
            <Ransom text={crying ? "tears." : "brave."} seed={crying ? 31 : 23} />
          </div>
        </div>
      )}

      {/* film grain + vignette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70" aria-hidden>
        <div className="fx-grain" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ boxShadow: `inset 0 0 90px 30px oklch(0.05 0.02 ${crying ? 20 : 60} / .75)` }}
      />

      {/* end card */}
      {shot === "done" && (
        <>
          <div className="absolute inset-0 bg-void/55 animate-in fade-in duration-700" />
          <div className="absolute inset-x-[6%] bottom-[5%] paper animate-float-up p-5">
            <p className="font-hand text-xs uppercase tracking-widest opacity-60">
              {crying ? "Ending — Tears" : "Ending — Brave"}
            </p>
            <p className="mt-2 font-display text-[clamp(15px,4.4cqw,17px)] leading-snug">
              {crying
                ? `Mommy finds ${s.name || "you"} in the hall, crying too hard to speak. She holds on and doesn't ask. She doesn't need to. She can see it in your eyes.`
                : `Mommy finds ${s.name || "you"} in the hall, pale but standing. "Were you good?" You nod. You don't tell her about the room upstairs.`}
            </p>
            <p className="mt-3 text-sm opacity-70">
              Behind you, in the room with no light, something sets out {s.favFood ?? "dinner"}{" "}
              beside {s.favToy ?? `the ${TOY_LABEL[toyId]}`}.
            </p>
            <p className="mt-3 text-xs opacity-60">Cordura at bedtime: {c}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="stitch-btn"
                onClick={() => {
                  s.newRun();
                  s.go("title");
                }}
              >
                Menu
              </button>
              <button type="button" className="stitch-btn sage" onClick={again}>
                Play again
              </button>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
