# Sistema de Gestão de Documentação

## 📋 Visão Geral

Este documento define o processo de manutenção da documentação do XUI-SaaS Enterprise, garantindo que toda mudança no código seja refletida na documentação correspondente.

## 🔄 Processo de Sincronização

### Regra de Ouro
> **Toda alteração de código que afeta funcionalidade, API ou comportamento do sistema DEVE ser acompanhada de atualização na documentação.**

### Fluxo de Trabalho

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Código     │────▶│  Checklist   │────▶│     Docs     │
│   Alterado   │     │   DocSync    │     │   Atualizada │
└──────────────┘     └──────────────┘     └──────────────┘
```

## ✅ Checklist de Sincronização

Para cada tipo de alteração, verifique os itens correspondentes:

### 🔧 Novas Funcionalidades
- [ ] Atualizar README.md (seções Features e Roadmap)
- [ ] Documentar em ADMIN_GUIDE.md (seção correspondente)
- [ ] Adicionar exemplos em API_REFERENCE.md
- [ ] Criar guia em USER_GUIDE.md (se aplicável)
- [ ] Atualizar CHANGELOG.md

### 🐛 Correções de Bugs
- [ ] Documentar em CHANGELOG.md
- [ ] Atualizar FAQ nas documentações afetadas
- [ ] Verificar se necessita atualizar ADMIN_GUIDE.md

### 🚀 Mudanças na API
- [ ] Atualizar API_REFERENCE.md
- [ ] Verificar exemplos de código
- [ ] Atualizar SDKs (cURL, JS, Python, PHP)
- [ ] Documentar breaking changes

### 🔒 Mudanças de Segurança
- [ ] Atualizar seção Security em README.md
- [ ] Documentar em ADMIN_GUIDE.md (Security)
- [ ] Atualizar CHANGELOG.md com [SECURITY] tag
- [ ] Notificar usuários se necessário

### 🗄️ Mudanças no Banco de Dados
- [ ] Atualizar diagrama em ARCHITECTURE.md
- [ ] Documentar migrations em DEPLOY.md
- [ ] Atualizar API_REFERENCE.md se campos mudaram

## 📝 Formato de Commits para Documentação

Use estas tags específicas para commits de documentação:

```bash
# README principal
git commit -m "docs(readme): Atualiza seção de features

- Adiciona novo módulo XYZ
- Atualiza roadmap para Q2 2025

Refs: #123"

# Guia do admin
git commit -m "docs(admin): Adiciona guia de configuração Mercado Pago

- Passo a passo completo
- Screenshots de exemplo
- Troubleshooting

Refs: #456"

# API Reference
git commit -m "docs(api): Documenta novos endpoints /v2/payments

- POST /v2/payments/checkout
- GET /v2/payments/status
- Exemplos em curl, JS, Python

Refs: #789"

# User Guide
git commit -m "docs(user): Atualiza guia de compra de planos

- Novo fluxo PIX
- Passo a passo com screenshots
- FAQ atualizado

Refs: #101"

# Changelog
git commit -m "docs(changelog): Registra versão 1.2.0

- Novas features
- Correções de bugs
- Breaking changes

Refs: #202"
```

## 📊 Tabela de Rastreamento

| Data | Versão | Tipo de Mudança | Código | Docs Atualizadas | Responsável |
|------|--------|----------------|--------|-----------------|-------------|
| 2025-01-31 | 1.0.0 | Initial Release | ✅ | ✅ | Weslei |
| 2025-01-31 | 1.0.0 | Docker Deploy | ✅ | ✅ | Weslei |
| 2025-01-31 | 1.0.0 | README Enterprise | ✅ | ✅ | Weslei |

## 🎯 Responsabilidades

### Desenvolvedores
- Verificar checklist antes de criar PR
- Garantir que código novo tenha documentação
- Usar tags de commit específicas

### Tech Lead
- Revisar se documentação acompanhou código
- Aprovar PRs apenas com docs atualizadas
- Manter CHANGELOG.md organizado

### Technical Writers
- Revisar qualidade da documentação
- Garantir consistência entre docs
- Manter exemplos atualizados

## 🚨 Alertas Automáticas

### Git Hooks Sugeridos

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Verifica se alterações em código afetam documentação
if git diff --cached --name-only | grep -E "\.(ts|js|json)$"; then
    echo "⚠️  Alterações de código detectadas!"
    echo "Verifique se a documentação precisa ser atualizada:"
    echo "  - API_REFERENCE.md (se alterou endpoints)"
    echo "  - USER_GUIDE.md (se mudou UX)"
    echo "  - ADMIN_GUIDE.md (se alterou config)"
    echo "  - CHANGELOG.md (sempre!)"
fi
```

## 📖 Templates de Documentação

### Template: Nova Funcionalidade

```markdown
## [Nome da Feature]

### Descrição
[Descrição clara e concisa]

### Pré-requisitos
- [Item 1]
- [Item 2]

### Passo a Passo
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

### Exemplos
\`\`\`bash
# Exemplo de uso
curl -X POST http://api/exemplo
\`\`\`

### Troubleshooting
| Problema | Solução |
|----------|---------|
| Erro X | Faça Y |

### Referências
- Issue: #[número]
- PR: #[número]
```

### Template: API Endpoint

```markdown
### [MÉTODO] /[endpoint]

**Descrição:** [Descrição breve]

**Autenticação:** [Tipo de auth necessária]

**Rate Limit:** [Limite de requisições]

#### Request
\`\`\`http
MÉTODO /endpoint HTTP/1.1
Host: api.xui-saas.com
Authorization: Bearer {token}
Content-Type: application/json

{
  "campo": "valor"
}
\`\`\`

#### Response
\`\`\`http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {}
}
\`\`\`

#### Códigos de Erro
| Código | Descrição |
|--------|-----------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 429 | Rate Limited |
```

## 🔄 Versionamento da Documentação

A documentação segue o mesmo versionamento do código (SemVer):

- **MAJOR**: Mudanças arquiteturais, breaking changes
- **MINOR**: Novas funcionalidades
- **PATCH**: Correções, melhorias de texto

## 🎓 Boas Práticas

1. **Clareza antes de tudo**: Documente como se estivesse explicando para um iniciante
2. **Exemplos funcionais**: Todo código deve ser testável
3. **Screenshots atualizados**: Mantenha imagens sincronizadas com a interface
4. **Links funcionais**: Verifique URLs regularmente
5. **Consistência**: Use mesma terminologia em todos os docs
6. **Revisão**: Sempre peça revisão de outra pessoa

## 📝 Lista de Documentos Prioritários

1. **README.md** - Primeira impressão do projeto
2. **INSTALLATION.md** - Setup deve ser impecável
3. **API_REFERENCE.md** - Desenvolvedores dependem disso
4. **USER_GUIDE.md** - Usuários finais precisam disso
5. **ADMIN_GUIDE.md** - Administradores usam diariamente
6. **CHANGELOG.md** - Histórico confiável de mudanças

## 🔍 Auditoria de Documentação

Realizada mensalmente:
- [ ] Verificar links quebrados
- [ ] Atualizar screenshots
- [ ] Revisar exemplos de código
- [ ] Verificar consistência entre docs
- [ ] Atualizar informações de contato
- [ ] Revisar FAQ com novas dúvidas comuns

## 📞 Contato

Dúvidas sobre documentação:
- Email: docs@xui-saas.com
- Discord: #documentation-channel
- Responsável: @tech-writer-team

---

**Última atualização:** 2025-01-31
**Versão deste documento:** 1.0.0
