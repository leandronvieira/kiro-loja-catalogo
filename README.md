# kiro-loja-catalogo

Serviço de catálogo de e-books — **Kiro Loja**.

Responsável pela verdade do produto: título, autor, **preço**, capa, categoria, preview. Dados armazenados no **Aurora PostgreSQL** (schema `catalogo` no cluster compartilhado) com cache em **Valkey**.

## Arquitetura

- **Computação:** ECS/Fargate (subnets privadas, atrás do ALB)
- **Dados:** Aurora (schema `catalogo`, usuário dedicado) + Valkey (cache)
- **API:** Express/Node.TS — endpoints de leitura para o frontend e para outros serviços
- **Deploy:** CodePipeline (GitHub → CodeBuild → ECR → ECS rolling)

## Dependências

**Importadas da fundação (outputs do `foundation.yaml`)**:
- VPC, subnets privadas, SG das tasks
- ALB + listener (adiciona ListenerRule neste repo)
- ECS Cluster
- Aurora (cluster endpoint, port, secret do master)
- Valkey (endpoint, port)

## Desenvolvimento local

```bash
# Setup
npm install

# Build
npm run build

# Dev (watch mode)
npm run dev

# Testes
npm run test

# Lint
npm run lint

# Migration (criar schema no Aurora)
npm run migration:create -- --name add_products_table
npm run migration:run
```

## Estrutura do repositório

```
kiro-loja-catalogo/
├── src/
│   ├── index.ts                 # Entrada da aplicação
│   ├── routes/
│   │   └── catalogo.ts          # Endpoints de catálogo (/api/catalogo)
│   ├── db/
│   │   ├── pool.ts              # Connection pool do Aurora
│   │   └── migrations/          # Migrações SQL (schema `catalogo`)
│   ├── cache/
│   │   └── valkey.ts            # Client do Valkey
│   └── types/
│       └── index.ts             # Tipos TypeScript compartilhados
├── scripts/
│   ├── migration-create.ts      # Criar migration
│   └── migration-run.ts         # Executar migrations
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Pipeline de Deploy

1. **PR na `main`:** testes + lint (GitHub Actions)
2. **Merge na `main`:**
   - CodePipeline (definido em CloudFormation no stack de serviço)
   - CodeBuild: `docker build` → push ECR (tag = SHA do commit)
   - CodeBuild in-VPC: executar migrations no Aurora
   - Ação de ECS: rolling deployment (lê `imagedefinitions.json` do build)

## Primeiro Deploy (Fase 1)

- [ ] Criar stack CloudFormation do serviço (`kiro-loja-catalogo-stack.yaml`)
  - Define: ECR, TaskDefinition, Service ECS, ListenerRule no ALB
  - Importa: VPC, subnets, SG, ALB, cluster ECS, Aurora, Valkey
- [ ] Criar CodePipeline (source GitHub + CodeBuild + migration + deploy ECS)
- [ ] Implementar GET `/api/catalogo/listar` (read all products)
- [ ] Implementar GET `/api/catalogo/{id}` (read single product + preço)
- [ ] Criar migration inicial: tabela `produtos`
- [ ] Testar no ALB (curl http://alb-dns/api/catalogo/listar)

## Docs

- **Roteiro transversal:** [ROTEIRO.md](../kiro-devops/ROTEIRO.md) (kiro-devops)
- **ADRs específicas:** `/docs/adr/` neste repo (conforme evoluir)

---

*Última atualização: Fase 1 (estrutura base)*
