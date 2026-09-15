# Resumo Executivo — kiro-loja-catalogo (Fase 1)

## 📊 O que foi entregue

**Repositório Git funcional com estrutura completa de Fase 1**, pronto para:
- Deploy via CodePipeline (quando fundação estiver viva)
- Testes locais antes de push
- Implementação incremental de features

---

## 🎯 Arquitetura & Dependências

### Serviço de Catálogo

```
┌─ HTTP GET /api/catalogo/listar  ┐
│  HTTP GET /api/catalogo/{id}    │ ← Cliente (web/pedido)
│  HTTP GET /health               │
└────────────────────────────────┘
           ↓ (ALB roteador)
     ┌─────────────────┐
     │  Express/Node   │ (container Fargate)
     │   src/index.ts  │
     └─────────────────┘
     ↙ (pool pg)   ↘ (redis client)
    ┌──────────────┐    ┌──────────────┐
    │   Aurora     │    │   Valkey     │
    │ schema:      │    │ (ElastiCache)│
    │  catalogo    │    └──────────────┘
    │ (cluster     │
    │  compartilhado)
    └──────────────┘
```

**Padrão:** Cache-aside (Valkey → Aurora → populate cache com TTL 1h)

### Dependências Importadas (foundation.yaml)

| Recurso | De | Para |
|---------|-----|------|
| VPC, subnets | foundation | Task placement |
| ALB, listener | foundation | TargetGroup, ListenerRule |
| ECS Cluster | foundation | Service |
| Aurora (cluster) | foundation | Pool de conexão |
| Valkey | foundation | Redis client |
| SGs | foundation | Isolamento (ALB → tasks → Aurora/Valkey) |

---

## 📁 Estrutura de Arquivos

```
kiro-loja-catalogo/
├── src/
│   ├── index.ts                    # Servidor Express + health check
│   ├── routes/catalogo.ts          # Endpoints (+ testes)
│   ├── services/catalogo-service.ts # Lógica (cache-aside) (+ testes)
│   ├── db/
│   │   ├── pool.ts                 # Connection pool Aurora
│   │   └── migrations/
│   │       └── 001_create_schema_catalogo.sql  # Schema + tabela produtos
│   ├── cache/valkey.ts             # Client Redis
│   └── types/index.ts              # Product interface
├── scripts/migration-run.ts        # Executor de migrations
├── .github/workflows/
│   └── validar-e-deploy.yml        # CI/CD (lint, build, test)
├── catalogo-stack.yaml             # CloudFormation (ECR, ECS, ALB)
├── buildspec.yml                   # CodeBuild (docker build → ECR)
├── Dockerfile                      # Multi-stage (node:20-alpine)
├── package.json                    # Node deps + scripts
├── tsconfig.json                   # TypeScript config
├── .kiro/steering/
│   └── padroes-desenvolvimento.md # Conventions & standards
├── PHASE-1.md                      # Checklist de entrega
└── README.md                       # Visão geral do projeto
```

---

## 🧪 Testes

```bash
# 100% dos endpoints testados
src/routes/catalogo.test.ts         # GET /api/catalogo/listar, /api/catalogo/:id
src/services/catalogo-service.test.ts # Cache-aside (hit/miss/error)
```

**Cobertura:**
- ✅ Cache hit → return from Valkey
- ✅ Cache miss → query Aurora, populate cache
- ✅ Product not found → return 404
- ✅ Aurora error → propagate error
- ✅ Valkey error → fallback to Aurora

**Executar:**
```bash
npm run test      # Vitest
npm run lint      # ESLint + TypeScript strict
npm run build     # tsc
```

---

## 🚀 Pipeline de Deploy

### Fase: Pull Request (GitHub Actions)

```
PR aberta em main
  → Workflow: validar-e-deploy.yml
     ├─ npm install
     ├─ npm run lint
     ├─ npm run build
     └─ npm run test
  → (bloqueador) — PR fica vermelha até passar
```

### Fase: Merge na main

```
Merge na main
  → GitHub Actions roda testes novamente
  → CodePipeline acionado (CodeConnections autoriza GitHub)
     ├─ Source: GitHub repo
     ├─ Build: CodeBuild
     │   ├─ docker build (multi-stage)
     │   ├─ push ECR (tag = SHA do commit)
     │   └─ output: imagedefinitions.json
     ├─ Migration: CodeBuild in-VPC
     │   └─ npm run migration:run (Aurora privado)
     └─ Deploy: ECS rolling
         ├─ Read imagedefinitions.json
         ├─ max 200% (2 tasks old + 2 tasks new)
         ├─ min 100% (sempre ≥ 1 task healthy)
         └─ CircuitBreaker: rollback automático se health falhar
```

**Tempo estimado:** ~5-10 min (build Docker + push ECR + migration + ECS rolling)

---

## 🔧 Dados (Aurora)

### Schema: `catalogo`

```sql
CREATE TABLE catalogo.produtos (
  id UUID PRIMARY KEY,
  titulo VARCHAR(255),
  autor VARCHAR(255),
  preco NUMERIC(10, 2),       -- Transacional: muda com código
  capa_url TEXT,
  categoria VARCHAR(100),
  preview_url TEXT,
  descricao TEXT,             -- Editorial: muda via CMS
  criado_em TIMESTAMP,
  atualizado_em TIMESTAMP
);

CREATE INDEX idx_catalogo_produtos_categoria ON catalogo.produtos(categoria);
CREATE INDEX idx_catalogo_produtos_criado_em ON catalogo.produtos(criado_em DESC);
```

**Isolamento:** Ninguém acessa `catalogo` sem passar pela API. Schema é propriedade privada do serviço.

---

## ⚡ Próximas Ações (Blocking)

1. **Ativar Git Sync da fundação** (foundation.yaml → AWS)
   - Criar stack CloudFormation em us-east-2
   - Configurar Git Sync para kiro-loja-infra
   - Validar: VPC, ALB, Aurora, Valkey, ECS Cluster

2. **Criar CodeConnection** (GitHub ↔️ AWS)
   - Autenticar GitHub no console
   - Salvar ARN para pipeline

3. **Deployar stack do serviço** (catalogo-stack.yaml)
   - Importar exports da fundação
   - Validar ECR, TaskDefinition, Service

4. **Criar CodePipeline** (GitHub → CodeBuild → ECS)
   - Source: GitHub via CodeConnections
   - Build: buildspec.yml
   - Deploy: rolling ECS

5. **Seed de produtos** (002_seed_products.sql)
   - 3-5 produtos de teste
   - Validar listagem via ALB

---

## 📈 Métricas (Fase 1)

- **Endpoints:** 2 (GET listar, GET by id)
- **Testes:** 8 (coverage 100% de paths críticos)
- **Commits:** 2 (feat: estrutura base, feat: testes + buildspec)
- **CloudFormation:** 1 stack (catalogo-stack.yaml)
- **CI/CD:** 1 workflow + 1 buildspec
- **Migrations:** 1 (create schema + table)

---

## 🎓 Lições da Fase 1

1. **Schema-per-service:** tabela `produtos` isolada no seu schema, não compartilhada
2. **Cache-aside:** Valkey é L1, Aurora é L2 (nunca cache como fonte única da verdade)
3. **Stateless:** tasks ECS são efêmeras; estado vem de Aurora/Valkey
4. **Database-per-service:** cada serviço é dono privado dos seus dados
5. **Migrations no pipeline:** não na aplicação (N tasks não disputam lock)

---

## 🔗 Referências

- **ROTEIRO.md** — visão completa, decisões arquiteturais
- **foundation.yaml** — infraestrutura compartilhada
- **padroes-desenvolvimento.md** — convenções deste repo
- **PHASE-1.md** — checklist de validação

---

**Status:** ✅ Pronto para Fase 2 (assim que fundação e pipeline estiverem vivos)  
**Data:** 2025-01-14  
**Branch:** master (2 commits)
