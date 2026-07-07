-- Alerta de precio del novillo en USD o ARS: se elige la moneda del umbral.
-- El cron compara el precio actual convertido a esa moneda (USD = INMAG ÷ dólar blue).
alter table price_alerts add column if not exists currency text not null default 'ars';
