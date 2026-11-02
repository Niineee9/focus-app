CREATE TABLE IF NOT EXISTS categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT     NOT NULL,
    icon       TEXT     NOT NULL DEFAULT 'circle',
    color      TEXT     NOT NULL,
    -- Bitmask de días: bit 0 = lunes … bit 6 = domingo.
    days_mask  SMALLINT NOT NULL CHECK (days_mask BETWEEN 1 AND 127),
    created_at DATE     NOT NULL,
    position   INTEGER  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completions (
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    date        DATE   NOT NULL,
    PRIMARY KEY (category_id, date)
);

CREATE INDEX IF NOT EXISTS completions_date_idx ON completions (date);
