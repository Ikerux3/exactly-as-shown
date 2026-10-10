import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPLASH_MS, StudioSplash } from "./StudioSplash";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("studio opening", () => {
  it("fades out automatically without waiting for a tap or the image", () => {
    const done = vi.fn();
    render(<StudioSplash onComplete={done} />);
    act(() => vi.advanceTimersByTime(SPLASH_MS - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledOnce();
  });
  it("stays short", () => {
    expect(SPLASH_MS).toBeLessThanOrEqual(2000);
  });
  it("allows a tap to skip", () => {
    const done = vi.fn();
    render(<StudioSplash onComplete={done} />);
    fireEvent.pointerDown(screen.getByTestId("studio-splash"));
    expect(done).toHaveBeenCalled();
  });
  it("cleans up its timer on unmount", () => {
    const done = vi.fn();
    const { unmount } = render(<StudioSplash onComplete={done} />);
    unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(done).not.toHaveBeenCalled();
  });
});
