import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://zzdvqchnbbxzyqrvufuj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZHZxY2huYmJ4enlxcnZ1ZnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjk1NTgsImV4cCI6MjA4NDUwNTU1OH0.oA3_x_fDyEo7iu_ygWEhiXtE-BzXDWU1lU27snJIFSo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  try {
    console.log('Testando query de produtos com variantes...\n');

    // 1. Buscar um produto com variantes
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        product_variants(id, color, color_hex, size, sku, stock, active)
      `)
      .eq('active', true)
      .limit(5);

    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      return;
    }

    console.log(`Encontrados ${products.length} produtos\n`);

    products.forEach(product => {
      console.log(`📦 Produto: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Variantes: ${product.product_variants?.length || 0}`);

      if (product.product_variants && product.product_variants.length > 0) {
        console.log('   Detalhes das variantes:');
        product.product_variants.forEach((v, i) => {
          console.log(`     ${i + 1}. Size: ${v.size}, Color: ${v.color}, Stock: ${v.stock}, Active: ${v.active}`);
        });
      }
      console.log('');
    });

    // 2. Testar query específica de um produto
    console.log('=== Testando query de produto específico ===\n');

    if (products.length > 0) {
      const productId = products[0].id;

      const { data: singleProduct, error: singleError } = await supabase
        .from('products')
        .select(`
          *,
          product_images(id, url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, active)
        `)
        .eq('id', productId)
        .eq('active', true)
        .single();

      if (singleError) {
        console.error('Erro ao buscar produto único:', singleError);
      } else {
        console.log(`Produto único: ${singleProduct.name}`);
        console.log(`Variantes: ${singleProduct.product_variants?.length || 0}`);
        console.log(`Imagens: ${singleProduct.product_images?.length || 0}`);

        // Mostrar variantes ativas
        const activeVariants = singleProduct.product_variants?.filter(v => v.active) || [];
        console.log(`Variantes ativas: ${activeVariants.length}`);

        // Extrair sizes únicos
        const sizes = [...new Set(activeVariants.map(v => v.size).filter(Boolean))];
        console.log(`Tamanhos disponíveis: ${sizes.join(', ')}`);

        // Extrair cores únicas
        const colors = [...new Set(activeVariants.map(v => v.color).filter(Boolean))];
        console.log(`Cores disponíveis: ${colors.join(', ')}`);
      }
    }

    // 3. Verificar diretamente a tabela product_variants
    console.log('\n=== Verificando tabela product_variants diretamente ===\n');

    const { data: allVariants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .limit(10);

    if (variantsError) {
      console.error('Erro ao buscar variantes:', variantsError);
    } else {
      console.log(`Total de variantes na tabela: ${allVariants.length}`);
      console.log('Primeiras 3 variantes:');
      allVariants.slice(0, 3).forEach(v => {
        console.log(`  - Product ID: ${v.product_id}, Size: ${v.size}, Color: ${v.color}, Active: ${v.active}, Stock: ${v.stock}`);
      });
    }

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

// Executar o teste
testQuery();