TRUNCATE stock_discrepancies, stock_transactions, stock_batches, products RESTART IDENTITY CASCADE;

INSERT INTO products (name, brand, unit, min_reorder_level) VALUES
('Amoxicillin 500mg', 'Cosmopharm', 'Capsule', 500),
('Paracetamol 500mg', 'Panadol', 'Tablet', 1000),
('Cetirizine 10mg', 'Almus', 'Tablet', 200),
('Artemether/Lumefantrine 20/120mg', 'Coartem', 'Tablet', 300),
('Amoxicillin/Clavulanic Acid 625mg', 'Augmentin', 'Tablet', 150),
('Cough Syrup 100ml', 'Hedelix', 'Bottle', 50);

INSERT INTO stock_batches 
(product_id, batch_number, supplier, quantity_received, quantity_available, purchase_price, selling_price, expiry_date, date_received) 
VALUES
(1, 'AMX-2026-A', 'Abacus Pharma Ltd', 600, 450, 150.00, 250.00, '2026-11-20', '2026-05-10'),
(1, 'AMX-2028-B', 'Medipharm Uganda', 1000, 1000, 145.00, 250.00, '2028-06-30', '2026-10-01'),
(2, 'PAN-9982', 'Ecopharm Wholesale', 2000, 400, 20.00, 50.00, '2027-12-15', '2026-04-15'),
(3, 'CET-004X', 'Abacus Pharma Ltd', 300, 120, 80.00, 150.00, '2026-10-25', '2026-02-11'),
(4, 'CRT-7711', 'Joint Medical Store', 500, 0, 1200.00, 2000.00, '2027-08-10', '2026-01-20'),
(5, 'AUG-8821', 'Medipharm Uganda', 250, 200, 3500.00, 5000.00, '2027-05-18', '2026-08-05'),
(6, 'HDL-033', 'Ecopharm Wholesale', 100, 35, 4000.00, 6500.00, '2026-12-05', '2026-06-12');

INSERT INTO stock_transactions (batch_id, quantity, dispensed_at) VALUES
(1, 50, '2026-10-05 09:30:00+03'),
(1, 100, '2026-10-10 14:15:00+03'),
(3, 800, '2026-10-01 11:00:00+03'),
(3, 800, '2026-10-08 16:45:00+03'),
(7, 65, '2026-10-11 10:20:00+03');

INSERT INTO stock_discrepancies (batch_id, expected_quantity, physical_quantity, difference, reason, status) VALUES
(1, 452, 450, -2, 'Two capsules crushed during routine shelf relocation count', 'Resolved'),
(6, 210, 200, -10, '10 tablets missing from box during physical monthly audit', 'Under Investigation');