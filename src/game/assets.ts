import bgTitle from "@/assets/bg-title.jpg";
import bgPlayroom from "@/assets/bg-playroom.jpg";
import bgKitchen from "@/assets/bg-kitchen.jpg";
import bgDining from "@/assets/bg-dining.jpg";
import bgBedroom from "@/assets/bg-bedroom.jpg";
import bgMother from "@/assets/bg-mother.jpg";
import bgBathroom from "@/assets/bg-bathroom.jpg";
import bgHallway from "@/assets/bg-hallway.jpg";
import bear from "@/assets/toy-bear.png";
import rabbit from "@/assets/toy-rabbit.png";
import train from "@/assets/toy-train.png";
import doll from "@/assets/toy-doll.png";
import elephant from "@/assets/toy-elephant.png";
import musicbox from "@/assets/musicbox.png";
import cutEyes from "@/assets/cut-eyes.png";
import cutGuest from "@/assets/cut-guest.png";
import cutHand from "@/assets/cut-hand.png";
import type { ToyId } from "./store";

export const BG = { bgTitle, bgPlayroom, bgKitchen, bgDining, bgBedroom, bgMother, bgBathroom, bgHallway };
export const TOY_IMG: Record<ToyId, string> = { bear, rabbit, train, doll, elephant };
export const MUSICBOX = musicbox;
export const CUT = { eyes: cutEyes, guest: cutGuest, hand: cutHand };

/** Warm the browser cache so rooms don't flash black when a chapter starts. */
let preloaded = false;
export function preloadArt() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  const urls = [...Object.values(BG), ...Object.values(TOY_IMG), MUSICBOX, ...Object.values(CUT)];
  const load = () => urls.forEach((u) => { const i = new Image(); i.decoding = "async"; i.src = u; });
  // Let the title screen paint first, then fetch the rest in the background.
  setTimeout(load, 600);
}
