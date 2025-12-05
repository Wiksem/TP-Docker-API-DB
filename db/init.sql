CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

INSERT INTO items (name, description) VALUES
('item 4', 'Premier item d''exemple'),
('Item 2', 'Deuxième item d''exemple')
ON CONFLICT DO NOTHING;
