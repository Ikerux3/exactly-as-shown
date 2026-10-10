import { useEffect, useRef, useState } from "react";
import { Stage, illuminated } from "../Stage";
import { BG, MUSICBOX, TOY_IMG } from "../assets";
import { TOY_LABEL, useGame } from "../store";
import { Clock, GuestVoid, Key, Pajamas, PhotoFrame, Symbol, Toothbrush, TrinketBox, type Sym } from "../Props";
import { Hint, useSceneIntro } from "../kit";
import { sfx, startMusic, stopMusic } from "../audio";
import { chooseInterventions } from "../guest";
import { useAdaptiveChapter } from "../ai/adapt";

/* ---------------- CHAPTER 3 — THE MUSIC BOX ---------------- */
const SYMS: Sym[] = ["star", "moon", "heart", "key"];
const LENS = [3, 4, 5, 7];
const ADAPTIVE_LENS = {
  gentle: [3, 3, 4, 4],
  standard: LENS,
  relentless: [4, 5, 6, 8],
} as const;
const SYM_COLOR: Partial<Record<Sym, string>> = { star: "var(--honey)", moon: "var(--turq)", heart: "var(--rose)", key: "var(--brass)" };

export function Ch3() {
  const s = useGame();
  const plan = useAdaptiveChapter(3);
  const round = s.ch3Rounds;
  const [seq, setSeq] = useState<Sym[]>([]);
  const [show, setShow] = useState<number>(-1);
  const [input, setInput] = useState<Sym[]>([]);
  const [done, setDone] = useState(false);
  const aiLineSpoken = useRef(false);

  useSceneIntro("ch3", "Stop the music box. Watch the pattern in the dark, play it back in the light.", [
    { speaker: "narrator", text: "Your music box is playing by itself on the nightstand." },
    ...chooseInterventions(s.facts, 3).filter((i) => i.kind === "line").map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
  ]);

  useEffect(() => {
    if (round >= 4) return;
    const bias: Sym = s.favColor === "rose" ? "heart" : s.favColor === "turq" ? "moon" : s.favColor === "honey" ? "star" : "key";
    const length = ADAPTIVE_LENS[plan.difficulty][round]!;
    setSeq(Array.from({ length }, (_, index) => index === 0 ? bias : SYMS[Math.floor(Math.random() * 4)]!));
    setInput([]);
  }, [round, plan.difficulty, s.favColor]);

  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  // Pattern loops only in darkness.
  useEffect(() => {
    if (s.lightsOn || !seq.length || done) { setShow(-1); return; }
    let i = 0;
    const id = window.setInterval(() => {
      const idx = i % (seq.length + 2);
      if (idx < seq.length) { setShow(idx); sfx("note", SYMS.indexOf(seq[idx]!)); } else setShow(-1);
      i++;
    }, 850);
    return () => window.clearInterval(id);
  }, [s.lightsOn, seq, done]);

  const press = (sym: Sym) => {
    if (!s.lightsOn || done) return;
    sfx("note", SYMS.indexOf(sym));
    const next = [...input, sym];
    if (seq[next.length - 1] !== sym) {
      sfx("wrong"); s.mistake(); setInput([]);
      s.say({ speaker: "narrator", text: "The tune stumbles and starts over.", ms: 1800 });
      return;
    }
    setInput(next);
    if (next.length === seq.length) {
      sfx("chime");
      if (round + 1 >= 4) {
        setDone(true);
        stopMusic();
        s.set({ ch3Rounds: 4, interactive: false, objective: "" });
        s.say([
          { speaker: "narrator", text: "You open the mechanism and hold the cylinder still. The music stops." },
          { speaker: "narrator", text: "The ballerina has stopped mid-turn. She is facing the door." },
          { speaker: "narrator", text: "Then, from down the hall, a voice you know." },
        ]);
        window.setTimeout(() => useGame.getState().go("ch4"), 10500);
      } else {
        s.set({ ch3Rounds: round + 1 });
      }
    }
  };

  return (
    <Stage
      bg={BG.bgBedroom} bgPos="55% 50%" chapter={3} chapterCard progress={`Song ${Math.min(round + 1, 4)}/4`}
      guest={{ x: 12, y: 20, h: 55, show: round >= 2 }}
      clues={show >= 0 && seq[show] && (
        <div key={`${round}-${show}`} className="glow-clue absolute left-[45%] top-[18%] -translate-x-1/2 animate-float-up">
          <Symbol s={seq[show]} size={96} color={SYM_COLOR[seq[show]]} />
        </div>
      )}
    >
      <div className="paper absolute left-[6%] top-[24%] max-w-[34%] rotate-[-4deg] px-2 py-1 font-hand text-[11px] leading-tight">
        for {s.favToy ?? "your toy"}<br />after {s.favFood ?? "dinner"}
      </div>
      <img src={MUSICBOX} alt="Your music box" className="absolute left-[44%] top-[33%] w-[34%] -translate-x-1/2 drop-shadow-[0_10px_8px_oklch(0.1_0.02_50/.8)]"
        style={{ animation: done ? undefined : "void-breathe 1.7s ease-in-out infinite" }} draggable={false} />
      <div className="absolute left-1/2 top-[60%] flex -translate-x-1/2 gap-2" aria-label={`Round ${Math.min(round + 1, 4)} of 4`}>
        {LENS.map((_, i) => <span key={i} className={`h-3 w-3 rounded-full border-2 border-paper ${i < round ? "bg-honey" : ""}`} />)}
      </div>
      {!done && (
        <div className="absolute inset-x-[5%] top-[66%] paper p-3">
          <div className="mb-2 flex min-h-5 justify-center gap-1">
            {seq.map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < input.length ? "bg-wood" : "bg-paper-deep"}`} />)}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SYMS.map((sym) => (
              <button key={sym} onClick={() => press(sym)} disabled={!s.lightsOn} aria-label={sym}
                className="grid aspect-square place-items-center rounded-xl bg-paper-deep shadow-inner transition active:scale-95 disabled:opacity-40">
                <Symbol s={sym} size={44} color={SYM_COLOR[sym]} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs opacity-70">{s.lightsOn ? "Play the pattern back. Turn the light off to see it again." : "Watch above the music box…"}</p>
        </div>
      )}
    </Stage>
  );
}

/* ---------------- CHAPTER 4 — MOTHER'S ROOM ---------------- */
const PANEL: Sym[] = ["flower", "star", "moon", "heart", "eye", "key"];
const PUZZLES: Record<"garden" | "keepsake" | "night", { answer: Sym[]; clue: string[]; positions: Array<[number, number]> }> = {
  garden: { answer: ["flower", "moon", "eye"], clue: ["what blooms", "what sleeps in the sky", "what is always watching"], positions: [[19, 11], [22, 58], [55, 16]] },
  keepsake: { answer: ["heart", "key", "star"], clue: ["what you keep", "what opens", "what guides you home"], positions: [[19, 11], [22, 58], [55, 16]] },
  night: { answer: ["moon", "eye", "key"], clue: ["what follows night", "what watches", "what lets you leave"], positions: [[19, 11], [22, 58], [55, 16]] },
};

export function Ch4() {
  const s = useGame();
  const plan = useAdaptiveChapter(4);
  const puzzle = PUZZLES[plan.puzzleVariant];
  const [note, setNote] = useState(false);
  const [input, setInput] = useState<Sym[]>([]);
  const [solved, setSolved] = useState(false);
  const [hasKey, setKey] = useState(false);
  const [wardrobe, setWardrobe] = useState(0);
  const [wrongTry, setWrongTry] = useState<Sym[] | null>(null); // visual only: the failed attempt, shown briefly
  const aiLineSpoken = useRef(false);
  const nm = s.name || "sweetheart";

  useEffect(() => setInput([]), [plan.puzzleVariant]);
  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  useSceneIntro("ch4", "Find a way out of Mommy's room.", [
    { speaker: "mimic", text: `${nm}? Sweetheart, come to my room. I'm back early.` },
    { speaker: "narrator", text: "Mommy's room. Nobody is here." },
    { speaker: "narrator", text: "Behind you, the door clicks shut." },
    ...chooseInterventions(s.facts, 4).filter((i) => i.kind === "line").map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
  ], () => window.setTimeout(() => sfx("creak"), 5000));

  const press = (sym: Sym) => {
    if (!s.lightsOn || solved) return;
    sfx("tap");
    const next = [...input, sym];
    if (puzzle.answer[next.length - 1] !== sym) {
      sfx("wrong"); s.mistake(); setInput([]);
      setWrongTry(next);
      window.setTimeout(() => setWrongTry(null), 750);
      return;
    }
    setWrongTry(null);
    setInput(next);
    if (next.length === 3) {
      setSolved(true); sfx("open"); sfx("chime");
      s.say({ speaker: "narrator", text: "Click. A hidden drawer slides out from under the bed." });
    }
  };

  const takeKey = () => {
    setKey(true); sfx("chime");
    s.set({ objective: "Unlock the door. Don't look at the wardrobe." });
    sfx("creak");
    setWardrobe(1);
    s.say([
      { speaker: "mimic", text: `${nm}… don't go. Come here. Come inside with Mommy.` },
      { speaker: "narrator", text: "The wardrobe door is opening. The voice is coming from inside it." },
      { speaker: "narrator", text: "Mommy has never sounded like that. Mommy is at the shop." },
    ]);
    window.setTimeout(() => setWardrobe(2), 3500);
  };

  return (
    <Stage
      bg={BG.bgMother} bgPos="75% 50%" chapter={4} chapterCard
      progress={hasKey ? "You have the key" : solved ? "The drawer is open" : `Lock ${input.length}/3`}
      guest={{ x: 88, y: 14, h: 62, show: true }}
      clues={!solved && (
        <>
          {puzzle.answer.map((symbol, index) => (
            <div key={symbol} className="glow-clue absolute" style={{ left: `${puzzle.positions[index]![0]}%`, top: `${puzzle.positions[index]![1]}%` }}>
              <Symbol s={symbol} size={44} color="var(--glow)" />
            </div>
          ))}
        </>
      )}
      above={
        <>
          {note && (
            <button onClick={() => setNote(false)} className="absolute inset-x-[10%] top-[22%] z-20 paper animate-float-up p-5 text-left">
              <p className="font-hand text-xl leading-snug">First, {puzzle.clue[0]}.<br />Then, {puzzle.clue[1]}.<br />Last, {puzzle.clue[2]}.</p>
              <p className="mt-3 font-hand text-sm opacity-75">You said {s.favToy ?? "your toy"}. You asked for {s.favFood ?? "dinner"}. The room listened.</p>
              <p className="mt-2 text-right font-hand text-sm opacity-70">— M.</p>
            </button>
          )}
        </>
      }
    >
      {/* wardrobe opening */}
      <div className="pointer-events-none absolute right-0 top-[17%] h-[78%] bg-void transition-all duration-[3000ms]" style={{ width: wardrobe === 0 ? "3%" : wardrobe === 1 ? "9%" : "14%", opacity: 0.92, filter: "blur(2px)" }} />
      {wardrobe === 2 && <GuestVoid style={{ right: "-2%", top: "18%", height: "70%" }} intensity={0.9} />}

      <button className="absolute left-[18%] top-[9%] w-[14%]" aria-label="The photograph" onClick={() => s.say({ speaker: "narrator", text: "You and Mommy. Someone is standing behind you in the picture. You don't remember them.", ms: 3500 })}>
        <PhotoFrame wrong style={{ position: "static", width: "100%" }} />
      </button>
      <button className="absolute left-[54%] top-[14%] w-[13%]" aria-label="The clock" onClick={() => s.say({ speaker: "narrator", text: "The clock ticks. It is not counting forwards.", ms: 2600 })}>
        <Clock style={{ position: "static", width: "100%" }} />
      </button>
      <button className="absolute left-[20%] top-[60%] w-[15%]" aria-label="The small box" onClick={() => s.say({ speaker: "narrator", text: "Mommy's trinket box. It's locked, and it's empty — you can tell from the sound.", ms: 3000 })}>
        <TrinketBox style={{ position: "static", width: "100%" }} />
      </button>
      <button className="absolute left-[56%] top-[62%] w-[16%] rotate-[-8deg]" aria-label="A note on the rug" onClick={() => { sfx("tap"); setNote(true); }}>
        <div className="paper px-2 py-3 font-hand text-xs">a note…</div>
      </button>

      {/* hidden drawer under the bed */}
      <div className="absolute left-[30%] top-[73%] w-[30%] overflow-visible">
        <div className="h-[3vh] rounded-sm transition-transform duration-700" style={{ background: "linear-gradient(var(--wood-light), var(--wood))", transform: solved ? "translateY(60%) scale(1.15)" : "scaleY(.2)", opacity: solved ? 1 : 0 }} />
        {solved && !hasKey && (
          <button onClick={takeKey} aria-label="Take the key" className="absolute left-1/2 top-0 w-[40%] -translate-x-1/2 animate-float-up"><Key style={{ position: "static", width: "100%" }} /></button>
        )}
      </div>

      {!solved && (
        <div className="absolute bottom-[3%] left-[4%] right-[4%] paper px-3 py-2.5">
          <p className="mb-1.5 text-center text-xs opacity-70">A little lock under the footboard</p>
          {/* the three dials of the lock: fill as you press, shake red on a wrong code */}
          <div className={`mb-2 flex justify-center gap-2 ${wrongTry ? "lock-shake" : ""}`} aria-live="polite"
            aria-label={wrongTry ? "Wrong code" : `Code entered: ${input.join(", ") || "none"}`}>
            {[0, 1, 2].map((i) => {
              const sym = (wrongTry ?? input)[i];
              return (
                <span key={i} className={`grid h-9 w-9 place-items-center rounded-md border-2 transition-colors ${
                  wrongTry ? "border-crimson bg-crimson/15" : sym ? "border-wood bg-paper-deep" : "border-dashed border-wood/40"}`}>
                  {sym && <span key={`${i}-${sym}`} className="animate-float-up"><Symbol s={sym} size={22} color={wrongTry ? "var(--crimson)" : "var(--wood)"} /></span>}
                </span>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {PANEL.map((p) => (
              <button key={p} onClick={() => press(p)} disabled={!s.lightsOn} aria-label={p}
                className="grid aspect-square place-items-center rounded-md bg-paper-deep transition active:scale-90 active:bg-honey/60 disabled:opacity-40">
                <Symbol s={p} size={30} color="var(--wood)" />
              </button>
            ))}
          </div>
        </div>
      )}
      {hasKey && (
        <button className="stitch-btn honey absolute bottom-[4%] left-[6%] z-20 animate-float-up" onClick={() => { sfx("open"); s.go("ch5"); }}>Unlock the door and run</button>
      )}
    </Stage>
  );
}

/* ---------------- CHAPTER 5 — BEDTIME ---------------- */
const HIDE_SPOTS = {
  bath: { label: "Look in the bathtub", x: 62, y: 54, w: 38, h: 20, clueX: 76, clueY: 61 },
  laundry: { label: "Look in the laundry basket", x: 66, y: 76, w: 29, h: 18, clueX: 79, clueY: 82 },
  towel: { label: "Look behind the towel", x: 5, y: 50, w: 23, h: 19, clueX: 15, clueY: 58 },
} as const;

export function Ch5() {
  const s = useGame();
  const plan = useAdaptiveChapter(5);
  const toy = s.favToyId ?? s.facts.firstToy ?? s.toyOrder[0];
  const toyLabel = s.favToy ?? TOY_LABEL[toy];
  const [brush, setBrush] = useState(0); // 0 no brush, 1 holding, 2 done
  const [scrub, setScrub] = useState(0);
  const [pj, setPj] = useState(false);
  const [sawClue, setSaw] = useState(false);
  const [found, setFound] = useState(false);
  const lastX = useRef<number | null>(null);
  const ended = useRef(false);
  const aiLineSpoken = useRef(false);

  const hidingSpot = HIDE_SPOTS[plan.hidingPlace];

  useSceneIntro("ch5", "Get ready for bed: teeth, pyjamas, and your toy.", [
    { speaker: "narrator", text: "The bathroom. Mommy will be home any minute. Be in bed when she is." },
    ...chooseInterventions(s.facts, 5).filter((i) => i.kind === "line").map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
  ], () => startMusic());

  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  // Mommy's list keeps track of what's still left before bed.
  const todo = [brush < 2 && "teeth", !pj && "pyjamas", !found && toyLabel].filter((t): t is string => !!t);
  const searching = brush === 2 && pj && !found;
  const toyName = s.favToy ?? `your ${TOY_LABEL[toy]}`;
  useEffect(() => {
    if (found) return;
    s.set({
      objective: !searching
        ? `Get ready for bed. Still to do: ${todo.join(", ")}.`
        : sawClue
          ? `You saw where ${toyName} is. Turn the light on and look there.`
          : `Find ${toyName}. Turn the light off and search the room with your light.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo.join(), searching, sawClue]);

  // The house turns the light off on its own after the first two tasks.
  useEffect(() => {
    if (brush < 2 || !pj || found) return;
    s.say({ speaker: "narrator", text: `Where is ${toyLabel}? You can't sleep without it.` });
    const probability = plan.blackoutPressure === "merciful" ? 0.18 : plan.blackoutPressure === "relentless" ? 0.58 : 0.35;
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.lightsOn && st.interactive && !st.paused && !st.scare && Math.random() < probability) { sfx("switch"); st.set({ lightsOn: false, flicker: Date.now() }); }
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush, pj, found, plan.blackoutPressure, toyLabel]);

  // Reading the mirror in the dark requires actually shining the light on it.
  useEffect(() => {
    if (s.lightsOn || sawClue || brush < 2 || !pj) return;
    const id = window.setInterval(() => { if (illuminated(hidingSpot.clueX, hidingSpot.clueY, 5)) setSaw(true); }, 200);
    return () => window.clearInterval(id);
  }, [s.lightsOn, sawClue, brush, pj, hidingSpot]);

  const onScrub = (e: React.PointerEvent) => {
    if (brush !== 1) return;
    if (lastX.current !== null) setScrub((v) => {
      const n = Math.min(100, v + Math.abs(e.clientX - lastX.current!) / 6);
      if (n >= 100 && v < 100) { setBrush(2); sfx("chime"); }
      return n;
    });
    lastX.current = e.clientX;
  };

  const search = (place: keyof typeof HIDE_SPOTS) => {
    if (!s.lightsOn) return;
    if (!sawClue) { s.say({ speaker: "narrator", text: "Nothing there. In the dark, something was trying to show you.", ms: 2200 }); return; }
    if (place !== plan.hidingPlace) { s.mistake(); sfx("wrong"); s.say({ speaker: "narrator", text: "Empty. The Guest moved it somewhere else.", ms: 1800 }); return; }
    setFound(true); sfx("chime");
  };

  useEffect(() => {
    if (found && !ended.current) {
      ended.current = true;
      const c = useGame.getState().cordura;
      s.set({ finalCordura: c, interactive: false, objective: "" });
      s.say([{ speaker: "narrator", text: `${toyLabel} was ${plan.hidingPlace === "bath" ? "in the bath, cold and damp" : plan.hidingPlace === "laundry" ? "under the laundry, wrapped too carefully" : "behind the towel, still warm"}.` }]);
      window.setTimeout(() => { sfx("switch"); useGame.getState().go("final"); }, 4500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  return (
    <Stage
      bg={BG.bgBathroom} bgPos="50% 50%" chapter={5} chapterCard progress={`Ready ${3 - todo.length}/3`}
      switchHint={searching && (s.lightsOn ? !sawClue : sawClue)}
      above={
        <>
          {brush === 0 && <Hint x={41} y={40} w={12} h={10} label="toothbrush" />}
          {brush === 1 && <Hint x={14} y={46} w={44} h={16} label="scrub ← →" ring={false} labelTop />}
          {!pj && <Hint x={30} y={79} w={30} h={12} label="pyjamas" />}
          {searching && Object.entries(HIDE_SPOTS).map(([id, spot]) => (
            <Hint key={id} x={spot.x} y={spot.y} w={spot.w} h={spot.h} faint />
          ))}
        </>
      }
      clues={brush === 2 && pj && !found && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${hidingSpot.clueX}%`, top: `${hidingSpot.clueY}%`, width: "18%" }}>
          <img src={TOY_IMG[toy]} alt="" className="w-full opacity-80" style={{ filter: "saturate(.4) brightness(1.2) drop-shadow(0 0 8px var(--glow))" }} />
          <GuestVoid style={{ left: "5%", top: "-70%", height: "180%" }} intensity={0.8} />
        </div>
      )}
    >
      {/* toothbrush cup */}
      {brush === 0 && (
        <button aria-label="Take your toothbrush" className="absolute left-[41%] top-[40%] h-[10%] w-[12%]" onClick={() => { setBrush(1); sfx("tap"); s.say({ speaker: "narrator", text: "Scrub back and forth over the sink.", ms: 2200 }); }} />
      )}
      {brush === 1 && (
        <div className="absolute left-[14%] top-[46%] h-[16%] w-[44%] touch-none rounded-[40%] border-2 border-dashed border-paper/50" onPointerMove={onScrub} onPointerLeave={() => (lastX.current = null)}>
          <Toothbrush style={{ left: `${20 + (scrub % 20) * 3}%`, top: "5%", height: "90%" }} />
          <div className="absolute -bottom-5 left-0 h-1.5 w-full rounded bg-paper/30"><div className="h-full rounded bg-turq" style={{ width: `${scrub}%` }} /></div>
        </div>
      )}
      {/* pyjamas */}
      {!pj && (
        <button aria-label="Put on your pyjamas" className="absolute left-[30%] top-[79%] w-[30%]" onClick={() => { setPj(true); sfx("open"); }}>
          <Pajamas color={`var(--c-${s.favColor})`} style={{ position: "static", width: "100%" }} />
        </button>
      )}
      {(Object.entries(HIDE_SPOTS) as Array<[keyof typeof HIDE_SPOTS, (typeof HIDE_SPOTS)[keyof typeof HIDE_SPOTS]]>).map(([id, spot]) => (
        <button key={id} aria-label={spot.label} className="absolute" style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }} onClick={() => search(id)} disabled={brush < 2 || !pj} />
      ))}
    </Stage>
  );
}
