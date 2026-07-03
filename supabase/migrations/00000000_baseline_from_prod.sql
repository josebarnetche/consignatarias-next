-- ══════════════════════════════════════════════════════════════════════════════
-- BASELINE del esquema de PRODUCCIÓN — snapshot estructural (2026-07-03)
-- ══════════════════════════════════════════════════════════════════════════════
-- Fuente de verdad del esquema (Proyecto C). Autogenerado desde el esquema real de
-- prod (proyecto nyqkgorazkwcufkzxmhd) vía information_schema/pg_catalog. Resuelve
-- el hallazgo crítico del review: "nadie puede reproducir prod desde el repo".
--
-- ALCANCE (honesto): este archivo captura la ESTRUCTURA DE COLUMNAS de las 55
-- tablas base de prod (nombre, tipo, NOT NULL, DEFAULT). Es un snapshot de
-- REFERENCIA y base para `supabase db diff`. NO es una migración runnable desde
-- cero: NO incluye enums (auction_type, cattle_category, remate_status,
-- auction_source, featured_link_type), secuencias, PKs/FKs/constraints, índices ni
-- RLS/policies — eso vive en las migraciones específicas (incl. los
-- 20260703_reconcile_* y 20260629_security_hardening*). El baseline COMPLETO y
-- 100% fiel se obtiene con `supabase db pull` (requiere credenciales de la DB, que
-- no están en el entorno donde se generó esto). Ver ROADMAP §P0.1.
--
-- Las 6 tablas reconciliadas el 2026-07-03 (user_dtes, sell_zone_alerts, webhooks,
-- remate_favorites, + user_favorites/consignataria_followers) ya están acá y en
-- sus migraciones reconcile_* con RLS correcto.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_referrals (
  id bigint NOT NULL DEFAULT nextval('ai_referrals_id_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  engine text NOT NULL,
  landing_page text,
  referrer text,
  utm_source text,
  detected_via text DEFAULT 'referrer'::text,
  path text
);

CREATE TABLE IF NOT EXISTS public.alerta_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alerta_id uuid,
  event text NOT NULL,
  payload jsonb,
  delivered_at timestamp with time zone,
  response_code integer,
  error text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alertas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  api_key text NOT NULL,
  name text NOT NULL,
  webhook_url text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  events text[] DEFAULT ARRAY['remate.created'::text],
  frequency text DEFAULT 'immediate'::text,
  status text DEFAULT 'active'::text,
  triggers_count integer DEFAULT 0,
  last_triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  prefix text NOT NULL,
  hash text NOT NULL,
  environment text NOT NULL,
  allowed_ips inet[] DEFAULT '{}'::inet[],
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  quota_alert_month text
);

CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  api_key_id uuid NOT NULL,
  date date NOT NULL,
  request_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.auction_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_slug text NOT NULL,
  auction_date date NOT NULL,
  auction_title text NOT NULL,
  location text,
  total_heads_offered integer,
  total_heads_sold integer,
  max_price numeric(10,2),
  min_price numeric(10,2),
  average_price numeric(10,2),
  category_results jsonb,
  notes text,
  submitted_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignataria_auctions (
  id bigint NOT NULL,
  consignataria_slug text NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time text,
  location text,
  province text,
  type text DEFAULT 'general'::text,
  main_category text DEFAULT 'mixto'::text,
  estimated_heads integer,
  description text,
  catalog_url text,
  youtube_url text,
  status text DEFAULT 'scheduled'::text,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignataria_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_slug text NOT NULL,
  claimant_name text,
  claimant_email text NOT NULL,
  claimant_phone text,
  claimant_role text,
  cuit text,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignataria_leads (
  id bigint NOT NULL,
  consignataria_slug text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  message text,
  source text DEFAULT 'profile'::text,
  remate_id integer,
  status text DEFAULT 'new'::text,
  ip_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignataria_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_slug text NOT NULL,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  submitter_role text,
  submitter_provincia text,
  rating smallint NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  rejection_reason text,
  ip_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by text
);

CREATE TABLE IF NOT EXISTS public.consignataria_slugs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  consignataria_id uuid NOT NULL,
  is_canonical boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignataria_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_id uuid NOT NULL,
  youtube_video_id character varying(11) NOT NULL,
  title character varying(255) NOT NULL,
  description text,
  remate_id uuid,
  video_type character varying(20) DEFAULT 'remate'::character varying,
  published_at timestamp with time zone,
  thumbnail_url text,
  duration_seconds integer,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.consignatarias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  canonical_slug text NOT NULL,
  display_name text NOT NULL,
  name text,
  cuit text,
  matricula text,
  province text,
  location text,
  category text,
  website text,
  phone text,
  email text,
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  claimed_by_email text,
  description text,
  logo_url text,
  whatsapp text,
  onboarding_points integer DEFAULT 0,
  points_redeemed_at timestamp with time zone,
  region_operativa text,
  especialidad text,
  anos_oficio integer,
  bio_referente text,
  referente_nombre text,
  referente_cargo text,
  foto_referente_url text
);

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id bigint NOT NULL DEFAULT nextval('cron_runs_id_seq'::regclass),
  workflow_name text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running'::text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_id text,
  type text NOT NULL,
  recipient text,
  subject text,
  campaign text,
  link text,
  bounce_type text,
  occurred_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  raw jsonb
);

CREATE TABLE IF NOT EXISTS public.email_tracking (
  id integer NOT NULL DEFAULT nextval('email_tracking_id_seq'::regclass),
  cliente_num integer NOT NULL,
  cliente_nombre text NOT NULL,
  email text NOT NULL,
  enviado_at timestamp with time zone,
  abierto_at timestamp with time zone,
  aperturas integer DEFAULT 0,
  ip_apertura text,
  user_agent text
);

CREATE TABLE IF NOT EXISTS public.featured_links (
  id integer NOT NULL DEFAULT nextval('featured_links_id_seq'::regclass),
  title text NOT NULL,
  url text NOT NULL,
  type featured_link_type NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_abandonment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  slug text,
  form_type text DEFAULT 'claim'::text,
  captured_at timestamp with time zone DEFAULT now(),
  converted_at timestamp with time zone,
  recovery_sent_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.fpt_approvals (
  id text NOT NULL,
  state text,
  note text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.frigorifico_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  frigorifico_cuit text NOT NULL,
  frigorifico_name text NOT NULL,
  claimant_name text,
  claimant_email text NOT NULL,
  claimant_phone text,
  claimant_role text,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.frigorifico_profiles (
  cuit text NOT NULL,
  display_name text NOT NULL,
  phone text,
  email text,
  website text,
  description text,
  claimed_by_email text,
  verified boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.frigorificos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cuit text NOT NULL,
  name text NOT NULL,
  matricula text,
  province text NOT NULL,
  stage smallint NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ganado_value_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  value_ars numeric NOT NULL,
  cabezas integer NOT NULL,
  kilos numeric NOT NULL,
  inmag_value numeric,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_remate_lot (
  id bigint NOT NULL DEFAULT nextval('live_remate_lot_id_seq'::regclass),
  session_id text NOT NULL,
  audio_t double precision,
  categoria text,
  precio integer,
  cabezas integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_remate_session (
  id text NOT NULL,
  youtube_url text,
  consignataria text,
  location text,
  model text,
  status text NOT NULL DEFAULT 'live'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mag_consignataria_sales_lots (
  id bigint NOT NULL DEFAULT nextval('mag_consignataria_sales_lots_id_seq'::regclass),
  date date NOT NULL,
  mag_consignataria_id integer NOT NULL,
  tipo text NOT NULL,
  pesada integer,
  remitente text NOT NULL,
  localidad text,
  provincia character(3),
  head_count integer,
  category text,
  total_kgs numeric(12,2),
  kg_avg numeric(7,2),
  price numeric(12,3),
  scraped_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mag_consignatarias (
  mag_id integer NOT NULL,
  name text NOT NULL,
  slug text,
  consignataria_canonical_slug text,
  active boolean NOT NULL DEFAULT true,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mag_inmag_history (
  date date NOT NULL,
  head_count integer,
  total_amount numeric(18,2),
  inmag_value numeric(10,3),
  inmag_calculated boolean NOT NULL DEFAULT true,
  variation numeric(7,3),
  source_url text DEFAULT 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011'::text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mag_prices_detailed (
  date date NOT NULL,
  subcategory text NOT NULL,
  category_group text NOT NULL,
  weight_threshold text,
  price_min numeric(10,3),
  price_max numeric(10,3),
  price_avg numeric(10,3),
  price_median numeric(10,3),
  head_count integer,
  total_amount numeric(18,2),
  total_kgs numeric(14,2),
  kg_avg numeric(7,2),
  source_url text DEFAULT 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502'::text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mag_scrape_queue (
  id bigint NOT NULL DEFAULT nextval('mag_scrape_queue_id_seq'::regclass),
  date date NOT NULL,
  mag_consignataria_id integer NOT NULL,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  enqueued_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  rows_inserted integer
);

CREATE TABLE IF NOT EXISTS public.market_category_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  category text NOT NULL,
  current_price numeric(12,2) NOT NULL,
  prev_price numeric(12,2),
  change_pct numeric(5,2)
);

CREATE TABLE IF NOT EXISTS public.market_price_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  indicator text NOT NULL,
  value numeric(12,2) NOT NULL,
  unit text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.market_price_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  inmag_value numeric(12,2),
  inmag_prev numeric(12,2),
  inmag_change_pct numeric(5,2),
  corn_usd_tn numeric(10,2),
  corn_prev numeric(10,2),
  corn_change_pct numeric(5,2),
  usd_blue numeric(10,2),
  usd_blue_prev numeric(10,2),
  usd_oficial numeric(10,2),
  usd_oficial_prev numeric(10,2),
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'homepage'::text,
  status text DEFAULT 'active'::text,
  subscribed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  lease_kg_ha numeric,
  lease_hectareas numeric,
  capture_context text
);

CREATE TABLE IF NOT EXISTS public.ops_events (
  id bigint NOT NULL DEFAULT nextval('ops_events_id_seq'::regclass),
  event_type text NOT NULL,
  status text NOT NULL,
  user_id uuid,
  api_key_id uuid,
  request_id text,
  route text,
  latency_ms integer,
  status_code integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type character varying(50) NOT NULL,
  consignataria_slug character varying(255) NOT NULL,
  email_sent_to character varying(255) NOT NULL,
  auction_date date,
  auction_title text,
  sent_at timestamp with time zone DEFAULT now(),
  response_received_at timestamp with time zone,
  response_type character varying(50),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_api_invites (
  email text NOT NULL,
  api_tier text NOT NULL,
  free_credits boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  redeemed_at timestamp with time zone,
  redeemed_user_id uuid
);

CREATE TABLE IF NOT EXISTS public.point_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consignataria_slug text NOT NULL,
  points_redeemed integer NOT NULL DEFAULT 4500,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  pro_expires_at timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_id uuid,
  action character varying(50) NOT NULL,
  points integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id text NOT NULL,
  source text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id bigint NOT NULL,
  entity_type text NOT NULL,
  entity_slug text NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  referrer text,
  user_agent text
);

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.remate_favorites (
  id bigint NOT NULL DEFAULT nextval('remate_favorites_id_seq'::regclass),
  remate_id integer NOT NULL,
  consignataria_slug text NOT NULL,
  user_id uuid,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scraper_id integer,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time time without time zone,
  location text NOT NULL,
  province text NOT NULL,
  auction_type auction_type,
  main_category cattle_category,
  estimated_heads integer,
  status remate_status NOT NULL DEFAULT 'scheduled'::remate_status,
  featured boolean NOT NULL DEFAULT false,
  youtube_url text,
  catalog_url text,
  source auction_source DEFAULT 'manual'::auction_source,
  source_url text,
  consignataria_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remitente_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_slug text NOT NULL,
  mag_id text,
  remitente text NOT NULL,
  localidad text,
  provincia text,
  cabezas integer NOT NULL DEFAULT 0,
  categorias jsonb,
  remate_date date NOT NULL,
  scrape_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date,
  period_end date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running'::text,
  auctions_found integer DEFAULT 0,
  auctions_new integer DEFAULT 0,
  auctions_updated integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.sell_zone_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  categoria text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  source text DEFAULT 'vender-ahora'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sent_at timestamp with time zone,
  last_sent_zone text
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_slug text NOT NULL,
  plan_name text NOT NULL,
  rebill_subscription_id text,
  rebill_customer_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usd_blue_history (
  date date NOT NULL,
  compra numeric(10,2),
  venta numeric(10,2),
  source_url text DEFAULT 'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue'::text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_dtes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consignataria_id uuid,
  numero_dte text,
  fecha_emision date,
  fecha_movimiento date,
  renspa_origen text,
  titular_origen text,
  establecimiento_origen text,
  renspa_destino text,
  titular_destino text,
  establecimiento_destino text,
  especie text DEFAULT 'bovino'::text,
  cantidad_cabezas integer,
  categorias jsonb DEFAULT '{}'::jsonb,
  peso_total_kg integer,
  motivo text,
  imagen_url text,
  ocr_raw_text text,
  ocr_confidence double precision,
  user_edited boolean DEFAULT false,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  consignataria_slug text NOT NULL,
  notify_new_remate boolean DEFAULT false,
  notify_catalog boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_ganado (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_seen_at timestamp with time zone,
  last_seen_value_ars numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  alerts_opt_in boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_report_downloads (
  id bigint NOT NULL DEFAULT nextval('user_report_downloads_id_seq'::regclass),
  user_id uuid NOT NULL,
  report_slug text NOT NULL,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  ip inet,
  user_agent text
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  tier text NOT NULL DEFAULT 'free'::text,
  rebill_customer_id text,
  rebill_subscription_id text,
  status text NOT NULL DEFAULT 'active'::text,
  current_period_end timestamp with time zone,
  upgraded_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  api_tier text NOT NULL DEFAULT 'none'::text,
  rebill_enterprise_subscription_id text,
  api_tier_activated_at timestamp with time zone,
  api_tier_cancelled_at timestamp with time zone,
  trial_nudge_7d_at timestamp with time zone,
  trial_nudge_3d_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.value_events (
  id bigint NOT NULL DEFAULT nextval('value_events_id_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event text NOT NULL,
  weight smallint NOT NULL DEFAULT 1,
  entity_type text,
  entity_slug text,
  source text,
  ai_engine text,
  path text,
  session_id text,
  meta jsonb
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}'::text[],
  secret text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true,
  owner_email text,
  description text,
  last_triggered_at timestamp with time zone,
  total_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.whatsapp_clicks (
  id bigint NOT NULL,
  consignataria_slug text NOT NULL,
  source text DEFAULT 'profile'::text,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consignataria_id uuid,
  channel_id character varying(24) NOT NULL,
  channel_url text,
  channel_title text,
  subscriber_count integer,
  last_checked timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
