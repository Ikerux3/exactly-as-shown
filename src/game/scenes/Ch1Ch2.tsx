import { useEffect, useRef, useState } from "react";
import { OnWall, Stage, illuminated } from "../Stage";
import { BG, PROP, toyImageFor } from "../assets";
import { GAMEPLAY_RULES, wrongTableBlackoutPenalty } from "../gameplayRules";
import { TOY_LABEL, useGame, type ToyId } from "../store";
import { Cupboard, Cushion, Cutlery, Dresser, Glass, Plate, ToyBox } from "../Props";
import { useSceneIntro } from "../kit";
import { sfx } from "../audio";
import { chooseInterventions } from "../guest";
import { interpretFavoriteFood } from "../ai/food";

/* ---------------- CHAPTER 1 — THE PLAYROOM ---------------- */

export function Ch1() {
  const s = useGame();
  const [r1, r2, r3, r4, r5] = s.toyOrder;
  const got = (t: ToyId) => s.ch1.includes(t);
  const labelFor = (t: ToyId) => (t === s.favToyVisualSlot && s.favToy ? s.favToy : TOY_LABEL[t]);
  const imageFor = (t: ToyId) => toyImageFor(t, s.favToyVisualSlot, s.favToyImage);
  const [cushionMoved, setCushion] = useState(false);
  const [drawerOpen, setDrawer] = useState(false);
  const [rugLifted, setRug] = useState(false);
  const [flying, setFlying] = useState<ToyId | null>(null);
  const [ejected, setEjected] = useState<ToyId[]>([]);
  const rapidCollections = useRef<number[]>([]);
  const previousLights = useRef(s.lightsOn);
  const [pos4, setPos4] = useState({ x: 38, y: 71 });
  const [frozen, setFrozen] = useState(false);
  const litMs = useRef(0);
  const target = useRef({ x: 70, y: 80 });
  const ended = useRef(false);

  useSceneIntro("ch1", "Put all five toys in the toy box.", []);

  const collect = (t: ToyId) => {
    if (got(t) || flying) return;
    sfx("tap");
    setFlying(t);
    window.setTimeout(() => {
      const st = useGame.getState();
      if (!st.facts.firstToy) st.fact({ firstToy: t });
      st.observeChoice(t === st.favToyVisualSlot && st.favToy ? st.favToy : TOY_LABEL[t]);
      const now = Date.now();
      rapidCollections.current = [
        ...rapidCollections.current.filter((time) => now - time < 4000),
        now,
      ];
      if (!st.toyCatapultUsed && rapidCollections.current.length >= 3) {
        // The Guest catapults the hurriedly boxed toys only once per entire run.
        const expelled = [...st.ch1, t];
        st.set({ ch1: [], toyCatapultUsed: true });
        setEjected(expelled);
        sfx("scare");
        st.say({ speaker: "guest", text: "Not so fast. Let's play again.", ms: 2000 });
      } else {
        st.set({ ch1: [...st.ch1, t] });
        setEjected((old) => old.filter((item) => item !== t));
        sfx("chime");
      }
      setFlying(null);
      sfx("chime");
    }, 550);
  };

  // Every genuine lights-off can teleport one boxed toy back into the room.
  // Unlike the one-time catapult, this is a small visible, recoverable interruption.
  useEffect(() => {
    const wentDark = previousLights.current && !s.lightsOn;
    previousLights.current = s.lightsOn;
    if (!wentDark || !s.interactive || s.ch1.length === 0) return;
    const moved = s.ch1[s.ch1.length - 1]!;
    setEjected((old) => (old.includes(moved) ? old : [...old, moved]));
    useGame.getState().set({ ch1: useGame.getState().ch1.filter((item) => item !== moved) });
    sfx("creak");
  }, [s.lightsOn, s.interactive, s.ch1.length]);

  // Toy 4: moves in darkness, freezes when held in the light.
  useEffect(() => {
    if (got(r4)) return;
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.paused) return;
      if (st.lightsOn || !st.interactive) {
        litMs.current = 0;
        return;
      }
      setPos4((p) => {
        if (illuminated(p.x, p.y, 2)) {
          litMs.current += 120;
          if (litMs.current > 360) setFrozen(true);
          return p;
        }
        litMs.current = Math.max(0, litMs.current - 240);
        if (litMs.current === 0) setFrozen(false);
        const t = target.current;
        if (Math.hypot(t.x - p.x, t.y - p.y) < 3)
          target.current = { x: 28 + Math.random() * 37, y: 61 + Math.random() * 19 };
        return { x: p.x + Math.sign(t.x - p.x) * 0.36, y: p.y + Math.sign(t.y - p.y) * 0.24 };
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [r4, s.ch1.length]);

  // Once the easy toys are away, Mommy's list points at the one that only moves in the dark.
  const darkHint = !got(r4) && s.ch1.length >= 2;
  useEffect(() => {
    if (useGame.getState().ch1.length >= 5) return;
    s.set({
      objective: darkHint
        ? "One toy is never where you left it. It only moves in the dark — hold it in your light, then grab it."
        : "Put all five toys in the toy box.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkHint]);

  // Done -> lights fail, the Guest speaks.
  useEffect(() => {
    if (s.ch1.length === 5 && !ended.current) {
      ended.current = true;
      s.set({ interactive: false, objective: "" });
      window.setTimeout(() => {
        sfx("switch");
        useGame.getState().set({ lightsOn: false, flicker: Date.now() });
      }, 900);
      window.setTimeout(
        () =>
          useGame.getState().say([
            { speaker: "guest", text: "You tidy so nicely." },
            {
              speaker: "guest",
              text: (() => {
                const state = useGame.getState();
                const first = state.facts.firstToy ?? r1;
                const label =
                  first === state.favToyVisualSlot && state.favToy
                    ? state.favToy
                    : TOY_LABEL[first];
                return `You picked up the ${label} first. I'll remember that.`;
              })(),
            },
            {
              speaker: "narrator",
              text: "The lights come back on. Someone is setting the table downstairs.",
              onShow: () => {
                sfx("switch");
                useGame.getState().set({ lightsOn: true });
              },
            },
          ]),
        1800,
      );
      window.setTimeout(() => useGame.getState().go("ch2k"), 11000);
    }
  }, [s.ch1.length]);

  const box = { x: 74, y: 86 };
  const flyStyle = (t: ToyId, x: number, y: number, w: number) =>
    flying === t
      ? {
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${w * 0.4}%`,
          transform: "translate(-50%,-50%) rotate(-12deg)",
          opacity: 0.2,
        }
      : { left: `${x}%`, top: `${y}%`, width: `${w}%`, transform: "translate(-50%,-50%)" };

  const Toy = ({
    t,
    x,
    y,
    w,
    extra,
  }: {
    t: ToyId;
    x: number;
    y: number;
    w: number;
    extra?: string;
  }) =>
    got(t) || ejected.includes(t) ? null : (
      <button
        onClick={() => collect(t)}
        aria-label={`Pick up the ${labelFor(t)}`}
        className={`absolute z-20 transition-all duration-500 ease-out ${extra ?? ""}`}
        style={flyStyle(t, x, y, w)}
      >
        <img
          src={imageFor(t)}
          alt=""
          className="w-full drop-shadow-[0_6px_6px_oklch(0.1_0.02_50/.7)]"
          draggable={false}
        />
      </button>
    );

  return (
    <Stage
      bg={BG.bgPlayroom}
      spread
      bgPos="15% 50%"
      chapter={1}
      chapterCard
      progress={`Toys ${s.ch1.length}/5`}
      guest={{ x: 88, y: 18, h: 60, show: s.ch1.length >= 3 }}
      clues={
        !got(r5) && (
          <OnWall n={2}>
            {[
              [52, 96],
              [46, 91],
              [39, 87],
              [32, 83],
              [26, 79],
            ].map(([x, y], i) => (
              <svg
                key={i}
                viewBox="0 0 20 30"
                className="glow-clue absolute w-[3.5%]"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `rotate(${-50 + (i % 2) * 20}deg)`,
                  animationDelay: `${i * 0.2}s`,
                }}
                aria-hidden
              >
                <ellipse cx="10" cy="18" rx="6" ry="10" fill="currentColor" />
                <circle cx="5" cy="4" r="2.5" fill="currentColor" />
                <circle cx="10" cy="2.5" r="2.5" fill="currentColor" />
                <circle cx="15" cy="4" r="2.5" fill="currentColor" />
              </svg>
            ))}
          </OnWall>
        )
      }
    >
      {/* Returned toys scatter to distinct walls and safe hitboxes, never a pile on the box. */}
      {ejected.map((toy) => {
        const slot = s.toyOrder.indexOf(toy);
        const locations = [
          { wall: 0, x: 26, y: 59 },
          { wall: 1, x: 27, y: 73 },
          { wall: 2, x: 68, y: 61 },
          { wall: 3, x: 62, y: 68 },
          { wall: 0, x: 80, y: 64 },
        ];
        const dest = locations[Math.max(0, slot)]!;
        return (
          <OnWall key={toy} n={dest.wall}>
            <button type="button" aria-label={`Pick up the escaped ${labelFor(toy)}`}
              onClick={() => collect(toy)}
              className="absolute z-40 grid min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl outline-offset-2 transition-transform duration-200 active:scale-95 focus-visible:outline-4 focus-visible:outline-honey"
              style={{ left: dest.x + "%", top: dest.y + "%", width: "18%", touchAction: "manipulation" }}>
              <img src={imageFor(toy)} alt="" draggable={false} className="w-full drop-shadow-xl motion-safe:animate-bounce" />
            </button>
          </OnWall>
        );
      })}

      <OnWall n={0}>
      <ToyBox style={{ left: "58%", top: "76%", width: "32%" }} glow={!!flying} />

      {/* The box is the front-wall collection point. Expelled toys appear across ALL four walls. */}
      <div aria-live="polite" className="pointer-events-none absolute bottom-[5%] left-[3%] rounded bg-void/70 px-2 py-1 text-xs text-paper">
        {ejected.length ? "The toys escaped! Search the room's four walls." : "Find toys on every wall."}
      </div>

      {/* Toy 1 — on the floor */}
      <Toy t={r1} x={42} y={66} w={19} />

      </OnWall>
      <OnWall n={3}>
      {/* Toy 2 — under the sofa cushion */}
      <Toy t={r2} x={63} y={66} w={18} />
      <button
        aria-label="Move the cushion"
        onClick={() => {
          if (cushionMoved) useGame.getState().fact({ revisits: s.facts.revisits + 1 });
          else s.inspect("sofa cushion");
          setCushion(!cushionMoved);
          sfx("open");
        }}
        className="absolute transition-transform duration-500"
        style={{
          left: "14%",
          top: "38%",
          width: "21%",
          zIndex: cushionMoved ? 5 : 30,
          transform: cushionMoved ? "translate(-60%, -20%) rotate(-24deg)" : "none",
        }}
      >
        <Cushion color="var(--sage)" style={{ position: "static", width: "100%" }} />
      </button>
      </OnWall>

      <OnWall n={1}>
      {/* Toy 3 — in the drawer */}
      <button
        aria-label={drawerOpen ? "Close the drawer" : "Open the drawer"}
        onClick={() => {
          if (!drawerOpen) s.inspect("playroom drawer");
          setDrawer(!drawerOpen);
          sfx("open");
        }}
        className="absolute"
        style={{ left: "50%", top: "50%", width: "42%" }}
      >
        <Dresser open={drawerOpen} style={{ position: "static", width: "100%" }} />
      </button>
      <Toy t={r3} x={75} y={69} w={18} />
      </OnWall>

      <OnWall n={3}>
      {/* Toy 4 — possessed, only exists in darkness */}
      {!got(r4) && !ejected.includes(r4) && !s.lightsOn && (
        <button
          aria-label="Grab the toy that keeps moving"
          onClick={() => {
            if (frozen || illuminated(pos4.x, pos4.y, 15)) collect(r4);
            else {
              sfx("wrong");
              s.mistake();
            }
          }}
          className="absolute z-10"
          style={
            flying === r4
              ? flyStyle(r4, 0, 0, 12)
              : {
                  left: `${pos4.x}%`,
                  top: `${pos4.y}%`,
                  width: "15%",
                  transform: `translate(-50%,-50%) rotate(${frozen ? 0 : Math.sin(pos4.x) * 8}deg)`,
                }
          }
        >
          <img
            src={imageFor(r4)}
            alt=""
            className="w-full"
            style={{ filter: frozen ? "drop-shadow(0 0 8px var(--glow))" : "brightness(.8)" }}
            draggable={false}
          />
        </button>
      )}
      </OnWall>

      <OnWall n={2}>
      {/* Toy 5 — under the rug edge */}
      <button
        aria-label="Lift the edge of the rug"
        onClick={() => {
          if (!rugLifted) s.inspect("rug edge");
          setRug(true);
          sfx("open");
        }}
        className="absolute"
        style={{ left: "10%", top: "70%", width: "26%", height: "12%" }}
      >
        <svg
          viewBox="0 0 100 40"
          className="h-full w-full"
          style={{
            transform: rugLifted ? "translateY(-30%) skewX(-18deg)" : "none",
            transition: "transform .5s",
            opacity: rugLifted ? 1 : 0,
          }}
          aria-hidden
        >
          <path
            d="M4 30 Q50 6 96 30 Q50 40 4 30 Z"
            fill="var(--sage)"
            stroke="var(--paper)"
            strokeDasharray="4 4"
          />
        </svg>
      </button>
      {rugLifted && !s.lightsOn && <Toy t={r5} x={22} y={79} w={15} />}
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
const UNITS: {
  kind: "door" | "drawer";
  x: number;
  y: number;
  w: number;
  contents: (ItemId | "decoy-plate" | "decoy-glass")[];
}[] = [
  { kind: "door", x: 3, y: 60, w: 21, contents: ["plate-mother", "decoy-plate"] },
  { kind: "door", x: 26, y: 60, w: 21, contents: ["glass-child"] },
  { kind: "door", x: 49, y: 60, w: 21, contents: ["decoy-glass", "cutlery-mother"] },
  { kind: "drawer", x: 73, y: 61, w: 24, contents: ["cutlery-child", "plate-child"] },
  { kind: "drawer", x: 73, y: 77, w: 24, contents: ["glass-mother"] },
];

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
      {kind === "decoy" &&
        (owner === "plate" ? (
          <Plate color="var(--wood-light)" big style={style} />
        ) : (
          <Glass color="var(--wood-light)" big style={style} />
        ))}
    </div>
  );
}

export function Ch2Kitchen() {
  const s = useGame();
  const [open, setOpen] = useState<number[]>([]);
  useSceneIntro("ch2k", "Find your plate, glass and cutlery — and Mommy's.", [
    { speaker: "narrator", text: "The kitchen. Everything is put away in the cupboards." },
  ]);
  const remaining = ITEMS.filter((i) => !s.ch2Items.includes(i));
  const cupboardWall = [0, 1, 2, 3, 0] as const;
  const take = (it: string) => {
    if (!s.lightsOn || !s.interactive) return; // cannot collect dishes in darkness
    if (it.startsWith("decoy")) {
      sfx("wrong");
      s.mistake();
      s.say({ speaker: "narrator", text: "That one's far too big. It isn't for you.", ms: 2000 });
      return;
    }
    sfx("chime");
    s.observeChoice(it.replace("-", " for "));
    s.set({ ch2Items: [...s.ch2Items, it] });
  };
  return (
    <Stage
      bg={BG.bgKitchen}
      spread
      bgPos="50% 50%"
      chapter={2}
      chapterCard
      progress={`Tray ${s.ch2Items.length}/6`}
      clues={UNITS.map((u, i) =>
        u.contents.some((c) => remaining.includes(c as ItemId)) && !open.includes(i) ? (
          <OnWall key={i} n={cupboardWall[i] ?? 0}>
          <div
            className="glow-clue absolute rounded-md border-2 border-current"
            style={{
              left: cupboardWall[i] === 0 ? `${u.x}%` : "32%",
              top: `${u.y}%`,
              width: cupboardWall[i] === 0 ? `${u.w}%` : "37%",
              height: u.kind === "door" ? "17.5%" : "9.7%",
            }}
          />
          </OnWall>
        ) : null,
      )}
    >
      {/* cabinet body the doors and drawers are set into */}
      <div
        className="pointer-events-none absolute left-[1.5%] right-[1.5%] top-[58%] h-[31%] rounded-md"
        style={{
          background: "linear-gradient(oklch(0.32 0.04 55), oklch(0.2 0.03 50))",
          boxShadow: "var(--shadow-contact), inset 0 2px 0 oklch(1 0 0 / .15)",
        }}
      />
      {UNITS.map((u, i) => {
        const isOpen = open.includes(i);
        const isFront = cupboardWall[i] === 0;
        const toggle = () => {
          sfx("open");
          if (!isOpen) s.inspect(`kitchen ${u.kind} ${i + 1}`);
          setOpen(isOpen ? open.filter((o) => o !== i) : [...open, i]);
        };
        const aspect = u.kind === "door" ? "4 / 5" : "12 / 7";
        return (
          <OnWall key={i} n={cupboardWall[i] ?? 0}>
          <div
            className="absolute"
            style={{ left: isFront ? `${u.x}%` : "32%", top: `${u.y}%`, width: isFront ? `${u.w}%` : "37%", zIndex: isOpen ? 5 : 1 }}
          >
            {!isOpen ? (
              <button
                aria-label="Open the cupboard"
                className="block w-full"
                style={{ aspectRatio: aspect, touchAction: "manipulation" }}
                onClick={toggle}
              >
                <Cupboard
                  kind={u.kind}
                  open={false}
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </button>
            ) : (
              <div className="relative w-full" style={{ aspectRatio: aspect }}>
                {/* the door / drawer front, swung clear of the opening — tap it to close */}
                {u.kind === "door" ? (
                  <button
                    aria-label="Close the cupboard"
                    onClick={toggle}
                    className="absolute -left-[14%] top-[2%] h-[96%] w-[14%] rounded-sm"
                    style={{
                      backgroundImage: `url(${PROP.door})`,
                      backgroundSize: "cover",
                      backgroundPosition: "right center",
                      filter: "brightness(.7) sepia(.3)",
                      boxShadow: "var(--shadow-contact)",
                    }}
                  />
                ) : (
                  <button
                    aria-label="Close the drawer"
                    onClick={toggle}
                    className="absolute left-[4%] top-full h-[38%] w-[92%] rounded-b-md"
                    style={{
                      backgroundImage: `url(${PROP.drawer})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "sepia(.3)",
                      boxShadow: "var(--shadow-contact)",
                    }}
                  ></button>
                )}
                {/* interior with contents, always on top and tappable */}
                <div
                  className={`absolute inset-0 flex items-center justify-around gap-1 rounded p-1.5 ${u.kind === "door" ? "flex-col" : ""}`}
                  style={{
                    background: "linear-gradient(oklch(0.16 0.02 50), oklch(0.24 0.03 50))",
                    boxShadow: "inset 0 4px 10px oklch(0 0 0 / .6)",
                  }}
                >
                  {u.kind === "door" && (
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 bg-wood-light" />
                  )}
                  {u.contents
                    .filter((c) => !s.ch2Items.includes(c))
                    .map((c) => (
                      <button
                        key={c}
                        onClick={() => take(c)}
                        aria-label={
                          c.startsWith("decoy")
                            ? "A very large dish"
                            : `Take ${c.replace("-", " for ")}`
                        }
                        style={{ minWidth: 44, minHeight: 44, touchAction: "manipulation" }}
                        className={`relative z-10 grid place-items-center ${c.startsWith("decoy") ? "w-[80%]" : u.kind === "door" ? "w-[62%]" : "w-[42%]"}`}
                      >
                        <ItemArt id={c} big={c.startsWith("decoy")} />
                      </button>
                    ))}
                  {u.contents.every((c) => s.ch2Items.includes(c) || c.startsWith("decoy")) &&
                    u.contents.every((c) => !c.startsWith("decoy") || false) && (
                      <span className="font-hand text-xs text-paper/50">empty</span>
                    )}
                </div>
              </div>
            )}
          </div>
          </OnWall>
        );
      })}
      {/* Tray */}
      <div
        className="absolute left-[4%] right-[4%] top-[47%] flex h-[10%] items-center gap-1 rounded-lg px-2"
        style={{
          background: "linear-gradient(oklch(0.32 0.04 55), oklch(0.2 0.03 50))",
          boxShadow: "var(--shadow-contact)",
        }}
      >
        {ITEMS.map((i) => (
          <div key={i} className="grid h-full flex-1 place-items-center">
            {s.ch2Items.includes(i) ? (
              <ItemArt id={i} className="w-[80%] animate-float-up" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-dashed border-paper/50" />
            )}
          </div>
        ))}
      </div>
      {s.ch2Items.length === 6 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[54%] z-20 flex justify-center animate-float-up">
          <button
            className="stitch-btn honey pointer-events-auto whitespace-nowrap text-[clamp(13px,4.2cqw,16px)]"
            onClick={() => {
              sfx("tap");
              s.go("ch2d");
            }}
          >
            Carry the tray to the table
          </button>
        </div>
      )}
    </Stage>
  );
}

export function Ch2Dining() {
  const s = useGame();
  const col = useColors();
  const childLeft = ["bear", "train", "elephant"].includes(s.toyOrder[0]);
  const [sel, setSel] = useState<ItemId | null>(null);
  const [asking, setAsking] = useState(false);
  const [foodInput, setFoodInput] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [third, setThird] = useState(false);
  const [intruders, setIntruders] = useState<number[]>([]);
  const [intruderCount, setIntruderCount] = useState(0);
  const previousLight = useRef(s.lightsOn);
  const blackoutTimer = useRef<number | null>(null);
  const lastPlacement = useRef(0);
  useEffect(
    () => () => {
      if (blackoutTimer.current) clearTimeout(blackoutTimer.current);
    },
    [],
  );
  useEffect(() => {
    const lightsWentOff = previousLight.current && !s.lightsOn;
    previousLight.current = s.lightsOn;
    if (!lightsWentOff || !s.interactive || intruderCount >= 3) return;
    setIntruders((items) => [...items, intruderCount]);
    setIntruderCount((n) => n + 1);
    sfx("creak");
  }, [s.lightsOn, s.interactive, intruderCount]);
  const ended = useRef(false);
  useSceneIntro(
    "ch2d",
    "Set two places: yours and Mommy's. In the dark you can tell which is which.",
    [
      { speaker: "narrator", text: "Two places at the long table. They look exactly the same." },
      ...chooseInterventions(s.facts, 2)
        .filter((i) => i.kind === "line")
        .map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
    ],
  );
  const placed = s.ch2Placed as ItemId[];
  const correct = placed.length;

  const answerFood = async () => {
    const answer = foodInput.trim();
    if (!answer || interpreting) return;
    setInterpreting(true);
    const result = await interpretFavoriteFood(answer);
    const state = useGame.getState();
    state.observeChoice(result.displayFood);
    state.set({ favFood: result.displayFood, interactive: true });
    setAsking(false);
    setInterpreting(false);
    state.say({ speaker: "guest", text: result.monsterLine });
  };

  const punishWrongPlacement = () => {
    const st = useGame.getState();
    if (blackoutTimer.current) return;
    st.set({ forcedBlackout: true, lightsOn: false, flicker: Date.now() });
    st.addCordura(wrongTableBlackoutPenalty()); // Stage pauses its normal ticker.
    sfx("switch");
    blackoutTimer.current = window.setTimeout(() => {
      const latest = useGame.getState();
      if (latest.screen === "ch2d" && !latest.scare)
        latest.set({ forcedBlackout: false, lightsOn: true });
      blackoutTimer.current = null;
    }, GAMEPLAY_RULES.errorBlackoutSeconds * 1000);
  };
  const place = (side: "L" | "R") => {
    if (!sel || !s.lightsOn || !s.interactive || s.forcedBlackout) {
      if (!s.lightsOn)
        s.say({
          speaker: "narrator",
          text: "You can't see well enough to set the table. Turn the light on.",
          ms: 2400,
        });
      return;
    }
    const owner: Owner = (side === "L") === childLeft ? "child" : "mother";
    if (placed.includes(sel)) {
      setSel(null);
      return;
    }
    if (sel.endsWith(owner)) {
      sfx("chime");
      s.success();
      if (Date.now() - lastPlacement.current < 1000) sfx("creak");
      lastPlacement.current = Date.now();
      s.set({ ch2Placed: [...placed, sel] });
      setSel(null);
      if (placed.length + 1 === 3 && !s.favFood)
        window.setTimeout(() => {
          useGame.getState().set({ interactive: false });
          setAsking(true);
          sfx("whisper");
        }, 600);
    } else {
      sfx("wrong");
      s.mistake();
      setSel(null);
      punishWrongPlacement();
    }
  };

  useEffect(() => {
    if (correct === 6 && intruderCount > 0 && intruders.length === 0 && !ended.current) {
      ended.current = true;
      s.set({ interactive: false, objective: "" });
      window.setTimeout(() => {
        sfx("switch");
        useGame.getState().set({ flicker: Date.now() });
        setThird(true);
        sfx("creak");
      }, 1200);
      window.setTimeout(
        () =>
          useGame.getState().say([
            { speaker: "narrator", text: "There are three places at the table now." },
            {
              speaker: "guest",
              text: `I set one for me. I made your ${useGame.getState().favFood}. Same colour as yours.`,
            },
            { speaker: "narrator", text: "Upstairs, a music box starts to play." },
          ]),
        2200,
      );
      window.setTimeout(() => useGame.getState().go("ch3"), 13000);
    }
  }, [correct, intruderCount, intruders.length]);

  const Mat = ({ side, x }: { side: "L" | "R"; x: number }) => {
    const owner: Owner = (side === "L") === childLeft ? "child" : "mother";
    const mine = placed.filter((p) => p.endsWith(owner));
    return (
      <button
        aria-label={`Place at the ${side === "L" ? "left" : "right"} seat`}
        onClick={() => place(side)}
        className={`absolute z-10 grid min-h-12 w-[34%] -translate-x-1/2 place-items-center rounded-[50%] touch-manipulation transition-[outline,background-color,box-shadow] duration-150 active:scale-[0.98] focus-visible:outline-4 focus-visible:outline-honey ${sel ? "ring-2 ring-honey/80" : ""}`}
        style={{
          left: `${x}%`,
          top: "54%",
          height: "11%",
          touchAction: "manipulation",
          background: "oklch(0.92 0.03 85 / .9)",
          outline: sel ? "3px dashed var(--honey)" : "2px dashed oklch(0.7 0.04 70)",
          outlineOffset: -6,
          boxShadow: "var(--shadow-contact)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-3">
          {(["cutlery", "plate", "glass"] as ItemKind[]).map((k) => {
            const id = `${k}-${owner}`;
            return mine.includes(id as ItemId) ? (
              <ItemArt key={k} id={id} className={k === "plate" ? "w-[45%]" : "w-[22%]"} />
            ) : null;
          })}
        </div>
      </button>
    );
  };

  return (
    <Stage
      bg={BG.bgDining}
      bgPos="50% 50%"
      chapter={2}
      progress={`Table ${correct}/6`}
      guest={{ x: 50, y: 22, h: 46, show: correct >= 1 }}
      clues={
        <>
          {(["L", "R"] as const).map((side) => {
            const owner: Owner = (side === "L") === childLeft ? "child" : "mother";
            const x = side === "L" ? 25 : 75;
            return (
              <div
                key={side}
                className="glow-clue absolute -translate-x-1/2 text-center"
                style={{ left: `${x}%`, top: "45%" }}
              >
                {owner === "child" ? (
                  <svg viewBox="0 0 40 40" className="mx-auto w-12" aria-hidden>
                    <path
                      d="M20 4 L25 15 L37 15 L27 23 L31 35 L20 28 L9 35 L13 23 L3 15 L15 15 Z"
                      fill={col.child}
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 40 50" className="mx-auto w-11" aria-hidden>
                    <path
                      d="M14 4 L26 4 L28 14 L38 46 L2 46 L12 14 Z"
                      fill={col.mother}
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
                <span className="font-hand text-sm">
                  {owner === "child" ? (s.name || "you").slice(0, 1) : "M"}
                </span>
              </div>
            );
          })}
        </>
      }
    >
      {/* Seat colors match the player's answer and the dress from Mom's introduction. */}
      <div
        className="pointer-events-none absolute left-[15%] top-[41%] h-[10%] w-[22%] rounded-t-lg border-4 border-wood shadow-md"
        style={{ backgroundColor: childLeft ? col.child : col.mother }}
      />
      <div
        className="pointer-events-none absolute right-[15%] top-[41%] h-[10%] w-[22%] rounded-t-lg border-4 border-wood shadow-md"
        style={{ backgroundColor: childLeft ? col.mother : col.child }}
      />
      <Mat side="L" x={25} />
      <Mat side="R" x={75} />
      {/* The Guest's plate, fork and glass appear one per blackout, removable in light. */}
      {intruders.map((id) => (
        <button
          key={id}
          type="button"
          disabled={!s.lightsOn || !s.interactive}
          aria-label={"Remove corrupt " + (["plate", "fork", "glass"][id] ?? "utensil")}
          onClick={() => {
            sfx("chime");
            setIntruders((items) => items.filter((i) => i !== id));
          }}
          className="absolute z-20 grid h-[8%] w-[13%] place-items-center rounded-lg border-2 border-crimson bg-void text-2xl text-paper disabled:opacity-50"
          style={{ left: 34 + id * 15 + "%", top: "33%" }}
        >
          {["🍽️", "🍴", "🥛"][id]}
        </button>
      ))}
      {third && (
        <div className="absolute left-1/2 top-[52%] w-[22%] -translate-x-1/2 animate-float-up text-center">
          <Plate color={col.child} style={{ width: "100%" }} />
          <p className="font-hand text-xs leading-tight text-paper drop-shadow">{s.favFood}</p>
        </div>
      )}
      {/* Tray */}
      <div
        className="absolute bottom-[3%] left-[4%] right-[4%] flex h-[10%] items-center justify-center gap-1 rounded-lg px-2"
        style={{
          background: "linear-gradient(oklch(0.32 0.04 55), oklch(0.2 0.03 50))",
          boxShadow: "var(--shadow-contact)",
        }}
      >
        {/* fixed slot width: pieces keep their size as the tray empties */}
        {(s.ch2Items as ItemId[])
          .filter((i) => !placed.includes(i))
          .map((i) => (
            <button
              key={i}
              onClick={() => {
                if (!s.interactive || !s.lightsOn || s.forcedBlackout) return;
                sfx("tap");
                if (sel !== i) s.observeChoice(i.replace("-", " for "));
                setSel(sel === i ? null : i);
              }}
              aria-label={`Pick ${i}`}
              className={`flex h-full min-h-12 w-[15.5%] shrink-0 touch-manipulation items-center justify-center rounded-lg border-2 transition-[border-color,background-color,box-shadow] duration-100 active:scale-[0.96] focus-visible:outline-4 focus-visible:outline-honey ${sel === i ? "border-honey bg-honey/50 ring-2 ring-honey/70" : "border-transparent hover:bg-paper/20"}`}
            >
              <ItemArt id={i} className="mx-auto w-[85%]" />
            </button>
          ))}
      </div>
      {asking && (
        <div className="absolute inset-x-[6%] top-[14%] z-20 paper animate-float-up p-5">
          <p className="font-display text-lg italic">"What do you like to eat best?"</p>
          <p className="mt-1 text-xs opacity-60">The voice comes from under the table.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void answerFood();
            }}
          >
            <label className="sr-only" htmlFor="favourite-food">
              Your favourite food
            </label>
            <input
              id="favourite-food"
              autoFocus
              maxLength={120}
              value={foodInput}
              onChange={(event) => setFoodInput(event.target.value)}
              disabled={interpreting}
              placeholder="Type anything…"
              className="min-w-0 flex-1 rounded border border-ink/30 bg-paper px-3 py-2 font-hand text-sm text-ink outline-none focus:border-crimson"
            />
            <button
              type="submit"
              disabled={!foodInput.trim() || interpreting}
              className="stitch-btn sage text-sm disabled:opacity-50"
            >
              {interpreting ? "Listening…" : "Tell it"}
            </button>
          </form>
          <p className="mt-2 text-[10px] opacity-50">
            If the house cannot reach Gemini, it remembers using local rules.
          </p>
        </div>
      )}
    </Stage>
  );
}
