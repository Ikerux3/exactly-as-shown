import { beforeEach, describe, expect, it } from "vitest";
import { clearProfile, loadProfile, saveProfile } from "@/game/profile";

describe("character profile", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips the look and cleans the name", () => {
    saveProfile({ name: "  mateo123 ", look: { body: "boy", skin: "brown", hair: "curly", hairColor: "black" } });
    expect(loadProfile()).toEqual({
      name: "Mateo",
      look: { body: "boy", skin: "brown", hair: "curly", hairColor: "black" },
    });
  });

  it("keeps a character without a name (the intro will ask for it)", () => {
    saveProfile({ name: "", look: { body: "girl", skin: "deep", hair: "pigtails", hairColor: "ginger" } });
    expect(loadProfile()?.name).toBe("");
  });

  it("ignores missing, corrupt or unknown looks", () => {
    expect(loadProfile()).toBeNull();
    localStorage.setItem("mwbb-profile-v1", "{oops");
    expect(loadProfile()).toBeNull();
    localStorage.setItem("mwbb-profile-v1", JSON.stringify({ name: "Ada", look: { body: "cat", skin: "light", hair: "bob", hairColor: "brown" } }));
    expect(loadProfile()).toBeNull();
  });

  it("can be forgotten", () => {
    saveProfile({ name: "Ada", look: { body: "girl", skin: "light", hair: "bob", hairColor: "brown" } });
    clearProfile();
    expect(loadProfile()).toBeNull();
  });
});
