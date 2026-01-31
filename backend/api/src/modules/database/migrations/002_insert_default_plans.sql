-- Migration: Insert default plans for XUI-SaaS
-- Date: 2025-01-31
-- Description: Creates 3 default plans (Starter, Professional, Enterprise)

-- Note: This should be run after the plans table is created
-- Each tenant can customize these plans or create their own

INSERT INTO plans (tenant_id, name, description, price, duration_days, is_active, created_at, updated_at) 
VALUES 
-- Starter Plan
(1, 'Starter', 'Ideal para pequenos provedores iniciando. Até 100 clientes, 1 instância XUI-One, pagamentos via PIX e Cartão, WhatsApp Business API (500 mensagens/mês), backup diário, 10GB storage, suporte por email.', 97.00, 30, TRUE, NOW(), NOW()),

-- Professional Plan  
(1, 'Professional', 'Para provedores em crescimento. Até 500 clientes, 3 instâncias XUI-One com failover, sistema de comissões (até 10 revendedores), integração TMDB (100 títulos VOD), Telegram Bot básico (1 canal), API REST (1.000 req/dia), backups horários, 50GB storage, suporte prioritário via WhatsApp.', 297.00, 30, TRUE, NOW(), NOW()),

-- Enterprise Plan
(1, 'Enterprise', 'Para grandes operações e ISPs. Clientes ilimitados, instâncias XUI-One ilimitadas com load balancer, sistema de comissões ilimitado, TMDB/VOD ilimitado, Telegram Bot avançado (canais ilimitados), posts automatizados, API ilimitada, white-label, mobile app próprio, CDN Cloudflare Pro, backups em tempo real, 200GB storage, suporte 24/7 dedicado, SLA 1h.', 697.00, 30, TRUE, NOW(), NOW());

-- Note: tenant_id = 1 is the default/system tenant
-- In production, each tenant creates their own plans based on these templates
