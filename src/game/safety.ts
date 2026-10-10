/**
 * Small, deterministic text-safety layer shared by browser and server code.
 * It deliberately checks whole words so innocent names such as Cassandra are
 * not rejected, while also normalising accents, common leetspeak and spaced
 * or punctuated spellings.
 */

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

const PROFANITY = [
  /^(?:fuck|fucks|fucked|fucker|fuckers|fucking|motherfucker|motherfuckers)$/u,
  /^(?:shit|shits|shitty|bullshit)$/u,
  /^(?:bitch|bitches|bastard|bastards)$/u,
  /^(?:cunt|cunts|dick|dicks|cock|cocks|pussy|pussies)$/u,
  /^(?:asshole|assholes|whore|whores|slut|sluts)$/u,
  /^(?:puta|putas|puto|putos|mierda|mierdas|joder|jodete)$/u,
  /^(?:cono|conos|cabron|cabrones|gilipollas|maricon|maricones)$/u,
  /^(?:zorra|zorras|polla|pollas|verga|vergas|hostia|hostias)$/u,
];

const UNSAFE_TOPICS = [
  /^(?:kill|kills|killed|killing|murder|murders|murdered|suicide|suicidal)$/u,
  /^(?:sex|sexual|porn|porno|weapon|weapons|gun|guns|knife|knives|blood|bloody|gore)$/u,
  /^(?:matar|mata|matas|maten|asesinar|asesino|suicidio|suicida)$/u,
  /^(?:sexo|sexual|arma|armas|pistola|pistolas|cuchillo|cuchillos|sangre)$/u,
];

const PROMPT_CONTROL = /^(?:ignore|instruction|instructions|prompt|system|secret|secrets)$/u;

const OBFUSCATED = [
  /(?:^|[^a-z])f[^a-z]*u[^a-z]*c[^a-z]*k(?:[^a-z]|$)/u,
  /(?:^|[^a-z])s[^a-z]*h[^a-z]*i[^a-z]*t(?:[^a-z]|$)/u,
  /(?:^|[^a-z])b[^a-z]*i[^a-z]*t[^a-z]*c[^a-z]*h(?:[^a-z]|$)/u,
  /(?:^|[^a-z])c[^a-z]*u[^a-z]*n[^a-z]*t(?:[^a-z]|$)/u,
  /(?:^|[^a-z])p[^a-z]*u[^a-z]*t[^a-z]*[ao](?:[^a-z]|$)/u,
  /(?:^|[^a-z])m[^a-z]*i[^a-z]*e[^a-z]*r[^a-z]*d[^a-z]*a(?:[^a-z]|$)/u,
];

function normalise(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[013457@$]/g, (character) => LEET[character] ?? character);
}

function words(value: string): string[] {
  return normalise(value).match(/\p{L}+/gu) ?? [];
}

export function containsProfanity(value: string): boolean {
  const normalised = normalise(value);
  return (
    OBFUSCATED.some((pattern) => pattern.test(normalised)) ||
    words(normalised).some((word) => PROFANITY.some((pattern) => pattern.test(word)))
  );
}

export function containsUnsafeContent(value: string): boolean {
  return (
    containsProfanity(value) ||
    words(value).some((word) => UNSAFE_TOPICS.some((pattern) => pattern.test(word)))
  );
}

export function containsPromptControl(value: string): boolean {
  return words(value).some((word) => PROMPT_CONTROL.test(word));
}

export function safePlayerText(value: string | undefined, fallback: string): string {
  const clean = value?.trim();
  return clean && !containsUnsafeContent(clean) ? clean : fallback;
}
