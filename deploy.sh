#!/bin/bash

# XUI-SaaS Quick Deploy Script for Proxmox VM
# Run this script on a fresh Ubuntu 22.04/24.04 VM

set -e

echo "🚀 Iniciando instalação do XUI-SaaS..."

# Update system
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose
echo "🐳 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create directory structure
echo "📁 Criando estrutura de diretórios..."
mkdir -p ~/xui-saas
cd ~/xui-saas

# Clone repository
echo "📥 Clonando repositório..."
if [ ! -d "xui-saas" ]; then
    git clone https://github.com/wesleiandersonti/xui-saas.git
fi

cd xui-saas

# Checkout the correct branch
git checkout feat/mvp-xui-instances

# Create environment file
echo "⚙️  Configurando ambiente..."
cat > .env << EOF
# Database Configuration
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
DB_USER=xui_saas
DB_PASSWORD=$(openssl rand -base64 24)
DB_NAME=xui_saas

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 48)
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Encryption Key (must be 32 characters)
XUI_ENCRYPTION_KEY=$(openssl rand -base64 24 | cut -c1-32)

# API Configuration
API_URL=http://$(hostname -I | awk '{print $1}'):5000
CORS_ORIGIN=*
EOF

echo "✅ Arquivo .env criado com senhas seguras!"

# Start services
echo "🚀 Iniciando serviços..."
sudo docker-compose up -d

# Wait for database
echo "⏳ Aguardando banco de dados..."
sleep 30

# Check if services are running
echo "🔍 Verificando status..."
sudo docker-compose ps

echo ""
echo "✅ XUI-SaaS instalado com sucesso!"
echo ""
echo "📊 Acesse a API em: http://$(hostname -I | awk '{print $1}'):5000"
echo "🔧 Health check: http://$(hostname -I | awk '{print $1}'):5000/health"
echo ""
echo "📁 Arquivos localizados em: ~/xui-saas/xui-saas"
echo "⚙️  Configurações em: ~/xui-saas/xui-saas/.env"
echo ""
echo "📝 Comandos úteis:"
echo "  sudo docker-compose logs -f     # Ver logs"
echo "  sudo docker-compose ps          # Status dos containers"
echo "  sudo docker-compose down        # Parar serviços"
echo "  sudo docker-compose up -d       # Iniciar serviços"
echo ""
echo "🔒 Lembre-se de configurar o firewall para liberar a porta 5000!"
echo "   sudo ufw allow 5000/tcp"
