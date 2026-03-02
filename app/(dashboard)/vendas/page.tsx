"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, Pencil, Trash2, CreditCard, Banknote, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Sale, Product, ProductSize } from "@/lib/types"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { getSales, createSale, getProducts, getProductSizes, getAllProductSizes, updateSale, deleteSale } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSales()

    const supabase = createClient()
    const channel = supabase
      .channel('realtime-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        loadSales()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadSales() {
    setIsLoading(true)
    const data = await getSales()
    setSales(data)
    setIsLoading(false)
  }

  const filteredSales = sales.filter(
    (sale) =>
      sale.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.size_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  async function handleAddSale(items: {
    productSizeId: string
    quantity: number
    totalValue: number
    saleDate: string
    paymentMethod: "money" | "card"
  }[]) {
    if (items.length === 0) return

    let successCount = 0
    let failCount = 0

    for (const item of items) {
      const result = await createSale({
        product_size_id: item.productSizeId,
        quantity: item.quantity,
        total_value: item.totalValue,
        sale_date: item.saleDate,
        payment_method: item.paymentMethod,
      })
      if (result) successCount++
      else failCount++
    }

    if (successCount > 0) {
      await loadSales()
      setIsDialogOpen(false)
      if (failCount === 0) {
        toast({ title: "Sucesso", description: "Venda(s) registrada(s) com sucesso" })
      } else {
        toast({
          title: "Aviso",
          description: `${successCount} vendas registradas, ${failCount} falharam (verifique estoque).`,
          variant: "warning",
        })
      }
    } else {
      toast({ title: "Erro", description: "Erro ao registrar vendas. Verifique o estoque.", variant: "destructive" })
    }
  }

  async function handleUpdateSale(data: { id: string; quantity: number; totalValue: number; saleDate: string }) {
    const { id, quantity, totalValue, saleDate } = data

    if (!quantity || totalValue <= 0) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" })
      return
    }

    const result = await updateSale(id, {
      quantity,
      total_value: totalValue,
      sale_date: saleDate,
    } as any)

    if (result) {
      await loadSales()
      setIsEditDialogOpen(false)
      setEditingSale(null)
      toast({ title: "Sucesso", description: "Venda atualizada com sucesso" })
    } else {
      toast({
        title: "Erro",
        description: "Erro ao atualizar venda. Verifique o estoque.",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteSale(id: string, description: string) {
    const confirmed = window.confirm(`Deseja realmente apagar a venda de ${description}?`)
    if (!confirmed) return

    const success = await deleteSale(id)

    if (success) {
      await loadSales()
      toast({ title: "Removido", description: "Venda apagada com sucesso" })
    } else {
      toast({ title: "Erro", description: "Erro ao apagar venda", variant: "destructive" })
    }
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
          <p className="mt-1 text-sm text-gray-500">PDV e histórico de transações</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-black/90">
              <Plus className="mr-2 h-4 w-4" />
              NOVA VENDA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Venda</DialogTitle>
            </DialogHeader>
            <NewSaleForm onSubmit={handleAddSale} />
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) {
              setEditingSale(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Venda</DialogTitle>
            </DialogHeader>
            {editingSale && <EditSaleForm sale={editingSale} onSubmit={handleUpdateSale} />}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar histórico por produto ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <Card className="border border-gray-200 bg-white p-12">
          <div className="text-center">
            <p className="text-sm text-gray-500">Nenhuma venda encontrada.</p>
          </div>
        </Card>
      ) : (
        <Card className="border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {format(new Date(sale.sale_date), "dd/MM/yyyy")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {sale.product_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{sale.size_name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {sale.payment_method === "card" ? (
                        <div className="flex items-center gap-1 text-blue-600">
                          <CreditCard className="h-4 w-4" />
                          <span>Cartão</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Banknote className="h-4 w-4" />
                          <span>Dinheiro</span>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">
                      R$ {sale.total_value.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => {
                            setEditingSale(sale)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          onClick={() =>
                            handleDeleteSale(
                              sale.id,
                              `${sale.product_name} (${sale.size_name}) - ${sale.quantity} un.`,
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                          Apagar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function EditSaleForm({
  sale,
  onSubmit,
}: {
  sale: Sale
  onSubmit: (data: { id: string; quantity: number; totalValue: number; saleDate: string }) => void
}) {
  const [quantity, setQuantity] = useState<number>(sale.quantity)
  const [totalValue, setTotalValue] = useState<number>(sale.total_value)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const dateInput = e.currentTarget.querySelector('[name="date"]') as HTMLInputElement
    const saleDate = dateInput?.value ? new Date(dateInput.value).toISOString() : sale.sale_date

    onSubmit({
      id: sale.id,
      quantity,
      totalValue,
      saleDate,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Produto</Label>
        <Input type="text" value={`${sale.product_name} (${sale.size_name})`} disabled />
      </div>
      <div>
        <Label htmlFor="quantity">Quantidade</Label>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
          min="1"
          required
        />
      </div>
      <div>
        <Label htmlFor="value">Valor Total (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={totalValue}
          onChange={(e) => setTotalValue(Number.parseFloat(e.target.value) || 0)}
          className="font-semibold text-green-600"
        />
      </div>
      <div>
        <Label htmlFor="date">Data</Label>
        <Input type="date" name="date" defaultValue={format(new Date(sale.sale_date), "yyyy-MM-dd")} required />
      </div>
      <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
        Salvar Alterações
      </Button>
    </form>
  )
}
function NewSaleForm({ onSubmit }: { onSubmit: (items: any[]) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [allProductSizes, setAllProductSizes] = useState<ProductSize[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<any[]>([])
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"))
  // We use a dummy state to control the select value and reset it after selection
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

    // Get available sizes for this product
    const productSizes = allProductSizes.filter(s => s.product_id === productId)
    
    if (productSizes.length === 0) {
      alert("Este produto não possui tamanhos cadastrados no estoque.")
      // Force reset select
      setSelectKey(prev => prev + 1)
      return
    }

    // Default to first size
    const defaultSize = productSizes[0]
    
    const newItem = {
      tempId: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      productSizeId: defaultSize.id,
      sizeName: defaultSize.size_name,
      quantity: 1,
      totalValue: defaultSize.unit_price,
      paymentMethod: "money",
      saleDate: new Date(saleDate).toISOString(),
      availableSizes: productSizes
    }

    setCart(prev => [...prev, newItem])
    // Reset select
    setSelectKey(prev => prev + 1)
  }

  function updateCartItem(tempId: string, field: string, value: any) {
    setCart(prev => prev.map(item => {
      if (item.tempId !== tempId) return item

      const updatedItem = { ...item, [field]: value }

      // Recalculate total value if relevant fields change
      if (field === 'productSizeId' || field === 'quantity' || field === 'paymentMethod') {
        const size = item.availableSizes.find((s: ProductSize) => s.id === updatedItem.productSizeId)
        if (size) {
          const price = updatedItem.paymentMethod === 'card' && size.unit_price_card 
            ? size.unit_price_card 
            : size.unit_price
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
    
    // Ensure dates are current
    const finalCart = cart.map(item => ({
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
            <h3 className="font-semibold text-gray-900">Nova Venda</h3>
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
            <Label className="text-base font-medium">Adicionar Produto (Toque para selecionar)</Label>
            <Select key={selectKey} onValueChange={handleAddProduct}>
              <SelectTrigger className="h-12 text-base bg-white border-black/20 focus:ring-black/20">
                <SelectValue placeholder="Selecione um produto para adicionar..." />
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

      {/* Cart List - Editable */}
      {cart.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
             <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-[40%]">Produto / Tamanho</th>
                    <th className="px-3 py-2 text-center w-[25%]">Qtd / Pagamento</th>
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
                          <SelectTrigger className="h-8 text-xs w-full bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="money" className="text-xs">Dinheiro</SelectItem>
                            <SelectItem value="card" className="text-xs">Cartão</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-green-600 align-top pt-4">
                        R$ {item.totalValue.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.tempId)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center">
              <span className="font-medium text-gray-600">Total Geral:</span>
              <span className="font-bold text-lg text-green-700">R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full h-12 text-base bg-black text-white hover:bg-gray-800 shadow-lg transition-all active:scale-[0.98]"
          >
            Finalizar Venda ({cart.length} itens)
          </Button>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 bg-gray-50/30 rounded-lg border border-dashed">
          <p>Nenhum produto selecionado</p>
          <p className="text-xs mt-1">Selecione um produto acima para começar</p>
        </div>
      )}
    </div>
  )
}
