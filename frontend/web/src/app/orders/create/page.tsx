"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Link as LinkIcon, User, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Product templates with pricing info
const PRODUCT_TEMPLATES = [
  { id: "miniature", name: "Miniature Figure", basePrice: 8.5, printTimeSeconds: 7200 },
  { id: "phone-case", name: "Phone Case", basePrice: 12.0, printTimeSeconds: 10800 },
  { id: "prototype", name: "Prototype Part", basePrice: 25.0, printTimeSeconds: 21600 },
  { id: "jewelry", name: "Jewelry Piece", basePrice: 18.0, printTimeSeconds: 14400 },
  { id: "functional", name: "Functional Part", basePrice: 15.0, printTimeSeconds: 18000 },
  { id: "custom", name: "Custom Project", basePrice: 30.0, printTimeSeconds: 28800 },
]

// Pricing constants
const MATERIAL_COST_PER_HOUR = 2.5
const MACHINE_COST_PER_HOUR = 1.8
const LABOR_COST_PER_HOUR = 12.0
const FIXED_ITEMS_COST = 3.5
const MARKUP_PERCENTAGE = 0.35

interface OrderItem {
  id: string
  productTemplateId: string
  quantity: number
  priceOverride: string
  printTimeHours: string
  printTimeMinutes: string
}

interface CustomerInfo {
  name: string
  link: string
}

export default function OrderCreationPage() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    link: "",
  })

  const [items, setItems] = useState<OrderItem[]>([
    {
      id: crypto.randomUUID(),
      productTemplateId: "",
      quantity: 1,
      priceOverride: "",
      printTimeHours: "",
      printTimeMinutes: "",
    },
  ])

  // Calculate total print time in seconds
  const getTotalPrintTimeSeconds = useMemo(() => {
    return items.reduce((total, item) => {
      const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId)
      const hours = parseInt(item.printTimeHours) || 0
      const minutes = parseInt(item.printTimeMinutes) || 0
      const overrideSeconds = (hours * 3600) + (minutes * 60)
      
      // Use override if provided, otherwise use template default
      const printSeconds = overrideSeconds > 0 
        ? overrideSeconds 
        : (template?.printTimeSeconds || 0)
      
      return total + (printSeconds * item.quantity)
    }, 0)
  }, [items])

  // Calculate all pricing
  const pricing = useMemo(() => {
    const totalHours = getTotalPrintTimeSeconds / 3600

    const rawMaterialCost = totalHours * MATERIAL_COST_PER_HOUR
    const machineCost = totalHours * MACHINE_COST_PER_HOUR
    const laborCost = totalHours * LABOR_COST_PER_HOUR
    const fixedItemsCost = items.length * FIXED_ITEMS_COST

    const rawCOGS = rawMaterialCost + machineCost + laborCost + fixedItemsCost
    
    // Check for price overrides
    const hasOverrides = items.some(item => item.priceOverride && parseFloat(item.priceOverride) > 0)
    
    let suggestedRetailPrice: number
    if (hasOverrides) {
      // Sum overrides + calculated prices for items without overrides
      suggestedRetailPrice = items.reduce((total, item) => {
        if (item.priceOverride && parseFloat(item.priceOverride) > 0) {
          return total + (parseFloat(item.priceOverride) * item.quantity)
        }
        const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId)
        if (template) {
          return total + (template.basePrice * item.quantity * (1 + MARKUP_PERCENTAGE))
        }
        return total
      }, 0)
    } else {
      suggestedRetailPrice = rawCOGS * (1 + MARKUP_PERCENTAGE)
    }

    return {
      rawMaterialCost,
      machineCost,
      laborCost,
      fixedItemsCost,
      rawCOGS,
      suggestedRetailPrice,
      totalHours,
    }
  }, [items, getTotalPrintTimeSeconds])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        productTemplateId: "",
        quantity: 1,
        priceOverride: "",
        printTimeHours: "",
        printTimeMinutes: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const formatCurrency = (value: number) => {
    return value.toFixed(2)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <main className="min-h-screen bg-brand-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="font-mono text-3xl font-bold text-brand-text tracking-tight">
            New Order
          </h1>
          <p className="mt-2 text-brand-text-muted">
            Create a new 3D printing order with real-time cost calculation
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Left Column - Order Form */}
          <div className="space-y-6">
            {/* Customer Information Card */}
            <Card className="border-brand-border bg-brand-surface">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 font-mono text-lg text-brand-text">
                  <User className="h-5 w-5 text-brand-primary" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name" className="text-brand-text-muted">
                    Customer Name
                  </Label>
                  <Input
                    id="customer-name"
                    placeholder="Enter customer name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="border-brand-border bg-brand-bg text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-link" className="flex items-center gap-2 text-brand-text-muted">
                    <LinkIcon className="h-4 w-4" />
                    Reference Link
                  </Label>
                  <Input
                    id="customer-link"
                    type="url"
                    placeholder="https://..."
                    value={customerInfo.link}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, link: e.target.value })}
                    className="border-brand-border bg-brand-bg text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items Card */}
            <Card className="border-brand-border bg-brand-surface">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-mono text-lg text-brand-text">
                    <Package className="h-5 w-5 text-brand-primary" />
                    Order Items
                  </CardTitle>
                  <Button
                    onClick={addItem}
                    size="sm"
                    className="bg-brand-cta text-brand-text hover:bg-brand-primary hover:scale-[0.98] active:scale-[0.95] transition-transform"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative rounded-lg border border-brand-border bg-brand-bg p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-sm text-brand-text-muted">
                        Item #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-brand-danger hover:bg-brand-danger/10 hover:text-brand-danger hover:scale-[0.98] active:scale-[0.95] transition-transform"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Product Template */}
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`product-${item.id}`} className="text-brand-text-muted">
                          Product Template
                        </Label>
                        <Select
                          value={item.productTemplateId}
                          onValueChange={(value) => updateItem(item.id, "productTemplateId", value)}
                        >
                          <SelectTrigger 
                            id={`product-${item.id}`}
                            className="border-brand-border bg-brand-surface text-brand-text focus:ring-brand-primary"
                          >
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent className="border-brand-border bg-brand-surface">
                            {PRODUCT_TEMPLATES.map((template) => (
                              <SelectItem
                                key={template.id}
                                value={template.id}
                                className="text-brand-text focus:bg-brand-primary/20 focus:text-brand-text"
                              >
                                <span className="flex items-center justify-between gap-4">
                                  <span>{template.name}</span>
                                  <span className="font-mono text-xs text-brand-text-muted">
                                    ${formatCurrency(template.basePrice)}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${item.id}`} className="text-brand-text-muted">
                          Quantity
                        </Label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className="border-brand-border bg-brand-surface font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                        />
                      </div>

                      {/* Price Override */}
                      <div className="space-y-2">
                        <Label htmlFor={`price-${item.id}`} className="text-brand-text-muted">
                          Price Override ($)
                        </Label>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Auto"
                          value={item.priceOverride}
                          onChange={(e) => updateItem(item.id, "priceOverride", e.target.value)}
                          className="border-brand-border bg-brand-surface font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                        />
                      </div>

                      {/* Print Time Override */}
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-brand-text-muted">
                          Print Time Override
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`hours-${item.id}`}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.printTimeHours}
                              onChange={(e) => updateItem(item.id, "printTimeHours", e.target.value)}
                              className="border-brand-border bg-brand-surface pr-12 font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-text-muted">
                              hrs
                            </span>
                          </div>
                          <span className="font-mono text-brand-text-muted">:</span>
                          <div className="relative flex-1">
                            <Input
                              id={`minutes-${item.id}`}
                              type="number"
                              min="0"
                              max="59"
                              placeholder="0"
                              value={item.printTimeMinutes}
                              onChange={(e) => updateItem(item.id, "printTimeMinutes", e.target.value)}
                              className="border-brand-border bg-brand-surface pr-12 font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-text-muted">
                              min
                            </span>
                          </div>
                        </div>
                        {item.productTemplateId && (
                          <p className="text-xs text-brand-text-muted">
                            Default: {formatTime(PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId)?.printTimeSeconds || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              size="lg"
              className="w-full bg-brand-cta py-6 text-lg font-semibold text-brand-text hover:bg-brand-primary hover:scale-[0.98] active:scale-[0.95] transition-transform"
            >
              Create Order
            </Button>
          </div>

          {/* Right Column - Live Pricing Receipt */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Card className="border-brand-border bg-brand-surface">
              <CardHeader className="border-b border-brand-border pb-4">
                <CardTitle className="font-mono text-lg text-brand-text">
                  Live Pricing Receipt
                </CardTitle>
                <p className="text-sm text-brand-text-muted">
                  Total Print Time:{" "}
                  <span className="font-mono text-brand-accent">
                    {formatTime(getTotalPrintTimeSeconds)}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Cost Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Raw Material Cost</span>
                      <span className="font-mono text-brand-text">
                        ${formatCurrency(pricing.rawMaterialCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Machine Cost</span>
                      <span className="font-mono text-brand-text">
                        ${formatCurrency(pricing.machineCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Labor Cost</span>
                      <span className="font-mono text-brand-text">
                        ${formatCurrency(pricing.laborCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Fixed Items Cost</span>
                      <span className="font-mono text-brand-text">
                        ${formatCurrency(pricing.fixedItemsCost)}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-brand-border" />

                  {/* Raw COGS */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-text">Raw COGS</span>
                    <span className="font-mono text-lg font-semibold text-brand-text">
                      ${formatCurrency(pricing.rawCOGS)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-brand-border" />

                  {/* Suggested Retail Price - with glow effect */}
                  <div className="relative overflow-hidden rounded-lg bg-brand-primary/10 p-4">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-brand-primary/20 to-brand-primary/5" />
                    <div 
                      className="absolute -inset-1 rounded-lg opacity-50 blur-xl"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}
                    />
                    
                    <div className="relative flex items-center justify-between">
                      <span className="font-semibold text-brand-text">
                        Suggested Retail Price
                      </span>
                      <span className="font-mono text-2xl font-bold text-brand-accent">
                        ${formatCurrency(pricing.suggestedRetailPrice)}
                      </span>
                    </div>
                    <p className="relative mt-1 text-xs text-brand-text-muted">
                      Includes {(MARKUP_PERCENTAGE * 100).toFixed(0)}% markup
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="mt-6 space-y-2">
                    <h4 className="text-sm font-medium text-brand-text-muted">
                      Items Summary
                    </h4>
                    {items.map((item, index) => {
                      const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId)
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                        >
                          <span className="text-brand-text-muted">
                            {template?.name || `Item #${index + 1}`}
                          </span>
                          <span className="font-mono text-brand-text">
                            ×{item.quantity}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
