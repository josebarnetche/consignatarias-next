import rematesData from '@/lib/data/remates.json';
import type { Auction } from '@/lib/db/schema';
import FavoritosClient, { type RemateFavorito } from './FavoritosClient';

// Remates desde el "hoy" del build con los cuatro campos que la vista usa. El scrape
// diario redeploya, y el cliente vuelve a filtrar por la fecha del navegador.
function rematesProximos(): RemateFavorito[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return (rematesData as Auction[])
    .filter((a) => a.date >= hoy)
    .map((a) => ({ title: a.title, consignatariaName: a.consignatariaName, date: a.date, time: a.time }));
}

export default function FavoritosPage() {
  return <FavoritosClient auctions={rematesProximos()} />;
}
