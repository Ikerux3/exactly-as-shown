// Prologue cinematic: Mommy says goodbye in the hallway, walks out of the front door and down
// the garden path, while something watches from the upstairs window. Same collage vocabulary as
// the rest of the game: photomontage rooms, black cardboard cut-outs, ransom-note captions.
// Lines go through the store, so they get subtitles + voices like any other dialogue.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BG, CUT, toyImageFor } from "../assets";
import { useGame, type Line } from "../store";
import { sfx, startMusic } from "../audio";
import { ChildCutout, ChildDoll, MotherCutout } from "../Props";
import { loadProfile } from "../profile";
import { Ransom } from "../fx";
import { DialogueBar, Shell } from "../Shell";

type Shot =
  | "card"
  | "hall"
  | "kiss"
  | "talk"
  | "walk"
  | "wave"
  | "out"
  | "slam"
  | "outside"
  | "path"
  | "watch"
  | "end";
type Ctx = { name: string; guestLine: string | undefined };

/** Each shot lasts `ms`; a shot with a line also ends early if the player taps the subtitle away. */
const STEPS: Array<{ shot: Shot; ms: number; line?: (c: Ctx) => Line | null }> = [
  { shot: "card", ms: 3000 },
  { shot: "hall", ms: 900 },
  {
    shot: "kiss",
    ms: 4000,
    line: (c) => ({
      speaker: "mother",
      text: `Be good for me, ${c.name}. I'm only popping out to the shop.`,
    }),
  },
  {
    shot: "talk",
    ms: 4800,
    line: () => ({
      speaker: "mother",
      text: "Tidy your toys, set the table, and be in your pyjamas when I'm back.",
    }),
  },
  {
    shot: "walk",
    ms: 2800,
    line: () => ({ speaker: "mother", text: "Lights on if you get scared." }),
  },
  {
    shot: "wave",
    ms: 3000,
    line: () => ({ speaker: "mother", text: "I'll be back before you know it." }),
  },
  { shot: "out", ms: 1100 },
  { shot: "slam", ms: 2000 },
  { shot: "outside", ms: 800 },
  {
    shot: "path",
    ms: 4400,
    line: () => ({ speaker: "narrator", text: "Her footsteps fade down the path." }),
  },
  {
    shot: "watch",
    ms: 4400,
    line: (c) =>
      c.guestLine
        ? { speaker: "guest", text: c.guestLine }
        : { speaker: "narrator", text: "The house is very quiet now." },
  },
  { shot: "end", ms: 1100 },
];

/** Cut-out placement in % of the 2:3 frame: centre x, y of the feet, height. */
type Pose = {
  x: number;
  feet: number;
  h: number;
  rot?: number;
  fade?: boolean;
  ms?: number;
  ease?: string;
};

const MOTHER_HALL: Partial<Record<Shot, Pose>> = {
  card: { x: 50, feet: 95, h: 60 },
  hall: { x: 50, feet: 95, h: 60 },
  kiss: { x: 45, feet: 95, h: 60, rot: -11, ms: 900 },
  talk: { x: 50, feet: 95, h: 60, ms: 900 },
  walk: { x: 38, feet: 67, h: 45, ms: 2700, ease: "cubic-bezier(.3,.1,.5,1)" },
  wave: { x: 38, feet: 67, h: 45 },
  out: { x: 38.5, feet: 63, h: 38, fade: true, ms: 1000 },
};
const MOTHER_OUT: Partial<Record<Shot, Pose>> = {
  outside: { x: 46, feet: 83, h: 10 },
  path: { x: 47, feet: 124, h: 36, ms: 4300, ease: "cubic-bezier(.55,0,.9,.6)" },
  watch: { x: 47, feet: 124, h: 36 },
};

/** Slow "camera" moves over the photo: scale + the point it pushes towards. */
const CAMERA: Record<Shot, { scale: number; origin: string; ms: number }> = {
  card: { scale: 1.02, origin: "35% 55%", ms: 0 },
  hall: { scale: 1.04, origin: "35% 55%", ms: 900 },
  kiss: { scale: 1.1, origin: "32% 74%", ms: 4000 },
  talk: { scale: 1.07, origin: "40% 62%", ms: 4800 },
  walk: { scale: 1.16, origin: "38% 45%", ms: 2800 },
  wave: { scale: 1.2, origin: "38% 42%", ms: 3000 },
  out: { scale: 1.24, origin: "38% 40%", ms: 1100 },
  slam: { scale: 1.26, origin: "38% 40%", ms: 2000 },
  outside: { scale: 1.38, origin: "46% 77%", ms: 0 },
  path: { scale: 1.12, origin: "46% 74%", ms: 4400 },
  watch: { scale: 1.65, origin: "59% 52%", ms: 4400 },
  end: { scale: 1.75, origin: "59% 52%", ms: 1100 },
};

const HALL_SHOTS: Shot[] = ["card", "hall", "kiss", "talk", "walk", "wave", "out", "slam"];

function poseStyle(p: Pose | undefined): CSSProperties {
  if (!p) return { display: "none" };
  const ms = p.ms ?? 0;
  return {
    left: `${p.x}%`,
    top: `${p.feet - p.h}%`,
    height: `${p.h}%`,
    opacity: p.fade ? 0 : 1,
    filter: p.fade ? "brightness(2.4) blur(1px)" : undefined,
    transitionProperty: "left, top, height, opacity, filter",
    transitionDuration: `${ms}ms`,
    transitionTimingFunction: p.ease ?? "ease-in-out",
  };
}

/** The front door, closed: a cut-out of the same panelled door that's painted open in the hallway photo. */
export function ClosedDoor() {
  const frame = "oklch(0.2 0.03 50)";
  return (
    <svg
      viewBox="0 0 100 170"
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
      style={{ filter: "sepia(.35) drop-shadow(-4px 0 6px oklch(0 0 0 / .6))" }}
    >
      <rect width="100" height="170" fill="oklch(0.33 0.045 55)" />
      <rect x="2" y="2" width="96" height="166" fill="none" stroke={frame} strokeWidth="3" />
      <rect
        x="22"
        y="12"
        width="56"
        height="34"
        fill="oklch(0.2 0.02 60)"
        stroke="oklch(0.42 0.05 60)"
        strokeWidth="3"
      />
      <path d="M50 12 V46 M22 29 H78" stroke="oklch(0.42 0.05 60)" strokeWidth="3" />
      {[
        [16, 56],
        [54, 56],
        [16, 112],
        [54, 112],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="30"
          height="46"
          fill="oklch(0.3 0.04 55)"
          stroke={frame}
          strokeWidth="2.5"
        />
      ))}
      <rect x="38" y="104" width="24" height="5" rx="1" fill="var(--brass)" opacity=".75" />
      <circle cx="11" cy="98" r="3.5" fill="var(--brass)" />
    </svg>
  );
}

export function Prologue() {
  const name = useGame((s) => s.name) || "sweetheart";
  const motherColor = useGame((s) => s.motherColor);
  const favColor = useGame((s) => s.favColor);
  const toyId = useGame((s) => s.favToyVisualSlot ?? s.favToyId ?? s.toyOrder[0]);
  const toyImage = useGame((s) => toyImageFor(toyId, s.favToyVisualSlot, s.favToyImage));
  const guestLine = useGame((s) => s.introGuestLine);
  const line = useGame((s) => s.line);
  // The character made in the menu, if any; otherwise the plain cardboard child.
  const [look] = useState(() => loadProfile()?.look);
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const said = useRef<Line | null>(null);
  const seen = useRef(false);
  const finished = useRef(false);
  const shot = STEPS[i]?.shot ?? "end";

  const advance = useCallback((from: number) => setI((cur) => (cur === from ? cur + 1 : cur)), []);

  const finish = useCallback((skipped: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const st = useGame.getState();
    st.set({ line: undefined, queue: [] });
    startMusic();
    st.go("ch1");
    // Skipping still leaves the player with the essentials.
    if (skipped) {
      st.say([
        {
          speaker: "mother",
          text: `Tidy your toys, set the table, and be in your pyjamas when I'm back, ${st.name || "sweetheart"}.`,
        },
        ...(st.introGuestLine ? [{ speaker: "guest" as const, text: st.introGuestLine }] : []),
      ]);
    }
  }, []);

  // Run the shot list.
  useEffect(() => {
    iRef.current = i;
    const step = STEPS[i];
    if (!step) {
      finish(false);
      return;
    }
    const l = step.line?.({ name, guestLine });
    said.current = l ? { ...l, ms: step.ms - 200 } : null;
    seen.current = false;
    if (said.current) {
      const st = useGame.getState();
      st.set({ line: undefined, queue: [] });
      st.say(said.current);
    }
    if (step.shot === "slam") sfx("door");
    if (step.shot === "watch") startMusic();
    if (said.current) return;
    const t = window.setTimeout(() => advance(i), step.ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Tapping a subtitle away moves the film on to the next shot.
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

  // Footsteps while she walks.
  useEffect(() => {
    if (shot !== "walk" && shot !== "path") return;
    const every = shot === "walk" ? 430 : 520;
    const id = window.setInterval(() => sfx("step"), every);
    return () => window.clearInterval(id);
  }, [shot]);

  // Escape skips, like any cutscene.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const inHall = HALL_SHOTS.includes(shot);
  const cam = CAMERA[shot];
  const doorShut = shot === "slam";
  const camStyle: CSSProperties = {
    transform: `scale(${cam.scale})`,
    transformOrigin: cam.origin,
    transition: `transform ${cam.ms}ms ease-in-out`,
  };

  return (
    <Shell
      top={
        <>
          <p className="min-w-0 flex-1 truncate font-display text-[13px] text-paper/70">Prologue</p>
          <button
            type="button"
            className="chip shrink-0 px-3 py-1.5 font-display text-sm"
            onClick={() => finish(true)}
          >
            Skip ›
          </button>
        </>
      }
      bottom={<DialogueBar />}
    >
      <div className="absolute inset-0 bg-void" />

      {/* ---- the hallway ---- */}
      {inHall && shot !== "card" && (
        <div
          key="hall"
          className={`absolute inset-0 animate-in fade-in duration-700 ${doorShut ? "cine-shake" : ""}`}
        >
          <div className="absolute inset-0" style={camStyle}>
            <img
              src={BG.bgHallway}
              alt="The hallway by the front door"
              className="scene-bg"
              style={{ objectPosition: "70% 50%" }}
            />
            {/* warm evening light pouring in through the open door */}
            <div
              className="pointer-events-none absolute left-[22%] top-[4%] h-[72%] w-[32%] transition-opacity duration-300"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 62%, oklch(0.92 0.11 80 / .5), transparent 68%)",
                mixBlendMode: "screen",
                opacity: doorShut ? 0 : 1,
              }}
            />
            {/* the front door swings shut on its hinge (right side of the frame) */}
            <div
              className="absolute left-[30.8%] top-[10.6%] h-[55.8%] w-[36.2%] origin-right transition-transform duration-200 ease-in"
              style={{ transform: doorShut ? "scaleX(1)" : "scaleX(0)" }}
            >
              <ClosedDoor />
            </div>
            <div
              className="absolute -translate-x-1/2"
              style={{ ...poseStyle(MOTHER_HALL[shot]), aspectRatio: "60 / 170" }}
            >
              <div
                className={`h-full w-full origin-bottom ${shot === "walk" ? "cut-walk" : ""} ${shot === "wave" ? "cut-wave" : ""}`}
                style={{
                  rotate: `${MOTHER_HALL[shot]?.rot ?? 0}deg`,
                  transition: "rotate .8s ease-in-out",
                }}
              >
                <MotherCutout color={`var(--c-${motherColor})`} className="h-full w-full" />
              </div>
            </div>
            <div className="absolute left-[20%] top-[67%] h-[38%] -translate-x-1/2">
              <div
                className={`h-full origin-bottom ${shot === "wave" ? "cut-wave" : ""}`}
                style={{
                  rotate: shot === "kiss" ? "5deg" : "0deg",
                  transition: "rotate .8s ease-in-out",
                }}
              >
                {look ? (
                  <ChildDoll
                    look={look}
                    view="back"
                    clothes={`var(--c-${favColor})`}
                    toy={toyImage}
                    className="relative h-full"
                  />
                ) : (
                  <ChildCutout
                    color={`var(--c-${favColor})`}
                    toy={toyImage}
                    className="relative h-full"
                  />
                )}
              </div>
            </div>
            {/* once she's gone the hallway goes cold */}
            <div
              className="pointer-events-none absolute inset-0 bg-void transition-opacity duration-500"
              style={{ opacity: doorShut ? 0.55 : 0 }}
            />
          </div>
          {doorShut && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-[12cqw] animate-float-up">
                <Ransom text="click." seed={17} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- outside: down the garden path; someone is at the upstairs window ---- */}
      {!inHall && shot !== "end" && (
        <div key="out" className="absolute inset-0 animate-in fade-in duration-500">
          <div className="absolute inset-0" style={camStyle}>
            <img
              src={BG.bgTitle}
              alt="The little house at night"
              className="scene-bg"
              style={{ objectPosition: "50% 50%" }}
            />
            {/* the Guest, behind the glass */}
            <div className="absolute left-[52.5%] top-[46.3%] h-[12.9%] w-[12.5%] overflow-hidden">
              {/* head and shoulders only, as if standing right behind the glass */}
              <img
                src={CUT.guest}
                alt=""
                className="absolute bottom-[-105%] left-1/2 h-[190%] max-w-none -translate-x-1/2 transition-opacity duration-[2500ms]"
                style={{
                  opacity: shot === "watch" ? 0.7 : 0,
                  filter: "brightness(.6) contrast(1.25)",
                }}
              />
            </div>
            <div
              className="absolute -translate-x-1/2"
              style={{ ...poseStyle(MOTHER_OUT[shot]), aspectRatio: "60 / 170" }}
            >
              <div className={`h-full w-full origin-bottom ${shot === "path" ? "cut-walk" : ""}`}>
                <MotherCutout color={`var(--c-${motherColor})`} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- title card ---- */}
      {shot === "card" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="animate-float-up">
            <p className="font-crayon text-xl text-paper/70">saturday · 8:47 pm</p>
            <div className="mt-3 text-[8cqw]">
              <Ransom text="just popping out" seed={5} />
            </div>
          </div>
        </div>
      )}

      {/* film grain + vignette, like an old home movie */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70" aria-hidden>
        <div className="fx-grain" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ boxShadow: "inset 0 0 90px 30px oklch(0.05 0.02 30 / .75)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-void transition-opacity duration-1000"
        style={{ opacity: shot === "end" ? 1 : 0 }}
      />
    </Shell>
  );
}
