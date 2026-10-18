DROP TABLE IF EXISTS stock_discrepancies CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS stock_batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    unit VARCHAR(50) NOT NULL,
    min_reorder_level INT DEFAULT 10 CHECK (min_reorder_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, brand, unit)
);

CREATE TABLE stock_batches (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    supplier VARCHAR(255),
    quantity_received INT NOT NULL CHECK (quantity_received >= 0),
    quantity_available INT NOT NULL CHECK (quantity_available >= 0),
    purchase_price DECIMAL(10, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
    expiry_date DATE NOT NULL,
    date_received DATE DEFAULT CURRENT_DATE CHECK (date_received <= expiry_date),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, batch_number),
    CHECK (quantity_available <= quantity_received),
    CHECK (expiry_date >= CURRENT_DATE)
);

CREATE TABLE stock_transactions (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES stock_batches(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_discrepancies (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES stock_batches(id) ON DELETE CASCADE,
    expected_quantity INT NOT NULL CHECK (expected_quantity >= 0),
    physical_quantity INT NOT NULL CHECK (physical_quantity >= 0),
    difference INT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Under Investigation')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_stock_product ON stock_batches(product_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_transactions_date ON stock_transactions(dispensed_at);


-- Expiry validation trigger (Defense-in-depth)
CREATE OR REPLACE FUNCTION check_expiry_date() RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'BLOCKED: Expiry date % cannot be in the past. Today is %', 
      NEW.expiry_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_expiry ON stock_batches;
CREATE TRIGGER trg_check_expiry
BEFORE INSERT OR UPDATE ON stock_batches
FOR EACH ROW EXECUTE FUNCTION check_expiry_date();