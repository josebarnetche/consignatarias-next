import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Mis Guías DT-e | Consignatarias',
  description: 'Subí tus documentos de tránsito electrónico y llevá un historial de todos tus movimientos de hacienda.',
  robots: 'noindex', // Private page
};

// This route lives OUTSIDE the (terminal) group, so it never got that group's
// auth gate. Guard it here: anonymous users were able to do the whole OCR flow
// and only hit an alert at save time. Redirect them to login first.
export default async function GuiasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/mi-cuenta/guias');
  return children;
}
