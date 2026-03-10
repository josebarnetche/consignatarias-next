-- Owner-managed auctions (separate from scraper data in remates.json)
CREATE TABLE consignataria_auctions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consignataria_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  province TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('invernada','cria','reproductores','general','especial')),
  main_category TEXT DEFAULT 'mixto' CHECK (main_category IN ('terneros','novillos','vaca_gorda','vaquillonas','toros','mixto')),
  estimated_heads INTEGER,
  description TEXT,
  catalog_url TEXT,
  youtube_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cons_auctions_slug ON consignataria_auctions(consignataria_slug);
CREATE INDEX idx_cons_auctions_date ON consignataria_auctions(date);

ALTER TABLE consignataria_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON consignataria_auctions FOR SELECT USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cons_auctions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cons_auctions_updated_at
  BEFORE UPDATE ON consignataria_auctions
  FOR EACH ROW EXECUTE FUNCTION update_cons_auctions_updated_at();
