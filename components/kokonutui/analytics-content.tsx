"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { DollarSign, CreditCard, Wallet, PiggyBank } from "lucide-react"
import { getSales, getFixedCosts, getVariableCosts, getProducts } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

const chartConfig = {
  income: {
    label: "Receita",
    color: "rgb(var(--chart-1))",
  },
  expenses: {
    label: "Despesas",
    color: "rgb(var(--chart-2))",
  },
  profit: {
    label: "Lucro",
    color: "var(--chart-3)",
  },
}

type MonthlyStat = { month: string; income: number; expenses: number; profit: number }
type ExpenseCategory = { name: string; value: number; color: string }
type DailySpendingPoint = { date: string; value: number }

export default function AnalyticsContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [dailySpending, setDailySpending] = useState<DailySpendingPoint[]>([])

  useEffect(() => {
    loadData()

    const supabase = createClient()
    const channel = supabase
      .channel("realtime-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "fixed_costs" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "variable_costs" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadData() {
    try {
      const [sales, fixedCosts, variableCosts, products] = await Promise.all([
        getSales(),
        getFixedCosts(),
        getVariableCosts(),
        getProducts(),
      ])

      // Process Monthly Data (Last 6 months)
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i)
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
          name: format(date, "MMM", { locale: ptBR }),
        }
      })

      const monthlyStats = months.map((month) => {
        const monthSales = sales.filter((s) => {
          const d = new Date(s.sale_date)
          return d >= month.start && d <= month.end
        })

        const income = monthSales.reduce((sum, s) => sum + s.total_value, 0)
        
        // Calculate COGS (Cost of Goods Sold)
        const cogs = monthSales.reduce((sum, s) => {
          const product = products.find((p) => p.id === s.product_id)
          return sum + (product?.cost || 0) * s.quantity
        }, 0)

        // Fixed costs (monthly)
        const activeFixedCosts = fixedCosts
          .filter((c) => c.status === "active")
          .reduce((sum, c) => sum + c.monthly_value, 0)

        const activeVariableCosts = variableCosts
          .filter((c) => c.status === "active")
          .reduce((sum, c) => sum + c.value, 0)

        const expenses = cogs + activeFixedCosts + activeVariableCosts

        return {
          month: month.name,
          income,
          expenses,
          profit: income - expenses,
        }
      })

      setMonthlyData(monthlyStats)

      // Current Month Metrics
      const currentMonth = monthlyStats[monthlyStats.length - 1]
      const totalIncome = currentMonth.income
      const totalExpenses = currentMonth.expenses
      const netProfit = currentMonth.profit
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      setMetrics({
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
      })

      // Expense Categories Breakdown (Current Month)
      const currentMonthSales = sales.filter((s) => {
        const d = new Date(s.sale_date)
        const now = new Date()
        return d >= startOfMonth(now) && d <= endOfMonth(now)
      })

      const currentCogs = currentMonthSales.reduce((sum, s) => {
        const product = products.find((p) => p.id === s.product_id)
        return sum + (product?.cost || 0) * s.quantity
      }, 0)

      const currentFixed = fixedCosts
        .filter((c) => c.status === "active")
        .reduce((sum, c) => sum + c.monthly_value, 0)

      setExpenseCategories([
        { name: "Produtos (CMV)", value: currentCogs, color: "hsl(var(--chart-1))" },
        { name: "Custos Fixos", value: currentFixed, color: "hsl(var(--chart-2))" },
        // Add variable costs if implemented properly linked to sales
      ])

      // Daily Sales (Last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        return {
          date,
          dayName: format(date, "EEE", { locale: ptBR }),
        }
      })

      const dailyStats = last7Days.map((day) => {
        const daySales = sales.filter((s) => {
          const d = new Date(s.sale_date)
          return d.getDate() === day.date.getDate() && 
                 d.getMonth() === day.date.getMonth() && 
                 d.getFullYear() === day.date.getFullYear()
        })

        return {
          day: day.dayName,
          amount: daySales.reduce((sum, s) => sum + s.total_value, 0),
        }
      })

      setDailySpending(dailyStats)
      setIsLoading(false)
    } catch (error) {
      console.error("Error loading analytics:", error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Carregando dados...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Visão detalhada do desempenho financeiro
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              CMV + Custos Fixos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.netProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={metrics.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                {metrics.netProfit >= 0 ? "+" : ""}{metrics.netProfit.toFixed(2)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Sobre a receita
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Mensal</CardTitle>
            <CardDescription>Receita vs Despesas (Últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-chart-1)" name="Receita" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-chart-2)" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Composição de Custos</CardTitle>
            <CardDescription>Mês Atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-md">
                            <p className="font-medium text-popover-foreground">{data.name}</p>
                            <p className="text-sm text-muted-foreground">R$ {data.value.toFixed(2)}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Lucro</CardTitle>
            <CardDescription>Acumulado mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--color-chart-3)"
                    fill="var(--color-chart-3)"
                    fillOpacity={0.3}
                    name="Lucro"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Spending */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Diárias</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-chart-1)" }}
                    name="Vendas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
