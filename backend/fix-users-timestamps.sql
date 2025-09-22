-- Correção para created_at e updated_at na tabela users
ALTER TABLE users 
ALTER COLUMN created_at 
SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users 
ALTER COLUMN updated_at 
SET DEFAULT CURRENT_TIMESTAMP;

-- Atualizar registros existentes que possam estar nulos
UPDATE users 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE users 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;