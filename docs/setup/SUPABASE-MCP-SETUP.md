# Configuração do Supabase MCP via OAuth (Por Projeto)

## ✅ Limpeza Completa Concluída!

Todas as configurações antigas do Supabase MCP foram removidas:
- ✅ Configuração global (C:\Users\matpg)
- ✅ Projeto cliente5sbrand
- ✅ Projeto dr.daniel
- ✅ Projeto sesh-store (este projeto)

**Total:** 3 configurações antigas removidas

Backup salvo em: `C:\Users\matpg\.claude.json.backup-complete-cleanup`

## 📋 Próximos Passos:

### 1. Reinicie o Claude Code
Feche completamente e reabra o Claude Code.

### 2. O arquivo `.mcp.json` já foi criado
O arquivo `.mcp.json` já está configurado neste projeto com a URL base do Supabase MCP.

### 3. Autentique via OAuth

Quando você reiniciar o Claude Code neste projeto, ele vai detectar o arquivo `.mcp.json` e pedir para autenticar o Supabase MCP via OAuth.

**Você verá uma tela assim:**
- "Authorize API access for Claude Code (supabase)"
- Uma lista de organizações do Supabase
- Botão para autorizar

**Selecione a organização correta** e clique em autorizar.

### 4. Para outros projetos

Repita o processo para cada projeto com conta Supabase diferente:

1. Crie um arquivo `.mcp.json` no diretório do projeto:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "type": "http",
         "url": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```

2. Abra o Claude Code naquele projeto
3. Autentique com a conta Supabase correspondente

## 🔐 Vantagens desta Configuração

- ✅ Cada projeto tem sua própria autenticação Supabase
- ✅ OAuth gerencia tokens automaticamente
- ✅ Mais seguro que tokens hardcoded
- ✅ Fácil de trocar entre contas diferentes

## 🚨 Importante

- O arquivo `.mcp.json` deve estar no **diretório raiz do projeto**
- Cada vez que você trocar de projeto, o Claude Code vai usar a autenticação correspondente
- Você pode commitar o `.mcp.json` no git (não contém dados sensíveis)

## 📝 Comandos Úteis

- `/mcp` - Ver status dos MCP servers
- `/mcp enable supabase` - Habilitar o Supabase MCP
- `/mcp disable supabase` - Desabilitar o Supabase MCP

---

**Pronto para começar!** 🚀
Reinicie o Claude Code e siga o fluxo de autenticação OAuth.
