# 🧪 Checklist de Testes - XUI-SaaS

## 📋 Sistema de Testes Completo

### ✅ Status Atual dos Testes

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  🧪 Testes Unitários: 13/13 PASSANDO ✅                         │
│  🏗️  Build TypeScript: ✅ SUCESSO                              │
│  📦 Dependências: ✅ Atualizadas                               │
│  🐳 Docker: ⏳ Não testado (precisa iniciar containers)       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Testes Automatizados (Jest)

### Execute os testes:

```bash
cd xui-saas/backend/api

# Testes unitários
npm test

# Com coverage
npm run test:cov

# Testes E2E
npm run test:e2e
```

### Resultados Esperados:

✅ **13 testes passando**
- AppController
- SSRF Security
- AuditService
- DashboardService
- M3U Parser

---

## 🔧 Testes de Build

### 1. Verificar Build
```bash
cd xui-saas/backend/api
npm run build
```

**Esperado:** ✅ `dist/` criado sem erros

### 2. Verificar Lint
```bash
npm run lint
```

**Esperado:** ✅ Sem erros de linting

### 3. Verificar Formatação
```bash
npm run format
```

**Esperado:** ✅ Arquivos formatados

---

## 🌐 Testes de API (Endpoints)

### Preparação
```bash
# Iniciar banco de dados
docker-compose up -d db

# Iniciar API
npm run start:dev
```

### Testes com cURL

#### 1. Health Check
```bash
curl http://localhost:5000/health
```

**Esperado:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-31T..."
}
```

#### 2. Registro (Trial)
```bash
curl -X POST http://localhost:5000/trials/start \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "email": "teste@email.com",
    "password": "senha123",
    "planId": 1
  }'
```

**Esperado:** ✅ Trial criado com sucesso

#### 3. Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@email.com",
    "password": "senha123"
  }'
```

**Esperado:** ✅ Token JWT retornado

#### 4. Listar Planos
```bash
curl http://localhost:5000/payments/plans
```

**Esperado:** ✅ Lista com 3 planos

---

## 🗄️ Testes de Banco de Dados

### 1. Conexão
```bash
# Verificar container
docker ps | grep mariadb

# Conectar
mysql -h localhost -P 3306 -u xui_saas -p
```

### 2. Verificar Tabelas
```sql
SHOW TABLES;
```

**Esperado:** 30+ tabelas criadas

### 3. Verificar Dados
```sql
-- Verificar planos
SELECT * FROM plans;

-- Verificar usuários
SELECT COUNT(*) FROM users;

-- Verificar tenants
SELECT * FROM tenants;
```

---

## 🐳 Testes Docker

### 1. Subir Tudo
```bash
cd xui-saas
docker-compose up -d
```

### 2. Verificar Containers
```bash
docker-compose ps
```

**Esperado:**
- ✅ db: Up
- ✅ api: Up

### 3. Verificar Logs
```bash
docker-compose logs -f api
docker-compose logs -f db
```

### 4. Testar Conexão
```bash
# API
curl http://localhost:5000/health

# Banco (de dentro do container)
docker exec -it xui-saas-db mysql -u xui_saas -p -e "SELECT 1;"
```

---

## 📱 Testes Frontend

### 1. Landing Page
```bash
# Acesse no navegador
http://localhost:3000/precos.html
```

**Verificar:**
- ✅ Design responsivo
- ✅ 3 planos exibidos
- ✅ Preços corretos
- ✅ Botões de CTA

### 2. Build
```bash
cd xui-saas/frontend/web
npm run build
```

---

## 🔒 Testes de Segurança

### 1. Rate Limiting
```bash
# Fazer 25 requisições rápidas
for i in {1..25}; do
  curl http://localhost:5000/health
done
```

**Esperado:** ✅ 429 Too Many Requests após 20

### 2. Autenticação
```bash
# Tentar acessar sem token
curl http://localhost:5000/dashboard/metrics

# Esperado: 401 Unauthorized
```

### 3. CORS
```bash
curl -H "Origin: http://invalid.com" \
  http://localhost:5000/health
```

**Esperado:** ✅ Bloqueado ou headers corretos

---

## 📊 Testes de Performance

### 1. Tempo de Resposta
```bash
# Health check
time curl http://localhost:5000/health

# Esperado: < 100ms
```

### 2. Concorrência
```bash
# Apache Bench (se instalado)
ab -n 100 -c 10 http://localhost:5000/health

# Esperado: Sem erros, tempo médio < 200ms
```

---

## 🔄 Testes de Integração

### 1. Fluxo Completo

#### A. Registro com Trial
```bash
curl -X POST http://localhost:5000/trials/start \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "email": "fluxo@teste.com",
    "password": "senha123",
    "planId": 1
  }'
```

#### B. Login
```bash
# Guardar token
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fluxo@teste.com","password":"senha123"}' \
  | jq -r '.accessToken')
```

#### C. Verificar Trial
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/trials/status
```

#### D. Acessar Dashboard
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/dashboard/metrics
```

---

## 📝 Checklist Manual

### Funcionalidades Core

- [ ] **Autenticação**
  - [ ] Registro funciona
  - [ ] Login funciona
  - [ ] JWT expira corretamente
  - [ ] Refresh token funciona
  - [ ] Logout funciona

- [ ] **Multi-tenancy**
  - [ ] Dados isolados por tenant
  - [ ] Usuários de tenants diferentes não se veem

- [ ] **XUI Connector**
  - [ ] Testar conexão funciona
  - [ ] Cadastrar instância funciona
  - [ ] Listar instâncias funciona

- [ ] **Pagamentos**
  - [ ] Listar planos funciona
  - [ ] Criar pagamento (sem MP real)
  - [ ] Webhook responde 200

- [ ] **Trial System**
  - [ ] Criar trial funciona
  - [ ] Verificar status funciona
  - [ ] Conversão para pago funciona

- [ ] **Upsell System**
  - [ ] Banner aparece ao atingir 80%
  - [ ] Tracking funciona
  - [ ] Analytics registram

---

## 🚨 Problemas Comuns

### Problema: "Cannot find module"
**Solução:**
```bash
npm install
```

### Problema: "Database connection failed"
**Solução:**
```bash
docker-compose up -d db
# Aguarde 30s
npm run start:dev
```

### Problema: "Port already in use"
**Solução:**
```bash
# Matar processo na porta 5000
lsof -ti:5000 | xargs kill -9
```

### Problema: "Permission denied"
**Solução:**
```bash
chmod +x scripts/*.sh
```

---

## ✅ Resultado Final

### Contagem de Testes

```
Testes Automatizados:     13/13 ✅
Testes de Build:          3/3   ✅
Testes de API:            5/5   ⏳ (requer servidor rodando)
Testes Docker:            4/4   ⏳ (requer containers)
Testes Frontend:          2/2   ⏳ (requer build)
Testes Segurança:         3/3   ⏳ (requer servidor rodando)
Testes Integração:        1/1   ⏳ (fluxo completo)
```

### Status Geral

🟡 **Parcialmente Testado**

**O que funciona:**
- ✅ Código compila
- ✅ Testes unitários passam
- ✅ Dependências instaladas
- ✅ Estrutura de arquivos correta

**O que precisa testar:**
- ⏳ API endpoints (requer banco de dados)
- ⏳ Docker containers (requer docker)
- ⏳ Integração completa (requer tudo rodando)

---

## 🚀 Próximos Passos para Teste Completo

1. **Iniciar ambiente:**
   ```bash
   docker-compose up -d
   ```

2. **Rodar testes de integração:**
   ```bash
   npm run test:e2e
   ```

3. **Testar manualmente** cada endpoint

4. **Verificar logs** por erros

5. **Testar frontend** no navegador

---

**Documento criado:** 2025-01-31  
**Status:** Checklist de testes completo  
**Pronto para:** Execução de testes manuais
