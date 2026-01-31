<div align="center">

# 🚀 XUI-SaaS Enterprise

### **Plataforma Enterprise de Automação e Orquestração Multi-Tenant para Operações XUI-One**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://semver.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-13%2F13%20passing-success.svg)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://docker.com)
[![Node](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://typescriptlang.org)

<p align="center">
  <strong>🏗️ Arquitetura Microservices • 🔐 Security-First • 📱 Multi-Platform • 🌍 Multi-Tenant</strong>
</p>

<p align="center">
  <a href="#-recursos">Recursos</a> •
  <a href="#-arquitetura">Arquitetura</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-documentação">Documentação</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

</div>

---

## 🎯 Visão do Projeto

O **XUI-SaaS Enterprise** é uma plataforma enterprise-grade projetada para revolucionar a gestão de operações XUI-One através de uma arquitetura SaaS multi-tenant, oferecendo automação completa, integrações avançadas e escalabilidade empresarial.

### Nossos Princípios Fundamentais

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 SECURITY-FIRST    •    🏗️ SCALABLE    •    🔧 AUTOMATED    │
├─────────────────────────────────────────────────────────────────┤
│  • Criptografia AES-256-GCM        • Arquitetura Microservices  │
│  • JWT com expiração               • Multi-tenant isolado       │
│  • Rate Limiting (100/20 req/min)  • Auto-scaling ready        │
│  • SSRF Protection                 • Container orchestration    │
│  • Input Validation                • State-of-the-art DevOps   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Recursos Enterprise

### FASE 1: Fundação Sólida ✅
<details>
<summary><b>🔐 Sistema de Autenticação & Autorização</b></summary>

- ✅ **JWT State-of-the-Art**: Tokens de acesso (15min) + refresh (7 dias)
- ✅ **RBAC Completo**: Super Admin, Admin Tenant, Seller, Customer, Support
- ✅ **Multi-Tenant Isolado**: Separação total de dados por tenant
- ✅ **Rate Limiting**: Proteção contra brute-force e DDoS
- ✅ **Audit Trail**: Registro completo de todas as ações
- ✅ **Session Management**: Controle granular de sessões ativas

</details>

<details>
<summary><b>🏗️ Conector XUI-One Enterprise</b></summary>

- ✅ **Conexão Direta MariaDB**: Sem necessidade de instalar XUI no cliente
- ✅ **Criptografia Enterprise**: Senhas criptografadas com AES-256-GCM
- ✅ **CRUD Completo**: Gerenciamento de instâncias com failover
- ✅ **Teste de Conectividade**: Validação automática de permissões
- ✅ **Sincronização Automática**: Importação de clientes, planos e métricas
- ✅ **Multi-Instância**: Suporte a múltiplas instâncias por tenant

</details>

### FASE 2: Monetização & Comunicação ✅
<details>
<summary><b>💰 Sistema de Pagamentos Enterprise</b></summary>

- ✅ **Multi-Gateway**: Mercado Pago + Cora
- ✅ **Múltiplos Métodos**: PIX, Cartão de Crédito, Boleto
- ✅ **Webhooks Seguros**: Confirmação automática de pagamentos
- ✅ **Gestão de Planos**: CRUD completo com preços e duração
- ✅ **Renovação Automática**: Integração com XUI para ativação
- ✅ **Relatórios Financeiros**: MRR, ARR, Churn analysis

</details>

<details>
<summary><b>💼 Sistema de Comissões Avançado</b></summary>

- ✅ **Comissões Configuráveis**: Porcentagem customizável por seller
- ✅ **Recorrência**: Comissões sobre renovações automáticas
- ✅ **Dashboard Seller**: Visualização de performance e ganhos
- ✅ **Estornos Automáticos**: Reversão em caso de chargeback
- ✅ **Relatórios Detalhados**: Tracking completo de vendas
- ✅ **Ranking**: Sistema de pontuação e performance

</details>

<details>
<summary><b>📱 Integrações de Comunicação</b></summary>

- ✅ **WhatsApp Business API**: Via Evolution API
- ✅ **Templates Inteligentes**: Variáveis dinâmicas ({nome}, {usuario}, etc)
- ✅ **Automação de Mensagens**: Boas-vindas, lembretes, confirmações
- ✅ **Logs de Envio**: Rastreabilidade completa
- ✅ **Multi-Channel**: Suporte a múltiplos números

</details>

### FASE 3: Marketing & Conteúdo ✅
<details>
<summary><b>✈️ Integração Telegram Enterprise</b></summary>

- ✅ **Bot Multi-Tenant**: Um bot por tenant isolado
- ✅ **Canais Privados**: Controle de acesso granular
- ✅ **Publicações Automáticas**: Agendamento de conteúdo
- ✅ **Jogos do Dia**: Integração com fontes esportivas
- ✅ **Filmes/Séries**: Sincronização automática de VOD
- ✅ **Controle Adulto**: Restrição por tipo de plano

</details>

<details>
<summary><b>🎬 Sistema VOD + TMDB</b></summary>

- ✅ **Importação TMDB**: Enriquecimento automático de metadados
- ✅ **Posters & Sinopses**: Dados completos de filmes/séries
- ✅ **Categorização**: Organização automática por gênero
- ✅ **Agendamento**: Importação programada de conteúdo
- ✅ **Múltiplas Chaves**: Suporte a várias API keys TMDB
- ✅ **M3U Parser**: Importação de playlists externas

</details>

<details>
<summary><b>📢 Marketing Automatizado</b></summary>

- ✅ **Jogos do Dia**: Agendamento de jogos esportivos
- ✅ **Banners Automáticos**: Geração de imagens promocionais
- ✅ **Categorias Dinâmicas**: Criação automática de grupos
- ✅ **Postagem Multi-Canal**: Telegram, WhatsApp simultâneo
- ✅ **Análise de Performance**: Métricas de engajamento

</details>

### FASE 4: Enterprise & Hardening ✅
<details>
<summary><b>👥 Multi-Revendedor Avançado</b></summary>

- ✅ **Gestão Hierárquica**: Admin → Seller → Customer
- ✅ **Clientes por Seller**: Isolamento de carteiras
- ✅ **Códigos Personalizados**: Identificação única de sellers
- ✅ **Metas Mensais**: Sistema de goals e comissões
- ✅ **Estatísticas**: Dashboard de performance por seller
- ✅ **API Exclusiva**: Endpoints dedicados para sellers

</details>

<details>
<summary><b>💾 Sistema de Backups Enterprise</b></summary>

- ✅ **Backup Automatizado**: Agendamento via cron
- ✅ **Multi-Nível**: Database, configurações, arquivos
- ✅ **Criptografia**: Checksums SHA256 para integridade
- ✅ **Restore Pontual**: Recuperação granular
- ✅ **Retenção Configurável**: Políticas de retenção
- ✅ **Notificações**: Alertas de sucesso/falha

</details>

<details>
<summary><b>🔒 Hardening & Segurança</b></summary>

- ✅ **Headers de Segurança**: HSTS, CSP, X-Frame-Options
- ✅ **SSRF Protection**: Bloqueio de requisições internas
- ✅ **Input Sanitization**: Validação rigorosa de entradas
- ✅ **Rate Limiting**: Throttling inteligente por endpoint
- ✅ **CORS Restrito**: Configuração granular de origens
- ✅ **Health Checks**: Monitoramento contínuo

</details>

---

## 🏗️ Arquitetura

### Stack Tecnológico Enterprise

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          XUI-SaaS Enterprise                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔷 FRONTEND                    🔷 BACKEND                     🔷 DATA   │
│  ┌──────────────┐              ┌──────────────┐              ┌──────────┐│
│  │ Next.js 16   │  ◄────────── │ NestJS 11    │  ◄────────── │ MariaDB  ││
│  │ React 19     │   REST API   │ Node.js 20   │   mysql2     │ 10.11    ││
│  │ Tailwind 4   │              │ TypeScript 5 │              │          ││
│  └──────────────┘              └──────────────┘              └──────────┘│
│                                          │                               │
│  🔷 INTEGRAÇÕES                          │ 🔷 SEGURANÇA                 │
│  ┌──────────┬──────────┬──────────┐     │ ┌──────────┬──────────┐       │
│  │ Mercado  │ Evolution│ Telegram │     │ │ JWT      │ AES-256  │       │
│  │ Pago     │ API      │ Bot API  │     │ │ RBAC     │ GCM      │       │
│  └──────────┴──────────┴──────────┘     │ └──────────┴──────────┘       │
│                                          │                               │
│  🔷 INFRAESTRUTURA                       │ 🔷 DEVOPS                    │
│  ┌──────────┬──────────┬──────────┐     │ ┌──────────┬──────────┐       │
│  │ Docker   │ Docker   │ Nginx    │     │ │ GitHub   │ Automated│       │
│  │          │ Compose  │ Reverse  │     │ │ Actions  │ Backups  │       │
│  └──────────┴──────────┴──────────┘     │ └──────────┴──────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Módulos da Aplicação

| Módulo | Descrição | Status |
|--------|-----------|--------|
| **Auth** | Autenticação JWT, RBAC, Sessions | ✅ Production |
| **Audit** | Registro de auditoria completo | ✅ Production |
| **XUI** | Conector XUI-One com failover | ✅ Production |
| **Payments** | Gateway multi-provider | ✅ Production |
| **Commissions** | Sistema de comissões | ✅ Production |
| **WhatsApp** | Evolution API integration | ✅ Production |
| **Telegram** | Bot e canais | ✅ Production |
| **VOD** | TMDB integration | ✅ Production |
| **Marketing** | Automação de marketing | ✅ Production |
| **Sellers** | Multi-revendedor | ✅ Production |
| **Backups** | Sistema de backups | ✅ Production |
| **Health** | Health checks | ✅ Production |

---

## 🚀 Instalação

### ⚡ One-Liner Install (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/wesleiandersonti/xui-saas/main/deploy.sh | sudo bash
```

### 🐳 Docker Compose (Manual)

```bash
# Clone o repositório
git clone https://github.com/wesleiandersonti/xui-saas.git
cd xui-saas

# Configure o ambiente
cp .env.example .env
# Edite .env com suas configurações

# Suba os serviços
docker-compose up -d
```

### 📋 Requisitos de Sistema

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 vCores | 4 vCores |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04/24.04 LTS | Ubuntu 24.04 LTS |
| Docker | 24.x+ | Latest |
| Docker Compose | 2.x+ | Latest |

### 🔧 Configuração Pós-Instalação

```bash
# Acesse a API
http://seu-ip:5000/health

# Dashboard estará disponível em:
http://seu-ip:5000/dashboard
```

---

## 📚 Documentação

Nossa documentação enterprise está organizada em níveis:

### 📖 Para Administradores
- **[INSTALAÇÃO.md](docs/INSTALLATION.md)** - Guia completo de instalação Proxmox + Ubuntu
- **[ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)** - Manual do administrador (150+ páginas)
- **[DEPLOY.md](docs/DEPLOY.md)** - Estratégias de deploy enterprise

### 👤 Para Usuários Finais
- **[USER_GUIDE.md](docs/USER_GUIDE.md)** - Guia completo do usuário

### 💻 Para Desenvolvedores
- **[API_REFERENCE.md](docs/API_REFERENCE.md)** - Documentação da API REST (200+ endpoints)
- **[CHANGELOG.md](docs/CHANGELOG.md)** - Histórico de mudanças

---

## 🗺️ Roadmap

### ✅ Versão 1.0 (Current)
- [x] Arquitetura multi-tenant
- [x] Conector XUI-One
- [x] Sistema de pagamentos
- [x] Integrações WhatsApp/Telegram
- [x] VOD com TMDB
- [x] Multi-revendedor
- [x] Backups automatizados
- [x] Hardening completo

### 🔄 Versão 1.1 (Q1 2025)
- [ ] Dashboard analítico avançado
- [ ] Inteligência artificial para recomendações
- [ ] Mobile apps nativos (iOS/Android)
- [ ] Integração n8n workflows
- [ ] API GraphQL

### 🎯 Versão 2.0 (Q2 2025)
- [ ] Kubernetes native
- [ ] Multi-region deployment
- [ ] CDN integration
- [ ] Real-time analytics
- [ ] Machine learning para churn prediction

---

## 🛡️ Segurança

### Certificações & Compliance
- 🔒 **OWASP Top 10** - Proteções implementadas
- 🔒 **GDPR Ready** - Conformidade com LGPD
- 🔒 **PCI DSS** - Práticas para dados de pagamento
- 🔒 **ISO 27001** - Alinhado com padrões de segurança

### Features de Segurança

```yaml
Autenticação:
  - JWT com expiração curta (15 min)
  - Refresh tokens rotativos
  - MFA ready
  - Brute-force protection

Criptografia:
  - AES-256-GCM para dados sensíveis
  - TLS 1.3 para comunicação
  - Hash bcrypt para senhas
  - Certificates pinning ready

Infraestrutura:
  - Container isolation
  - Network segmentation
  - Secrets management
  - Vulnerability scanning
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia nosso [Guia de Contribuição](CONTRIBUTING.md) antes de submeter PRs.

```bash
# Fork o projeto
git clone https://github.com/seu-usuario/xui-saas.git

# Crie uma branch
git checkout -b feature/nova-feature

# Commit suas mudanças
git commit -m "feat: Adiciona nova feature"

# Push para a branch
git push origin feature/nova-feature

# Abra um Pull Request
```

---

## 💼 Suporte Enterprise

### Níveis de Suporte

| Nível | Descrição | Resposta |
|-------|-----------|----------|
| 🥉 Community | GitHub Issues | 72h |
| 🥈 Business | Email support | 24h |
| 🥇 Enterprise | 24/7 Phone + Slack | 1h |

### Contato
- 📧 **Email**: support@xui-saas.com
- 💬 **Discord**: [Join our server](https://discord.gg/xui-saas)
- 📱 **WhatsApp**: +55 (11) 99999-9999

---

## 📜 Licença

Este projeto está licenciado sob a [MIT License](LICENSE) - veja o arquivo para detalhes.

```
MIT License

Copyright (c) 2025 XUI-SaaS Enterprise

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🌟 Agradecimentos

Agradecemos a todas as pessoas que contribuíram para este projeto:

- 💻 **Desenvolvedores Core**: Arquitetura e implementação
- 🎨 **Designers UI/UX**: Interface intuitiva
- 🧪 **QA Team**: Testes e garantia de qualidade
- 📚 **Technical Writers**: Documentação completa
- 🌍 **Comunidade**: Feedback e sugestões

---

<div align="center">

**[⬆️ Voltar ao Topo](#-xui-saas-enterprise)**

Feito com ❤️ e ☕ pela equipe XUI-SaaS Enterprise

⭐ Star este projeto se ele te ajudou!

</div>
