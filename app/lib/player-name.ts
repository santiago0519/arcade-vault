// Nombre del jugador para el leaderboard. Solo cliente (localStorage).
// La normalización vive solo en la UI; la base no la valida.
export const PLAYER_NAME_KEY = 'av_player_name';
export const DEFAULT_PLAYER_NAME = 'INVITADO';
const MAX_LENGTH = 10;
// trim + mayúsculas + máximo 10 caracteres; vacío → 'INVITADO'.
export function normalizePlayerName(raw: string): string {
  const name = raw.trim().toUpperCase().slice(0, MAX_LENGTH).trim();
  return name === '' ? DEFAULT_PLAYER_NAME : name;
}
// Último nombre guardado con éxito, o null si no hay o localStorage falla.
export function loadPlayerName(): string | null {
  try {
    const value = localStorage.getItem(PLAYER_NAME_KEY);
    return value && value.trim() !== '' ? value : null;
  } catch {
    return null;
  }
}
// No guarda 'INVITADO'. Errores de localStorage se ignoran en silencio.
export function savePlayerName(name: string): void {
  if (name === DEFAULT_PLAYER_NAME) return;
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // localStorage bloqueado o lleno
  }
}
