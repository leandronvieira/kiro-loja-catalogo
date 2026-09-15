# Fase 1 — Catálogo + 1º Loop de Deploy

> Status: **Estrutura Base Completa**
> 
> Data: 2025-01-14  
> Repositório: `kiro-loja-catalogo` (master)

---

## ✅ Entregáveis Concluídos

### Estrutura de Projeto

- [x] Git inicializado (`git init`)
- [x] `.gitignore` configurado
- [x] `package.json` com scripts (build, dev, lint, test)
- [x] `tsconfig.json` com target ES2020
- [x] `README.md` com visão geral e primeiros passos
- [x] `.kiro/steering/padroes-desenvolvimento.md` com convenções

### Código-Fonte

- [x] `src/index.ts` — servidor Express + health check
- [x] `src/routes/catalogo.ts` — endpoints GET `/api/catalogo/listar` e `/api/catalogo/:id`
- [x] `src/services/catalogo-service.ts` — lógica de negócio (cache-aside com Valkey)
- [x] `src/db/pool.ts` — connection pool Aurora (env vars)
- [x] `src/cache/valkey.ts` — client Redis/Valkey
- [x] `src/types/index.ts` — tipos TypeScript (Product, etc.)

### Testes

- [x] `src/services/catalogo-service.test.ts` — cobertura de cache-aside, hits/misses, erros
- [x] `src/routes/catalogo.test.ts` — testes de endpoints com mocks de serviço
- [x] `vitest.config.ts` + `.eslintrc.json` configurados

### Infrastructure-as-Code

- [x] `catalogo-stack.yaml` — CloudFormation do serviço
  - ECR (repo de imagens)
  - IAM roles (task execution + task)
  - CloudWatch Logs (log group)
  - ECS TaskDefinition (container, env vars, health check)
  - ECS Service (2 tasks, Fargate)
  - ALB TargetGroup (health checks)
  - ALB ListenerRule (path `/api/catalogo/*`, priority 100)
  - Auto-scaling placeholder (ativa Fase 7)

### CI/CD

- [x] `.github/workflows/validar-e-deploy.yml` — GitHub Actions
  - PR: lint + build + test (obrigatório)
  - Push main: trigger CodePipeline (manual por enquanto; será acionado via Git Sync quando stack estiver viva)
  
- [x] `buildspec.yml` — CodeBuild
  - Docker build com labels (BUILD_DATE, VCS_REF, VERSION)
  - Push ECR com tags (SHA + latest)
  - Output: `imagedefinitions.json` (consumido por ECS deploy)

- [x] `Dockerfile` — multi-stage
  - Build: tsc + npm prune
  - Runtime: node:20-alpine slim
  - Health check: curl `/health`

### Migrations

- [x] `src/db/migrations/001_create_schema_catalogo.sql`
  - Schema `catalogo` (isolado)
  - Tabela `produtos` (id, titulo, autor, preco, capa_url, categoria, etc.)
  - Índices (categoria, criado_em)
  - Comentários (documentação)

- [x] `scripts/migration-run.ts` — executor de migrations
  - Roda via CodeBuild in-VPC (antes do deploy ECS rolling)
  - Rastreia migrations executadas em `catalogo._migrations`

---

## ❌ A Fazer (Próximas Ações)

### Imediato (Blocking)

1. **Ativar Git Sync da fundação**
   - Criar stack CloudFormation em us-east-2 com `foundation.yaml`
   - Configurar Git Sync para `kiro-loja-infra` → `kiro-loja-infra-implantar.yaml`
   - Validar: VPC, ALB, Aurora, Valkey, ECS Cluster vivos na AWS

2. **Criar CodeConnection (GitHub → AWS)**
   - Autenticar GitHub no console CloudFormation
   - Salvar CodeConnection ARN para referência nos pipelines

3. **Criar stack do serviço**
   - Deployar `catalogo-stack.yaml` (ou via Git Sync se automatizar)
   - Validar imports de exports da fundação (VPC, ALB, ECS Cluster, Aurora, Valkey)
   - Conferir: ECR criado, TaskDefinition registrada, Service rodando (2 tasks)

4. **Criar CodePipeline (scaffold)**
   - Source: GitHub via CodeConnections
   - Build: CodeBuild (`buildspec.yml`)
   - Migration: CodeBuild in-VPC (novo stage)
   - Deploy: ação de ECS (rolling, lê `imagedefinitions.json`)

5. **Seed inicial de dados (produtos)**
   - Script ou migration secundária (002_seed_products.sql)
   - 3-5 produtos de teste para validar listagem/busca

### Curto Prazo (Próxima Sprint)

6. **Testes de integração** (CI/CD)
   - Validar pipeline ponta a ponta: push → ECR → migration → ECS running
   - Health check do ALB verificando `/health`

7. **Observabilidade inicial**
   - CloudWatch logs estruturados (JSON)
   - Métricas básicas: latência de GET, cache hit rate

8. **Documentação de ADRs**
   - `/docs/adr/001-schema-per-service.md` — decisão de isolamento no Aurora
   - `/docs/adr/002-cache-aside.md` — estratégia Valkey

### Médio Prazo (Fase 2+)

9. **Identidade + Cognito** (Fase 2)
   - JWT obrigatório no ALB listener (Cognito auth)
   - Endpoint protegido de admin (futuro)

10. **Entrega para Pedido** (Fase 3)
    - GET `/api/catalogo/{id}` chamado por `kiro-loja-pedido` (síncrono)
    - Contrato de API documentado + testes de contrato

11. **Entrega Global** (Fase 6)
    - CloudFront multi-origem (S3 + ALB)
    - Travar ALB ao CloudFront (prefix list + header secreto)

---

## 🧪 Validação Local (Antes de Deploy)

```bash
# Setup
npm install

# Lint + Build + Test
npm run lint
npm run build
npm run test

# Dev (simulação local)
npm run dev
# curl http://localhost:3000/health
# curl http://localhost:3000/api/catalogo/listar
```

**Dependências AWS para testes locais:** Aurora/Valkey mockados nos testes; sem dependência de AWS local.

---

## 🚀 Fluxo de Merge e Deploy

1. **Branch curta** (ex: `feat/list-products`)
2. **PR na main**
   - GitHub Actions: lint → build → test
   - Revisão de código
3. **Merge na main** (squash ou rebase)
   - GitHub Actions roda novamente (redundante, mas seguro)
4. **CodePipeline acionado** (após merge, assumindo CF + CodeConnections vivas)
   - CodeBuild: docker build → push ECR (tag = SHA)
   - CodeBuild in-VPC: migration no Aurora
   - ECS: rolling deployment (max 2 tasks, gradual rollout)
5. **Health check do ALB** valida task nova
6. **Rollback automático** se health check falhar (ECS DeploymentCircuitBreaker)

---

## 📋 Checklist de Produção (Antes de Fase 2)

- [ ] Foundation (VPC, ALB, Aurora, Valkey, ECS Cluster) viva na AWS
- [ ] CodeConnection GitHub ↔️ AWS autenticado
- [ ] Stack `catalogo-stack.yaml` deployado (ECR, Service, TargetGroup criados)
- [ ] CodePipeline rodou ≥ 1 vez com sucesso (imagem no ECR, tasks rodando, ALB respondendo)
- [ ] Health check (`GET /health`) passando
- [ ] Seed de produtos no Aurora (≥ 3 produtos de teste)
- [ ] Endpoint `GET /api/catalogo/listar` retornando produtos via ALB (`http://ALB-DNS/api/catalogo/listar`)
- [ ] Cache Valkey validado (latência reduzida no 2º request)
- [ ] Logs estruturados visíveis no CloudWatch
- [ ] Branch protection ativada na `main` (exigir tests verdes + revisão)
- [ ] Documentação de ADRs atualizada

---

## 🔗 Referências

- **ROTEIRO.md** (kiro-devops) — roteiro transversal, decisões de arquitetura
- **foundation.yaml** (kiro-loja-infra) — camada compartilhada (VPC, ALB, Aurora, Valkey)
- **padroes-desenvolvimento.md** (este repo, `.kiro/steering/`) — convenções locais
- **Fase 1** nesta especificação (ROTEIRO § 9) — catálogo + loop de deploy

---

*Última atualização: 2025-01-14*
