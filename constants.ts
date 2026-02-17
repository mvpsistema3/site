import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'CAMISETA SESH GRAFFITI LOGO',
    price: 119.90,
    originalPrice: 149.90,
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Camisetas',
    colors: ['Preto', 'Branco'],
    sizes: ['P', 'M', 'G', 'GG'],
    rating: 4.8,
    reviews: 124,
    discount: 20
  },
  {
    id: '2',
    name: 'HOODIE URBAN CONCRETE',
    price: 289.90,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1556821833-828ee7f74d88?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Moletons',
    colors: ['Cinza', 'Preto'],
    sizes: ['M', 'G', 'GG'],
    rating: 5.0,
    reviews: 45,
    isNew: true
  },
  {
    id: '3',
    name: 'BONÉ 5 PANEL SESH',
    price: 89.90,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1588850561230-7e108d3c54a9?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Headwear',
    colors: ['Preto'],
    sizes: ['U'],
    rating: 4.5,
    reviews: 22
  },
  {
    id: '4',
    name: 'SHORTS DRI-FIT SKATE',
    price: 129.90,
    images: [
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591195853341-35b917c91353?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Shorts',
    colors: ['Azul', 'Preto'],
    sizes: ['38', '40', '42', '44'],
    rating: 4.7,
    reviews: 56
  },
  {
    id: '5',
    name: 'PITEIRA GLASS ART COLLECTION',
    price: 49.90,
    images: [
      'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&q=80&w=800', // Placeholder glass art
      'https://images.unsplash.com/photo-1621360841013-c768371e93cf?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Acessórios',
    colors: ['Multicolor'],
    sizes: ['6mm', '7mm'],
    rating: 4.9,
    reviews: 89,
    isNew: true
  },
  {
    id: '6',
    name: 'CAMISETA OVERSIZED TAG',
    price: 139.90,
    images: [
      'https://images.unsplash.com/photo-1503341338985-c0477be52513?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Camisetas',
    colors: ['Branco', 'Off-white'],
    sizes: ['P', 'M', 'G', 'GG', 'XG'],
    rating: 4.6,
    reviews: 34
  },
  {
    id: '7',
    name: 'BAG SHOULDER TACTICAL',
    price: 159.90,
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1548036328-1c4b7b2b80a6?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Acessórios',
    colors: ['Preto', 'Camuflado'],
    sizes: ['U'],
    rating: 4.8,
    reviews: 67
  },
  {
    id: '8',
    name: 'COPO SESH CUP',
    price: 39.90,
    images: [
      'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Acessórios',
    colors: ['Preto'],
    sizes: ['500ml'],
    rating: 4.9,
    reviews: 112
  }
];

export const CATEGORIES = [
  'Camisetas', 'Moletons', 'Shorts', 'Headwear', 'Acessórios'
];

export const SIZES = ['P', 'M', 'G', 'GG', 'XG', 'U'];
export const COLORS = ['Preto', 'Branco', 'Cinza', 'Azul', 'Vermelho', 'Verde', 'Off-white'];
