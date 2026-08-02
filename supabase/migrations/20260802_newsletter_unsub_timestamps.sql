-- El código escribe estas dos columnas desde siempre y NO existían: el upsert del
-- alta de El Corredor y el update de /unsubscribe fallaban enteros y en silencio.
-- Efecto: quien se suscribía recibía el PDF pero nunca quedaba en la lista, y quien
-- pedía la baja seguía recibiendo. Se agregan en vez de sacarlas del código porque
-- la información (cuándo se fue, cuándo volvió) es la correcta de guardar.
-- Aplicada como newsletter_subscribers_unsub_timestamps.
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS resubscribed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribed_at
  ON public.newsletter_subscribers (unsubscribed_at) WHERE unsubscribed_at IS NOT NULL;
