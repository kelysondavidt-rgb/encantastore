"use client"

import type { Product, ProductVariant, Sale, FixedCost, VariableCost, Category, Size } from "./types"

const STORAGE_KEYS = {
  PRODUCTS: "retail_products",
  VARIANTS: "retail_variants",
  SALES: "retail_sales",
  FIXED_COSTS: "retail_fixed_costs",
  VARIABLE_COSTS: "retail_variable_costs",
  CATEGORIES: "retail_categories",
  SIZES: "retail_sizes",
}

// Products
export function getProducts(): Product[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
  return data ? JSON.parse(data) : []
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products))
}

// Variants
export function getVariants(): ProductVariant[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.VARIANTS)
  return data ? JSON.parse(data) : []
}

export function saveVariants(variants: ProductVariant[]) {
  localStorage.setItem(STORAGE_KEYS.VARIANTS, JSON.stringify(variants))
}

// Sales
export function getSales(): Sale[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.SALES)
  return data ? (JSON.parse(data) as Sale[]) : []
}

export function saveSales(sales: Sale[]) {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales))
}

// Fixed Costs
export function getFixedCosts(): FixedCost[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.FIXED_COSTS)
  return data ? JSON.parse(data) : []
}

export function saveFixedCosts(costs: FixedCost[]) {
  localStorage.setItem(STORAGE_KEYS.FIXED_COSTS, JSON.stringify(costs))
}

// Variable Costs
export function getVariableCosts(): VariableCost[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.VARIABLE_COSTS)
  return data ? JSON.parse(data) : []
}

export function saveVariableCosts(costs: VariableCost[]) {
  localStorage.setItem(STORAGE_KEYS.VARIABLE_COSTS, JSON.stringify(costs))
}

// Categories
export function getCategories(): Category[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
  return data
    ? JSON.parse(data)
    : [
        { id: "1", name: "Biquíni", created_at: new Date().toISOString() },
        { id: "2", name: "Maiô", created_at: new Date().toISOString() },
        { id: "3", name: "Saída de Praia", created_at: new Date().toISOString() },
      ]
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
}

// Sizes
export function getSizes(): Size[] {
  const defaultSizes: Size[] = [
    { id: "1", name: "P", sort_order: 1, created_at: new Date().toISOString() },
    { id: "2", name: "M", sort_order: 2, created_at: new Date().toISOString() },
    { id: "3", name: "G", sort_order: 3, created_at: new Date().toISOString() },
    { id: "4", name: "GG", sort_order: 4, created_at: new Date().toISOString() },
    { id: "5", name: "Tamanho Único", sort_order: 5, created_at: new Date().toISOString() },
  ]

  if (typeof window === "undefined") return defaultSizes
  const data = localStorage.getItem(STORAGE_KEYS.SIZES)
  return data ? JSON.parse(data) : defaultSizes
}

export function saveSizes(sizes: Size[]) {
  localStorage.setItem(STORAGE_KEYS.SIZES, JSON.stringify(sizes))
}
