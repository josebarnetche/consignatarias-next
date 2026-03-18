import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mis Guías DT-e | Consignatarias',
  description: 'Subí tus documentos de tránsito electrónico y llevá un historial de todos tus movimientos de hacienda.',
  robots: 'noindex', // Private page
};

export default function GuiasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
