#!/bin/bash

# ==============================================
# Script de Deploy - Sistema de Frete Frenet
# ==============================================
# Este script automatiza o deploy da Edge Function
# do Supabase para o cálculo de frete.

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do sistema de frete..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================
# Verificar Supabase CLI
# ==============================================
echo -e "${BLUE}[1/5]${NC} Verificando Supabase CLI..."

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo ""
    echo "Instale usando:"
    echo "  - macOS/Linux: brew install supabase/tap/supabase"
    echo "  - Windows (Scoop): scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "                     scoop install supabase"
    echo "  - NPM: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
echo ""

# ==============================================
# Verificar Login
# ==============================================
echo -e "${BLUE}[2/5]${NC} Verificando autenticação..."

if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você não está logado no Supabase${NC}"
    echo "Executando login..."
    supabase login
fi

echo -e "${GREEN}✅ Autenticado no Supabase${NC}"
echo ""

# ==============================================
# Link do Projeto
# ==============================================
echo -e "${BLUE}[3/5]${NC} Vinculando ao projeto..."

# Ler o Project ID do .env.local
PROJECT_REF="zzdvqchnbbxzyqrvufuj"

# Verificar se já está linkado
if [ ! -f ".supabase/config.toml" ]; then
    echo "Vinculando ao projeto: $PROJECT_REF"
    supabase link --project-ref "$PROJECT_REF"
else
    echo -e "${GREEN}✅ Projeto já vinculado${NC}"
fi

echo ""

# ==============================================
# Deploy da Edge Function
# ==============================================
echo -e "${BLUE}[4/5]${NC} Fazendo deploy da Edge Function..."

supabase functions deploy calculate-shipping --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployada com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao fazer deploy da Edge Function${NC}"
    exit 1
fi

echo ""

# ==============================================
# Configurar Secrets
# ==============================================
echo -e "${BLUE}[5/5]${NC} Configurando secrets..."

# Token da API Frenet
FRENET_TOKEN="8637DDEBREA99R4DDBR92E3R5D823268204F"

echo "Configurando FRENET_API_TOKEN..."
echo "$FRENET_TOKEN" | supabase secrets set FRENET_API_TOKEN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Secrets configurados com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao configurar secrets${NC}"
    exit 1
fi

echo ""

# ==============================================
# Teste da Edge Function
# ==============================================
echo -e "${YELLOW}[TESTE]${NC} Testando Edge Function..."
echo ""

# Obter URL do projeto
PROJECT_URL="https://$PROJECT_REF.supabase.co"
FUNCTION_URL="$PROJECT_URL/functions/v1/calculate-shipping"

# Obter anon key do .env.local
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

echo "Enviando requisição de teste..."
echo "CEP: 01310-100 (Av. Paulista, SP)"
echo "Valor: R$ 150,00"
echo ""

RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "recipientCEP": "01310100",
    "invoiceValue": 150.00
  }')

# Verificar se há erro
if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Erro no teste:${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Contar opções retornadas
OPTIONS_COUNT=$(echo "$RESPONSE" | jq '.ShippingSevicesArray | length' 2>/dev/null)

if [ "$OPTIONS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Teste bem-sucedido!${NC}"
    echo "Opções de frete encontradas: $OPTIONS_COUNT"
    echo ""
    echo "Exemplo de opção:"
    echo "$RESPONSE" | jq '.ShippingSevicesArray[0]' 2>/dev/null
else
    echo -e "${YELLOW}⚠️  Nenhuma opção de frete encontrada${NC}"
    echo "Resposta completa:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

echo ""

# ==============================================
# Resumo Final
# ==============================================
echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "📦 Edge Function deployada: calculate-shipping"
echo "🔑 Secrets configurados: FRENET_API_TOKEN"
echo "🌐 URL: $FUNCTION_URL"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Integre o ShippingCalculator no seu checkout"
echo "2. Teste com CEPs diferentes"
echo "3. Monitore os logs: supabase functions logs calculate-shipping"
echo ""
echo -e "${BLUE}Documentação completa:${NC} docs/SHIPPING_INTEGRATION.md"
echo ""
