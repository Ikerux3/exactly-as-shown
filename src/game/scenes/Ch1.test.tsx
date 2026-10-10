import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const model = vi.hoisted(() => ({ state: {} as any, listeners: new Set<() => void>() }));
vi.mock("../store", async () => {
  const React = await import("react");
  const useGame = Object.assign(() => React.useSyncExternalStore(
    (listener) => { model.listeners.add(listener); return () => model.listeners.delete(listener); },
    () => model.state,
  ), { getState: () => model.state });
  return { useGame, saveCheckpoint: vi.fn(), TOY_LABEL: { bear: "bear", rabbit: "rabbit", train: "train", doll: "doll", elephant: "elephant" } };
});
vi.mock("../Stage", async () => {
  const React = await import("react");
  const Wall = React.createContext(0);
  return {
    useWall: () => React.useContext(Wall),
    OnWall: ({ n, children }: any) => React.useContext(Wall) === n ? children : null,
    Stage: ({ children }: any) => {
      const [wall, setWall] = React.useState(0);
      return <Wall.Provider value={wall}><button onClick={() => setWall((wall + 1) % 4)}>Turn wall</button>{children}</Wall.Provider>;
    },
  };
});
vi.mock("../kit", () => ({ useSceneIntro: vi.fn() }));
vi.mock("../audio", () => ({ sfx: vi.fn() }));
vi.mock("../guest", () => ({ chooseInterventions: () => [] }));
vi.mock("../ai/food", () => ({ interpretFavoriteFood: vi.fn() }));
vi.mock("../fx", () => ({ JumpScare: () => null }));
vi.mock("../DialogueVoice", () => ({ useSpokenPrompt: vi.fn() }));
vi.mock("../ai/questions", () => ({ adaptiveQuestion: vi.fn(), currentQuestionContext: vi.fn(), offlineAdaptiveQuestion: vi.fn() }));
vi.mock("../assets", () => ({ MUSICBOX: "musicbox.png", WALLS: { room: ["room", "window", "coat", "shelves"] }, PROP2: {}, PROP3: {}, SCARE: {}, BG: { bgPlayroom: "room" }, PROP: {}, toyImageFor: (toy: string) => "/" + toy + ".png" }));
vi.mock("../Props", () => ({ Cupboard: () => null, Cushion: () => null, Cutlery: () => null, Dresser: () => null, Glass: () => null, Plate: () => null, ToyBox: () => <div data-testid="toybox" /> }));
import { Ch1 } from "./Ch1Ch2";
import { saveCheckpoint } from "../store";

function update(patch: any) { model.state = { ...model.state, ...patch }; model.listeners.forEach((fn) => fn()); }
function pick(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
  act(() => vi.advanceTimersByTime(220));
}
function turn(times = 1) { for (let i = 0; i < times; i++) fireEvent.click(screen.getByText("Turn wall")); }
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(saveCheckpoint).mockClear();
  model.state = {
    screen: "ch1", toyOrder: ["bear", "rabbit", "train", "doll", "elephant"],
    ch1: [], interactive: true, lightsOn: true, paused: false, scare: false, facts: {},
    set: update, fact: (fact: any) => update({ facts: { ...model.state.facts, ...fact } }),
    observeChoice: vi.fn(), inspect: vi.fn(), say: vi.fn(), go: vi.fn(),
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); model.listeners.clear(); });

describe("MG01 first pickup escape", () => {
  it("does not grant another escape to a resumed older save with stored toys", () => {
    model.state.ch1 = ["bear"];
    render(<Ch1 />);
    turn(2);
    pick("Pick up the elephant");
    expect(model.state.ch1).toEqual(["bear", "elephant"]);
    expect(model.state.toyEscape).toBeUndefined();
    expect(saveCheckpoint).toHaveBeenCalledOnce();
  });
  it("lets the first pickup on the jacket wall escape from its chest once on that wall", () => {
    render(<Ch1 />);
    turn(2);
    pick("Pick up the elephant");
    expect(model.state.toyEscape).toMatchObject({ toy: "elephant", wall: 2, y: 82, recovered: false });
    expect(screen.getByRole("button", { name: "Pick up the escaped elephant" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    turn(4);
    const walker = document.querySelector(".mg01-exit-and-walk") as HTMLElement;
    expect(parseFloat(walker.style.animationDelay)).toBeLessThan(-1);
    pick("Pick up the escaped elephant");
    turn(2);
    pick("Pick up the bear");
    expect(model.state.ch1).toEqual(["elephant", "bear"]);
    expect(model.state.toyEscape).toMatchObject({ toy: "elephant", recovered: true });
  });

  it("accepts one action for repeated taps, remembers its wall, recovers once and preserves it after remount", () => {
    const view = render(<Ch1 />);
    expect(screen.getByTestId("toybox")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Pick up the bear" });
    fireEvent.click(button); fireEvent.click(button);
    act(() => vi.advanceTimersByTime(220));
    expect(model.state.toyEscape).toMatchObject({ toy: "bear", wall: 0, recovered: false });
    expect(model.state.ch1).toEqual([]);
    expect(model.state.observeChoice).toHaveBeenCalledTimes(1);
    turn();
    expect(screen.queryByTestId("toybox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Pick up the escaped bear" })).toBeNull();
    turn(3);
    expect(screen.getByTestId("toybox")).toBeInTheDocument();
    pick("Pick up the escaped bear");
    expect(model.state.ch1).toEqual(["bear"]);
    expect(model.state.toyEscape.recovered).toBe(true);
    expect(saveCheckpoint).toHaveBeenCalledTimes(2);
    view.unmount(); render(<Ch1 />);
    expect(screen.queryByRole("button", { name: "Pick up the escaped bear" })).toBeNull();
  });

  it("has two light-visible toys by door/jacket and completes all five without catapult at any speed", () => {
    render(<Ch1 />);
    pick("Pick up the bear");
    expect(document.querySelector(".mg01-exit-and-walk")).toBeInTheDocument();
    expect(model.state.toyEscape.escapedAt).toEqual(expect.any(Number));
    pick("Pick up the escaped bear");
    turn(); fireEvent.click(screen.getByRole("button", { name: "Open the drawer" })); pick("Pick up the train");
    turn();
    expect(screen.getByRole("button", { name: "Pick up the elephant" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pick up the doll" })).toBeNull();
    expect(screen.getByRole("button", { name: "Move the jacket" })).toHaveStyle({ left: "20%", top: "35%" });
    expect(document.querySelector('[data-toy="elephant"]')).toHaveStyle({ left: "59%", top: "82%" });
    fireEvent.click(screen.getByRole("button", { name: "Move the jacket" }));
    expect(document.querySelector('[data-toy="doll"]')).toHaveStyle({ left: "36%", top: "50%" });
    pick("Pick up the doll"); pick("Pick up the elephant");
    turn(); fireEvent.click(screen.getByRole("button", { name: "Move the cushion" })); pick("Pick up the rabbit");
    expect(new Set(model.state.ch1).size).toBe(5);
    expect(model.state.ch1).toHaveLength(5);
    act(() => vi.advanceTimersByTime(11000));
    expect(model.state.go).toHaveBeenCalledExactlyOnceWith("ch2k");
  });

  it("blocks pickups in darkness/pause, resumes in light without releasing stored toys, cancels pending work on unmount", () => {
    const view = render(<Ch1 />);
    act(() => update({ lightsOn: false }));
    fireEvent.click(screen.getByRole("button", { name: "Pick up the bear" }));
    act(() => vi.advanceTimersByTime(500));
    expect(model.state.toyEscape).toBeUndefined();
    act(() => update({ lightsOn: true, paused: true }));
    fireEvent.click(screen.getByRole("button", { name: "Pick up the bear" }));
    act(() => vi.advanceTimersByTime(500));
    expect(model.state.toyEscape).toBeUndefined();
    act(() => update({ paused: false }));
    pick("Pick up the bear"); pick("Pick up the escaped bear");
    act(() => update({ lightsOn: false }));
    act(() => update({ lightsOn: true }));
    expect(model.state.ch1).toEqual(["bear"]);
    turn(); fireEvent.click(screen.getByRole("button", { name: "Open the drawer" }));
    fireEvent.click(screen.getByRole("button", { name: "Pick up the train" }));
    view.unmount(); act(() => vi.advanceTimersByTime(500));
    expect(model.state.ch1).toEqual(["bear"]);
  });
});
