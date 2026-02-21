import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Credenciais expostas para queries públicas via fetch direto (sem JWT)
export { supabaseUrl, supabaseAnonKey };

// Database Types (You'll update these based on your Supabase schema)
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  images: string[];
  colors: string[];
  sizes: string[];
  stock: number;
  featured: boolean;
  is_tabaco?: boolean;
  discount?: number;
  rating: number;
  reviews: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: Address;
  payment_method: 'credit_card' | 'pix' | 'boleto';
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  color: string;
};

export type Address = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  active: boolean;
  position: number;
  created_at: string;
};

export type Category = {
  id: string;
  brand_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description?: string;
  banner_url?: string;
  banner_mobile_url?: string;
  icon?: string;
  position: number;
  active: boolean;
  featured: boolean;
  show_in_menu: boolean;
  is_tabacaria?: boolean;
  created_at: string;
  children?: Category[];
};

/** @deprecated Use Category instead */
export type Collection = Category;
