@echo off
REM ==============================================
REM Script de Deploy - Sistema de Frete Frenet
REM Versão Windows (.bat)
REM ==============================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   DEPLOY - Sistema de Frete Frenet
echo ========================================
echo.

REM ==============================================
REM Verificar Supabase CLI
REM ==============================================
echo [1/5] Verificando Supabase CLI...
where supabase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Supabase CLI nao encontrado!
    echo.
    echo Instale usando:
    echo   - Scoop: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    echo            scoop install supabase
    echo   - NPM: npm install -g supabase
    echo.
    exit /b 1
)
echo [OK] Supabase CLI instalado
echo.

REM ==============================================
REM Verificar Login
REM ==============================================
echo [2/5] Verificando autenticacao...
supabase projects list >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [AVISO] Voce nao esta logado no Supabase
    echo Executando login...
    supabase login
)
echo [OK] Autenticado no Supabase
echo.

REM ==============================================
REM Link do Projeto
REM ==============================================
echo [3/5] Vinculando ao projeto...
set PROJECT_REF=zzdvqchnbbxzyqrvufuj

if not exist ".supabase\config.toml" (
    echo Vinculando ao projeto: %PROJECT_REF%
    supabase link --project-ref %PROJECT_REF%
) else (
    echo [OK] Projeto ja vinculado
)
echo.

REM ==============================================
REM Deploy da Edge Function
REM ==============================================
echo [4/5] Fazendo deploy da Edge Function...
supabase functions deploy calculate-shipping --no-verify-jwt

if %ERRORLEVEL% neq 0 (
    echo [ERRO] Erro ao fazer deploy da Edge Function
    exit /b 1
)
echo [OK] Edge Function deployada com sucesso!
echo.

REM ==============================================
REM Configurar Secrets
REM ==============================================
echo [5/5] Configurando secrets...
set FRENET_TOKEN=8637DDEBREA99R4DDBR92E3R5D823268204F

echo Configurando FRENET_API_TOKEN...
echo %FRENET_TOKEN% | supabase secrets set FRENET_API_TOKEN

if %ERRORLEVEL% neq 0 (
    echo [ERRO] Erro ao configurar secrets
    exit /b 1
)
echo [OK] Secrets configurados com sucesso!
echo.

REM ==============================================
REM Resumo Final
REM ==============================================
echo ========================================
echo  DEPLOY CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Edge Function: calculate-shipping
echo Secrets: FRENET_API_TOKEN
echo URL: https://%PROJECT_REF%.supabase.co/functions/v1/calculate-shipping
echo.
echo Proximos passos:
echo 1. Integre o ShippingCalculator no checkout
echo 2. Teste com CEPs diferentes
echo 3. Monitore: supabase functions logs calculate-shipping
echo.
echo Documentacao: docs\SHIPPING_INTEGRATION.md
echo.
pause
