// External preference anchors for first-time onboarding (cold-start problem).
// These are WELL-KNOWN games from the broader gaming world used ONLY to infer
// taste. They are NOT marketplace games: never purchasable, never listed in
// discovery, never stored as Game rows. Only their genre/tag metadata feeds
// the interest profile (see domain.ts). Covers are emoji art rendered by the
// frontend — no binaries, no fake marketplace metadata.

export interface PreferenceGame {
  id: string;
  name: string;
  /** Emoji art shown on the onboarding card (no image binaries needed). */
  art: string;
  /** Card gradient (both themes legible; decorative only). */
  gradient: string;
  genres: string[];
  tags: string[];
}

export const MAX_ONBOARDING_SELECTIONS = 5;

export const PREFERENCE_GAMES: PreferenceGame[] = [
  { id: 'hades', name: 'Hades', art: '🔥', gradient: 'linear-gradient(135deg,#7f1d1d,#ea580c)', genres: ['Action', 'Roguelike'], tags: ['Indie', 'Singleplayer', 'Fast-paced', 'Mythology'] },
  { id: 'stardew-valley', name: 'Stardew Valley', art: '🌾', gradient: 'linear-gradient(135deg,#14532d,#4ade80)', genres: ['Simulation', 'RPG'], tags: ['Indie', 'Singleplayer', 'Relaxing', 'Pixel Art'] },
  { id: 'celeste', name: 'Celeste', art: '🏔️', gradient: 'linear-gradient(135deg,#1e3a8a,#38bdf8)', genres: ['Platformer'], tags: ['Indie', 'Singleplayer', 'Pixel Art', 'Story Rich'] },
  { id: 'minecraft', name: 'Minecraft', art: '⛏️', gradient: 'linear-gradient(135deg,#3f6212,#a3e635)', genres: ['Sandbox', 'Survival'], tags: ['Multiplayer', 'Crafting', 'Open World', 'Building'] },
  { id: 'portal-2', name: 'Portal 2', art: '🌀', gradient: 'linear-gradient(135deg,#0f172a,#64748b)', genres: ['Puzzle'], tags: ['Singleplayer', 'Sci-fi', 'Story Rich', 'Co-op'] },
  { id: 'the-witcher-3', name: 'The Witcher 3', art: '🐺', gradient: 'linear-gradient(135deg,#27272a,#a1a1aa)', genres: ['RPG', 'Adventure'], tags: ['Open World', 'Story Rich', 'Fantasy', 'Singleplayer'] },
  { id: 'among-us', name: 'Among Us', art: '🚀', gradient: 'linear-gradient(135deg,#7c2d12,#f43f5e)', genres: ['Party', 'Strategy'], tags: ['Multiplayer', 'Social', 'Casual', 'Online'] },
  { id: 'hollow-knight', name: 'Hollow Knight', art: '⚔️', gradient: 'linear-gradient(135deg,#111827,#4b5563)', genres: ['Action', 'Adventure'], tags: ['Indie', 'Singleplayer', 'Souls-like', 'Hand-drawn'] },
  { id: 'civ-vi', name: 'Civilization VI', art: '🌍', gradient: 'linear-gradient(135deg,#713f12,#eab308)', genres: ['Strategy'], tags: ['Turn-Based', 'Singleplayer', 'Multiplayer', 'Historical'] },
  { id: 'rocket-league', name: 'Rocket League', art: '🏎️', gradient: 'linear-gradient(135deg,#0c4a6e,#22d3ee)', genres: ['Sports', 'Racing'], tags: ['Multiplayer', 'Competitive', 'Online', 'Fast-paced'] },
  { id: 'animal-crossing', name: 'Animal Crossing', art: '🍃', gradient: 'linear-gradient(135deg,#065f46,#6ee7b7)', genres: ['Simulation'], tags: ['Relaxing', 'Singleplayer', 'Casual', 'Cute'] },
  { id: 'doom-eternal', name: 'DOOM Eternal', art: '💀', gradient: 'linear-gradient(135deg,#450a0a,#f97316)', genres: ['Action', 'Shooter'], tags: ['Singleplayer', 'Fast-paced', 'Sci-fi', 'Intense'] },
];

export function getPreferenceGame(id: string): PreferenceGame | undefined {
  return PREFERENCE_GAMES.find((g) => g.id === id);
}

export function isValidPreferenceId(id: string): boolean {
  return PREFERENCE_GAMES.some((g) => g.id === id);
}
