import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://zzdvqchnbbxzyqrvufuj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZHZxY2huYmJ4enlxcnZ1ZnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjk1NTgsImV4cCI6MjA4NDUwNTU1OH0.oA3_x_fDyEo7iu_ygWEhiXtE-BzXDWU1lU27snJIFSo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateVariants() {
  try {
    console.log('Buscando todas as variantes...');

    // Buscar todas as variantes
    const { data: variants, error: fetchError } = await supabase
      .from('product_variants')
      .select('id, product_id, active, stock, size, color')
      .limit(1000);

    if (fetchError) {
      console.error('Erro ao buscar variantes:', fetchError);
      return;
    }

    console.log(`Encontradas ${variants.length} variantes`);

    // Filtrar variantes inativas
    const inactiveVariants = variants.filter(v => !v.active);
    console.log(`${inactiveVariants.length} variantes estão inativas`);

    if (inactiveVariants.length > 0) {
      console.log('Ativando variantes inativas...');

      // Ativar todas as variantes inativas
      const { data: updatedVariants, error: updateError } = await supabase
        .from('product_variants')
        .update({ active: true })
        .in('id', inactiveVariants.map(v => v.id))
        .select();

      if (updateError) {
        console.error('Erro ao ativar variantes:', updateError);
      } else {
        console.log(`✅ ${updatedVariants.length} variantes ativadas com sucesso!`);
      }
    }

    // Verificar e adicionar estoque se necessário
    const noStockVariants = variants.filter(v => !v.stock || v.stock <= 0);
    console.log(`${noStockVariants.length} variantes sem estoque`);

    if (noStockVariants.length > 0) {
      console.log('Adicionando estoque às variantes...');

      for (const variant of noStockVariants) {
        const newStock = Math.floor(Math.random() * 30) + 10; // Entre 10 e 40

        const { error: stockError } = await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', variant.id);

        if (stockError) {
          console.error(`Erro ao atualizar estoque da variante ${variant.id}:`, stockError);
        }
      }

      console.log(`✅ Estoque adicionado às variantes!`);
    }

    // Mostrar resumo
    console.log('\n📊 Resumo das variantes:');
    const { data: summary, error: summaryError } = await supabase
      .from('product_variants')
      .select('product_id, active, stock')
      .eq('active', true)
      .gt('stock', 0);

    if (!summaryError) {
      const productCount = new Set(summary.map(v => v.product_id)).size;
      console.log(`✅ ${summary.length} variantes ativas com estoque`);
      console.log(`✅ ${productCount} produtos com variantes disponíveis`);
    }

    console.log('\n✅ Script finalizado!');
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

// Executar o script
activateVariants();