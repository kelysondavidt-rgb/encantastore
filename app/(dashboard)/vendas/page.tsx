"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, Trash2, CreditCard, Banknote, ChevronDown, ChevronUp, Package } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Product, ProductSize, CartItem, Order } from "@/lib/types"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { getOrders, createOrder, deleteOrder, getProducts, getAllProductSizes } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"

export default function VendasPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const { toast } = useToast()

  // Helper to safely format dates
  const safeFormat = (dateStr: string | Date | null | undefined, formatStr: string) => {
    try {
      if (!dateStr) return "-"
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return "-"
      return format(date, formatStr)
    } catch {
      return "-"
    }
  }

  useEffect(() => {
    loadOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadOrders() {
    setIsLoading(true)
    const data = await getOrders()
    setOrders(data)
    setIsLoading(false)
  }

  // Filter orders based on ID, date, or items
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase()
    // Search by ID (last 4 chars)
    if (order.id.slice(-4).toLowerCase().includes(searchLower)) return true
    
    // Search by product name in items
    if (order.sales?.some(item => item.product_name.toLowerCase().includes(searchLower))) return true
    
    // Search by date
    try {
      const dateStr = safeFormat(order.created_at, "dd/MM/yyyy")
      if (dateStr.includes(searchLower)) return true
    } catch {
      // ignore date errors in search
    }

    return false
  })

  async function handleAddSale(items: CartItem[]) {
    if (items.length === 0) return

    const success = await createOrder(items.map(item => ({
        product_size_id: item.productSizeId,
        quantity: item.quantity,
        total_value: item.totalValue,
        sale_date: item.saleDate,
        payment_method: item.paymentMethod
    })))

    if (success) {
      await loadOrders()
      setIsDialogOpen(false)
      toast({ title: "Sucesso", description: "Pedido registrado com sucesso" })
    } else {
      toast({ title: "Erro", description: "Erro ao registrar pedido. Verifique o estoque.", variant: "destructive" })
    }
  }

  async function handleDeleteOrder(id: string) {
    const confirmed = window.confirm(`Deseja realmente apagar este pedido? Todos os itens serão devolvidos ao estoque.`)
    if (!confirmed) return

    const success = await deleteOrder(id)

    if (success) {
      await loadOrders()
      toast({ title: "Removido", description: "Pedido apagado com sucesso" })
    } else {
      toast({ title: "Erro", description: "Erro ao apagar pedido", variant: "destructive" })
    }
  }

  function toggleExpand(orderId: string) {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Carregando vendas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black">Vendas</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão de Pedidos e Vendas</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-black/90">
              <Plus className="mr-2 h-4 w-4" />
              NOVA VENDA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Venda</DialogTitle>
            </DialogHeader>
            <NewSaleForm onSubmit={handleAddSale} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por produto, data ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border border-gray-200 bg-white p-12">
          <div className="text-center">
            <p className="text-sm text-gray-500">Nenhum pedido encontrado.</p>
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Resumo</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-center">Qtd Itens</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {safeFormat(order.created_at, "dd/MM/yyyy")}
                      <div className="text-xs text-gray-500 font-normal">
                        {safeFormat(order.created_at, "HH:mm")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.sales && order.sales.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.sales[0].product_name}</span>
                          {order.sales.length > 1 && (
                            <span className="text-xs text-gray-500">
                              + {order.sales.length - 1} outros itens
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Sem itens</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        {order.payment_method === 'card' ? <CreditCard className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
                        <span>
                          {order.payment_method === 'card' ? 'Cartão' : order.payment_method === 'money' ? 'Dinheiro' : 'Misto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {order.sales?.reduce((acc, sale) => acc + sale.quantity, 0) || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      R$ {order.total_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400"
                          onClick={() => toggleExpand(order.id)}
                        >
                          {expandedOrderId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedOrderId === order.id && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={6} className="p-0">
                        <div className="border-t border-gray-100 p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">Detalhes do Pedido</h4>
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 bg-gray-100/50">
                              <tr>
                                <th className="px-3 py-2 text-left rounded-l">Produto</th>
                                <th className="px-3 py-2 text-left">Tamanho</th>
                                <th className="px-3 py-2 text-center">Qtd</th>
                                <th className="px-3 py-2 text-right">Valor Unit.</th>
                                <th className="px-3 py-2 text-right rounded-r">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/50">
                              {order.sales?.map((sale) => (
                                <tr key={sale.id}>
                                  <td className="px-3 py-2 font-medium text-gray-900">{sale.product_name}</td>
                                  <td className="px-3 py-2 text-gray-600">{sale.size_name}</td>
                                  <td className="px-3 py-2 text-center text-gray-600">{sale.quantity}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">
                                    R$ {(sale.total_value / sale.quantity).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                                    R$ {sale.total_value.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NewSaleForm({ onSubmit }: { onSubmit: (items: CartItem[]) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [allProductSizes, setAllProductSizes] = useState<ProductSize[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [selectKey, setSelectKey] = useState(0)

  useEffect(() => {
    async function loadData() {
      const [productsData, sizesData] = await Promise.all([
        getProducts(),
        getAllProductSizes()
      ])
      setProducts(productsData.filter((p) => p.status === "active"))
      setAllProductSizes(sizesData)
      setIsLoading(false)
    }
    loadData()
  }, [])

  function handleAddProduct(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const productSizes = allProductSizes.filter(s => s.product_id === productId)
    
    if (productSizes.length === 0) {
      alert("Este produto não possui tamanhos cadastrados no estoque.")
      setSelectKey(prev => prev + 1)
      return
    }

    const defaultSize = productSizes[0]
    
    // Check if item already exists in cart with same product and size
    // We assume default payment method (money) for new items
    const existingItemIndex = cart.findIndex(item => 
      item.productId === productId && 
      item.productSizeId === defaultSize.id && 
      item.paymentMethod === 'money'
    )

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      setCart(prev => {
        const newCart = [...prev]
        const item = newCart[existingItemIndex]
        const newQuantity = item.quantity + 1
        
        // Update total value
        const size = item.availableSizes.find((s: ProductSize) => s.id === item.productSizeId)
        const price =
          item.paymentMethod === "card" && size?.unit_price_card != null && !Number.isNaN(Number(size.unit_price_card))
            ? Number(size.unit_price_card)
            : Number(size?.unit_price) || 0
          
        newCart[existingItemIndex] = {
          ...item,
          quantity: newQuantity,
          totalValue: price * newQuantity
        }
        return newCart
      })
      setSelectKey(prev => prev + 1)
      return
    }
    
    const newItem = {
      tempId: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      productSizeId: defaultSize.id,
      sizeName: defaultSize.size_name,
      quantity: 1,
      totalValue: defaultSize.unit_price,
      paymentMethod: "money" as "money" | "card",
      saleDate: new Date(saleDate).toISOString(),
      availableSizes: productSizes
    }

    setCart(prev => [...prev, newItem])
    setSelectKey(prev => prev + 1)
  }

  function updateCartItem(tempId: string, field: "productSizeId" | "quantity" | "paymentMethod", value: string | number) {
    setCart(prev => prev.map(item => {
      if (item.tempId !== tempId) return item

      const updatedItem = { ...item, [field]: value }

      if (field === 'productSizeId' || field === 'quantity' || field === 'paymentMethod') {
        const size = item.availableSizes.find((s: ProductSize) => s.id === updatedItem.productSizeId)
        if (size) {
          const price =
            updatedItem.paymentMethod === "card" && size.unit_price_card != null && !Number.isNaN(Number(size.unit_price_card))
              ? Number(size.unit_price_card)
              : Number(size.unit_price) || 0
          updatedItem.totalValue = price * updatedItem.quantity
          updatedItem.sizeName = size.size_name
        }
      }

      return updatedItem
    }))
  }

  function removeFromCart(tempId: string) {
    setCart(cart.filter((item) => item.tempId !== tempId))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) return
    
    // Merge duplicate items (same product, size, and payment method)
    const mergedCart: CartItem[] = []
    
    cart.forEach(item => {
      const existingIndex = mergedCart.findIndex(existing => 
        existing.productSizeId === item.productSizeId && 
        existing.paymentMethod === item.paymentMethod
      )
      
      if (existingIndex >= 0) {
        // Update existing item
        const existing = mergedCart[existingIndex]
        const newQuantity = existing.quantity + item.quantity
        const newTotal = existing.totalValue + item.totalValue
        
        mergedCart[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          totalValue: newTotal
        }
      } else {
        mergedCart.push(item)
      }
    })

    const finalCart = mergedCart.map(item => ({
      ...item,
      saleDate: new Date(saleDate).toISOString()
    }))
    
    onSubmit(finalCart)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-center text-sm text-gray-500">Carregando produtos...</p>
      </div>
    )
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.totalValue, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1 rounded">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-gray-900">Adicionar Produtos</h3>
          </div>
          <div className="w-40">
            <Label htmlFor="globalDate" className="sr-only">Data</Label>
            <Input 
                id="globalDate"
                type="date" 
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required 
                className="bg-white h-9"
            />
          </div>
        </div>
        
        <div className="space-y-2">
            <Select key={selectKey} onValueChange={handleAddProduct}>
              <SelectTrigger className="h-12 text-base bg-white border-black/20 focus:ring-black/20">
                <SelectValue placeholder="Toque para selecionar um produto..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] max-h-[300px]">
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-base py-3 cursor-pointer">
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* Cart List */}
      {cart.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
             <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-[40%]">Produto</th>
                    <th className="px-3 py-2 text-center w-[25%]">Qtd / Pag</th>
                    <th className="px-3 py-2 text-right w-[25%]">Total</th>
                    <th className="px-3 py-2 text-center w-[10%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.map((item) => (
                    <tr key={item.tempId} className="bg-white hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3 align-top space-y-2">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <Select 
                          value={item.productSizeId} 
                          onValueChange={(val) => updateCartItem(item.tempId, 'productSizeId', val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-full bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            {item.availableSizes.map((s: ProductSize) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.size_name} (Est: {s.stock_quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 align-top space-y-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.tempId, 'quantity', Number(e.target.value) || 1)}
                          min="1"
                          className="h-8 text-center"
                        />
                        <Select 
                          value={item.paymentMethod} 
                          onValueChange={(val) => updateCartItem(item.tempId, 'paymentMethod', val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-full bg-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="money">Dinheiro</SelectItem>
                            <SelectItem value="card">Cartão</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 align-top text-right font-medium pt-4">
                        R$ {item.totalValue.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 align-top text-center pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.tempId)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-gray-900 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total do Pedido</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400 text-right">
                {cart.length} itens
            </div>
            <Button 
                onClick={handleSubmit} 
                className="mt-4 w-full bg-white text-black hover:bg-gray-100 font-bold h-12 text-base"
            >
              FINALIZAR VENDA
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400 bg-gray-50">
          <Package className="mx-auto h-8 w-8 opacity-50 mb-2" />
          <p>Nenhum produto adicionado ainda.</p>
        </div>
      )}
    </div>
  )
}
