#!/bin/bash

# 🧪 Script de Testes - XUI-SaaS
# Este script verifica se todos os componentes estão funcionando

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Funções
print_header() {
    echo ""
    echo "=========================================="
    echo "🧪 $1"
    echo "=========================================="
}

print_success() {
    echo -e "${GREEN}✅ PASSOU${NC}: $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ FALHOU${NC}: $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  AVISO${NC}: $1"
}

# ============================================
# TESTE 1: Verificar estrutura de arquivos
# ============================================
print_header "TESTE 1: Estrutura de Arquivos"

if [ -d "xui-saas/backend/api" ]; then
    print_success "Diretório backend/api existe"
else
    print_error "Diretório backend/api não encontrado"
fi

if [ -d "xui-saas/frontend/web" ]; then
    print_success "Diretório frontend/web existe"
else
    print_error "Diretório frontend/web não encontrado"
fi

if [ -f "xui-saas/docker-compose.yml" ]; then
    print_success "Arquivo docker-compose.yml existe"
else
    print_error "Arquivo docker-compose.yml não encontrado"
fi

# ============================================
# TESTE 2: Verificar package.json
# ============================================
print_header "TESTE 2: Dependências do Backend"

cd xui-saas/backend/api

if [ -f "package.json" ]; then
    print_success "package.json encontrado"
    
    # Verificar se @nestjs/core está instalado
    if npm list @nestjs/core --silent 2>/dev/null; then
        print_success "@nestjs/core instalado"
    else
        print_error "@nestjs/core não instalado"
    fi
    
    # Verificar se mysql2 está instalado
    if npm list mysql2 --silent 2>/dev/null; then
        print_success "mysql2 instalado"
    else
        print_error "mysql2 não instalado"
    fi
else
    print_error "package.json não encontrado"
fi

# ============================================
# TESTE 3: Build do TypeScript
# ============================================
print_header "TESTE 3: Build TypeScript"

if npm run build --silent 2>/dev/null; then
    print_success "Build TypeScript realizado com sucesso"
    
    if [ -d "dist" ]; then
        print_success "Diretório dist/ criado"
    else
        print_error "Diretório dist/ não criado"
    fi
else
    print_error "Falha no build TypeScript"
fi

# ============================================
# TESTE 4: Verificar testes unitários
# ============================================
print_header "TESTE 4: Testes Unitários"

if npm test --silent 2>/dev/null; then
    print_success "Todos os testes unitários passaram"
else
    print_error "Alguns testes unitários falharam"
fi

# ============================================
# ============================================
# TESTE 5: Verificar arquivos críticos
# ============================================
print_header "TESTE 5: Arquivos Críticos"

cd ../../..

# Verificar módulos importantes
CRITICAL_FILES=(
    "backend/api/src/app.module.ts"
    "backend/api/src/main.ts"
    "backend/api/src/modules/auth/auth.service.ts"
    "backend/api/src/modules/auth/auth.controller.ts"
    "backend/api/src/modules/database/database.service.ts"
    "backend/api/src/modules/xui/xui.service.ts"
    "backend/api/src/modules/payments/payments.service.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "xui-saas/$file" ]; then
        print_success "Arquivo $file existe"
    else
        print_error "Arquivo $file não encontrado"
    fi
done

# ============================================
# TESTE 6: Verificar documentação
# ============================================
print_header "TESTE 6: Documentação"

DOCS=(
    "docs/README.md"
    "docs/INSTALLATION.md"
    "docs/ADMIN_GUIDE.md"
    "docs/PLANOS_PRECO.md"
    "docs/TRIAL_SYSTEM.md"
    "docs/UPSELL_SYSTEM.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "xui-saas/$doc" ]; then
        print_success "Documentação $doc existe"
    else
        print_warning "Documentação $doc não encontrada"
    fi
done

# ============================================
# TESTE 7: Verificar Docker
# ============================================
print_header "TESTE 7: Configuração Docker"

if command -v docker &> /dev/null; then
    print_success "Docker instalado"
    
    if docker --version &> /dev/null; then
        print_success "Docker funcionando"
    else
        print_error "Docker não está funcionando corretamente"
    fi
else
    print_warning "Docker não instalado (necessário para deploy)"
fi

if command -v docker-compose &> /dev/null; then
    print_success "Docker Compose instalado"
else
    print_warning "Docker Compose não instalado"
fi

# ============================================
# TESTE 8: Verificar banco de dados (se rodando)
# ============================================
print_header "TESTE 8: Banco de Dados (Se Rodando)"

if docker ps | grep -q mariadb 2>/dev/null; then
    print_success "Container MariaDB está rodando"
    
    # Testar conexão
    if docker exec -it xui-saas-db mysql -u root -p -e "SELECT 1;" &> /dev/null; then
        print_success "Conexão com MariaDB funcionando"
    else
        print_warning "Não foi possível conectar ao MariaDB (senha necessária)"
    fi
else
    print_warning "MariaDB não está rodando (inicie com: docker-compose up -d)"
fi

# ============================================
# RESUMO
# ============================================
echo ""
echo "=========================================="
echo "📊 RESUMO DOS TESTES"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Testes Passaram: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Testes Falharam: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
    echo ""
    echo "Pronto para deploy! 🚀"
    exit 0
else
    echo -e "${RED}⚠️  ALGUNS TESTES FALHARAM${NC}"
    echo ""
    echo "Corrija os erros acima antes de fazer deploy."
    exit 1
fi
