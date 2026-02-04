"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getProducts,
  saveProduct,
  updateProduct,
  getVariantsByProduct,
  upsertVariant,
  getCategories,
  getSizes,
  getAllVariants,
  deleteProduct,
} from "@/lib/db"
import { Plus, Package, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Product, ProductVariantWithDetails, Category, Size, ProductWithCategory } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function EstoquePage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantWithDetails[]>>({})
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()

    const supabase = createClient()
    const channel = supabase
      .channel('realtime-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => {
        loadProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadProducts() {
    setIsLoading(true)
    const data = await getProducts()
    setProducts(data)

    const allVariants = await getAllVariants()
    const variantsMap: Record<string, ProductVariantWithDetails[]> = {}
    
    // Group variants by product_id
    allVariants.forEach((variant) => {
      if (!variantsMap[variant.product_id]) {
        variantsMap[variant.product_id] = []
      }
      variantsMap[variant.product_id].push(variant)
    })

    setProductVariants(variantsMap)
    setIsLoading(false)
  }

  async function handleSaveProduct(productData: any, selectedSizes: string[]) {
    if (editingProduct) {
      const result = await updateProduct(editingProduct.id, {
        name: productData.name,
        category_id: productData.category,
        cost: productData.cost,
        price: productData.price,
        price_with_card: productData.price_with_card,
        status: productData.status,
      })

      if (result) {
        // Update sizes/variants
        for (const sizeId of selectedSizes) {
          await upsertVariant(editingProduct.id, sizeId, 0)
        }

        await loadProducts()
        setIsProductDialogOpen(false)
        setEditingProduct(null)
        toast({ title: "Sucesso", description: "Produto atualizado com sucesso" })
      } else {
        toast({ title: "Erro", description: "Erro ao atualizar produto", variant: "destructive" })
      }
    } else {
      const result = await saveProduct({
        name: productData.name,
        category_id: productData.category,
        cost: productData.cost,
        price: productData.price,
        price_with_card: productData.price_with_card,
        status: productData.status,
      })

      if (result) {
        // Add size variants
        for (const sizeId of selectedSizes) {
          await upsertVariant(result.id, sizeId, 0)
        }

        await loadProducts()
        setIsProductDialogOpen(false)
        toast({ title: "Sucesso", description: "Produto cadastrado com sucesso" })
      } else {
        toast({ title: "Erro", description: "Erro ao cadastrar produto", variant: "destructive" })
      }
    }
  }

  async function handleUpdateStock(variantId: string, productId: string, newQuantity: number) {
    const supabase = await import("@/lib/supabase/client").then((m) => m.createClient())
    const { error } = await supabase.from("product_variants").update({ quantity: newQuantity }).eq("id", variantId)

    if (!error) {
      setProductVariants((prev) => ({
        ...prev,
        [productId]: prev[productId].map((v) => (v.id === variantId ? { ...v, quantity: newQuantity } : v)),
      }))
      toast({ title: "Atualizado", description: "Estoque atualizado" })
    } else {
      toast({ title: "Erro", description: "Erro ao atualizar estoque", variant: "destructive" })
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    const confirmed = window.confirm(`Tem certeza que deseja apagar o produto "${productName}"?`)
    if (!confirmed) return

    const success = await deleteProduct(productId)

    if (success) {
      await loadProducts()
      toast({ title: "Removido", description: "Produto apagado com sucesso" })
    } else {
      toast({ title: "Erro", description: "Erro ao apagar produto", variant: "destructive" })
    }
  }

  function handleEditProduct(product: Product) {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Carregando produtos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black">Produtos & Estoque</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão de produtos e variantes</p>
        </div>

        <Dialog
          open={isProductDialogOpen}
          onOpenChange={(open) => {
            setIsProductDialogOpen(open)
            if (!open) {
              setEditingProduct(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-black/90">
              <Plus className="mr-2 h-4 w-4" />
              NOVO PRODUTO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              existingVariants={editingProduct ? productVariants[editingProduct.id] || [] : []}
              onSubmit={handleSaveProduct}
            />
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="border border-gray-200 bg-white p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Nenhum produto cadastrado.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id} className="border border-gray-200 bg-white p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-black">{product.name}</h3>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Categoria: {product.category_name}</p>
                  <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-sm">
                    <span className="text-gray-600">
                      Custo: <span className="font-medium text-black">R$ {product.cost.toFixed(2)}</span>
                    </span>
                    {product.price && (
                      <span className="text-gray-600">
                        Preço: <span className="font-medium text-green-600">R$ {product.price.toFixed(2)}</span>
                      </span>
                    )}
                    {product.price_with_card && (
                      <span className="text-gray-600">
                        Cartão: <span className="font-medium text-blue-600">R$ {product.price_with_card.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Apagar
                  </Button>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Estoque por Tamanho</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {productVariants[product.id]?.map((variant) => (
                    <StockInput
                      key={variant.id}
                      size={variant.sizes?.name || "N/A"}
                      quantity={variant.quantity}
                      onUpdate={(newQty) => handleUpdateStock(variant.id, product.id, newQty)}
                    />
                  ))}
                  {(!productVariants[product.id] || productVariants[product.id].length === 0) && (
                    <p className="col-span-5 text-sm text-gray-400">Nenhum tamanho configurado para este produto.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductForm({
  product,
  existingVariants,
  onSubmit,
}: {
  product?: Product | null
  existingVariants?: ProductVariantWithDetails[]
  onSubmit: (productData: any, selectedSizes: string[]) => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    category: product?.category_id || "",
    cost: product?.cost?.toString() || "",
    price: product?.price?.toString() || "",
    priceWithCard: product?.price_with_card?.toString() || "",
    status: product?.status || "active",
  })

  useEffect(() => {
    async function loadData() {
      const [categoriesData, sizesData] = await Promise.all([getCategories(), getSizes()])
      setCategories(categoriesData)
      setSizes(sizesData)

      if (product && existingVariants) {
        setSelectedSizes(existingVariants.map((v) => v.size_id))
        setFormData({
          name: product.name,
          category: product.category_id || "",
          cost: product.cost.toString(),
          price: product.price ? product.price.toString() : "",
          priceWithCard: product.price_with_card ? product.price_with_card.toString() : "",
          status: product.status,
        })
      } else {
        // Reset form when opening for new product
        setFormData({
          name: "",
          category: "",
          cost: "",
          price: "",
          priceWithCard: "",
          status: "active",
        })
        setSelectedSizes([])
      }

      setIsLoading(false)
    }
    loadData()
  }, [product, existingVariants])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const costValue = Number.parseFloat(formData.cost)
    const priceValue = formData.price ? Number.parseFloat(formData.price) : undefined
    const priceWithCardValue = formData.priceWithCard ? Number.parseFloat(formData.priceWithCard) : undefined

    const productData = {
      name: formData.name,
      category: formData.category,
      cost: costValue,
      price: priceValue,
      price_with_card: priceWithCardValue,
      status: formData.status as "active" | "inactive",
    }

    if (!productData.name || !productData.category || isNaN(productData.cost)) {
      alert("Preencha todos os campos obrigatórios")
      return
    }

    if (selectedSizes.length === 0) {
      alert("Selecione pelo menos um tamanho")
      return
    }

    onSubmit(productData, selectedSizes)
  }

  function toggleSize(sizeId: string) {
    setSelectedSizes((prev) => (prev.includes(sizeId) ? prev.filter((id) => id !== sizeId) : [...prev, sizeId]))
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-center text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Categoria *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="cost">Custo Unitário (R$) *</Label>
        <Input
          type="number"
          name="cost"
          step="0.01"
          min="0"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="price">Preço de Venda (R$)</Label>
        <Input
          type="number"
          name="price"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="priceWithCard">Preço com Taxa de Cartão (R$)</Label>
        <Input
          type="number"
          name="priceWithCard"
          step="0.01"
          min="0"
          value={formData.priceWithCard}
          onChange={(e) => setFormData({ ...formData, priceWithCard: e.target.value })}
          placeholder="Preço diferenciado para cartão"
        />
      </div>

      <div>
        <Label>Tamanhos Disponíveis *</Label>
        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          {sizes.map((size) => (
            <div key={size.id} className="flex items-center gap-2">
              <Checkbox
                id={`size-${size.id}`}
                checked={selectedSizes.includes(size.id)}
                onCheckedChange={() => toggleSize(size.id)}
              />
              <label htmlFor={`size-${size.id}`} className="text-sm font-medium leading-none">
                {size.name}
              </label>
            </div>
          ))}
          {sizes.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum tamanho cadastrado. Acesse Configurações para adicionar tamanhos.
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
        {product ? "Atualizar Produto" : "Cadastrar Produto"}
      </Button>
    </form>
  )
}

function StockInput({
  size,
  quantity,
  onUpdate,
}: {
  size: string
  quantity: number
  onUpdate: (quantity: number) => void
}) {
  const [value, setValue] = useState(quantity.toString())

  useEffect(() => {
    setValue(quantity.toString())
  }, [quantity])

  function handleBlur() {
    const newQty = Number.parseInt(value) || 0
    if (newQty !== quantity) {
      onUpdate(newQty)
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{size}</Label>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className="h-10"
      />
    </div>
  )
}
