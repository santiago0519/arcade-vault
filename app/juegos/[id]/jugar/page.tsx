import { notFound } from "next/navigation";
import PlayerScreen from "@/app/components/PlayerScreen";
import { GAMES } from "@/app/data/games";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function Player({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <PlayerScreen gameId={game.id} title={game.title} />;
}
