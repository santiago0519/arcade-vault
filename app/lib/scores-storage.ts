export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

export const SCORES_KEY = "av_scores";

export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    let list: SavedScore[] = [];
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(SCORES_KEY) ?? "[]",
      );
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
    list.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(list));
  } catch {
    // localStorage bloqueado o lleno: se ignora en silencio
  }
}
