-- Script SQL para adicionar os novos status de tarefa
-- Execute este script diretamente no seu banco PostgreSQL

-- Verificar o nome do enum atual
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname LIKE '%status%' 
ORDER BY typname, enumsortorder;

-- Adicionar os novos valores ao enum (se ainda não existirem)
DO $$ 
BEGIN
    -- Verificar se o enum existe e adicionar os novos valores
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tasks_status_enum') THEN
        -- Adicionar 'aguardando_cliente' se não existir
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                      WHERE t.typname = 'tasks_status_enum' AND e.enumlabel = 'aguardando_cliente') THEN
            ALTER TYPE tasks_status_enum ADD VALUE 'aguardando_cliente';
            RAISE NOTICE 'Adicionado valor: aguardando_cliente';
        ELSE
            RAISE NOTICE 'Valor aguardando_cliente já existe';
        END IF;
        
        -- Adicionar 'cancelado' se não existir
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
                      WHERE t.typname = 'tasks_status_enum' AND e.enumlabel = 'cancelado') THEN
            ALTER TYPE tasks_status_enum ADD VALUE 'cancelado';
            RAISE NOTICE 'Adicionado valor: cancelado';
        ELSE
            RAISE NOTICE 'Valor cancelado já existe';
        END IF;
    ELSE
        RAISE NOTICE 'Enum tasks_status_enum não encontrado - verificando outros enums...';
        
        -- Listar todos os enums relacionados a status
        FOR r IN SELECT DISTINCT typname FROM pg_type WHERE typname LIKE '%status%' LOOP
            RAISE NOTICE 'Enum encontrado: %', r.typname;
        END LOOP;
    END IF;
END $$;

-- Verificar os valores após a adição
SELECT 'Valores do enum após adição:' as info;
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname LIKE '%status%' 
ORDER BY typname, enumsortorder;

-- Testar se podemos inserir os novos valores
DO $$
BEGIN
    -- Teste inserir aguardando_cliente (não vai inserir realmente, só testa)
    BEGIN
        PERFORM 'aguardando_cliente'::tasks_status_enum;
        RAISE NOTICE 'Status aguardando_cliente é válido';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Status aguardando_cliente não é válido: %', SQLERRM;
    END;
    
    -- Teste inserir cancelado
    BEGIN
        PERFORM 'cancelado'::tasks_status_enum;
        RAISE NOTICE 'Status cancelado é válido';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Status cancelado não é válido: %', SQLERRM;
    END;
END $$;