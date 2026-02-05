"use client"

import { createClient } from "./supabase/client"
import type {
  Product,
  ProductVariant,
  Sale,
  FixedCost,
  VariableCost,
  Category,
  Size,
  ProductWithCategory,
  ProductVariantWithDetails,
  User,
  ProductSize,
} from "./types"

// Categories
export async function getCategories(): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }
  return data || []
}

export async function saveCategory(category: Omit<Category, "id" | "created_at">): Promise<Category | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("categories").insert(category).select().single()

  if (error) {
    console.error("[v0] Error saving category:", error)
    return null
  }
  return data
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting category:", error)
    return false
  }
  return true
}

// Sizes
export async function getSizes(): Promise<Size[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("sizes").select("*").order("sort_order")

  if (error) {
    console.error("[v0] Error fetching sizes:", error)
    return []
  }
  return data || []
}

export async function saveSize(size: Omit<Size, "id" | "created_at">): Promise<Size | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("sizes").insert(size).select().single()

  if (error) {
    console.error("[v0] Error saving size:", error)
    return null
  }
  return data
}

export async function deleteSize(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("sizes").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting size:", error)
    return false
  }
  return true
}

// Products
export async function getProducts(): Promise<ProductWithCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching products:", error)
    return []
  }
  return data || []
}

export async function saveProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("products").insert(product).select().single()

  if (error) {
    console.error("[v0] Error saving product:", error)
    return null
  }
  return data
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating product:", error)
    return null
  }
  return data
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting product:", error)
    return false
  }
  return true
}

// Product Variants
export async function getVariantsByProduct(productId: string): Promise<ProductVariantWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select("*, sizes(id, name, sort_order)")
    .eq("product_id", productId)
    .order("sizes(sort_order)")

  if (error) {
    console.error("[v0] Error fetching variants:", error)
    return []
  }
  return data || []
}

export async function getAllVariants(): Promise<ProductVariantWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select("*, sizes(id, name, sort_order)")
    .order("sizes(sort_order)")

  if (error) {
    console.error("[v0] Error fetching all variants:", error)
    return []
  }
  return data || []
}

export async function saveVariant(
  variant: Omit<ProductVariant, "id" | "created_at" | "updated_at">,
): Promise<ProductVariant | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("product_variants").insert(variant).select().single()

  if (error) {
    console.error("[v0] Error saving variant:", error)
    return null
  }
  return data
}

export async function updateVariant(id: string, updates: Partial<ProductVariant>): Promise<ProductVariant | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("product_variants").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating variant:", error)
    return null
  }
  return data
}

export async function upsertVariant(
  productId: string,
  sizeId: string,
  quantity: number,
): Promise<ProductVariant | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("product_variants")
    .upsert({ product_id: productId, size_id: sizeId, quantity }, { onConflict: "product_id,size_id" })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error upserting variant:", error)
    return null
  }
  return data
}

// Sales
export async function getSales(): Promise<Sale[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("sales").select("*").order("sale_date", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching sales:", error)
    return []
  }
  const rows = (data || []) as any[]

  return rows.map((row) => {
    const totalValue = row.total_value ?? row.value ?? 0
    return {
      ...row,
      total_value: totalValue,
    } as Sale
  })
}

export async function saveSale(sale: Omit<Sale, "id" | "created_at">): Promise<Sale | null> {
  const supabase = createClient()
  const payload: any = {
    ...sale,
    value: (sale as any).total_value ?? sale.total_value,
    payment_method: sale.payment_method,
  }

  delete payload.total_value

  const { data, error } = await supabase.from("sales").insert(payload).select().single()

  if (error) {
    console.error("[v0] Error saving sale:", error)
    return null
  }
  if (!data) return null

  const row: any = data
  const totalValue = row.total_value ?? row.value ?? sale.total_value

  return {
    ...row,
    total_value: totalValue,
  } as Sale
}

export async function updateSale(
  id: string,
  updates: Pick<Sale, "quantity" | "total_value" | "sale_date">,
): Promise<Sale | null> {
  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase.from("sales").select("*").eq("id", id).single()

  if (fetchError || !existing) {
    console.error("[v0] Error fetching sale for update:", fetchError)
    return null
  }

  const existingSale = existing as any
  const oldQuantity = existingSale.quantity as number

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, quantity")
    .eq("product_id", existingSale.product_id)
    .eq("size_id", existingSale.size_id)
    .single()

  if (variantError || !variant) {
    console.error("[v0] Error fetching variant for sale update:", variantError)
    return null
  }

  const variantRow = variant as any
  const currentStock = (variantRow.quantity as number) ?? 0
  const delta = updates.quantity - oldQuantity

  if (delta > 0 && delta > currentStock) {
    console.error("[v0] Not enough stock to increase sale quantity. Requested extra:", delta, "Available:", currentStock)
    return null
  }

  let newStock = currentStock - delta

  const { error: stockError } = await supabase
    .from("product_variants")
    .update({ quantity: newStock })
    .eq("id", variantRow.id)

  if (stockError) {
    console.error("[v0] Error updating stock while updating sale:", stockError)
    return null
  }

  const payload: any = {
    quantity: updates.quantity,
    value: updates.total_value,
    sale_date: updates.sale_date,
  }

  const { data, error } = await supabase.from("sales").update(payload).eq("id", id).select().single()

  if (error || !data) {
    console.error("[v0] Error updating sale:", error)
    return null
  }

  const row: any = data
  const totalValue = row.total_value ?? row.value ?? updates.total_value

  return {
    ...row,
    total_value: totalValue,
  } as Sale
}

export async function deleteSale(id: string): Promise<boolean> {
  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase.from("sales").select("*").eq("id", id).single()

  if (fetchError || !existing) {
    console.error("[v0] Error fetching sale for delete:", fetchError)
    return false
  }

  const saleRow = existing as any

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, quantity")
    .eq("product_id", saleRow.product_id)
    .eq("size_id", saleRow.size_id)
    .single()

  if (variantError || !variant) {
    console.error("[v0] Error fetching variant for sale delete:", variantError)
    return false
  }

  const variantRow = variant as any
  const currentStock = (variantRow.quantity as number) ?? 0
  const newStock = currentStock + (saleRow.quantity as number)

  const { error: stockError } = await supabase
    .from("product_variants")
    .update({ quantity: newStock })
    .eq("id", variantRow.id)

  if (stockError) {
    console.error("[v0] Error updating stock while deleting sale:", stockError)
    return false
  }

  const { error: deleteError } = await supabase.from("sales").delete().eq("id", id)

  if (deleteError) {
    console.error("[v0] Error deleting sale:", deleteError)
    return false
  }

  return true
}

// Fixed Costs
export async function getFixedCosts(): Promise<FixedCost[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("fixed_costs").select("*").order("name")

  if (error) {
    console.error("[v0] Error fetching fixed costs:", error)
    return []
  }
  return data || []
}

export async function saveFixedCost(
  cost: Omit<FixedCost, "id" | "created_at" | "updated_at">,
): Promise<FixedCost | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("fixed_costs").insert(cost).select().single()

  if (error) {
    console.error("[v0] Error saving fixed cost:", error)
    return null
  }
  return data
}

export async function updateFixedCost(id: string, updates: Partial<FixedCost>): Promise<FixedCost | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("fixed_costs").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating fixed cost:", error)
    return null
  }
  return data
}

export async function deleteFixedCost(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("fixed_costs").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting fixed cost:", error)
    return false
  }
  return true
}

// Variable Costs
export async function getVariableCosts(): Promise<VariableCost[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("variable_costs").select("*").order("name")

  if (error) {
    console.error("[v0] Error fetching variable costs:", error)
    return []
  }
  return data || []
}

export async function saveVariableCost(
  cost: Omit<VariableCost, "id" | "created_at" | "updated_at">,
): Promise<VariableCost | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("variable_costs").insert(cost).select().single()

  if (error) {
    console.error("[v0] Error saving variable cost:", error)
    return null
  }
  return data
}

export async function updateVariableCost(id: string, updates: Partial<VariableCost>): Promise<VariableCost | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("variable_costs").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating variable cost:", error)
    return null
  }
  return data
}

export async function deleteVariableCost(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("variable_costs").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting variable cost:", error)
    return false
  }
  return true
}

// User Management Functions
export async function getUserByUsername(username: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("users").select("*").eq("username", username).single()

  if (error) {
    console.error("[v0] Error fetching user:", error)
    return null
  }
  return data
}

export async function updateUserPhoto(userId: string, photoUrl: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("users")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating user photo:", error)
    return null
  }
  return data
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating user password:", error)
    return null
  }
  return data
}

// Additional Helper Functions
export async function getProductSizes(productId: string): Promise<ProductSize[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      size_id,
      quantity,
      sizes(name, sort_order),
      products(price, price_with_card)
    `)
    .eq("product_id", productId)
    .order("sort_order", { foreignTable: "sizes" })

  if (error) {
    console.error("[v0] Error fetching product sizes:", error)
    return []
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    size_id: item.size_id,
    size_name: item.sizes?.name || "",
    stock_quantity: item.quantity || 0,
    unit_price: item.products?.price || 0,
    unit_price_card: item.products?.price_with_card,
  }))
}

export async function getAllProductSizes(): Promise<ProductSize[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      size_id,
      quantity,
      sizes(name, sort_order),
      products(price, name)
    `)
    .order("sort_order", { foreignTable: "sizes" })

  if (error) {
    console.error("[v0] Error fetching all product sizes:", error)
    return []
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    size_id: item.size_id,
    size_name: item.sizes?.name || "",
    stock_quantity: item.quantity || 0,
    unit_price: item.products?.price || 0,
    product_name: item.products?.name || "",
  }))
}

export async function createProduct(
  product: Omit<Product, "id" | "created_at" | "updated_at">,
): Promise<Product | null> {
  return saveProduct(product)
}

export async function updateProductSize(variantId: string, quantity: number): Promise<ProductVariant | null> {
  return updateVariant(variantId, { quantity })
}

export async function createSale(
  saleData: { product_size_id: string; quantity: number; total_value: number; sale_date: string }
): Promise<Sale | null> {
  const supabase = createClient()
  
  // Get variant details
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(`
      product_id,
      size_id,
      quantity,
      products (name),
      sizes (name)
    `)
    .eq("id", saleData.product_size_id)
    .single()

  if (variantError || !variant) {
    console.error("[v0] Error fetching variant details for sale:", variantError)
    return null
  }

  const currentStock = (variant as any).quantity as number | null

  if (currentStock == null) {
    console.error("[v0] Variant has no quantity information for stock check")
    return null
  }

  if (saleData.quantity > currentStock) {
    console.error("[v0] Not enough stock for sale. Requested:", saleData.quantity, "Available:", currentStock)
    return null
  }

  const newStock = currentStock - saleData.quantity

  const { error: stockError } = await supabase
    .from("product_variants")
    .update({ quantity: newStock })
    .eq("id", saleData.product_size_id)

  if (stockError) {
    console.error("[v0] Error updating stock for sale:", stockError)
    return null
  }

  const newSale: Omit<Sale, "id" | "created_at"> = {
    product_id: variant.product_id,
    product_name: (variant.products as any)?.name || "Unknown",
    size_id: variant.size_id,
    size_name: (variant.sizes as any)?.name || "Unknown",
    quantity: saleData.quantity,
    total_value: saleData.total_value,
    sale_date: saleData.sale_date,
  }

  return saveSale(newSale)
}

export async function createFixedCost(
  cost: Omit<FixedCost, "id" | "created_at" | "updated_at">,
): Promise<FixedCost | null> {
  return saveFixedCost(cost)
}

export async function createVariableCost(
  cost: Omit<VariableCost, "id" | "created_at" | "updated_at">,
): Promise<VariableCost | null> {
  return saveVariableCost(cost)
}

export async function createCategory(category: Omit<Category, "id" | "created_at">): Promise<Category | null> {
  return saveCategory(category)
}

export async function createSize(size: Omit<Size, "id" | "created_at">): Promise<Size | null> {
  return saveSize(size)
}
