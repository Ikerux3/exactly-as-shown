import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OnWall, Stage, useWall } from "../Stage";
import { KITCHEN_WALLS, PLAYROOM_TOYS, FIRST_TOY_WALKS } from "../roomLayout";
import { BG, MUSICBOX, PROP, PROP2, PROP3, SCARE, WALLS, toyImageFor } from "../assets";
import { JumpScare } from "../fx";
import { TOY_LABEL, useGame, type ToyId } from "../store";
import { Cupboard, Cushion, Cutlery, Dresser, Glass, Plate, ToyBox } from "../Props";
import { useSceneIntro } from "../kit";
import { sfx } from "../audio";
import { chooseInterventions } from "../guest";
import { interpretFavoriteFood } from "../ai/food";
import { adaptiveQuestion, currentQuestionContext, offlineAdaptiveQuestion } from "../ai/questions";
import { useSpokenPrompt } from "../DialogueVoice";

/** Stable component identity keeps the pressed button and its animation alive on store updates. */
function PlayroomToy({ toy, x, y, flying, walking = false, escapedAt, onCollect }: {
  toy: ToyId; x: number; y: number; flying: ToyId | null; walking?: boolean; escapedAt?: number | undefined;
  onCollect: (toy: ToyId, wall: number) => void;
}) {
  const wall = useWall();
  const s = useGame();
  const [walkDelay] = useState(() => -Math.max(0, Date.now() - (escapedAt ?? Date.now() - 1000)) / 1000);
  const label = toy === s.favToyVisualSlot && s.favToy ? s.favToy : TOY_LABEL[toy];
  return (
    <div className={`absolute z-40 w-[18%] -translate-x-1/2 -translate-y-1/2 ${walking ? "mg01-exit-and-walk" : ""}`}
      data-toy={toy} data-wall={wall}
      style={{ left: x + "%", top: y + "%", "--box-dx": `${76 - x}cqw`, "--box-dy": `${(82 - y) * 1.5}cqw`,
        animationDelay: walking ? `${walkDelay}s, ${walkDelay + 0.7}s` : undefined,
        animationPlayState: s.lightsOn && !s.paused && s.interactive && !flying ? "running" : "paused" } as CSSProperties}>
      <button type="button" aria-label={`Pick up ${walking ? "the escaped " : "the "}${label}`}
        disabled={!!flying || !s.interactive || s.paused || s.scare}
        onClick={() => onCollect(toy, wall)}
        className={`grid min-h-12 min-w-12 w-full place-items-center rounded-xl touch-manipulation active:scale-95 focus-visible:outline-4 focus-visible:outline-honey `}
        style={{ touchAction: "manipulation" }}>
        <img src={toyImageFor(toy, s.favToyVisualSlot, s.favToyImage)} alt="" draggable={false}
          onError={(e) => { const fallback = toyImageFor(toy); if (e.currentTarget.src !== new URL(fallback, window.location.href).href) e.currentTarget.src = fallback; }}
          className="pointer-events-none w-full drop-shadow-xl transition-[transform,opacity] duration-200"
          style={{ transform: flying === toy ? "translate(var(--box-dx), var(--box-dy)) scale(.35)" : undefined, opacity: flying === toy ? .25 : 1 }} />
      </button>
    </div>
  );
}

export function Ch1() {
  const s = useGame();
  const [r1, r2, r3, r4, r5] = s.toyOrder;
  const [cushionMoved, setCushion] = useState(false);
  const [drawerOpen, setDrawer] = useState(false);
  const [jacketMoved, setJacket] = useState(false);
  const [flying, setFlying] = useState<ToyId | null>(null);
  const pickupLock = useRef(false);
  const pickupTimer = useRef<number | null>(null);
  const ended = useRef(false);
  useSceneIntro("ch1", "Find five toys on the four walls. Look behind the jacket and follow the footprints.", []);
  useEffect(() => () => { if (pickupTimer.current !== null) window.clearTimeout(pickupTimer.current); }, []);

  const collect = (toy: ToyId, wall: number) => {
    const st = useGame.getState();
    if (pickupLock.current || !st.interactive || st.paused || st.scare || !st.lightsOn || st.ch1.includes(toy)) return;
    // Lock synchronously: two click/touch events in the same render cannot schedule two pickups.
    pickupLock.current = true;
    setFlying(toy);
    sfx("tap");
    pickupTimer.current = window.setTimeout(() => {
      pickupTimer.current = null;
      const latest = useGame.getState();
      if (latest.screen === "ch1" && !latest.scare) {
        if (!latest.facts.firstToy) latest.fact({ firstToy: toy });
        latest.observeChoice(toy === latest.favToyVisualSlot && latest.favToy ? latest.favToy : TOY_LABEL[toy]);
        const firstEscape = !latest.toyEscape;
        const recovering = latest.toyEscape?.toy === toy && !latest.toyEscape.recovered;
        if (firstEscape) {
          // Exactly the first collected toy escapes; neither speed, lights nor wall turns eject others.
          const point = FIRST_TOY_WALKS[wall] ?? FIRST_TOY_WALKS[0]!;
          latest.set({ toyEscape: { toy, ...point, escapedAt: Date.now(), recovered: false } });
          sfx("creak");
        } else {
          latest.set({
            ch1: latest.ch1.includes(toy) ? latest.ch1 : [...latest.ch1, toy],
            ...(recovering ? { toyEscape: { ...latest.toyEscape!, recovered: true } } : {}),
          });
          sfx("chime");
        }
      }
      setFlying(null);
      pickupLock.current = false;
    }, 220);
  };

  useEffect(() => {
    if (s.ch1.length !== 5 || !s.toyEscape?.recovered || ended.current) return;
    ended.current = true;
    s.set({ interactive: false, objective: "" });
    const timers = [
      window.setTimeout(() => {
        sfx("switch");
        useGame.getState().set({ lightsOn: false, flicker: Date.now() });
      }, 900),
      window.setTimeout(() => useGame.getState().say([
        { speaker: "guest", text: "You tidy so nicely." },
        { speaker: "guest", text: (() => {
          const state = useGame.getState();
          const first = state.facts.firstToy ?? r1;
          const label = first === state.favToyVisualSlot && state.favToy ? state.favToy : TOY_LABEL[first];
          return `You picked up the ${label} first. I'll remember that.`;
        })() },
        { speaker: "narrator", text: "The lights come back on. Someone is setting the table downstairs.",
          onShow: () => { sfx("switch"); useGame.getState().set({ lightsOn: true }); } },
      ]), 1800),
      window.setTimeout(() => useGame.getState().go("ch2k"), 11000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [s.ch1.length, s.toyEscape?.recovered]);

  const toy = (t: ToyId, slot: number, revealed = true) => {
    if (!revealed || s.ch1.includes(t) || (s.toyEscape?.toy === t && !s.toyEscape.recovered)) return null;
    const spot = PLAYROOM_TOYS[slot]!;
    return <PlayroomToy toy={t} x={spot.x} y={spot.y} flying={flying} onCollect={collect} />;
  };
  const canInspect = s.interactive && !s.paused && !s.scare && s.lightsOn;
  return (
    <Stage bg={BG.bgPlayroom} spread bgPos="15% 50%" wallPositions={["15% 50%", "50% 50%", "25% 50%", "50% 50%"]} chapter={1} chapterCard
      progress={`Toys ${s.ch1.length}/5`} guest={{ x: 88, y: 18, h: 60, show: s.ch1.length >= 3 }}>
      {s.toyEscape && !s.toyEscape.recovered && (
        <OnWall n={s.toyEscape.wall}>
          <PlayroomToy toy={s.toyEscape.toy} x={s.toyEscape.x} y={s.toyEscape.y}
            flying={flying} walking escapedAt={s.toyEscape.escapedAt} onCollect={collect} />
        </OnWall>
      )}
      <div aria-live="polite" className="pointer-events-none absolute bottom-[3%] left-[8%] right-[8%] z-40 rounded bg-void/70 px-2 py-1 text-xs text-paper">
        {s.toyEscape && !s.toyEscape.recovered ? "The first toy walked away! It is still on the same wall. Turn the light on to pick it up." : "Find toys on every wall. Two are by the door and jacket."}
      </div>
      <ToyBox style={{ position: "absolute", left: "61%", top: "74.5%", width: "30%" }} glow={!!flying} />
      <OnWall n={0}>
        {toy(r1, 0)}
        <div className="pointer-events-none absolute left-[34%] top-[73%] z-[41] h-[3%] w-[20%] rotate-[-7deg] rounded-full bg-wood/40" aria-hidden />
      </OnWall>
      <OnWall n={3}>
        {toy(r2, 1, cushionMoved)}
        <button type="button" aria-label="Move the cushion" disabled={!canInspect}
          onClick={() => { if (!cushionMoved) s.inspect("sofa cushion"); setCushion((old) => !old); sfx("open"); }}
          className="absolute min-h-12 min-w-12 touch-manipulation transition-transform duration-200"
          style={{ left: "14%", top: "38%", width: "21%", zIndex: cushionMoved ? 5 : 30,
            transform: cushionMoved ? "translate(-30%, -20%) rotate(-24deg)" : "none" }}>
          <Cushion color="var(--sage)" style={{ position: "static", width: "100%" }} />
        </button>
      </OnWall>
      <OnWall n={1}>
        <button type="button" aria-label={drawerOpen ? "Close the drawer" : "Open the drawer"} disabled={!canInspect}
          onClick={() => { if (!drawerOpen) s.inspect("playroom drawer"); setDrawer((old) => !old); sfx("open"); }}
          className="absolute min-h-12 min-w-12 touch-manipulation"
          style={{ left: "50%", top: "50%", width: "42%" }}>
          <Dresser open={drawerOpen} style={{ position: "static", width: "100%" }} />
        </button>
        {toy(r3, 2, drawerOpen)}
      </OnWall>
      <OnWall n={2}>
        {/* The same artwork supplies the coat cutout, aligned with this wall's crop. */}
        {jacketMoved && <div aria-hidden className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath: "polygon(32% 36%,40% 36%,44% 40%,52% 51%,47% 53%,46% 57%,28% 57%,27% 53%,20% 51%,28% 40%)",
            background: "radial-gradient(ellipse at 36% 48%, #242025, #51444a)" }} />}
        {toy(r4, 3, jacketMoved)}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[45] transition-transform duration-500 motion-reduce:transition-none"
          style={{ clipPath: "polygon(32% 36%,40% 36%,44% 40%,52% 51%,47% 53%,46% 57%,28% 57%,27% 53%,20% 51%,28% 40%)",
            transformOrigin: "36% 33%", transform: jacketMoved ? "rotate(-36deg)" : undefined }}>
          <img src={WALLS[BG.bgPlayroom]?.[2]} alt="" className="scene-bg" style={{ objectPosition: "25% 50%" }} />
        </div>
        {!jacketMoved && <button type="button" aria-label="Move the jacket" disabled={!canInspect}
          onClick={() => { s.inspect("jacket"); setJacket(true); sfx("open"); }}
          className="absolute z-[46] min-h-12 min-w-12 touch-manipulation focus-visible:outline-4 focus-visible:outline-honey"
          style={{ left: "20%", top: "35%", width: "32%", height: "23%" }}>
          <span className="sr-only">Move the jacket</span>
        </button>}
        {toy(r5, 4)}
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-paper/60" viewBox="0 0 100 150">
          {[[78,139], [73,135], [69,130], [64,126]].map(([x,y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(-35) scale(.35)`} fill="currentColor">
              <ellipse rx="2" ry="4" /><circle cx="-1.5" cy="-6" r="1" /><circle cy="-7" r="1" /><circle cx="1.5" cy="-6" r="1" />
            </g>
          ))}
        </svg>
      </OnWall>
    </Stage>
  );
}

/* ---------------- CHAPTER 2 — TABLE FOR THREE ---------------- */

type ItemKind = "plate" | "glass" | "cutlery";
type Owner = "child" | "mother";
export type ItemId = `${ItemKind}-${Owner}`;
const ITEMS: ItemId[] = [
  "plate-child",
  "glass-child",
  "cutlery-child",
  "plate-mother",
  "glass-mother",
  "cutlery-mother",
];
type Junk = "junk-clock" | "junk-key" | "junk-brush" | "junk-box";
type Content = ItemId | Junk;
const JUNK_IMG: Record<Junk, string> = {
  "junk-clock": PROP.clock,
  "junk-key": PROP2.key,
  "junk-brush": PROP2.toothbrush,
  "junk-box": MUSICBOX,
};
const UNITS: { kind: "door" | "drawer"; x: number; y: number; w: number }[] = [
  { kind: "door", x: 3, y: 60, w: 21 },
  { kind: "door", x: 26, y: 60, w: 21 },
  { kind: "door", x: 49, y: 60, w: 21 },
  { kind: "drawer", x: 73, y: 61, w: 24 },
  { kind: "drawer", x: 73, y: 77, w: 24 },
];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}

function useColors() {
  const s = useGame();
  return { child: `var(--c-${s.favColor})`, mother: `var(--c-${s.motherColor})` };
}

export function ItemArt({ id, big, className }: { id: string; big?: boolean; className?: string }) {
  const col = useColors();
  const [kind, owner] = id.split("-") as [string, string];
  const color =
    owner === "child" ? col.child : owner === "mother" ? col.mother : "var(--paper-deep)";
  const style = { width: "100%" };
  return (
    <div className={className}>
      {kind === "plate" && <Plate color={color} big={big} style={style} />}
      {kind === "glass" && <Glass color={color} big={big} style={style} />}
      {kind === "cutlery" && <Cutlery color={color} big={big} style={style} />}
      {kind === "junk" && (
        <img src={JUNK_IMG[id as Junk]} alt="" className="prop w-full" style={{ filter: "sepia(.4) contrast(1.15)" }} />
      )}
    </div>
  );
}

const itemLabel = (id: ItemId, name: string) => {
  const [kind, owner] = id.split("-") as [ItemKind, Owner];
  const k = kind === "cutlery" ? "fork & spoon" : kind;
  return owner === "child" ? `${name}'s ${k}` : `Mommy's ${k}`;
};

/** Kitchen: Mommy's list only shows in the dark, it can change, and the cupboards bite back. */
export function Ch2Kitchen() {
  const s = useGame();
  const nm = s.name || "baby";
  const [openU, setOpenU] = useState<number | null>(null);
  const [setup] = useState(() => {
    const order = shuffle(ITEMS);
    const list = order.slice(0, 4);
    const pool = order.slice(4);
    const stuff: Content[] = shuffle<Content>([...ITEMS, "junk-clock", "junk-key", "junk-brush", "junk-box"]);
    const contents: Content[][] = UNITS.map(() => []);
    stuff.forEach((c, i) => contents[i % UNITS.length]!.push(c));
    return { list, pool, contents: shuffle(contents), trap: Math.floor(Math.random() * UNITS.length) };
  });
  const [list, setList] = useState<ItemId[]>(setup.list);
  const [changed, setChanged] = useState(false);
  const [scare, setScare] = useState<string | null>(null);
  const trapSprung = useRef(false);
  useSceneIntro("ch2k", "Mommy left a list. You can only read it with the light off.", [
    { speaker: "narrator", text: "The kitchen. Everything is put away in the cupboards." },
    { speaker: "mimic", text: `I left you a list, ${nm}. Turn off the light to read it.` },
  ]);
  const got = s.ch2Items as ItemId[];
  const done = list.every((i) => got.includes(i));

  const take = (it: Content) => {
    if (!s.interactive || scare) return;
    if (!s.lightsOn) {
      s.say({ speaker: "narrator", text: "Too dark to grab anything. Turn the light back on.", ms: 2000 });
      return;
    }
    if (it.startsWith("junk")) {
      s.mistake();
      s.addCordura(12);
      setOpenU(null);
      setScare(Math.random() < 0.5 ? SCARE.face1 : SCARE.face2);
      return;
    }
    const id = it as ItemId;
    if (!list.includes(id)) {
      sfx("wrong");
      s.mistake();
      s.addCordura(4);
      s.say({ speaker: "guest", text: "That's not on the list. Read it again.", ms: 2200 });
      return;
    }
    sfx("chime");
    s.observeChoice(id.replace("-", " for "));
    const next = [...got, id];
    s.set({ ch2Items: next });
    if (!changed && next.length === 2) {
      setChanged(true);
      const left = list.filter((i) => !next.includes(i));
      const out = left[Math.floor(Math.random() * left.length)];
      const inn = setup.pool[0];
      if (out && inn) {
        window.setTimeout(() => {
          sfx("whisper");
          useGame.getState().set({ flicker: Date.now() });
          setList((l) => l.map((i) => (i === out ? inn : i)));
          useGame.getState().say({ speaker: "guest", text: "Mommy changed her mind. Check the list again.", ms: 3000 });
        }, 700);
      }
    }
  };

  const openUnit = (i: number, kind: string) => {
    if (!s.interactive || scare) return;
    sfx("open");
    s.inspect(`kitchen ${kind} ${i + 1}`);
    if (i === setup.trap && !trapSprung.current) {
      trapSprung.current = true;
      s.addCordura(8);
      setScare(SCARE.face2);
      window.setTimeout(() => setOpenU(i), 1100);
      return;
    }
    setOpenU(i);
  };

  const u = openU === null ? null : UNITS[openU]!;
  const inside = openU === null ? [] : (setup.contents[openU] ?? []).filter((c) => !got.includes(c as ItemId));
  const ownerTag = (c: Content) => {
    if (c.startsWith("junk")) return null;
    const child = c.endsWith("child");
    return { color: child ? `var(--c-${s.favColor})` : `var(--c-${s.motherColor})`, text: child ? nm : "Mommy" };
  };
  const kindName = (c: Content) => (c.startsWith("plate") ? "plate" : c.startsWith("glass") ? "glass" : c.startsWith("cutlery") ? "fork & spoon" : "");

  return (
    <Stage
      bg={BG.bgKitchen}
      spread
      bgPos="50% 50%"
      chapter={2}
      chapterCard
      progress={`List ${list.filter((i) => got.includes(i)).length}/${list.length}`}
      switchHint={got.length === 0}
      clues={
        <div className="absolute left-[8%] right-[8%] top-[7%] -rotate-2 px-3 py-2 font-crayon list-scrawl">
          <p className="text-[clamp(12px,4cqw,16px)] uppercase tracking-wider opacity-80">Mommy's list</p>
          <ul className="mt-1 space-y-0.5 text-[clamp(15px,5.2cqw,22px)] leading-tight">
            {list.map((i, n) => (
              <li key={i} style={{ rotate: `${(n % 2 ? 1 : -1) * 1.5}deg`, textDecoration: got.includes(i) ? "line-through" : undefined, opacity: got.includes(i) ? 0.45 : 1 }}>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: i.endsWith("child") ? `var(--c-${s.favColor})` : `var(--c-${s.motherColor})` }} />
                {itemLabel(i, nm)}
              </li>
            ))}
          </ul>
          {changed && <p className="mt-1 text-xs opacity-70">(she crossed something out)</p>}
        </div>
      }
      above={
        <>
          {u && openU !== null && !scare && (
            <div className="absolute inset-0 z-[40] grid place-items-center bg-void/75 animate-float-up">
              <div
                className="relative w-[90%] -rotate-1 p-3"
                style={{ background: "linear-gradient(oklch(0.3 0.04 55), oklch(0.18 0.03 50))", boxShadow: "0 0 0 6px oklch(0.24 0.04 50), 6px 10px 0 oklch(0 0 0 / .6)", filter: s.lightsOn ? undefined : "brightness(.2)" }}
              >
                <span className="absolute -top-3 left-6 h-5 w-20 rotate-3 bg-paper/80" />
                <p className="mb-2 text-center font-crayon text-xs uppercase tracking-widest text-paper/70">
                  inside the {u.kind === "door" ? "cupboard" : "drawer"}
                </p>
                <div className="relative grid grid-cols-2 gap-3 rounded p-2" style={{ background: "oklch(0.12 0.02 50)", boxShadow: "inset 0 6px 14px oklch(0 0 0 / .8)" }}>
                  {openU === setup.trap && (
                    <img src={SCARE.face2} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-screen grayscale" />
                  )}
                  {inside.length === 0 && <p className="col-span-2 py-8 text-center font-hand text-paper/50">empty</p>}
                  {inside.map((c) => {
                    const tag = ownerTag(c);
                    return (
                      <button
                        key={c}
                        onClick={() => take(c)}
                        aria-label={c.startsWith("junk") ? "Something that isn't a dish" : `Take ${itemLabel(c as ItemId, nm)}`}
                        className="relative grid aspect-square touch-manipulation place-items-center rounded bg-paper/5 p-2 active:scale-95"
                      >
                        <ItemArt id={c} className="w-[78%]" />
                        {tag && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 -rotate-2 whitespace-nowrap px-2 py-0.5 font-hand text-[13px] leading-none text-ink" style={{ background: tag.color }}>
                            {tag.text}'s {kindName(c)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-center">
                  <button className="stitch-btn text-sm" onClick={() => { sfx("open"); setOpenU(null); }}>Close it</button>
                </div>
              </div>
            </div>
          )}
          {scare && <JumpScare img={scare} onDone={() => setScare(null)} />}
        </>
      }
    >
      {UNITS.map((unit, i) => {
        const wallN = KITCHEN_WALLS[i] ?? 0;
        const isFront = wallN === 0;
        return (
          <OnWall key={i} n={wallN}>
            <button
              aria-label={unit.kind === "door" ? "Open the cupboard" : "Open the drawer"}
              onClick={() => openUnit(i, unit.kind)}
              className="absolute block touch-manipulation active:scale-[0.97]"
              style={{ left: isFront ? `${unit.x}%` : "30%", top: isFront ? `${unit.y}%` : "55%", width: isFront ? `${unit.w}%` : "40%", aspectRatio: unit.kind === "door" ? "4 / 5" : "12 / 7" }}
            >
              <Cupboard kind={unit.kind} open={false} style={{ width: "100%", height: "100%", display: "block" }} />
            </button>
          </OnWall>
        );
      })}
      {/* what you've gathered so far, pinned to the wall like a note */}
      {got.length > 0 && (
        <div className="pointer-events-none absolute left-[4%] top-[44%] flex max-w-[60%] rotate-[-2deg] items-center gap-1 bg-paper/90 px-2 py-1 shadow-[3px_4px_0_oklch(0_0_0/.5)]">
          {got.map((i) => (
            <ItemArt key={i} id={i} className="w-9 animate-float-up" />
          ))}
        </div>
      )}
      {done && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[4%] z-20 flex justify-center animate-float-up">
          <button
            className="stitch-btn honey pointer-events-auto whitespace-nowrap text-[clamp(13px,4.2cqw,16px)]"
            onClick={() => {
              sfx("tap");
              s.go("ch2d");
            }}
          >
            Carry everything to the table
          </button>
        </div>
      )}
    </Stage>
  );
}

/* ---- Dining: a Resident-Evil style packing puzzle on the table, seen from above ---- */

type PieceId = ItemId | "bread" | "bigplate";
type Piece = { id: PieceId; w: number; h: number };
const GRID = 4;
const PIECES: Piece[] = [
  { id: "plate-child", w: 2, h: 2 },
  { id: "plate-mother", w: 2, h: 2 },
  { id: "bread", w: 2, h: 1 },
  { id: "cutlery-child", w: 1, h: 2 },
  { id: "cutlery-mother", w: 1, h: 2 },
  { id: "glass-child", w: 1, h: 1 },
  { id: "glass-mother", w: 1, h: 1 },
];
const BIG: Piece = { id: "bigplate", w: 4, h: 4 };
const SOLUTION: Record<string, { x: number; y: number; r: boolean }> = {
  "plate-child": { x: 0, y: 0, r: false },
  "plate-mother": { x: 2, y: 0, r: false },
  bread: { x: 0, y: 2, r: false },
  "cutlery-child": { x: 2, y: 2, r: false },
  "cutlery-mother": { x: 3, y: 2, r: false },
  "glass-child": { x: 0, y: 3, r: false },
  "glass-mother": { x: 1, y: 3, r: false },
};
type Placed = Record<string, { x: number; y: number; r: boolean }>;
const dims = (p: Piece, r: boolean) => (r ? { w: p.h, h: p.w } : { w: p.w, h: p.h });
const GRID_BOX = { left: 12, top: 15, width: 76 }; // % of frame; cells are square

function PieceArt({ p, r }: { p: Piece; r: boolean }) {
  const { w, h } = dims(p, r);
  const inner: CSSProperties = r
    ? { position: "absolute", left: "50%", top: "50%", width: `${(h / w) * 100}%`, height: `${(w / h) * 100}%`, transform: "translate(-50%,-50%) rotate(90deg)" }
    : { position: "absolute", inset: 0 };
  return (
    <div className="pointer-events-none absolute inset-0">
      <div style={inner} className="grid place-items-center">
        {p.id === "bread" ? (
          <img src={PROP3.bread} alt="" draggable={false} className="prop h-full w-full object-contain" />
        ) : p.id === "bigplate" ? (
          <img src={PROP3.bigplate} alt="" draggable={false} className="prop h-full w-full object-contain" />
        ) : (
          <ItemArt id={p.id} className={p.id.startsWith("cutlery") ? "h-full w-[70%]" : "w-[88%]"} />
        )}
      </div>
    </div>
  );
}

type Drag = { id: PieceId; r: boolean; px: number; py: number; sx: number; sy: number; moved: boolean; from: { x: number; y: number; r: boolean } | null };

export function Ch2Dining() {
  const s = useGame();
  const nm = s.name || "sweetheart";
  const [view, setView] = useState<"tray" | "table">("tray");
  const [placed, setPlaced] = useState<Placed>({});
  const [rot, setRot] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const gridRef = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false);
  const [foodInput, setFoodInput] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [bigOffered, setBigOffered] = useState(false);
  const [phase, setPhase] = useState<"play" | "crash" | "black" | "smile" | "after">("play");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  useSceneIntro(
    "ch2d",
    "Drag everything onto the table so it all fits. In the dark, the cloth remembers how.",
    [
      { speaker: "narrator", text: "The table is too small for everything on the tray." },
      { speaker: "mimic", text: `Make it all fit, ${nm}. Mommy hates a messy table.` },
      ...chooseInterventions(s.facts, 2)
        .filter((i) => i.kind === "line")
        .map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
    ],
  );
  const all = bigOffered ? [...PIECES, BIG] : PIECES;
  const pieceOf = (id: PieceId) => all.find((p) => p.id === id)!;
  const inDock = all.filter((p) => !placed[p.id] && drag?.id !== p.id);
  const count = PIECES.filter((p) => placed[p.id]).length;

  const fitsIn = (pl: Placed, p: Piece, r: boolean, x: number, y: number) => {
    const d = dims(p, r);
    if (x < 0 || y < 0 || x + d.w > GRID || y + d.h > GRID) return false;
    for (const [id, q] of Object.entries(pl)) {
      if (id === p.id) continue;
      const qd = dims(pieceOf(id as PieceId), q.r);
      if (x < q.x + qd.w && x + d.w > q.x && y < q.y + qd.h && y + d.h > q.y) return false;
    }
    return true;
  };

  /** Which cell the dragged piece's top-left would snap to, or null when off the table. */
  const target = (dr: Drag) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cell = rect.width / GRID;
    const d = dims(pieceOf(dr.id), dr.r);
    const cx = (dr.px - rect.left) / cell;
    const cy = (dr.py - rect.top) / cell;
    if (cx < -0.5 || cy < -0.5 || cx > GRID + 0.5 || cy > GRID + 0.5) return null;
    return { x: Math.round(cx - d.w / 2), y: Math.round(cy - d.h / 2), cell };
  };

  const crash = () => {
    s.set({ interactive: false, objective: "" });
    setPlaced((pl) => ({ ...pl, bigplate: { x: 0, y: 0, r: false } }));
    setPhase("crash");
    sfx("scare");
    s.addCordura(15);
    window.setTimeout(() => { setPhase("black"); sfx("switch"); }, 700);
    window.setTimeout(() => { setPhase("smile"); sfx("whisper"); }, 3400);
    window.setTimeout(() => {
      setPhase("after");
      setPlaced(SOLUTION);
      sfx("switch");
      useGame.getState().say([
        { speaker: "narrator", text: "The light comes back. The table is set. Perfectly." },
        { speaker: "guest", text: `Thank you, ${nm}. I'll make your ${useGame.getState().favFood || "dinner"}.` },
        { speaker: "narrator", text: "Upstairs, a music box starts to play." },
      ]);
    }, 7200);
    window.setTimeout(() => useGame.getState().go("ch3"), 15500);
  };

  const offerBig = () => {
    setBigOffered(true);
    setView("tray");
    sfx("creak");
    const st = useGame.getState();
    st.set({ interactive: true, objective: "Set its plate too." });
    st.say({ speaker: "guest", text: "Can you set my plate too?", ms: 4000 });
  };

  const afterPlace = (next: Placed) => {
    const n = PIECES.filter((q) => next[q.id]).length;
    if (n === PIECES.length && !bigOffered) {
      useGame.getState().set({ interactive: false });
      window.setTimeout(() => {
        if (!useGame.getState().favFood) {
          setAsking(true);
          sfx("whisper");
        } else offerBig();
      }, 900);
    }
  };

  const canTouch = () => {
    if (!s.interactive || phase !== "play") return false;
    if (!s.lightsOn) {
      s.say({ speaker: "narrator", text: "In the dark you can only look. Turn the light on to move things.", ms: 2400 });
      return false;
    }
    return true;
  };

  const startDrag = (e: React.PointerEvent, id: PieceId) => {
    if (!canTouch()) return;
    e.preventDefault();
    e.stopPropagation();
    const from = placed[id] ?? null;
    const r = from ? from.r : !!rot[id];
    if (from) setPlaced((pl) => { const n = { ...pl }; delete n[id]; return n; });
    sfx("tap");
    setDrag({ id, r, px: e.clientX, py: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, from });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8;
      setDrag({ ...d, px: e.clientX, py: e.clientY, moved });
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      const p = pieceOf(d.id);
      // A tap (no drag) turns the piece.
      if (!d.moved) {
        if (p.w !== p.h) {
          sfx("creak");
          if (d.from) {
            const nr = !d.from.r;
            setPlaced((pl) => (fitsIn(pl, p, nr, d.from!.x, d.from!.y) ? { ...pl, [p.id]: { ...d.from!, r: nr } } : { ...pl, [p.id]: d.from! }));
          } else setRot((o) => ({ ...o, [p.id]: !o[p.id] }));
        } else if (d.from) setPlaced((pl) => ({ ...pl, [p.id]: d.from! }));
        return;
      }
      const t = target(d);
      if (p.id === "bigplate") {
        if (t) crash();
        return;
      }
      setPlaced((pl) => {
        if (t && fitsIn(pl, p, d.r, t.x, t.y)) {
          sfx("chime");
          useGame.getState().success();
          const next = { ...pl, [p.id]: { x: t.x, y: t.y, r: d.r } };
          window.setTimeout(() => afterPlace(next), 0);
          return next;
        }
        if (t) {
          sfx("wrong");
          useGame.getState().mistake();
        }
        if (!d.from) setRot((o) => ({ ...o, [p.id]: d.r }));
        return pl; // back to the tray
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [!!drag]);

  const answerFood = async () => {
    const answer = foodInput.trim();
    if (!answer || interpreting) return;
    setInterpreting(true);
    const result = await interpretFavoriteFood(answer);
    const state = useGame.getState();
    state.observeChoice(result.displayFood);
    state.set({ favFood: result.displayFood });
    setAsking(false);
    setInterpreting(false);
    state.say({ speaker: "guest", text: result.monsterLine });
    window.setTimeout(offerBig, 2600);
  };

  const gridStyle: CSSProperties = { left: `${GRID_BOX.left}%`, top: `${GRID_BOX.top}%`, width: `${GRID_BOX.width}%`, aspectRatio: "1" };
  const cellPct = 100 / GRID;
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
    left: `${x * cellPct}%`, top: `${y * cellPct}%`, width: `${w * cellPct}%`, height: `${h * cellPct}%`,
  });
  const tgt = drag && drag.moved ? target(drag) : null;
  const tgtOk = !!(drag && tgt && (drag.id === "bigplate" || fitsIn(placed, pieceOf(drag.id), drag.r, tgt.x, tgt.y)));
  const cellPx = gridRef.current ? gridRef.current.getBoundingClientRect().width / GRID : 60;

  /** A tray piece you can grab: tap to turn, drag onto the table. */
  const DockPiece = ({ p, scale }: { p: Piece; scale: number }) => {
    const r = !!rot[p.id];
    const d = dims(p, r);
    return (
      <button
        onPointerDown={(e) => startDrag(e, p.id)}
        aria-label={`Drag ${p.id.replace("-", " for ")}`}
        className="relative shrink-0 touch-none select-none"
        style={{ width: d.w * scale, height: d.h * scale }}
      >
        <div className="absolute inset-0 rounded border border-dashed border-paper/30" />
        <PieceArt p={p} r={r} />
      </button>
    );
  };

  return (
    <Stage
      bg={BG.bgDining}
      noTurn
      bgPos="50% 50%"
      chapter={2}
      progress={`Table ${count}/${PIECES.length}`}
      clues={
        view === "table" ? (
          <div className="absolute" style={gridStyle}>
            {PIECES.map((p) => {
              const sol = SOLUTION[p.id]!;
              const d = dims(p, sol.r);
              return (
                <div key={p.id} className="glow-clue absolute rounded-sm border-2 border-dashed border-current" style={box(sol.x, sol.y, d.w, d.h)}>
                  <span className="absolute left-1 top-0.5 font-crayon text-[10px]">{p.id.split("-")[0]}</span>
                </div>
              );
            })}
          </div>
        ) : null
      }
      above={
        <>
          {drag && (
            <div
              className="pointer-events-none fixed z-[70] opacity-90"
              style={{
                left: drag.px - (dims(pieceOf(drag.id), drag.r).w * cellPx) / 2,
                top: drag.py - (dims(pieceOf(drag.id), drag.r).h * cellPx) / 2,
                width: dims(pieceOf(drag.id), drag.r).w * cellPx,
                height: dims(pieceOf(drag.id), drag.r).h * cellPx,
                filter: "drop-shadow(4px 8px 0 oklch(0 0 0 / .5))",
              }}
            >
              <PieceArt p={pieceOf(drag.id)} r={drag.r} />
            </div>
          )}
          {phase === "crash" && <div className="shatter absolute inset-0 z-[55] bg-paper/80 mix-blend-difference" />}
          {(phase === "black" || phase === "smile") && (
            <div className="absolute inset-0 z-[58] grid place-items-center bg-void">
              {phase === "smile" && <img src={SCARE.smile} alt="" className="smile-rise w-[96%]" />}
            </div>
          )}
          {asking && (
            <div className="absolute inset-x-[6%] top-[14%] z-[45] paper animate-float-up p-5">
              <p className="font-display text-lg italic">"What do you like to eat best?"</p>
              <p className="mt-1 text-xs opacity-60">The voice comes from under the table.</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void answerFood(); }}>
                <label className="sr-only" htmlFor="favourite-food">Your favourite food</label>
                <input
                  id="favourite-food"
                  autoFocus
                  maxLength={120}
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  disabled={interpreting}
                  placeholder="Type anything…"
                  className="min-w-0 flex-1 rounded border border-ink/30 bg-paper px-3 py-2 font-hand text-sm text-ink outline-none focus:border-crimson"
                />
                <button type="submit" disabled={!foodInput.trim() || interpreting} className="stitch-btn sage text-sm disabled:opacity-50">
                  {interpreting ? "Listening…" : "Tell it"}
                </button>
              </form>
            </div>
          )}
        </>
      }
    >
      <div
        className="absolute inset-0"
        onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s0 = swipe.current;
          swipe.current = null;
          if (!s0 || dragRef.current) return;
          const dx = e.clientX - s0.x;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s0.y) * 1.6) { sfx("creak"); setView((v) => (v === "tray" ? "table" : "tray")); }
        }}
      >
        <div className="absolute inset-x-0 top-[3%] z-40 flex justify-center gap-3">
          {(["tray", "table"] as const).map((v) => (
            <button key={v} onClick={() => { sfx("creak"); setView(v); }} className={`stitch-btn px-3 py-1 text-xs ${view === v ? "honey" : "opacity-70"}`}>
              {v === "tray" ? "Tray" : "Table"}
            </button>
          ))}
        </div>

        {view === "tray" ? (
          <div className="wall-in-l absolute inset-0">
            <div
              className="absolute left-[5%] right-[5%] top-[46%] rounded-lg p-3"
              style={{ background: "linear-gradient(oklch(0.34 0.05 55), oklch(0.2 0.03 50))", boxShadow: "var(--shadow-contact), inset 0 2px 0 oklch(1 0 0 / .15)" }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                {inDock.length === 0 && <span className="py-6 font-hand text-sm text-paper/60">nothing left on the tray</span>}
                {inDock.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { if (canTouch()) { sfx("tap"); setView("table"); } }}
                    aria-label={`Look at ${p.id.replace("-", " for ")}`}
                    className={`relative touch-manipulation ${p.id === "bigplate" ? "animate-float-up" : ""}`}
                    style={{ width: p.id === "bigplate" ? 200 : p.w * 46, height: p.id === "bigplate" ? 200 : p.h * 46 }}
                  >
                    <div className="absolute inset-0 rounded border border-dashed border-paper/30" />
                    <PieceArt p={p} r={false} />
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { sfx("creak"); setView("table"); }}
              className="stitch-btn honey absolute bottom-[5%] left-1/2 -translate-x-1/2 whitespace-nowrap text-sm"
            >
              Take the tray to the table →
            </button>
          </div>
        ) : (
          <div className="wall-in-r absolute inset-0">
            <img src={PROP3.tabletop} alt="" className="scene-bg" style={{ filter: s.lightsOn ? undefined : "saturate(.3) brightness(.7)" }} />
            <div ref={gridRef} className="absolute" style={gridStyle}>
              {Array.from({ length: GRID * GRID }, (_, k) => (
                <div key={k} className="absolute border border-dashed border-paper/30" style={box(k % GRID, Math.floor(k / GRID), 1, 1)} />
              ))}
              {tgt && drag && (
                <div
                  className="absolute z-10 rounded-sm border-[3px]"
                  style={{
                    ...box(Math.max(0, tgt.x), Math.max(0, tgt.y), dims(pieceOf(drag.id), drag.r).w, dims(pieceOf(drag.id), drag.r).h),
                    borderColor: tgtOk ? "var(--sage)" : "var(--crimson)",
                    background: tgtOk ? "color-mix(in oklab, var(--sage) 25%, transparent)" : "color-mix(in oklab, var(--crimson) 25%, transparent)",
                  }}
                />
              )}
              {Object.entries(placed).map(([id, pl]) => {
                const p = pieceOf(id as PieceId);
                if (!p) return null;
                const d = dims(p, pl.r);
                return (
                  <button
                    key={id}
                    onPointerDown={(e) => startDrag(e, id as PieceId)}
                    aria-label={`Move ${id.replace("-", " for ")}`}
                    className={`absolute touch-none select-none ${id === "bigplate" && phase === "crash" ? "shatter" : ""}`}
                    style={box(pl.x, pl.y, d.w, d.h)}
                  >
                    <PieceArt p={p} r={pl.r} />
                  </button>
                );
              })}
            </div>
            {/* the tray, docked under the table: drag from here */}
            {phase === "play" && (
              <div className="absolute inset-x-[3%] bottom-[2%] top-[69%] rounded-lg p-2" style={{ background: "linear-gradient(oklch(0.3 0.04 55 / .95), oklch(0.18 0.03 50 / .95))", boxShadow: "var(--shadow-contact)" }}>
                <p className="mb-1 text-center font-hand text-[12px] leading-none text-paper/80">
                  {inDock.length ? "drag onto the table · tap to turn" : "everything is on the table"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {inDock.map((p) => <DockPiece key={p.id} p={p} scale={p.id === "bigplate" ? 22 : 34} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Stage>
  );
}
