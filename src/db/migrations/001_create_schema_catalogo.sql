-- Migration 001: Criar schema catalogo e tabela produtos
-- Executado no pipeline: CodeBuild in-VPC (Aurora privado alcançável)

-- Criar schema se nao existir
CREATE SCHEMA IF NOT EXISTS catalogo;

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS catalogo.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  autor VARCHAR(255) NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  capa_url TEXT NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  preview_url TEXT,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_catalogo_produtos_categoria ON catalogo.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_catalogo_produtos_criado_em ON catalogo.produtos(criado_em DESC);

-- Comentários (documentação no banco)
COMMENT ON SCHEMA catalogo IS 'Schema do serviço de catálogo — produtos (dono da verdade)';
COMMENT ON TABLE catalogo.produtos IS 'Catálogo de e-books: título, autor, preço, capa, categoria';
COMMENT ON COLUMN catalogo.produtos.preco IS 'Preço em USD (transacional — nunca muda sem código/migration)';
COMMENT ON COLUMN catalogo.produtos.capa_url IS 'URL da capa (S3 público ou CDN)';
COMMENT ON COLUMN catalogo.produtos.preview_url IS 'URL do preview/amostra (S3 público)';
