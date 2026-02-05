"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, Pencil, Trash2, CreditCard, Banknote } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Sale, Product, ProductSize } from "@/lib/types"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { getSales, createSale, getProducts, getProductSizes, updateSale, deleteSale } from "@/lib/db"
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

  async function handleAddSale(data: {
    productSizeId: string
    quantity: number
    totalValue: number
    saleDate: string
    paymentMethod: "money" | "card"
  }) {
    const { productSizeId, quantity, totalValue, saleDate, paymentMethod } = data

    if (!productSizeId || !quantity || !totalValue) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" })
      return
    }

    const result = await createSale({
      product_size_id: productSizeId,
      quantity,
      total_value: totalValue,
      sale_date: saleDate,
      payment_method: paymentMethod,
    })

    if (result) {
      await loadSales()
      setIsDialogOpen(false)
      toast({ title: "Sucesso", description: "Venda registrada com sucesso" })
    } else {
      toast({ title: "Erro", description: "Erro ao registrar venda. Verifique o estoque.", variant: "destructive" })
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
function NewSaleForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [availableSizes, setAvailableSizes] = useState<ProductSize[]>([])
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [totalValue, setTotalValue] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<"money" | "card">("money")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      const data = await getProducts()
      setProducts(data.filter((p) => p.status === "active"))
      setIsLoading(false)
    }
    loadProducts()
  }, [])

  useEffect(() => {
    async function loadSizes() {
      if (selectedProduct) {
        const sizes = await getProductSizes(selectedProduct)
        setAvailableSizes(sizes)
        setSelectedSize("")
        setQuantity(1)
        setTotalValue(0)
      } else {
        setAvailableSizes([])
        setSelectedSize("")
        setQuantity(1)
        setTotalValue(0)
      }
    }
    loadSizes()
  }, [selectedProduct])

  useEffect(() => {
    if (selectedSize && quantity > 0) {
      const size = availableSizes.find((s) => s.id === selectedSize)
      if (size) {
        const price = paymentMethod === "card" && size.unit_price_card 
          ? size.unit_price_card 
          : size.unit_price
        setTotalValue(price * quantity)
      }
    } else {
      setTotalValue(0)
    }
  }, [selectedSize, quantity, availableSizes, paymentMethod])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!selectedSize || !quantity || totalValue <= 0) {
      alert("Preencha todos os campos corretamente")
      return
    }

    const maxQuantity = availableSizes.find((s) => s.id === selectedSize)?.stock_quantity || 1
    if (quantity > maxQuantity) {
      alert(`Quantidade máxima em estoque para este tamanho é ${maxQuantity}`)
      return
    }

    const dateInput = e.currentTarget.querySelector('[name="date"]') as HTMLInputElement
    const saleDate = dateInput?.value ? new Date(dateInput.value).toISOString() : new Date().toISOString()

    onSubmit({
      productSizeId: selectedSize,
      quantity,
      totalValue,
      saleDate,
      paymentMethod,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-center text-sm text-gray-500">Carregando produtos...</p>
      </div>
    )
  }

  const maxQuantity = availableSizes.find((s) => s.id === selectedSize)?.stock_quantity || 1

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="productId">Produto</Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="size">Tamanho</Label>
        <Select
          value={selectedSize}
          onValueChange={setSelectedSize}
          required
          disabled={!selectedProduct || availableSizes.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={availableSizes.length === 0 ? "Nenhum tamanho disponível" : "Selecione um tamanho"}
            />
          </SelectTrigger>
          <SelectContent>
            {availableSizes.map((size) => (
              <SelectItem key={size.id} value={size.id}>
                {size.size_name} (Estoque: {size.stock_quantity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="paymentMethod">Método de Pagamento</Label>
        <Select
          value={paymentMethod}
          onValueChange={(value: "money" | "card") => setPaymentMethod(value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="money">Dinheiro / Pix (Preço Normal)</SelectItem>
            <SelectItem value="card">Cartão de Crédito (Taxa Inclusa)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="quantity">Quantidade</Label>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
          min="1"
          max={maxQuantity}
          required
          disabled={!selectedSize}
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
        <input type="hidden" name="value" value={totalValue} />
      </div>

      <div>
        <Label htmlFor="date">Data</Label>
        <Input type="date" name="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
      </div>

      <Button
        type="submit"
        className="w-full bg-black text-white hover:bg-black/90"
        disabled={!selectedSize || quantity <= 0}
      >
        Registrar Venda
      </Button>
    </form>
  )
}
