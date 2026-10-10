import { useEffect, useState } from "react";
import { BG, TOY_IMG } from "../assets";
import { COLOR_LABEL, MOTHER_LABEL, loadMemory, sanitizeName, saveMemory, useGame, type ColorKey } from "../store";
import { sfx, startMusic, stopMusic, unlockAudio } from "../audio";
import { GuestVoid } from "../Props";
import { Ransom } from "../fx";
import { resetOnce } from "../kit";

export function Title() {
  const s = useGame();
  const [mem, setMem] = useState<{ runs: number }>({ runs: 0 });
  useEffect(() => setMem(loadMemory()), []);
  return (
    <div className="game-frame">
      <img src={BG.bgTitle} alt="A small handmade house at dusk" className="scene-bg" style={{ objectPosition: "50% 50%" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.12 0.04 275 / .2), transparent 40%, oklch(0.06 0.02 275 / .85) 100%)" }} />
      <div className="absolute inset-x-0 top-[8%] px-6 text-center">
        <h1 className="space-y-2 text-[10vw] sm:text-5xl" aria-label="Mommy will be back">
          <Ransom text="MOMMY" seed={3} className="block" />
          <Ransom text="will be" seed={8} className="block text-[0.6em]" />
          <span className="relative block">
            <Ransom text="BACK" seed={21} />
            <span className="absolute left-[58%] top-[90%] block h-[0.9em] w-[3px] origin-top bg-crimson" style={{ animation: "drip 6s ease-out both" }} />
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-[16rem] font-hand text-base text-paper/80">
          {mem.runs > 0 ? "The house remembers you." : "Be good while she's gone. It won't take long."}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-3">
        <button
          className="stitch-btn honey text-lg"
          onClick={() => { unlockAudio(); sfx("chime"); resetOnce(); s.newRun(); s.go("intro"); }}
        >
          Open the little house
        </button>
        <p className="font-hand text-xs text-paper/60">Psychological horror · best with sound · subtitles always on</p>
      </div>
    </div>
  );
}

const COLORS: ColorKey[] = ["rose", "sage", "honey", "turq"];

export function Intro() {
  const s = useGame();
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState(0);
  const name = sanitizeName(raw);
  return (
    <div className="game-frame">
      <img src={BG.bgPlayroom} alt="" className="scene-bg" style={{ objectPosition: "15% 50%" }} />
      <div className="absolute inset-0 bg-void/30" />
      {/* Mother: a faceless black cardboard cut-out, pinned to the scene */}
      <svg viewBox="0 0 60 170" className="absolute bottom-[8%] right-[6%] h-[44%]" style={{ filter: "drop-shadow(5px 6px 0 oklch(0 0 0 / .5))" }} aria-hidden>
        <path d="M30 6 C40 6 44 15 43 24 C42 33 37 38 30 38 C23 38 18 33 17 24 C16 15 20 6 30 6 Z M14 46 Q30 38 46 46 L50 70 L56 160 L34 162 L32 120 L28 120 L26 162 L4 160 L10 70 Z" fill="oklch(0.08 0.01 270)" />
        <path d="M48 96 l10 2 l-1 20 l-12 -1 Z" fill="oklch(0.08 0.01 270)" />
        <path d="M22 52 L38 52" stroke={`var(--c-${s.motherColor})`} strokeWidth="3" strokeDasharray="3 3" />
        <rect x="24" y="2" width="12" height="5" fill="oklch(0.88 0.08 90 / .7)" transform="rotate(-8 30 4)" />
      </svg>
      <div className="absolute inset-x-[6%] top-[10%] paper animate-float-up p-5">
        {step === 0 && (
          <>
            <p className="font-display text-lg leading-snug">"I'm popping out for groceries, sweetheart. What do I call you while I'm gone?"</p>
            <label className="mt-4 block text-xs uppercase tracking-widest opacity-60" htmlFor="nm">Your name</label>
            <input
              id="nm" value={raw} maxLength={14} onChange={(e) => setRaw(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-dashed border-wood-light bg-paper-deep/60 px-3 py-2 font-hand text-xl text-ink outline-none focus:border-honey"
              placeholder="e.g. Lucía" autoComplete="off"
            />
            <button className="stitch-btn sage mt-4 w-full" disabled={!name} onClick={() => setStep(1)}>That's me</button>
          </>
        )}
        {step === 1 && (
          <>
            <p className="font-display text-lg leading-snug">"And your favourite colour, {name}? I'll get you a new cup."</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {COLORS.map((c) => (
                <button key={c} onClick={() => s.set({ favColor: c })} aria-label={COLOR_LABEL[c]}
                  className={`aspect-square rounded-full shadow-md transition ${s.favColor === c ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  style={{ background: `var(--c-${c})`, outline: "2px dashed oklch(1 0 0 / .6)", outlineOffset: -5 }} />
              ))}
            </div>
            <p className="mt-3 text-sm opacity-70">She buttons her {MOTHER_LABEL[s.motherColor]} coat.</p>
            <button className="stitch-btn mt-4 w-full" onClick={() => {
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
    </div>
  );
}

export function Final() {
  const s = useGame();
  const [phase, setPhase] = useState<"blackout" | "door">("blackout");
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
        { speaker: "mother", text: `${s.name || "Sweetheart"}? I'm home! I'm so sorry I took so long.` },
      ]);
    }, 5000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (phase === "blackout") {
    return (
      <div className="game-frame grid place-items-center bg-void">
        <p className="subtitle guest px-4 py-3 text-lg animate-float-up [animation-delay:1.2s]">{s.name || "little one"}…</p>
      </div>
    );
  }
  return (
    <div className="game-frame">
      <img src={BG.bgHallway} alt="The front door opening" className="scene-bg" style={{ objectPosition: "60% 50%" }} />
      <GuestVoid style={{ left: "2%", top: "8%", height: "70%", opacity: 0.6 }} intensity={0.6} />
      {s.line && (
        <button onClick={() => s.nextLine()} className={`subtitle absolute bottom-[18%] left-[5%] right-[5%] px-4 py-3 text-left animate-float-up`}>
          {s.line.speaker === "mother" && <span className="block text-xs uppercase tracking-widest opacity-70">Mommy</span>}
          {s.line.text}
        </button>
      )}
      <div className="absolute inset-x-0 bottom-[5%] flex justify-center">
        <button className="stitch-btn honey text-lg" onClick={() => { s.set({ line: undefined, queue: [] }); s.go("ending"); }}>Run to Mommy</button>
      </div>
    </div>
  );
}

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
  return (
    <div className="game-frame">
      <img src={BG.bgHallway} alt="" className="scene-bg" style={{ objectPosition: "55% 50%", filter: "saturate(1.1)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 45%, oklch(0.85 0.12 75 / .35), transparent 60%)" }} />
      <GuestVoid style={{ left: "1%", top: "6%", height: "74%" }} intensity={0.5} />
      <img src={TOY_IMG[toy]} alt="" className="absolute bottom-[30%] left-[52%] w-[16%] drop-shadow-xl" />
      <div className="absolute inset-x-[6%] bottom-[5%] paper animate-float-up p-5">
        <p className="font-hand text-xs uppercase tracking-widest opacity-60">{crying ? "Ending — Tears" : "Ending — Brave"}</p>
        <p className="mt-2 font-display text-[17px] leading-snug">
          {crying
            ? `Mommy finds ${s.name || "you"} in the hall, crying too hard to speak. She holds on and doesn't ask. She doesn't need to. She can see it in your eyes.`
            : `Mommy finds ${s.name || "you"} in the hall, pale but standing. "Were you good?" You nod. You don't tell her about the room upstairs.`}
        </p>
        <p className="mt-3 text-sm opacity-70">Behind you, in the room with no light, something sets a fourth place at the table.</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs opacity-60">Cordura at bedtime: {c}</span>
          <button className="stitch-btn sage" onClick={() => { s.newRun(); s.go("title"); }}>Again</button>
        </div>
      </div>
    </div>
  );
}
