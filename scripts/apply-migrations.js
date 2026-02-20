/**
 * Script para aplicar as migrations de cupons e reservas
 * Execute com: node apply-migrations.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Iniciando aplicação de migrations...\n');

  const migrations = [
    '20260130_coupons_and_reservations.sql',
    '20260130_orders_enhancements.sql'
  ];

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

    try {
      console.log(`📄 Aplicando migration: ${migrationFile}`);

      // Ler o arquivo SQL
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Executar a migration
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: sql
      }).single();

      if (error) {
        // Se o erro for sobre exec_sql não existir, tentar executar diretamente
        console.log('⚠️  Tentando método alternativo...');

        // Dividir o SQL em comandos individuais (simplificado)
        const commands = sql
          .split(';')
          .filter(cmd => cmd.trim())
          .map(cmd => cmd.trim() + ';');

        console.log(`  Executando ${commands.length} comandos SQL...`);

        // Por limitações do Supabase client, você precisará executar via Dashboard ou CLI
        console.log(`
❗ ATENÇÃO: O Supabase client não permite executar DDL diretamente.

Para aplicar as migrations, você tem 3 opções:

1. Via Supabase Dashboard:
   - Acesse: ${supabaseUrl}
   - Vá em SQL Editor
   - Cole o conteúdo de cada arquivo e execute

2. Via Supabase CLI:
   supabase db push

3. Via psql (se tiver acesso direto):
   psql -f ${migrationPath} <connection_string>
        `);
      } else {
        console.log(`✅ Migration ${migrationFile} aplicada com sucesso!\n`);
      }

    } catch (err) {
      console.error(`❌ Erro ao aplicar ${migrationFile}:`, err.message);
    }
  }

  console.log('\n📋 INSTRUÇÕES PARA APLICAR AS MIGRATIONS:');
  console.log('================================================');
  console.log('1. Acesse o Supabase Dashboard');
  console.log('2. Vá em "SQL Editor"');
  console.log('3. Copie e cole o conteúdo de cada arquivo:');
  migrations.forEach(m => {
    console.log(`   - supabase/migrations/${m}`);
  });
  console.log('4. Execute cada script');
  console.log('\n✨ Após executar, suas tabelas estarão prontas!');
}

// Executar
applyMigrations().catch(console.error);