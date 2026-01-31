# 💳 Configuração de Links de Pagamento - Mercado Pago

## 📋 Visão Geral

Este documento descreve como configurar links de pagamento (Checkout Pro) no Mercado Pago para os 3 planos do XUI-SaaS.

## 🎯 Planos e Valores

| Plano | Valor Mensal | Valor Anual | ID Interno |
|-------|-------------|-------------|------------|
| Starter | R$ 97,00 | R$ 970,00 | `starter_monthly` / `starter_yearly` |
| Professional | R$ 297,00 | R$ 2.970,00 | `pro_monthly` / `pro_yearly` |
| Enterprise | R$ 697,00 | R$ 6.970,00 | `enterprise_monthly` / `enterprise_yearly` |

## 🔧 Configuração no Mercado Pago

### 1. Acessar Dashboard

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta
3. Vá em "Checkout Pro" > "Criar link de pagamento"

### 2. Criar Links Manualmente (Alternativa 1)

Para cada plano, crie um link:

#### Starter Mensal
```
Título: XUI-SaaS Starter - Plano Mensal
Descrição: Plano Starter do XUI-SaaS - 100 clientes, 1 instância XUI, suporte por email
Valor: R$ 97,00
SKU: XUI_STARTER_M
```

#### Starter Anual
```
Título: XUI-SaaS Starter - Plano Anual (2 meses grátis)
Descrição: Plano Starter anual - Economize 2 meses! 100 clientes, 1 instância XUI
Valor: R$ 970,00
SKU: XUI_STARTER_Y
```

#### Professional Mensal
```
Título: XUI-SaaS Professional - Plano Mensal
Descrição: Plano Professional - 500 clientes, 3 instâncias, sistema de revendedores
Valor: R$ 297,00
SKU: XUI_PRO_M
```

#### Professional Anual
```
Título: XUI-SaaS Professional - Plano Anual (2 meses grátis)
Descrição: Plano Professional anual - Economize 2 meses! 500 clientes, revendedores, API
Valor: R$ 2.970,00
SKU: XUI_PRO_Y
```

#### Enterprise Mensal
```
Título: XUI-SaaS Enterprise - Plano Mensal
Descrição: Plano Enterprise - Ilimitado, white-label, mobile app, suporte 24/7
Valor: R$ 697,00
SKU: XUI_ENT_M
```

#### Enterprise Anual
```
Título: XUI-SaaS Enterprise - Plano Anual (2 meses grátis)
Descrição: Plano Enterprise anual - Economize 2 meses! Ilimitado, white-label, SLA 1h
Valor: R$ 6.970,00
SKU: XUI_ENT_Y
```

### 3. Configurar Webhook

1. No dashboard do Mercado Pago, vá em "Webhooks"
2. Adicione a URL: `https://seu-dominio.com/payments/webhook/mercadopago`
3. Selecione eventos: `payment.created`, `payment.updated`
4. Salve o `webhook_secret` no `.env`

## 💻 Integração Automática (API)

### Configuração no Backend

#### 1. Adicionar Planos ao Banco

Execute a migration:
```bash
npm run migration:run
```

Ou manualmente:
```sql
INSERT INTO plans (tenant_id, name, description, price, duration_days, is_active, metadata) VALUES
(1, 'Starter', 'Plano ideal para iniciar', 97.00, 30, TRUE, '{"mp_link_id": "link_starter_m", "features": ["100_clientes", "1_instancia", "whatsapp_500"]}'),
(1, 'Starter Anual', 'Plano Starter anual com desconto', 970.00, 365, TRUE, '{"mp_link_id": "link_starter_y", "features": ["100_clientes", "1_instancia", "whatsapp_500"]}'),
(1, 'Professional', 'Plano para crescimento', 297.00, 30, TRUE, '{"mp_link_id": "link_pro_m", "features": ["500_clientes", "3_instancias", "revendedores"]}'),
(1, 'Professional Anual', 'Plano Professional anual', 2970.00, 365, TRUE, '{"mp_link_id": "link_pro_y", "features": ["500_clientes", "3_instancias", "revendedores"]}'),
(1, 'Enterprise', 'Plano ilimitado', 697.00, 30, TRUE, '{"mp_link_id": "link_ent_m", "features": ["ilimitado", "white_label", "24_7"]}'),
(1, 'Enterprise Anual', 'Plano Enterprise anual', 6970.00, 365, TRUE, '{"mp_link_id": "link_ent_y", "features": ["ilimitado", "white_label", "24_7"]}');
```

#### 2. Variáveis de Ambiente (.env)

```env
# Mercado Pago Configuration
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_WEBHOOK_SECRET=seu_webhook_secret_aqui

# Planos MP Links IDs
MP_LINK_STARTER_M=https://mpago.la/xxxxx
MP_LINK_STARTER_Y=https://mpago.la/xxxxx
MP_LINK_PRO_M=https://mpago.la/xxxxx
MP_LINK_PRO_Y=https://mpago.la/xxxxx
MP_LINK_ENT_M=https://mpago.la/xxxxx
MP_LINK_ENT_Y=https://mpago.la/xxxxx
```

#### 3. Criar Preferência Dinâmica

O sistema já cria preferências automaticamente via API:

```typescript
// src/modules/payments/payments.service.ts
async createMercadoPagoPayment(payment: Payment, plan: Plan, config: PaymentConfig) {
  const preference: MercadoPagoPreference = {
    items: [{
      title: `XUI-SaaS ${plan.name}`,
      description: plan.description,
      unit_price: plan.price,
      quantity: 1,
      currency_id: 'BRL',
    }],
    external_reference: String(payment.id),
    notification_url: `${process.env.API_URL}/payments/webhook/mercadopago`,
    back_urls: {
      success: `${process.env.FRONTEND_URL}/payment/success`,
      failure: `${process.env.FRONTEND_URL}/payment/failure`,
      pending: `${process.env.FRONTEND_URL}/payment/pending`,
    },
    auto_return: 'approved',
  };

  // Cria preferência via API MP
  const response = await axios.post(
    'https://api.mercadopago.com/checkout/preferences',
    preference,
    {
      headers: {
        'Authorization': `Bearer ${config.configJson.accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.init_point; // Link de pagamento
}
```

## 🎨 URLs de Pagamento

### Endpoints da API

```
POST /payments/checkout
Body: {
  "planId": 1,
  "provider": "mercadopago",
  "paymentMethod": "pix" // ou "credit_card"
}

Response: {
  "success": true,
  "data": {
    "payment": {...},
    "checkoutUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
    "pixQrCode": null // ou QR code se PIX
  }
}
```

## 📊 Fluxo de Pagamento

```
1. Usuário escolhe plano
   ↓
2. Frontend chama POST /payments/checkout
   ↓
3. Backend cria preferência MP
   ↓
4. Retorna link de pagamento
   ↓
5. Usuário redirecionado para MP
   ↓
6. Usuário paga (PIX/Cartão)
   ↓
7. MP chama webhook
   ↓
8. Backend atualiza status
   ↓
9. Ativa plano automaticamente
   ↓
10. Notifica usuário (WhatsApp/Email)
```

## 🧪 Testes

### Ambiente Sandbox

1. Use credenciais de TEST no `.env`
2. Use cartões de teste MP:
   - Mastercard: `5031 4333 2364 4786`
   - Visa: `4235 6477 2802 5683`
3. Use CPF fictício: `12345678909`

### Verificar Webhook

```bash
# Testar endpoint de webhook
curl -X POST https://seu-dominio.com/payments/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type": "payment", "data": {"id": "123456"}}'
```

## 📝 Documentação dos Campos

### Tabela: plans

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | ID único do plano |
| name | VARCHAR | Nome do plano |
| description | TEXT | Descrição completa |
| price | DECIMAL | Valor mensal |
| duration_days | INT | Duração (30 ou 365) |
| metadata | JSON | Configurações extras |

### Tabela: payments

| Campo | Tipo | Descrição |
|-------|------|-----------|
| external_id | VARCHAR | ID da preferência MP |
| status | ENUM | pending/approved/rejected |
| payment_method | VARCHAR | pix/credit_card |

## 🚀 Checklist de Implementação

- [ ] Criar conta no Mercado Pago
- [ ] Gerar Access Token (Produção)
- [ ] Configurar webhook no MP
- [ ] Adicionar credenciais no .env
- [ ] Criar planos no banco de dados
- [ ] Testar criação de preferência
- [ ] Testar webhook de confirmação
- [ ] Verificar ativação automática
- [ ] Testar notificações
- [ ] Documentar para equipe

## 📞 Suporte

Dúvidas sobre integração:
- Doc MP: https://www.mercadopago.com.br/developers
- Email: dev@xui-saas.com

---

**Documento criado:** 2025-01-31  
**Versão:** 1.0.0  
**Integração:** Mercado Pago Checkout Pro
