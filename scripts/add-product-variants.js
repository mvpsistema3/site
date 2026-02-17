import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://zzdvqchnbbxzyqrvufuj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZHZxY2huYmJ4enlxcnZ1ZnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjk1NTgsImV4cCI6MjA4NDUwNTU1OH0.oA3_x_fDyEo7iu_ygWEhiXtE-BzXDWU1lU27snJIFSo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addProductVariants() {
  try {
    console.log('Buscando produtos ativos...');

    // Buscar produtos ativos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id')
      .eq('active', true)
      .limit(20);

    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      return;
    }

    console.log(`Encontrados ${products.length} produtos`);

    // Definir variantes padrão para produtos de piteira
    const piteiraSizes = ['6mm', '8mm', '10mm'];
    const piteiraColors = [
      { name: 'Transparente', hex: '#ffffff' },
      { name: 'Verde', hex: '#22c55e' },
      { name: 'Azul', hex: '#3b82f6' },
      { name: 'Rosa', hex: '#ec4899' }
    ];

    // Definir variantes para sedas
    const sedaSizes = ['King Size', 'Slim', '1 1/4'];
    const sedaColors = [
      { name: 'Natural', hex: '#d4a574' },
      { name: 'Branco', hex: '#ffffff' }
    ];

    // Definir variantes para grinders
    const grinderSizes = ['40mm', '50mm', '63mm'];
    const grinderColors = [
      { name: 'Preto', hex: '#000000' },
      { name: 'Prata', hex: '#c0c0c0' },
      { name: 'Dourado', hex: '#ffd700' },
      { name: 'Verde', hex: '#22c55e' }
    ];

    for (const product of products) {
      console.log(`\nProcessando produto: ${product.name}`);

      // Verificar se já tem variantes
      const { data: existingVariants, error: variantsError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', product.id);

      if (variantsError) {
        console.error(`Erro ao verificar variantes do produto ${product.name}:`, variantsError);
        continue;
      }

      if (existingVariants && existingVariants.length > 0) {
        console.log(`Produto ${product.name} já tem ${existingVariants.length} variantes. Pulando...`);
        continue;
      }

      // Determinar tipo de produto e variantes
      let sizes = [];
      let colors = [];

      if (product.name.toLowerCase().includes('piteira')) {
        sizes = piteiraSizes;
        colors = piteiraColors;
      } else if (product.name.toLowerCase().includes('seda')) {
        sizes = sedaSizes;
        colors = sedaColors;
      } else if (product.name.toLowerCase().includes('grinder')) {
        sizes = grinderSizes;
        colors = grinderColors;
      } else {
        // Produtos genéricos
        sizes = ['P', 'M', 'G', 'GG'];
        colors = [
          { name: 'Preto', hex: '#000000' },
          { name: 'Branco', hex: '#ffffff' }
        ];
      }

      // Criar variantes
      const variantsToInsert = [];
      for (const size of sizes) {
        for (const color of colors) {
          variantsToInsert.push({
            product_id: product.id,
            size: size,
            color: color.name,
            color_hex: color.hex,
            sku: `${product.name.substring(0, 3).toUpperCase()}-${size}-${color.name.substring(0, 3).toUpperCase()}`,
            stock: Math.floor(Math.random() * 50) + 10, // Estoque entre 10 e 60
            active: true
          });
        }
      }

      console.log(`Criando ${variantsToInsert.length} variantes para ${product.name}...`);

      const { data: insertedVariants, error: insertError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert)
        .select();

      if (insertError) {
        console.error(`Erro ao inserir variantes para ${product.name}:`, insertError);
      } else {
        console.log(`✅ ${insertedVariants.length} variantes criadas com sucesso!`);
      }
    }

    console.log('\n✅ Script finalizado!');
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

// Executar o script
addProductVariants();