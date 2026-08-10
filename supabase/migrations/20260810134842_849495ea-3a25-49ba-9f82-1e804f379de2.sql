-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the long-term memory table
CREATE TABLE IF NOT EXISTS public.memorias_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contexto TEXT NOT NULL,
    embedding VECTOR(1536),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorias_sistema TO authenticated;
GRANT ALL ON public.memorias_sistema TO service_role;

-- Enable RLS
ALTER TABLE public.memorias_sistema ENABLE ROW LEVEL SECURITY;

-- Index for similarity search
CREATE INDEX IF NOT EXISTS memorias_sistema_embedding_idx ON public.memorias_sistema USING hnsw (embedding vector_cosine_ops);

-- Security policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Admins can select memories' AND polrelid = 'public.memorias_sistema'::regclass
    ) THEN
        CREATE POLICY "Admins can select memories" ON public.memorias_sistema FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
