import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioSplash } from "./StudioSplash";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("studio opening", () => {
  it("holds the logo after loading, then enters the game", () => {
    const done = vi.fn();
    render(<StudioSplash onComplete={done} />);
    fireEvent.load(screen.getByAltText("M.U.F.I studio"));
    act(() => vi.advanceTimersByTime(2599));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledOnce();
  });
  it("allows a tap to skip", () => {
    const done = vi.fn();
    render(<StudioSplash onComplete={done} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue to Mommy Will Be Back" }));
    expect(done).toHaveBeenCalledOnce();
  });
  it("does not strand players if the image never loads", () => {
    const done = vi.fn();
    render(<StudioSplash onComplete={done} />);
    act(() => vi.advanceTimersByTime(7000));
    expect(done).toHaveBeenCalledOnce();
  });
  it("cleans up opening timers on unmount", () => {
    const done = vi.fn();
    const { unmount } = render(<StudioSplash onComplete={done} />);
    fireEvent.load(screen.getByAltText("M.U.F.I studio"));
    unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(done).not.toHaveBeenCalled();
  });
});