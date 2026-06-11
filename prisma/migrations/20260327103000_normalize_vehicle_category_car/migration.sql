-- Normalize old fleet category values
UPDATE "Vehicle"
SET "category" = 'car'
WHERE LOWER(COALESCE("category", '')) = 'cat';
