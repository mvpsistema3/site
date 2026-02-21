export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  colors: string[];
  sizes: string[];
  rating: number;
  reviews: number;
  isNew?: boolean;
  is_tabaco?: boolean;
  discount?: number;
}

export interface CartItem extends Product {
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface FilterState {
  dimensions: Record<string, string[]>;
  priceRange: [number, number] | null;
  sort: string;
}
