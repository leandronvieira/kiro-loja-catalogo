# Comece Aqui 🚀

Bem-vindo ao **kiro-loja-catalogo**! Este é o serviço de catálogo de e-books do projeto **Kiro Loja**.

---

## 📖 Leitura Rápida (5 min)

1. **Você quer entender a arquitetura?**
   → Leia [`README.md`](README.md) (1 min) + [`ROTEIRO.md`](../kiro-devops/ROTEIRO.md) (10 min no kiro-devops)

2. **Você quer clonar e desenvolver localmente?**
   → Ir para **"Desenvolvimento Local"** abaixo

3. **Você quer entender o que foi entregue?**
   → Leia [`RESUMO-EXECUTIVO.md`](RESUMO-EXECUTIVO.md) (3 min)

4. **Você quer fazer deploy na AWS?**
   → Leia [`PHASE-1.md`](PHASE-1.md) > Seção "❌ A Fazer"

---

## 💻 Desenvolvimento Local

### Setup (primeira vez)

```bash
# 1. Clonar repositório (você já está aqui se leu isto)
git clone https://github.com/seu-user/kiro-loja-catalogo.git
cd kiro-loja-catalogo

# 2. Instalar dependências
npm install

# 3. Build inicial
npm run build
```

### Desenvolvimento

```bash
# Terminal 1: Live reload (watch mode)
npm run dev

# Terminal 2: Testes (watch mode)
npm run test -- --watch

# Terminal 3: Lint contínuo (opcional)
npm run lint
```

**A aplicação vai rodar em:**
```
http://localhost:3000/health
http://localhost:3000/api/catalogo/listar
```

### Commits

```bash
# Mudar para branch de feature
git checkout -b feat/sua-feature

# Fazer mudanças, testar, commitar
git add .
git commit -m "feat: descrição breve"
git push origin feat/sua-feature

# Abrir PR no GitHub
```

**Atenção:** commits devem passar nos testes + lint (GitHub Actions é obrigatório).

---

## 🧪 Testes

```bash
# Rodar testes uma vez
npm run test

# Watch mode
npm run test -- --watch

# Com cobertura
npm run test -- --coverage

# Apenas um arquivo
npm run test src/routes/catalogo.test.ts
```

**Cobertura esperada:** 100% dos paths críticos (endpoints + cache-aside)

---

## 📚 Documentação

| Arquivo | Propósito |
|---------|-----------|
| [`README.md`](README.md) | Visão geral do serviço |
| [`RESUMO-EXECUTIVO.md`](RESUMO-EXECUTIVO.md) | Deliverables da Fase 1 |
| [`PHASE-1.md`](PHASE-1.md) | Checklist de validação + próximos passos |
| [`.kiro/steering/padroes-desenvolvimento.md`](.kiro/steering/padroes-desenvolvimento.md) | Convenções e standards |
| [`../kiro-devops/ROTEIRO.md`](../kiro-devops/ROTEIRO.md) | Roteiro transversal (decisões, arquitetura) |

---

## 🏗️ Estrutura (Resumo)

```
src/
├── index.ts                      # Express + setup
├── routes/catalogo.ts           # GET /api/catalogo/{listar,{id}}
├── services/catalogo-service.ts # Cache-aside (Valkey → Aurora)
├── db/pool.ts                   # Aurora connection pool
├── cache/valkey.ts              # Valkey/Redis client
└── types/index.ts               # Product interface

tests/
├── src/routes/catalogo.test.ts
└── src/services/catalogo-service.test.ts

infra/
├── catalogo-stack.yaml          # CloudFormation (ECR, ECS, ALB)
├── buildspec.yml                # CodeBuild (docker build → ECR)
└── Dockerfile                   # Multi-stage build
```

---

## 🔗 Endpoints

### GET `/health`
```bash
curl http://localhost:3000/health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T10:30:00.000Z"
}
```

### GET `/api/catalogo/listar`
```bash
curl 'http://localhost:3000/api/catalogo/listar?page=1&limit=10'
```

**Resposta:**
```json
{
  "products": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "titulo": "Clean Code",
      "autor": "Robert C. Martin",
      "preco": 29.99,
      "capa_url": "https://example.com/cover.jpg",
      "categoria": "programming",
      "criado_em": "2025-01-01T00:00:00Z",
      "atualizado_em": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "offset": 0
  }
}
```

### GET `/api/catalogo/:id`
```bash
curl http://localhost:3000/api/catalogo/550e8400-e29b-41d4-a716-446655440001
```

**Resposta:** (mesmo objeto de produto acima)

---

## ⚙️ Ambiente (Produção)

Variáveis injetadas pelo **CloudFormation** (não é preciso `.env` em prod):

```
AURORA_HOST=<cluster endpoint>
AURORA_PORT=5432
AURORA_DATABASE=kirolojadb
AURORA_USER=catalogo
AURORA_PASSWORD=<from Secrets Manager>
VALKEY_HOST=<cluster endpoint>
VALKEY_PORT=6379
NODE_ENV=production
PORT=3000
```

**Localmente**, crie `.env` para testes (não comitar):
```bash
AURORA_HOST=localhost
AURORA_PORT=5432
AURORA_DATABASE=testdb
AURORA_USER=testuser
AURORA_PASSWORD=testpass
VALKEY_HOST=localhost
VALKEY_PORT=6379
NODE_ENV=development
PORT=3000
```

---

## 🚀 Deploy (Quando Fundação Estiver Viva)

1. **Ativar Git Sync** (kiro-loja-infra)
2. **Criar CodeConnection** (GitHub ↔️ AWS)
3. **Deployar stack de serviço** (`catalogo-stack.yaml`)
4. **Criar CodePipeline** (GitHub → CodeBuild → ECS)
5. **Push na main**
   - GitHub Actions: testes verdes
   - CodePipeline: docker build → ECR → migration → ECS rolling

Ver [`PHASE-1.md`](PHASE-1.md) para detalhes.

---

## ❓ Perguntas Frequentes

**P: Posso commitar `.env`?**  
R: Não. Use `.gitignore` (já configurado). `.env` é apenas local; produção vem de CloudFormation.

**P: Como adicionar uma nova feature?**  
R: 1) Branch (`feat/...`) 2) Código + testes 3) PR 4) GitHub Actions testa 5) Merge 6) Deploy automático.

**P: Onde são os dados armazenados?**  
R: Aurora PostgreSQL (schema `catalogo`, isolado). Cache em Valkey (TTL 1h). Sem dados locais.

**P: Posso rodar sem Aurora/Valkey local?**  
R: Sim! Testes usam mocks. Para `npm run dev`, será preciso Aurora/Valkey (docker-compose, depois).

**P: Como resetar o repo para estado inicial?**  
R: `git reset --hard HEAD` (cuidado, perde mudanças locais não commitadas).

---

## 🤝 Próximas Etapas Recomendadas

1. **Agora:** Rodar `npm install && npm run build && npm run test` localmente
2. **Depois:** Adicionar seed de produtos (002_seed_products.sql)
3. **Depois:** Integrar com kiro-loja-pedido (API consumption)
4. **Depois:** Integrar com Identidade/Cognito (Fase 2)

---

## 📞 Suporte

- **Roteiro & arquitetura:** [`../kiro-devops/ROTEIRO.md`](../kiro-devops/ROTEIRO.md)
- **Infraestrutura:** [`../kiro-loja-infra/README.md`](../kiro-loja-infra/README.md)
- **Este serviço:** [`README.md`](README.md)
- **Padrões:** [`.kiro/steering/padroes-desenvolvimento.md`](.kiro/steering/padroes-desenvolvimento.md)

---

**Pronto para começar? Rode `npm install` e divirta-se! 🎉**
