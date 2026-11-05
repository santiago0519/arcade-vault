// Capa de escritura de puntuaciones. Solo cliente: usa el cliente de
// navegador con la publishable key. No envía user_id (queda null).
import { createClient } from '@/app/lib/supabase/client';
export async function insertScore(entry: {
  gameId: string;
  playerName: string; // ya normalizado
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('scores').insert({
    game_id: entry.gameId,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw new Error(`No se pudo guardar la puntuación: ${error.message}`);
}
