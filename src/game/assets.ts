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

export const BG = {
  bgTitle,
  bgPlayroom,
  bgKitchen,
  bgDining,
  bgBedroom,
  bgMother,
  bgBathroom,
  bgHallway,
};
export const TOY_IMG: Record<ToyId, string> = { bear, rabbit, train, doll, elephant };
export function toyImageFor(toy: ToyId, customSlot?: ToyId, customImage?: string): string {
  return customImage && toy === customSlot ? customImage : TOY_IMG[toy];
}
export const MUSICBOX = musicbox;
export const CUT = { eyes: cutEyes, guest: cutGuest, hand: cutHand };

/** Warm the browser cache so rooms don't flash black when a chapter starts. */
let preloaded = false;
export function preloadArt() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  const urls = [
    ...Object.values(BG),
    ...Object.values(WALLS).flat(),
    ...Object.values(PROP2),
    ...Object.values(TOY_IMG),
    MUSICBOX,
    ...Object.values(CUT),
  ];
  const load = () =>
    urls.forEach((u) => {
      const i = new Image();
      i.decoding = "async";
      i.src = u;
    });
  // Let the title screen paint first, then fetch the rest in the background.
  setTimeout(load, 600);
}
import cutPlate from "@/assets/cut-plate.png";
import cutGlass from "@/assets/cut-glass.png";
import cutCutlery from "@/assets/cut-cutlery.png";
import cutDoor from "@/assets/cut-door.jpg";
import cutDrawer from "@/assets/cut-drawer.jpg";
import cutToybox from "@/assets/cut-toybox.png";
import cutCushion from "@/assets/cut-cushion.png";
import cutClock from "@/assets/cut-clock.png";
export const PROP = {
  plate: cutPlate,
  glass: cutGlass,
  cutlery: cutCutlery,
  door: cutDoor,
  drawer: cutDrawer,
  toybox: cutToybox,
  cushion: cutCushion,
  clock: cutClock,
};
import cutDresser from "@/assets/cut-dresser.png";
import cutPhotoframe from "@/assets/cut-photoframe.png";
import cutTrinketbox from "@/assets/cut-trinketbox.png";
import cutPajamas from "@/assets/cut-pajamas.png";
import cutToothbrush from "@/assets/cut-toothbrush.png";
import cutKey from "@/assets/cut-key.png";
import cutSwitch from "@/assets/cut-switch.png";
export const PROP2 = { dresser: cutDresser, photoframe: cutPhotoframe, trinketbox: cutTrinketbox, pajamas: cutPajamas, toothbrush: cutToothbrush, key: cutKey, switch: cutSwitch };
import pr1 from "@/assets/bg-playroom-1.jpg";
import pr2 from "@/assets/bg-playroom-2.jpg";
import pr3 from "@/assets/bg-playroom-3.jpg";
import ki1 from "@/assets/bg-kitchen-1.jpg";
import ki2 from "@/assets/bg-kitchen-2.jpg";
import ki3 from "@/assets/bg-kitchen-3.jpg";
import di1 from "@/assets/bg-dining-1.jpg";
import di2 from "@/assets/bg-dining-2.jpg";
import di3 from "@/assets/bg-dining-3.jpg";
import be1 from "@/assets/bg-bedroom-1.jpg";
import be2 from "@/assets/bg-bedroom-2.jpg";
import be3 from "@/assets/bg-bedroom-3.jpg";
import ba1 from "@/assets/bg-bathroom-1.jpg";
import ba2 from "@/assets/bg-bathroom-2.jpg";
import ba3 from "@/assets/bg-bathroom-3.jpg";
import mo1 from "@/assets/bg-mother-1.jpg";
import mo2 from "@/assets/bg-mother-2.jpg";
import mo3 from "@/assets/bg-mother-3.jpg";
/** The four sides of each room: [front, right, back, left]. */
export const WALLS: Record<string, string[]> = {
  [bgPlayroom]: [bgPlayroom, pr1, pr2, pr3],
  [bgKitchen]: [bgKitchen, ki1, ki2, ki3],
  [bgDining]: [bgDining, di1, di2, di3],
  [bgBedroom]: [bgBedroom, be1, be2, be3],
  [bgBathroom]: [bgBathroom, ba1, ba2, ba3],
  [bgMother]: [bgMother, mo1, mo2, mo3],
};
import cutFace1 from "@/assets/cut-face1.png";
import cutFace2 from "@/assets/cut-face2.png";
import cutSmile from "@/assets/cut-smile.png";
import cutBigplate from "@/assets/cut-bigplate.png";
import cutBasket from "@/assets/cut-basket.png";
import cutShirt from "@/assets/cut-shirt.png";
import cutPants from "@/assets/cut-pants.png";
import cutSocks from "@/assets/cut-socks.png";
import cutBread from "@/assets/cut-bread.png";
import bgTabletop from "@/assets/bg-tabletop.jpg";
/** Collage jumpscare cut-outs (faces, eyes, the Guest's smile). */
export const SCARE = { face1: cutFace1, face2: cutFace2, smile: cutSmile };
/** Late-chapter photo cut-outs. */
export const PROP3 = { bigplate: cutBigplate, basket: cutBasket, shirt: cutShirt, pants: cutPants, socks: cutSocks, bread: cutBread, tabletop: bgTabletop };
if (typeof window !== "undefined") {
  for (const src of [...Object.values(SCARE), ...Object.values(PROP3)]) {
    const i = new Image();
    i.src = src;
  }
}
