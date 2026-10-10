import { useEffect, useRef, useState } from "react";
import { Stage, illuminated } from "../Stage";
import { BG, MUSICBOX, TOY_IMG } from "../assets";
import { TOY_LABEL, useGame } from "../store";
import { Clock, GuestVoid, Key, Pajamas, PhotoFrame, Symbol, Toothbrush, TrinketBox, type Sym } from "../Props";
import { ChapterCard, useSceneIntro } from "../kit";
import { sfx, startMusic, stopMusic } from "../audio";
import { chooseInterventions } from "../guest";

/* ---------------- CHAPTER 3 — THE MUSIC BOX ---------------- */
const SYMS: Sym[] = ["star", "moon", "heart", "key"];
const LENS = [3, 4, 5, 7];
const SYM_COLOR: Partial<Record<Sym, string>> = { star: "var(--honey)", moon: "var(--turq)", heart: "var(--rose)", key: "var(--brass)" };

export function Ch3() {
  const s = useGame();
  const round = s.ch3Rounds;
  const [seq, setSeq] = useState<Sym[]>([]);
  const [show, setShow] = useState<number>(-1);
  const [input, setInput] = useState<Sym[]>([]);
  const [done, setDone] = useState(false);

  useSceneIntro("ch3", "Stop the music box. Watch the pattern in the dark, play it back in the light.", [
    { speaker: "narrator", text: "Your music box is playing by itself on the nightstand." },
    ...chooseInterventions(s.facts, 3).filter((i) => i.kind === "line").map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
  ]);

  useEffect(() => {
    if (round >= 4) return;
    setSeq(Array.from({ length: LENS[round]! }, () => SYMS[Math.floor(Math.random() * 4)]!));
    setInput([]);
  }, [round]);

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
      bg={BG.bgBedroom} bgPos="55% 50%" chapter={3}
      guest={{ x: 12, y: 20, h: 55, show: round >= 2 }}
      clues={show >= 0 && seq[show] && (
        <div key={`${round}-${show}`} className="glow-clue absolute left-[45%] top-[18%] -translate-x-1/2 animate-float-up">
          <Symbol s={seq[show]} size={96} color={SYM_COLOR[seq[show]]} />
        </div>
      )}
    >
      <ChapterCard n={3} title="The Music Box" />
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
const ANSWER: Sym[] = ["flower", "moon", "eye"];

export function Ch4() {
  const s = useGame();
  const [note, setNote] = useState(false);
  const [input, setInput] = useState<Sym[]>([]);
  const [solved, setSolved] = useState(false);
  const [hasKey, setKey] = useState(false);
  const [wardrobe, setWardrobe] = useState(0);
  const nm = s.name || "sweetheart";

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
    if (ANSWER[next.length - 1] !== sym) {
      sfx("wrong"); s.mistake(); setInput([]);
      return;
    }
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
      bg={BG.bgMother} bgPos="75% 50%" chapter={4}
      guest={{ x: 88, y: 14, h: 62, show: true }}
      clues={!solved && (
        <>
          <div className="glow-clue absolute left-[19%] top-[18%]"><Symbol s="flower" size={46} color="var(--glow)" /></div>
          <div className="glow-clue absolute left-[22%] top-[58%]"><Symbol s="moon" size={42} color="var(--glow)" /></div>
          <div className="glow-clue absolute left-[55%] top-[16%]"><Symbol s="eye" size={44} color="var(--glow)" /></div>
        </>
      )}
      above={
        <>
          {note && (
            <button onClick={() => setNote(false)} className="absolute inset-x-[10%] top-[22%] z-20 paper animate-float-up p-5 text-left">
              <p className="font-hand text-xl leading-snug">First, what blooms.<br />Then, what sleeps in the sky.<br />Last, what is always watching.</p>
              <p className="mt-2 text-right font-hand text-sm opacity-70">— M.</p>
            </button>
          )}
        </>
      }
    >
      <ChapterCard n={4} title="Mother's Room" />
      {/* wardrobe opening */}
      <div className="pointer-events-none absolute right-0 top-[17%] h-[78%] bg-void transition-all duration-[3000ms]" style={{ width: wardrobe === 0 ? "3%" : wardrobe === 1 ? "9%" : "14%", opacity: 0.92, filter: "blur(2px)" }} />
      {wardrobe === 2 && <GuestVoid style={{ right: "-2%", top: "18%", height: "70%" }} intensity={0.9} />}

      <button className="absolute left-[18%] top-[16%] w-[14%]" aria-label="The photograph" onClick={() => s.say({ speaker: "narrator", text: "You and Mommy. Someone is standing behind you in the picture. You don't remember them.", ms: 3500 })}>
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
        <div className="absolute bottom-[3%] left-[4%] right-[22%] paper p-2">
          <p className="mb-1 text-center text-[11px] opacity-70">A little lock under the footboard: {input.length}/3</p>
          <div className="grid grid-cols-6 gap-1">
            {PANEL.map((p) => (
              <button key={p} onClick={() => press(p)} disabled={!s.lightsOn} aria-label={p} className="grid aspect-square place-items-center rounded-md bg-paper-deep disabled:opacity-40">
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
export function Ch5() {
  const s = useGame();
  const toy = s.facts.firstToy ?? s.toyOrder[0];
  const [brush, setBrush] = useState(0); // 0 no brush, 1 holding, 2 done
  const [scrub, setScrub] = useState(0);
  const [pj, setPj] = useState(false);
  const [sawMirror, setSaw] = useState(false);
  const [found, setFound] = useState(false);
  const lastX = useRef<number | null>(null);
  const ended = useRef(false);

  useSceneIntro("ch5", "Get ready for bed: teeth, pyjamas, and your toy.", [
    { speaker: "narrator", text: "The bathroom. Mommy will be home any minute. Be in bed when she is." },
    ...chooseInterventions(s.facts, 5).filter((i) => i.kind === "line").map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
  ], () => startMusic());

  // The house turns the light off on its own after the first two tasks.
  useEffect(() => {
    if (brush < 2 || !pj || found) return;
    s.say({ speaker: "narrator", text: `Where is your ${TOY_LABEL[toy]}? You can't sleep without it.` });
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.lightsOn && st.interactive && Math.random() < 0.35) { sfx("switch"); st.set({ lightsOn: false, flicker: Date.now() }); }
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush, pj, found]);

  // Reading the mirror in the dark requires actually shining the light on it.
  useEffect(() => {
    if (s.lightsOn || sawMirror || brush < 2 || !pj) return;
    const id = window.setInterval(() => { if (illuminated(35, 26, 4)) setSaw(true); }, 200);
    return () => window.clearInterval(id);
  }, [s.lightsOn, sawMirror, brush, pj]);

  const onScrub = (e: React.PointerEvent) => {
    if (brush !== 1) return;
    if (lastX.current !== null) setScrub((v) => {
      const n = Math.min(100, v + Math.abs(e.clientX - lastX.current!) / 6);
      if (n >= 100 && v < 100) { setBrush(2); sfx("chime"); }
      return n;
    });
    lastX.current = e.clientX;
  };

  const tub = () => {
    if (!s.lightsOn) return;
    if (!sawMirror) { s.say({ speaker: "narrator", text: "Just the bath. Empty.", ms: 1800 }); return; }
    setFound(true); sfx("chime");
  };

  useEffect(() => {
    if (found && !ended.current) {
      ended.current = true;
      const c = useGame.getState().cordura;
      s.set({ finalCordura: c, interactive: false, objective: "" });
      s.say([{ speaker: "narrator", text: `It was in the bath the whole time. Your ${TOY_LABEL[toy]} is cold and a little damp.` }]);
      window.setTimeout(() => { sfx("switch"); useGame.getState().go("final"); }, 4500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  return (
    <Stage
      bg={BG.bgBathroom} bgPos="50% 50%" chapter={5}
      clues={brush === 2 && pj && !found && (
        <div className="absolute left-[23%] top-[12%] h-[29%] w-[24%] overflow-hidden rounded-[50%]">
          <img src={TOY_IMG[toy]} alt="" className="absolute bottom-[6%] left-[38%] w-[46%] opacity-80" style={{ filter: "saturate(.4) brightness(1.2) drop-shadow(0 0 8px var(--glow))" }} />
          <svg viewBox="0 0 100 60" className="absolute bottom-0 left-[18%] w-[90%] opacity-70" aria-hidden><path d="M2 30 Q50 18 98 30 L90 58 L10 58 Z" fill="oklch(0.85 0.03 200 / .5)" /></svg>
          <GuestVoid style={{ left: "6%", top: "0%", height: "110%" }} intensity={0.8} />
        </div>
      )}
    >
      <ChapterCard n={5} title="Bedtime" />
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
      {/* the bathtub */}
      <button aria-label="Look in the bathtub" className="absolute left-[62%] top-[54%] h-[20%] w-[38%]" onClick={tub} disabled={brush < 2 || !pj} />
      <div className="absolute left-[5%] top-[66%] space-y-1 font-hand text-sm text-paper drop-shadow">
        <p className={brush === 2 ? "line-through opacity-60" : ""}>☐ teeth</p>
        <p className={pj ? "line-through opacity-60" : ""}>☐ pyjamas</p>
        <p className={found ? "line-through opacity-60" : ""}>☐ {TOY_LABEL[toy]}</p>
      </div>
    </Stage>
  );
}
