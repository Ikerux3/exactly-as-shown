import { useEffect, useState, type ReactNode } from "react";
import { BG, TOY_IMG } from "../assets";
import {
  CHAPTER_TITLE, COLOR_LABEL, MOTHER_LABEL, forgetMemory, loadMemory, loadSave, sanitizeName, saveMemory, useGame,
  type ColorKey, type Screen,
} from "../store";
import { sfx, startMusic, stopMusic, unlockAudio } from "../audio";
import { GuestVoid } from "../Props";
import { Ransom } from "../fx";
import { resetOnce } from "../kit";
import { DialogueBar, Shell } from "../Shell";

const CHAPTER_OF: Partial<Record<Screen, number>> = { ch1: 1, ch2k: 2, ch2d: 2, ch3: 3, ch4: 4, ch5: 5 };

/* ---------------- TITLE / START MENU ---------------- */

type Panel = "menu" | "how" | "settings";

export function Title() {
  const muted = useGame((s) => s.muted);
  const [mem, setMem] = useState<{ runs: number }>({ runs: 0 });
  const [saved, setSaved] = useState<Screen | null>(null);
  const [panel, setPanel] = useState<Panel>("menu");
  const [confirmNew, setConfirmNew] = useState(false);
  useEffect(() => {
    setMem(loadMemory());
    setSaved(loadSave()?.screen ?? null);
  }, []);

  const newGame = () => {
    if (saved && !confirmNew) { setConfirmNew(true); sfx("tap"); return; }
    unlockAudio(); sfx("chime"); resetOnce();
    const s = useGame.getState();
    s.newRun(); s.go("intro");
  };
  const resume = () => {
    unlockAudio(); sfx("chime"); resetOnce();
    if (useGame.getState().continueRun() && useGame.getState().screen !== "ch4") startMusic();
  };
  const open = (p: Panel) => { unlockAudio(); sfx("tap"); setPanel(p); setConfirmNew(false); };
  const savedChapter = saved ? CHAPTER_OF[saved] : undefined;

  return (
    <Shell bars={false}>
      <img src={BG.bgTitle} alt="A small handmade house at dusk" className="scene-bg" style={{ objectPosition: "50% 50%" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.12 0.04 275 / .2), transparent 40%, oklch(0.06 0.02 275 / .55) 70%, oklch(0.06 0.02 275 / .92) 100%)" }} />
      <div className="absolute inset-x-0 top-[7%] px-6 text-center">
        <h1 className="space-y-2 text-[10cqw]" aria-label="Mommy will be back">
          <Ransom text="MOMMY" seed={3} className="block" />
          <Ransom text="will be" seed={8} className="block text-[0.6em]" />
          <span className="relative block">
            <Ransom text="BACK" seed={21} />
          </span>
        </h1>
        {panel === "menu" && (
          <p className="mx-auto mt-6 max-w-[16rem] font-hand text-base text-paper/85 drop-shadow">
            {mem.runs > 0 ? "The house remembers you." : "Be good while she's gone. It won't take long."}
          </p>
        )}
      </div>

      {panel === "menu" && (
        <nav className="absolute inset-x-0 bottom-[6%] flex flex-col items-center gap-3 px-[12%] animate-float-up" aria-label="Main menu">
          {saved ? (
            <>
              <button type="button" className="stitch-btn honey w-full text-lg leading-tight" onClick={resume}>
                Continue
                {savedChapter && (
                  <span className="block font-hand text-sm opacity-75">Chapter {savedChapter} · {CHAPTER_TITLE[savedChapter]}</span>
                )}
              </button>
              <button type="button" className={`stitch-btn w-full ${confirmNew ? "" : "ghost"}`} onClick={newGame}>
                {confirmNew ? "Start over? Tap again" : "New game"}
              </button>
            </>
          ) : (
            <button type="button" className="stitch-btn honey w-full text-lg" onClick={newGame}>
              Open the little house
            </button>
          )}
          <div className="grid w-full grid-cols-2 gap-3">
            <button type="button" className="stitch-btn ghost px-2 text-sm" onClick={() => open("how")}>How to play</button>
            <button type="button" className="stitch-btn ghost px-2 text-sm" onClick={() => open("settings")}>Settings</button>
          </div>
          <p className="mt-1 text-center font-hand text-xs text-paper/60">Psychological horror · best with sound · subtitles always on</p>
        </nav>
      )}

      {panel === "how" && (
        <MenuPanel title="How to play" onBack={() => open("menu")}>
          <ul className="space-y-2 text-left font-hand text-[clamp(13px,3.8cqw,15px)] leading-snug">
            <li><b className="font-display">Tap</b> things in the house to look at them, open them and pick them up.</li>
            <li><b className="font-display">The light switch</b> sits at the bottom of the screen. In the dark you hold a small light — drag your finger to look around. Some things only show in the dark.</li>
            <li><b className="font-display">Cordura</b> rises in the dark and when something frightens you. Light brings it back down. If it fills up, you'll have to try that part again.</li>
            <li><b className="font-display">Subtitles</b> are always on. Tap them to skip ahead. Mommy's list shows what to do next.</li>
          </ul>
        </MenuPanel>
      )}

      {panel === "settings" && (
        <MenuPanel title="Settings" onBack={() => open("menu")}>
          <div className="space-y-3">
            <button type="button" className="stitch-btn sage w-full" aria-pressed={!muted}
              onClick={() => { unlockAudio(); useGame.getState().setMute(!muted); if (muted) sfx("chime"); }}>
              {muted ? "Sound: off" : "Sound: on"}
            </button>
            <button type="button" className="stitch-btn w-full" disabled={mem.runs === 0}
              onClick={() => { forgetMemory(); setMem({ runs: 0 }); sfx("whisper"); }}>
              {mem.runs === 0 ? "The house doesn't know you" : "Make the house forget you"}
            </button>
            <p className="text-xs leading-snug opacity-70">
              The house remembers your past visits on this device, and the game keeps your place at the start of each chapter.
            </p>
          </div>
        </MenuPanel>
      )}
    </Shell>
  );
}

function MenuPanel({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-x-[6%] bottom-[5%] flex max-h-[66%] flex-col" role="dialog" aria-label={title}>
      <div className="paper flex min-h-0 flex-1 flex-col p-5 animate-float-up">
        <p className="title-word text-center text-2xl">{title}</p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        <button type="button" className="stitch-btn honey mt-4 w-full" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

/* ---------------- INTRO ---------------- */

const COLORS: ColorKey[] = ["rose", "sage", "honey", "turq"];

export function Intro() {
  const s = useGame();
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState(0);
  const name = sanitizeName(raw);
  const confirmName = () => { if (name) { sfx("tap"); setStep(1); } };
  return (
    <Shell bars={false}>
      <img src={BG.bgPlayroom} alt="" className="scene-bg" style={{ objectPosition: "15% 50%" }} />
      <div className="absolute inset-0 bg-void/30" />
      {/* Mother: a faceless black cardboard cut-out, pinned to the scene (kept clear of the dialogue card) */}
      <svg viewBox="0 0 60 170" className="absolute bottom-[4%] right-[7%] h-[38%]" style={{ filter: "drop-shadow(5px 6px 0 oklch(0 0 0 / .5))" }} aria-hidden>
        <path d="M30 6 C40 6 44 15 43 24 C42 33 37 38 30 38 C23 38 18 33 17 24 C16 15 20 6 30 6 Z M14 46 Q30 38 46 46 L50 70 L56 160 L34 162 L32 120 L28 120 L26 162 L4 160 L10 70 Z" fill="oklch(0.08 0.01 270)" />
        <path d="M48 96 l10 2 l-1 20 l-12 -1 Z" fill="oklch(0.08 0.01 270)" />
        <path d="M22 52 L38 52" stroke={`var(--c-${s.motherColor})`} strokeWidth="3" strokeDasharray="3 3" />
        <rect x="24" y="2" width="12" height="5" fill="oklch(0.88 0.08 90 / .7)" transform="rotate(-8 30 4)" />
      </svg>
      <div className="absolute inset-x-[6%] top-[5%] paper animate-float-up p-5">
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); confirmName(); }}>
            <p className="font-display text-[clamp(15px,4.6cqw,19px)] leading-snug">"I'm popping out for groceries, sweetheart. What do I call you while I'm gone?"</p>
            <label className="mt-4 block text-xs uppercase tracking-widest opacity-60" htmlFor="nm">Your name</label>
            <input
              id="nm" value={raw} maxLength={14} onChange={(e) => setRaw(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-dashed border-wood-light bg-paper-deep/60 px-3 py-2 font-hand text-xl text-ink outline-none focus:border-honey"
              placeholder="e.g. Lucía" autoComplete="off" autoCapitalize="words" enterKeyHint="done"
            />
            <button type="submit" className="stitch-btn sage mt-4 w-full" disabled={!name}>That's me</button>
          </form>
        )}
        {step === 1 && (
          <>
            <p className="font-display text-[clamp(15px,4.6cqw,19px)] leading-snug">"And your favourite colour, {name}? I'll get you a new cup."</p>
            <div className="mt-4 grid grid-cols-4 gap-3" role="radiogroup" aria-label="Favourite colour">
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={s.favColor === c} onClick={() => { sfx("tap"); s.set({ favColor: c }); }} aria-label={COLOR_LABEL[c]}
                  className={`aspect-square rounded-full shadow-md transition ${s.favColor === c ? "scale-105 ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  style={{ background: `var(--c-${c})`, outline: "2px dashed oklch(1 0 0 / .6)", outlineOffset: -5 }} />
              ))}
            </div>
            <p className="mt-3 text-sm opacity-70">
              <span className="font-display">{COLOR_LABEL[s.favColor]}</span> it is. She buttons her {MOTHER_LABEL[s.motherColor]} coat.
            </p>
            <button type="button" className="stitch-btn mt-4 w-full" onClick={() => {
              s.set({ name });
              startMusic();
              s.go("ch1");
              s.say([
                { speaker: "mother", text: `Tidy your toys, set the table, and be in your pyjamas when I'm back, ${name}.` },
                { speaker: "mother", text: "Lights on if you get scared. I'll be back before you know it." },
                { speaker: "narrator", text: "The front door closes. Her footsteps fade down the path." },
              ]);
            }}>Bye, Mommy</button>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- FINAL ---------------- */

export function Final() {
  const s = useGame();
  const [phase, setPhase] = useState<"blackout" | "door">("blackout");
  const [canRun, setCanRun] = useState(false);
  useEffect(() => {
    stopMusic();
    s.set({ interactive: false, lightsOn: false, objective: "" });
    sfx("whisper");
    const t1 = window.setTimeout(() => sfx("whisper"), 2600);
    const t2 = window.setTimeout(() => {
      setPhase("door");
      sfx("open");
      useGame.getState().say([
        { speaker: "narrator", text: "A key turns in the front door. Warm light spills across the floor." },
        { speaker: "mother", text: `${s.name || "Sweetheart"}? I'm home! I'm so sorry I took so long.`, onShow: () => setCanRun(true) },
      ]);
    }, 5000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Shell bottom={<DialogueBar />}>
      {phase === "blackout" ? (
        <div className="absolute inset-0 grid place-items-center bg-void">
          <p className="subtitle guest px-4 py-3 text-lg animate-float-up [animation-delay:1.2s]">{s.name || "little one"}…</p>
        </div>
      ) : (
        <>
          <img src={BG.bgHallway} alt="The front door opening" className="scene-bg animate-in fade-in duration-1000" style={{ objectPosition: "60% 50%" }} />
          <GuestVoid style={{ left: "2%", top: "8%", height: "70%", opacity: 0.6 }} intensity={0.6} />
          {canRun && (
            <div className="absolute inset-x-0 bottom-[6%] flex justify-center animate-float-up">
              <button type="button" className="stitch-btn honey text-lg" onClick={() => { s.set({ line: undefined, queue: [] }); s.go("ending"); }}>Run to Mommy</button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

/* ---------------- ENDING ---------------- */

export function Ending() {
  const s = useGame();
  const c = s.finalCordura ?? s.cordura;
  const crying = c >= 65;
  const toy = s.facts.firstToy ?? s.toyOrder[0];
  useEffect(() => {
    const m = loadMemory();
    saveMemory({ runs: (m.runs || 0) + 1, lastName: s.name, lastToy: toy, lastEnding: crying ? "crying" : "composed" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const again = () => { unlockAudio(); sfx("chime"); resetOnce(); s.newRun(); s.go("intro"); };
  return (
    <Shell bars={false}>
      <img src={BG.bgHallway} alt="" className="scene-bg" style={{ objectPosition: "55% 50%", filter: "saturate(1.1)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 45%, oklch(0.85 0.12 75 / .35), transparent 60%)" }} />
      <GuestVoid style={{ left: "1%", top: "6%", height: "74%" }} intensity={0.5} />
      {/* your toy stays behind, in the room with no light */}
      <img src={TOY_IMG[toy]} alt="" className="absolute left-[12%] top-[34%] w-[15%] drop-shadow-xl" style={{ filter: "brightness(.55) saturate(.6)" }} />
      <div className="absolute inset-x-[6%] bottom-[5%] paper animate-float-up p-5">
        <p className="font-hand text-xs uppercase tracking-widest opacity-60">{crying ? "Ending — Tears" : "Ending — Brave"}</p>
        <p className="mt-2 font-display text-[clamp(15px,4.4cqw,17px)] leading-snug">
          {crying
            ? `Mommy finds ${s.name || "you"} in the hall, crying too hard to speak. She holds on and doesn't ask. She doesn't need to. She can see it in your eyes.`
            : `Mommy finds ${s.name || "you"} in the hall, pale but standing. "Were you good?" You nod. You don't tell her about the room upstairs.`}
        </p>
        <p className="mt-3 text-sm opacity-70">Behind you, in the room with no light, something sets a fourth place at the table.</p>
        <p className="mt-3 text-xs opacity-60">Cordura at bedtime: {c}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" className="stitch-btn" onClick={() => { s.newRun(); s.go("title"); }}>Menu</button>
          <button type="button" className="stitch-btn sage" onClick={again}>Play again</button>
        </div>
      </div>
    </Shell>
  );
}
