# Guia de Contribuição - XUI-SaaS Enterprise

## 🎯 Nossos Princípios de Desenvolvimento

```
Código Limpo          Arquitetura Sólida        Segurança First
     👇                    👇                      👇
┌──────────┐          ┌──────────┐          ┌──────────┐
│ Legível  │          │ Modular  │          │ Validado │
│ Testado  │          │ Escalável│          │ Auditado │
│ Simples  │          │ Isolado  │          │ Protegido│
└──────────┘          └──────────┘          └──────────┘
```

## 🚀 Como Contribuir

### 1. Preparação do Ambiente

```bash
# 1. Fork o repositório
git clone https://github.com/seu-usuario/xui-saas.git
cd xui-saas

# 2. Instale dependências
cd backend/api && npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas configurações

# 4. Execute testes
npm test
npm run build
```

### 2. Fluxo de Contribuição

```bash
# Crie uma branch descritiva
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/correcao-do-bug
# ou
git checkout -b docs/atualizacao-readme

# Faça suas alterações
# ...

# Commit seguindo nossos padrões
git commit -m "tipo(scope): descrição curta

Descrição detalhada do que foi feito e por quê.

Refs: #123"

# Push para seu fork
git push origin feature/nome-da-feature

# Abra um Pull Request
```

## 📝 Padrões de Commit

Usamos [Conventional Commits](https://conventionalcommits.org/):

### Tipos de Commit

```
feat:     Nova funcionalidade
fix:      Correção de bug
docs:     Documentação apenas
style:    Formatação (sem mudança de código)
refactor: Refatoração de código
perf:     Melhoria de performance
test:     Adição/correção de testes
chore:    Tarefas de manutenção
ci:       Mudanças em CI/CD
security: Correções de segurança
```

### Exemplos

```bash
# Nova funcionalidade
git commit -m "feat(payments): Implementa webhook de confirmação Mercado Pago

- Adiciona endpoint para receber notificações
- Valida assinatura do webhook
- Atualiza status do pagamento automaticamente

Refs: #456"

# Correção de bug
git commit -m "fix(auth): Corrige expiração de token JWT

- Altera TTL de 15min para 30min
- Adiciona teste de expiração

Fixes: #789"

# Documentação
git commit -m "docs(api): Adiciona exemplos de integração Python

- Script completo de exemplo
- Documentação de autenticação

Refs: #101"

# Segurança
git commit -m "security(xui): Implementa criptografia AES-256-GCM

- Criptografa senhas de instâncias XUI
- Adiciona serviço de criptografia
- Atualiza documentação de segurança

Security: CVE-2025-XXXX"
```

## 🏗️ Padrões de Código

### TypeScript/NestJS

```typescript
// ✅ BOM: Tipagem explícita e documentada
/**
 * Cria uma nova instância XUI
 * @param tenantId - ID do tenant
 * @param dto - Dados da instância
 * @returns Instância criada
 * @throws NotFoundException se tenant não existe
 */
async createInstance(
  tenantId: number,
  dto: CreateXuiInstanceDto
): Promise<XuiInstance> {
  // Validação de inputs
  if (!tenantId || tenantId <= 0) {
    throw new BadRequestException('Tenant ID inválido');
  }
  
  // Lógica de negócio
  const instance = await this.repository.create({
    tenantId,
    ...dto,
    createdAt: new Date(),
  });
  
  // Auditoria
  await this.auditService.log({
    tenantId,
    action: 'XUI_INSTANCE_CREATED',
    entityId: instance.id,
  });
  
  return instance;
}

// ❌ RUIM: Sem tipagem, sem validação
async create(data) {
  return this.repo.save(data);
}
```

### Nomenclatura

```typescript
// Variáveis: camelCase
const userId: number;
const isActive: boolean;

// Classes/Interfaces: PascalCase
class XuiService {}
interface PaymentConfig {}

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const JWT_EXPIRATION = '15m';

// Enums: PascalCase + UPPER para valores
enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Funções: verbo + substantivo
async function validateUserInput() {}
async function processPaymentWebhook() {}
```

### Estrutura de Módulos

```
modules/
├── module-name/
│   ├── dto/
│   │   ├── create-entity.dto.ts
│   │   ├── update-entity.dto.ts
│   │   └── index.ts
│   ├── entity/
│   │   └── entity.types.ts
│   ├── module-name.controller.ts
│   ├── module-name.module.ts
│   ├── module-name.service.ts
│   └── module-name.service.spec.ts
```

## 🧪 Padrões de Teste

### Testes Unitários

```typescript
describe('XuiService', () => {
  let service: XuiService;
  let repository: MockType<XuiRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XuiService,
        {
          provide: XuiRepository,
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<XuiService>(XuiService);
    repository = module.get(XuiRepository);
  });

  describe('createInstance', () => {
    it('should create instance with valid data', async () => {
      // Arrange
      const dto: CreateXuiInstanceDto = {
        name: 'Test Instance',
        host: '192.168.1.1',
        port: 3306,
        username: 'admin',
        password: 'secret',
      };
      
      // Act
      const result = await service.createInstance(1, dto);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid tenant', async () => {
      // Arrange
      const dto = createMockDto();
      
      // Act & Assert
      await expect(service.createInstance(-1, dto))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
```

### Cobertura Mínima

- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

## 🔒 Padrões de Segurança

### Validação de Input

```typescript
// ✅ SEMPRE valide inputs
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateXuiInstanceDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;
}

// ✅ SEMPRE sanitize
import { sanitize } from 'class-sanitizer';

const cleanInput = sanitize(userInput);
```

### Criptografia

```typescript
// ✅ Use algoritmos fortes
import * as crypto from 'crypto';

// AES-256-GCM para dados sensíveis
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(secret, 'salt', 32);

// bcrypt para senhas
import * as bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 12);
```

### Proteção de Dados

```typescript
// ✅ Nunca logue dados sensíveis
// ❌ NÃO FAÇA:
logger.log(`User password: ${user.password}`);

// ✅ FAÇA:
logger.log(`User authenticated: ${user.id}`);

// ✅ Máscara dados em responses
return {
  ...user,
  password: undefined,
  ssn: maskSSN(user.ssn), // ***-**-1234
};
```

## 📚 Documentação

### Regra de Ouro
> **Toda alteração de código que afeta funcionalidade deve atualizar a documentação.**

### Checklist de Documentação

- [ ] README.md atualizado (se afeta visibilidade do projeto)
- [ ] ADMIN_GUIDE.md atualizado (se afeta administração)
- [ ] USER_GUIDE.md atualizado (se afeta usuário final)
- [ ] API_REFERENCE.md atualizado (se altera endpoints)
- [ ] CHANGELOG.md atualizado (sempre!)

### Template de Documentação

```markdown
## [Título da Feature]

### Visão Geral
Breve descrição do que a feature faz.

### Pré-requisitos
- Lista de requisitos

### Uso
\`\`\`typescript
// Exemplo de código
\`\`\`

### API Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST   | /api/v1/... | Descrição |

### Troubleshooting
| Problema | Solução |
|----------|---------|
| Erro X   | Faça Y  |
```

## 🔍 Code Review

### Checklist do Revisor

- [ ] Código segue padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Commits seguem padrão conventional
- [ ] Não há dados sensíveis expostos
- [ ] Performance foi considerada
- [ ] Segurança foi verificada

### Processo de Review

1. **Autor** cria PR com descrição detalhada
2. **CI/CD** executa testes e lint
3. **Revisor 1** foca em lógica e arquitetura
4. **Revisor 2** foca em segurança e performance
5. **Aprovação** requer 2 LGTM (Looks Good To Me)
6. **Merge** squash para manter histórico limpo

## 🐛 Reportando Bugs

### Template de Bug Report

```markdown
**Descrição do Bug**
Descrição clara do que está acontecendo.

**Como Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável.

**Ambiente:**
 - OS: [e.g. Ubuntu 22.04]
 - Versão: [e.g. 1.0.0]
 - Browser: [e.g. Chrome 120]

**Logs**
```
Stack trace ou logs relevantes
```
```

## 💡 Sugerindo Features

### Template de Feature Request

```markdown
**Sua sugestão está relacionada a um problema?**
Descrição clara do problema.

**Descreva a solução desejada**
Descrição do que você quer que aconteça.

**Alternativas consideradas**
Outras soluções que você considerou.

**Contexto adicional**
Qualquer outra informação relevante.
```

## 🏆 Reconhecimento

Contribuidores serão reconhecidos em:
- README.md (seção Agradecimentos)
- CHANGELOG.md
- Releases notes

## 📞 Suporte para Contribuidores

- **Discord**: #dev-contributors
- **Email**: dev@xui-saas.com
- **Horário de suporte**: Seg-Sex, 9h-18h BRT

## ⚖️ Código de Conduta

### Nossos Valores
- **Respeito**: Trate todos com dignidade
- **Colaboração**: Construímos juntos
- **Transparência**: Comunicação aberta
- **Excelência**: Buscamos a melhor qualidade

### Comportamento Inaceitável
- Assédio de qualquer tipo
- Discriminação
- Trollagem ou spam
- Desrespeito com revisores

## 📝 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença MIT do projeto.

---

**Dúvidas?** Abra uma issue com label `question` ou entre em contato em dev@xui-saas.com

Obrigado por contribuir! 🚀
