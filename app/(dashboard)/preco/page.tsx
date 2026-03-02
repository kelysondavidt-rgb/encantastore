"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, DollarSign, Package, Truck, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Fixed costs reference
const FIXED_COSTS = {
  loan: 650,
  energy: 200,
  water: 50,
  get total() {
    return this.loan + this.energy + this.water
  },
}

// Scenarios definition
const SCENARIOS = [
  {
    id: "conservative",
    name: "Preço Conservador",
    description: "Menor margem, maior competitividade. Ideal para giro rápido.",
    markup: 40, // 40% markup
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "balanced",
    name: "Preço Equilibrado",
    description: "Margem saudável e sustentável. Recomendado para a maioria dos produtos.",
    markup: 70, // 70% markup
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    id: "aggressive",
    name: "Preço Premium",
    description: "Maior margem de lucro. Ideal para produtos exclusivos ou lançamentos.",
    markup: 100, // 100% markup
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
]

export default function PrecoPage() {
  const [productCost, setProductCost] = useState<number>(0)
  const [freightCost, setFreightCost] = useState<number>(0)
  const [packagingCost, setPackagingCost] = useState<number>(0)
  const [additionalCost, setAdditionalCost] = useState<number>(0)

  const totalVariableCost = productCost + freightCost + packagingCost + additionalCost

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold text-black">Calculadora de Preço Inteligente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Defina preços estratégicos considerando seus custos e margem de lucro.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Inputs and Fixed Costs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Inputs Card */}
          <Card className="border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Calculator className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Custos Variáveis do Produto</h3>
            </div>

            <div className="space-y-5">
              <div>
                <Label htmlFor="productCost" className="mb-2 block text-sm font-medium text-gray-700">
                  Custo do Produto (Produção/Compra)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    id="productCost"
                    step="0.01"
                    min="0"
                    value={productCost || ""}
                    onChange={(e) => setProductCost(Number.parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="freightCost" className="mb-2 block text-sm font-medium text-gray-700">
                    Frete
                  </Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      id="freightCost"
                      step="0.01"
                      min="0"
                      value={freightCost || ""}
                      onChange={(e) => setFreightCost(Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="packagingCost" className="mb-2 block text-sm font-medium text-gray-700">
                    Embalagem
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      id="packagingCost"
                      step="0.01"
                      min="0"
                      value={packagingCost || ""}
                      onChange={(e) => setPackagingCost(Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="additionalCost" className="mb-2 block text-sm font-medium text-gray-700">
                  Outros Custos Variáveis
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    id="additionalCost"
                    step="0.01"
                    min="0"
                    value={additionalCost || ""}
                    onChange={(e) => setAdditionalCost(Number.parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Custo Total Variável:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(totalVariableCost)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Fixed Costs Reference Card */}
          <Card className="border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Referência de Custos Fixos Mensais</h3>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              Estes valores são base para sustentabilidade do negócio, não sendo diluídos em um único produto.
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Empréstimo</span>
                <span className="font-medium">{formatCurrency(FIXED_COSTS.loan)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Energia</span>
                <span className="font-medium">{formatCurrency(FIXED_COSTS.energy)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Água</span>
                <span className="font-medium">{formatCurrency(FIXED_COSTS.water)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold text-gray-900">Total Mensal</span>
                <span className="font-bold text-gray-900">{formatCurrency(FIXED_COSTS.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Scenarios */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Cenários de Precificação</h2>
          
          <div className="grid gap-6">
            {SCENARIOS.map((scenario) => {
              // Calculations
              // Price = Total Variable Cost * (1 + Markup)
              const sellingPrice = totalVariableCost * (1 + scenario.markup / 100)
              const profitValue = sellingPrice - totalVariableCost
              // Gross Margin % = (Profit / Price) * 100
              const grossMarginPercent = sellingPrice > 0 ? (profitValue / sellingPrice) * 100 : 0
              
              return (
                <Card 
                  key={scenario.id} 
                  className={`border-l-4 p-6 shadow-sm transition-all hover:shadow-md ${scenario.borderColor}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-lg font-bold ${scenario.color}`}>{scenario.name}</h3>
                        <Badge variant="outline" className={`${scenario.color} ${scenario.bgColor} border-0`}>
                          Markup {scenario.markup}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 max-w-md">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Preço de Venda</p>
                      <p className={`text-3xl font-bold ${scenario.color}`}>
                        {formatCurrency(sellingPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-gray-100" />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Custo Total</p>
                      <p className="font-medium text-gray-900">{formatCurrency(totalVariableCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Lucro (R$)</p>
                      <p className={`font-bold ${scenario.color}`}>{formatCurrency(profitValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Margem Real</p>
                      <p className={`font-bold ${scenario.color}`}>{formatPercent(grossMarginPercent)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Status</p>
                      <p className="font-medium text-gray-900">
                        {scenario.id === 'conservative' ? 'Competitivo' : 
                         scenario.id === 'balanced' ? 'Sustentável' : 'Alta Rentabilidade'}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
