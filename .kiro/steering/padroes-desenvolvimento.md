# Padrões de Desenvolvimento — kiro-loja-catalogo

> Steering file para alinhar desenvolvimento com os padrões do projeto Kiro Loja.
> Aplicado em todas as ações deste repositório.

## Princípios

1. **Schema-per-service:** o schema `catalogo` no Aurora é dono privado; ninguém acessa de fora sem passar pela API.
2. **Transacional × Editorial:** preço é transacional (muda com código/migration); descrição é editorial (muda via CMS).
3. **Cache-aside:** tenta Valkey → miss → Aurora → populate Valkey com TTL.
4. **Idempotência:** endpoints leitura é naturalmente idempotente; futuras mutações precisam de UUID/token.
5. **Blast radius:** erros no catálogo não derrubam pedidos/pagamento (serviços desacoplados por API/evento).

## Convenções de Código

### Estrutura de Diretórios

```
src/
├── index.ts               # Entrada, setup Express
├── routes/                # Rotas/endpoints
├── services/              # Lógica de negócio
├── db/                    # Conexão Aurora, migrations
├── cache/                 # Client Valkey
└── types/                 # Tipos TypeScript (compartilhados)
```

### Tipos

```typescript
// Sempre exportado de src/types/index.ts
export interface Product {
  id: string;
  titulo: string;
  autor: string;
  preco: number;           // Transacional: nunca muda sem migration
  capa_url: string;
  categoria: string;
  preview_url?: string;
  descricao?: string;      // Editorial: muda via CMS/Strapi
  criado_em: Date;
  atualizado_em: Date;
}
```

### Erros e Logging

```typescript
// Console para debug / auditoria (estruturado para CloudWatch)
console.log(`✓ Produto ${id} cacheado`);
console.warn(`⚠️ Valkey indisponível, usando Aurora`);
console.error(`❌ Erro ao buscar Aurora:`, error);

// Sempre retornar JSON estruturado na API
res.status(500).json({
  error: "erro ao buscar produto",
  message: process.env.NODE_ENV === "development" ? err.message : undefined,
});
```

### Migrations

- **Arquivo:** `src/db/migrations/NNN_descricao.sql` (número sequencial)
- **Padrão expand/contract:** alter table sem drop/breaking changes
- **Exemplo:** adicionar coluna `NOT NULL` é breaking; adicionar `NULL DEFAULT X` é seguro
- **Execução:** CodeBuild in-VPC (tem acesso ao Aurora privado); roda antes de deploy ECS rolling

## Tests

```bash
npm run test                    # Rodar testes (Vitest)
npm run lint                    # Lint TypeScript
npm run build                   # Build (tsc)
```

Tests são **obrigatórios** em PRs (gate GitHub Actions). Cobertura mínima:
- Endpoints principais (GET `/api/catalogo/listar`, GET `/api/catalogo/:id`)
- Cache-aside (hit e miss)
- Tratamento de erro (Aurora indisponível, cache indisponível)

## Deployment

1. **PR na `main`:** testes + lint obrigatórios
2. **Merge na `main`:**
   - CodePipeline acionado (GitHub via CodeConnections)
   - CodeBuild: `docker build` → push ECR (tag = SHA do commit)
   - CodeBuild in-VPC: executar migrations no Aurora
   - Ação de ECS: rolling deployment (lê `imagedefinitions.json`, max 2 tasks simultâneas)

## Ambiente de Desenvolvimento

```bash
# Setup local
npm install

# Dev (watch mode — tsc + tsx)
npm run dev

# Testes
npm run test

# Simulação local (mock Aurora/Valkey)
docker-compose up     # (criar se precisar)
```

Sem dependência de AWS local — use mocks/stubs nos testes.

## Secrets e Configuração

**Variáveis de ambiente** (injetadas pelo CloudFormation):
- `AURORA_HOST`, `AURORA_PORT`, `AURORA_DATABASE`, `AURORA_USER`
- `AURORA_PASSWORD` (injetado de Secrets Manager)
- `VALKEY_HOST`, `VALKEY_PORT`
- `NODE_ENV` (production / development)
- `PORT` (default 3000)

**Nunca commit `.env` ou secrets.** Usar `dotenv` apenas em dev local; em produção, tudo vem de CloudFormation.

## Observabilidade

### Logs

Estruturados no stdout (CloudWatch/JSON):
```
2025-01-14T10:30:00Z [catalogo] ✓ Produto abc123 cacheado (ttl: 3600s)
2025-01-14T10:30:05Z [catalogo] ❌ Aurora connection timeout
```

### Métricas (Fase 7)

- Latência de GET `/api/catalogo/listar`
- Taxa de hit/miss do Valkey
- Erros de conexão Aurora/Valkey

### Health Check

Endpoint `GET /health` deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T10:30:00Z"
}
```

CloudWatch health check: HTTP 200 dentro de 5s (timeout).

## Referências

- **Roteiro transversal:** [ROTEIRO.md](../../kiro-devops/ROTEIRO.md) (kiro-devops)
- **Arquitetura:** foundation.yaml (kiro-loja-infra)
- **Modelo de domínio:** ROTEIRO.md § 4 (bounded contexts)
- **Padrões de migration:** ROTEIRO.md § 7 (schema-per-service)
