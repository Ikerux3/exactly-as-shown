// Character creator (title menu): a paper doll pinned over the playroom, and a scrap of paper
// with the choices. Purely cosmetic, plus the name so the intro doesn't have to ask for it.
import { useState, type ReactNode } from "react";
import { BG } from "../assets";
import { sanitizeName } from "../store";
import { sfx } from "../audio";
import { ChildDoll } from "../Props";
import { Ransom } from "../fx";
import {
  BODIES, DEFAULT_LOOK, HAIR_COLOR, HAIR_COLORS, HAIRS, SKIN, SKINS, clearProfile, saveProfile,
  type HairStyle, type Look, type Profile,
} from "../profile";

const HAIR_LABEL: Record<HairStyle, string> = { short: "Short", curly: "Curly", bob: "Bob", pigtails: "Pigtails" };
/** The creator doesn't know your favourite colour yet: the doll wears faded denim until the intro. */
const PREVIEW_CLOTHES = "oklch(0.55 0.06 240)";

export function CharacterCreator({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const [look, setLook] = useState<Look>(profile?.look ?? DEFAULT_LOOK);
  const [raw, setRaw] = useState(profile?.name ?? "");
  const name = sanitizeName(raw);
  const invalidName = !!raw.trim() && !name;
  const pick = (patch: Partial<Look>) => { sfx("tap"); setLook((l) => ({ ...l, ...patch })); };
  const done = () => { if (invalidName) return; saveProfile({ name, look }); sfx("chime"); onClose(); };

  return (
    <div className="absolute inset-0" role="dialog" aria-label="Your character">
      <img src={BG.bgPlayroom} alt="" className="scene-bg" style={{ objectPosition: "35% 50%" }} />
      <div className="absolute inset-0 bg-void/45" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 32%, oklch(0.9 0.1 80 / .22), transparent 55%)" }} />

      <div className="absolute inset-x-0 top-[3.5%] text-center text-[6.5cqw]"><Ransom text="who are you?" seed={11} /></div>

      {/* the doll, pinned up like a cut-out on the playroom wall */}
      <div className="absolute left-1/2 top-[11%] h-[27%] -translate-x-1/2">
        <div className="absolute -bottom-[2%] left-1/2 h-[5%] w-[90%] -translate-x-1/2 rounded-[50%] bg-void/50 blur-[3px]" />
        <ChildDoll key={`${look.body}-${look.hair}`} look={look} clothes={PREVIEW_CLOTHES} className="relative h-full animate-float-up" />
      </div>

      <div className="absolute inset-x-[5%] bottom-[2.5%] max-h-[59%] overflow-y-auto">
        <div className="paper space-y-2 px-4 py-3">
          <Row label="Name" htmlFor="cc-name">
            <input id="cc-name" value={raw} maxLength={14} onChange={(e) => setRaw(e.target.value)}
              aria-invalid={invalidName} aria-describedby={invalidName ? "cc-name-error" : undefined}
              placeholder="Mommy will ask you" autoComplete="off" autoCapitalize="words" enterKeyHint="done"
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="w-full rounded-md border-2 border-dashed border-wood-light bg-paper-deep/60 px-2.5 py-1.5 font-hand text-lg text-ink outline-none focus:border-honey" />
          </Row>
          {invalidName && <p id="cc-name-error" className="text-right text-xs text-crimson" role="alert">That name can't be used.</p>}
          <Row label="I'm a">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Boy or girl">
              {BODIES.map((b) => (
                <Choice key={b} on={look.body === b} onClick={() => pick({ body: b })}>{b === "boy" ? "Boy" : "Girl"}</Choice>
              ))}
            </div>
          </Row>
          <Row label="Skin">
            <div className="flex gap-2" role="radiogroup" aria-label="Skin colour">
              {SKINS.map((k) => <Swatch key={k} color={SKIN[k]} on={look.skin === k} label={k} onClick={() => pick({ skin: k })} />)}
            </div>
          </Row>
          <Row label="Hair">
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Hairstyle">
              {HAIRS.map((h) => (
                <button key={h} type="button" role="radio" aria-checked={look.hair === h} aria-label={HAIR_LABEL[h]}
                  onClick={() => pick({ hair: h })}
                  className={`relative grid place-items-center overflow-hidden rounded-md pb-1 pt-0.5 transition ${look.hair === h ? "bg-honey/45 ring-2 ring-ink" : "bg-paper-deep/70"}`}>
                  {/* just the head of the doll, with that hairstyle */}
                  <span className="relative block h-8 w-8 overflow-hidden">
                    <ChildDoll look={{ ...look, hair: h }} clothes={PREVIEW_CLOTHES} className="absolute left-1/2 top-0 h-[300%] -translate-x-1/2" />
                  </span>
                  <span className="font-hand text-[11px] leading-none">{HAIR_LABEL[h]}</span>
                </button>
              ))}
            </div>
          </Row>
          <Row label="Colour">
            <div className="flex gap-2" role="radiogroup" aria-label="Hair colour">
              {HAIR_COLORS.map((c) => <Swatch key={c} color={HAIR_COLOR[c]} on={look.hairColor === c} label={`${c} hair`} onClick={() => pick({ hairColor: c })} />)}
            </div>
          </Row>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" className="stitch-btn py-2" onClick={() => { sfx("tap"); onClose(); }}>Back</button>
            <button type="button" className="stitch-btn honey py-2" onClick={done} disabled={invalidName}>That's me</button>
          </div>
          {profile && (
            <button type="button" className="mx-auto block font-hand text-xs leading-none underline opacity-60"
              onClick={() => { clearProfile(); sfx("whisper"); onClose(); }}>
              Forget this character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[3.6rem_1fr] items-center gap-2">
      <label htmlFor={htmlFor} className="font-crayon text-[15px] leading-none text-crimson">{label}</label>
      {children}
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={`chip py-1.5 font-display text-sm transition ${on ? "bg-honey ring-2 ring-ink" : "opacity-80"}`}
      style={on ? { background: "var(--honey)" } : undefined}>
      {children}
    </button>
  );
}

function Swatch({ color, on, label, onClick }: { color: string; on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} aria-label={label} onClick={onClick}
      className={`h-7 w-7 shrink-0 rounded-full shadow-md transition ${on ? "scale-110 ring-[3px] ring-ink ring-offset-2 ring-offset-paper" : ""}`}
      style={{ background: color, outline: "2px dashed oklch(1 0 0 / .55)", outlineOffset: -5 }} />
  );
}
