export interface User {
  id: string
  username: string
  password_hash: string
  photo_url?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string | null
  cost: number
  price: number | null
  price_with_card?: number | null
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  size_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  product_id: string
  product_name: string
  size_id: string
  size_name: string
  quantity: number
  total_value: number
  payment_method?: "money" | "card"
  sale_date: string
  created_at: string
}

export interface FixedCost {
  id: string
  name: string
  monthly_value: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface VariableCost {
  id: string
  name: string
  value: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Size {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface ProductWithCategory extends Product {
  categories?: { name: string } | null
  category_name?: string
}

export interface ProductVariantWithDetails extends ProductVariant {
  products?: ProductWithCategory
  sizes?: Size
}

export interface SaleWithDetails extends Sale {
  products?: ProductWithCategory
  sizes?: Size
}

export interface ProductSize {
  id: string
  product_id: string
  size_id: string
  size_name: string
  stock_quantity: number
  unit_price: number
  unit_price_card?: number
  product_name?: string
}
