// Capa de lectura de Supabase. Solo servidor: usa el cliente de
// @/app/lib/supabase/server, que llama a cookies(). Quien la use debe
// renderizar dentro de <Suspense> (cacheComponents).
// Sin 'use cache': los datos son frescos en cada petición.
import type { Category, Game, GameColor } from '@/app/data/games';
import { createClient } from '@/app/lib/supabase/server';
export interface LeaderboardRow {
  rank: number; // 1..N, calculado en la app
  name: string; // ← player_name
  score: number;
  date: string; // created_at como 'dd/mm/aaaa', es-ES, timeZone 'UTC'
}
export interface GameStats {
  plays: number; // count(*) de scores del juego
  best: number | null; // max(score); null si no hay partidas
}
const GAME_COLUMNS = 'id, title, short_description, long_description, category, cover, color';
interface GameRow {
  id: string;
  title: string;
  short_description: string;
  long_description: string;
  category: string;
  cover: string;
  color: string;
}
function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short_description,
    long: row.long_description,
    cat: row.category as Category,
    cover: row.cover,
    color: row.color as GameColor,
  };
}
const dateFormat = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});
function fail(what: string, message: string): never {
  throw new Error(`No se pudo cargar ${what}: ${message}`);
}
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error) fail('el catálogo de juegos', error.message);
  return data.map(toGame);
}
export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) fail(`el juego "${id}"`, error.message);
  return data ? toGame(data) : null;
}
export async function getLeaderboard(gameId: string, limit: number): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, score, created_at')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) fail(`el ranking de "${gameId}"`, error.message);
  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: dateFormat.format(new Date(row.created_at)),
  }));
}
export async function getGameStats(gameId: string): Promise<GameStats> {
  const supabase = await createClient();
  const [countRes, bestRes] = await Promise.all([
    supabase.from('scores').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase
      .from('scores')
      .select('score')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (countRes.error) fail(`las partidas de "${gameId}"`, countRes.error.message);
  if (bestRes.error) fail(`el récord de "${gameId}"`, bestRes.error.message);
  return {
    plays: countRes.count ?? 0,
    best: bestRes.data?.score ?? null,
  };
}
