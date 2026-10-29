import { notFound } from "next/navigation";
import { Suspense } from "react";
import PlayerScreen from "@/app/components/PlayerScreen";
import PlayerSkeleton from "@/app/components/PlayerSkeleton";
import { GAMES } from "@/app/data/games";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default function Player({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <PlayerContent params={params} />
    </Suspense>
  );
}

async function PlayerContent({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <PlayerScreen gameId={game.id} title={game.title} />;
}
