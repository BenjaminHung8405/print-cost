"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Link as LinkIcon, User, Package, Clock, Scale } from "lucide-react"
import Big from "big.js"
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

// Configure Big.js to use ROUND_HALF_UP (1)
Big.RM = 1

// 1. Currency & Localization formatting function
const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0 // No decimals for VND
  }).format(value);
};

// Rounds a value to the nearest 100 VND (ROUND_HALF_UP)
const roundTo100 = (rawValue: Big): number => {
  if (rawValue.lt(0)) return 0;
  const divided = rawValue.div(100);
  const rounded = divided.round(0); // uses Big.RM (ROUND_HALF_UP)
  return rounded.times(100).toNumber();
};

// Materials constants matching init.sql V4 seed data
const MATERIALS = {
  PLA: { price_per_kg: 250000, fail_rate: 1.10, default_margin: 0.40 },
  PETG: { price_per_kg: 203000, fail_rate: 1.00, default_margin: 0.30 },
  ABS: { price_per_kg: 280000, fail_rate: 1.15, default_margin: 0.35 },
  TPU: { price_per_kg: 350000, fail_rate: 1.05, default_margin: 0.45 },
}

// Operational configs matching init.sql V4
const OPERATIONAL_CONFIG = {
  machine_depreciation_per_hour: 5000,
  labor_cost_per_minute: 500,
}

// Average packaging cost in VND
const FIXED_ITEMS_COST = 2400

// Product templates with database V4 properties
const PRODUCT_TEMPLATES = [
  { id: "1", name: "Keycap (PLA)", material: "PLA", weightGram: 16.88, printTimeSeconds: 5700, laborTimeMinutes: 0, marginOverride: null, basePrice: 24900 },
  { id: "2", name: "Phone Case (PETG)", material: "PETG", weightGram: 40.0, printTimeSeconds: 7200, laborTimeMinutes: 10, marginOverride: null, basePrice: 36500 },
  { id: "3", name: "Miniature Figure (PLA)", material: "PLA", weightGram: 25.0, printTimeSeconds: 10800, laborTimeMinutes: 15, marginOverride: null, basePrice: 53000 },
  { id: "4", name: "Artistic Bust (ABS)", material: "ABS", weightGram: 150.0, printTimeSeconds: 28800, laborTimeMinutes: 30, marginOverride: 0.50, basePrice: 211400 },
  { id: "5", name: "Custom Project (TPU)", material: "TPU", weightGram: 100.0, printTimeSeconds: 21600, laborTimeMinutes: 20, marginOverride: null, basePrice: 143900 },
]

interface OrderItem {
  id: string
  productTemplateId: string
  quantity: number
  priceOverride: string
  printTimeHours: string
  printTimeMinutes: string
  weightGramOverride: string
  laborTimeMinutesOverride: string
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
      weightGramOverride: "",
      laborTimeMinutesOverride: "",
    },
  ])

  // Calculate pricing per item and total order summary
  const orderSummary = useMemo(() => {
    let totalPrintTimeSeconds = 0;
    let totalRawMaterialCost = Big(0);
    let totalRawMachineCost = Big(0);
    let totalRawLaborCost = Big(0);
    let totalRawFixedItemsCost = Big(0);
    let totalRawCOGS = Big(0);
    let totalSuggestedPrice = Big(0);

    const calculatedItems = items.map((item) => {
      const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId);
      
      // Default parameters
      const defaultWeight = template ? template.weightGram : 0;
      const defaultPrintSeconds = template ? template.printTimeSeconds : 0;
      const defaultLaborMinutes = template ? template.laborTimeMinutes : 0;
      const defaultMaterial = template ? template.material : "PLA";
      
      // Apply overrides if provided
      const weightGram = item.weightGramOverride !== "" ? parseFloat(item.weightGramOverride) || 0 : defaultWeight;
      
      const hours = parseInt(item.printTimeHours) || 0;
      const minutes = parseInt(item.printTimeMinutes) || 0;
      const overrideSeconds = (hours * 3600) + (minutes * 60);
      const printTimeSeconds = overrideSeconds > 0 ? overrideSeconds : defaultPrintSeconds;
      
      const laborTimeMinutes = item.laborTimeMinutesOverride !== "" ? parseInt(item.laborTimeMinutesOverride) || 0 : defaultLaborMinutes;
      
      // Pricing configurations
      const matConfig = MATERIALS[defaultMaterial as keyof typeof MATERIALS] || MATERIALS.PLA;
      const margin = template && template.marginOverride !== null 
        ? template.marginOverride 
        : matConfig.default_margin;
      
      // Calculate costs using DB Schema V4 formulas
      // 1. Raw Material Cost = Weight (gram) * (Price per kg / 1000) * Fail Rate
      const itemRawMaterialCost = Big(weightGram)
        .times(Big(matConfig.price_per_kg).div(1000))
        .times(matConfig.fail_rate);
        
      // 2. Raw Machine Cost = (Print Time in Seconds / 3600) * Depreciation per Hour
      const itemRawMachineCost = Big(printTimeSeconds)
        .div(3600)
        .times(OPERATIONAL_CONFIG.machine_depreciation_per_hour);
        
      // 3. Raw Labor Cost = Labor Time in Minutes * Labor Cost per Minute
      const itemRawLaborCost = Big(laborTimeMinutes)
        .times(OPERATIONAL_CONFIG.labor_cost_per_minute);
        
      // 4. Raw Fixed Items Cost
      const itemRawFixedItemsCost = Big(FIXED_ITEMS_COST);
      
      // 5. Raw Unit COGS = Material + Machine + Labor + Fixed
      const itemRawCOGS = itemRawMaterialCost
        .plus(itemRawMachineCost)
        .plus(itemRawLaborCost)
        .plus(itemRawFixedItemsCost);
        
      // 6. Raw Suggested Price = Raw Unit COGS / (1 - Margin)
      const itemRawSuggestedPrice = margin === 1.0 
        ? itemRawCOGS 
        : itemRawCOGS.div(Big(1).minus(margin));
        
      // 7. Final Suggested Price = round_to_100(Raw Suggested Price)
      const itemFinalSuggestedPrice = roundTo100(itemRawSuggestedPrice);
      
      // 8. Actual final unit price: check if there's a price override
      const actualUnitPrice = item.priceOverride !== "" && parseFloat(item.priceOverride) > 0
        ? parseFloat(item.priceOverride)
        : itemFinalSuggestedPrice;
        
      const itemTotalPrice = Big(actualUnitPrice).times(item.quantity);
      
      // Accumulate totals
      totalPrintTimeSeconds += printTimeSeconds * item.quantity;
      totalRawMaterialCost = totalRawMaterialCost.plus(itemRawMaterialCost.times(item.quantity));
      totalRawMachineCost = totalRawMachineCost.plus(itemRawMachineCost.times(item.quantity));
      totalRawLaborCost = totalRawLaborCost.plus(itemRawLaborCost.times(item.quantity));
      totalRawFixedItemsCost = totalRawFixedItemsCost.plus(itemRawFixedItemsCost.times(item.quantity));
      totalRawCOGS = totalRawCOGS.plus(itemRawCOGS.times(item.quantity));
      totalSuggestedPrice = totalSuggestedPrice.plus(itemTotalPrice);
      
      return {
        ...item,
        templateName: template ? template.name : "Custom Item",
        margin,
        rawMaterialCost: itemRawMaterialCost.toNumber(),
        rawMachineCost: itemRawMachineCost.toNumber(),
        rawLaborCost: itemRawLaborCost.toNumber(),
        rawFixedItemsCost: itemRawFixedItemsCost.toNumber(),
        rawCOGS: itemRawCOGS.toNumber(),
        suggestedPrice: itemFinalSuggestedPrice,
        actualUnitPrice,
        totalPrice: itemTotalPrice.toNumber(),
      };
    });

    return {
      items: calculatedItems,
      totalPrintTimeSeconds,
      rawMaterialCost: totalRawMaterialCost.toNumber(),
      rawMachineCost: totalRawMachineCost.toNumber(),
      rawLaborCost: totalRawLaborCost.toNumber(),
      rawFixedItemsCost: totalRawFixedItemsCost.toNumber(),
      rawCOGS: totalRawCOGS.toNumber(),
      suggestedRetailPrice: totalSuggestedPrice.toNumber(),
    };
  }, [items]);

  // Generate dynamic markup text
  const markupText = useMemo(() => {
    const activeItems = orderSummary.items.filter(item => item.productTemplateId !== "");
    if (activeItems.length === 0) return `Includes standard markup`;
    
    const margins = Array.from(new Set(activeItems.map(item => item.margin)));
    if (margins.length === 1) {
      return `Includes ${(margins[0] * 100).toFixed(0)}% markup`;
    } else {
      const sortedMargins = margins.sort((a, b) => a - b);
      const marginStrings = sortedMargins.map(m => `${(m * 100).toFixed(0)}%`);
      return `Includes mixed markups (${marginStrings.join(", ")})`;
    }
  }, [orderSummary]);

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
        weightGramOverride: "",
        laborTimeMinutesOverride: "",
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name) {
      alert("Vui lòng điền tên khách hàng!");
      return;
    }

    const payload = {
      customer_name: customerInfo.name,
      customer_contact: customerInfo.link || null,
      items: items.map((item) => {
        const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId);
        const defaultPrintSeconds = template ? template.printTimeSeconds : 0;
        const hours = parseInt(item.printTimeHours) || 0;
        const minutes = parseInt(item.printTimeMinutes) || 0;
        const overrideSeconds = (hours * 3600) + (minutes * 60);
        const printTimeSeconds = overrideSeconds > 0 ? overrideSeconds : defaultPrintSeconds;

        return {
          product_id: template ? Number(template.id) : null,
          quantity: Number(item.quantity),
          // Quy đổi thời gian sang Giây đúng thiết kế hệ thống
          print_time_seconds: printTimeSeconds,
          // Nếu có giá ghi đè thì gửi số, không thì để null cho DB tự tính giá gợi ý
          price_override: item.priceOverride ? Number(item.priceOverride) : null
        };
      })
    };

    alert(`Order created successfully!\n\nPayload:\n${JSON.stringify(payload, null, 2)}`);
  };

  return (
    <main className="min-h-screen bg-brand-bg p-4 md:p-6 lg:p-8">
      <form onSubmit={handleCreateOrder} className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="font-mono text-3xl font-bold text-brand-text tracking-tight">
            New Order / Tạo Đơn Hàng
          </h1>
          <p className="mt-2 text-brand-text-muted">
            Create a new 3D printing order with real-time cost calculation in VND
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
                  Customer Information / Thông Tin Khách Hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name" className="text-brand-text-muted">
                    Customer Name / Tên Khách Hàng
                  </Label>
                  <Input
                    id="customer-name"
                    required
                    placeholder="Enter customer name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="border-brand-border bg-brand-bg text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-link" className="flex items-center gap-2 text-brand-text-muted">
                    <LinkIcon className="h-4 w-4" />
                    Contact Info / Liên Hệ (Zalo, SĐT, Facebook...)
                  </Label>
                  <Input
                    id="customer-link"
                    placeholder="Zalo number, FB link or phone number"
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
                    Order Items / Chi Tiết Đơn Hàng
                  </CardTitle>
                  <Button
                    type="button"
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
                {items.map((item, index) => {
                  const template = PRODUCT_TEMPLATES.find(t => t.id === item.productTemplateId);
                  return (
                    <div
                      key={item.id}
                      className="relative rounded-lg border border-brand-border bg-brand-bg p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono text-sm text-brand-text-muted font-bold">
                          Item #{index + 1}
                        </span>
                        {items.length > 1 && (
                          <Button
                            type="button"
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
                            Product Template / Mẫu Sản Phẩm
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
                                  className="text-brand-text focus:bg-brand-primary/20 focus:text-brand-text cursor-pointer"
                                >
                                  <span className="flex items-center justify-between gap-8 w-full">
                                    <span>{template.name}</span>
                                    <span className="font-mono text-xs text-brand-text-muted font-semibold">
                                      {formatVND(template.basePrice)}
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
                            Quantity / Số Lượng
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
                            Price Override / Giá Ghi Đè (đ)
                          </Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            min="0"
                            placeholder="Auto (Tự động)"
                            value={item.priceOverride}
                            onChange={(e) => updateItem(item.id, "priceOverride", e.target.value)}
                            className="border-brand-border bg-brand-surface font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                          />
                        </div>

                        {/* Weight Override */}
                        <div className="space-y-2">
                          <Label htmlFor={`weight-${item.id}`} className="text-brand-text-muted flex items-center gap-1">
                            <Scale className="h-3.5 w-3.5 text-brand-primary" />
                            Weight Override / Khối Lượng (g)
                          </Label>
                          <Input
                            id={`weight-${item.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={template ? `${template.weightGram}g (Mặc định)` : "Mặc định (g)"}
                            value={item.weightGramOverride}
                            onChange={(e) => updateItem(item.id, "weightGramOverride", e.target.value)}
                            className="border-brand-border bg-brand-surface font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                          />
                        </div>

                        {/* Labor Time Override */}
                        <div className="space-y-2">
                          <Label htmlFor={`labor-${item.id}`} className="text-brand-text-muted flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-brand-primary" />
                            Labor Override / Công Thợ (phút)
                          </Label>
                          <Input
                            id={`labor-${item.id}`}
                            type="number"
                            min="0"
                            placeholder={template ? `${template.laborTimeMinutes}m (Mặc định)` : "Mặc định (phút)"}
                            value={item.laborTimeMinutesOverride}
                            onChange={(e) => updateItem(item.id, "laborTimeMinutesOverride", e.target.value)}
                            className="border-brand-border bg-brand-surface font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                          />
                        </div>

                        {/* Print Time Override */}
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-brand-text-muted flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-brand-primary" />
                            Print Time Override / Thời Gian Chạy Máy
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                id={`hours-${item.id}`}
                                type="number"
                                min="0"
                                placeholder={template ? Math.floor(template.printTimeSeconds / 3600).toString() : "0"}
                                value={item.printTimeHours}
                                onChange={(e) => updateItem(item.id, "printTimeHours", e.target.value)}
                                className="border-brand-border bg-brand-surface pr-12 font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-text-muted font-mono">
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
                                placeholder={template ? Math.floor((template.printTimeSeconds % 3600) / 60).toString() : "0"}
                                value={item.printTimeMinutes}
                                onChange={(e) => updateItem(item.id, "printTimeMinutes", e.target.value)}
                                className="border-brand-border bg-brand-surface pr-12 font-mono text-brand-text placeholder:text-brand-text-muted/50 focus:ring-brand-primary"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-text-muted font-mono">
                                min
                              </span>
                            </div>
                          </div>
                          {template && (
                            <p className="text-xs text-brand-text-muted italic">
                              Default / Mặc định: {formatTime(template.printTimeSeconds)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-brand-cta py-6 text-lg font-semibold text-brand-text hover:bg-brand-primary hover:scale-[0.98] active:scale-[0.95] transition-transform cursor-pointer"
            >
              Create Order / Chốt Đơn Hàng
            </Button>
          </div>

          {/* Right Column - Live Pricing Receipt */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Card className="border-brand-border bg-brand-surface">
              <CardHeader className="border-b border-brand-border pb-4">
                <CardTitle className="font-mono text-lg text-brand-text">
                  Live Pricing Receipt / Hóa Đơn Tạm Tính
                </CardTitle>
                <p className="text-sm text-brand-text-muted">
                  Total Print Time:{" "}
                  <span className="font-mono text-brand-accent font-semibold">
                    {formatTime(orderSummary.totalPrintTimeSeconds)}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Cost Breakdown */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Raw Material Cost (Nhựa)</span>
                      <span className="font-mono text-brand-text">
                        {formatVND(orderSummary.rawMaterialCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Machine Cost (Điện & Khấu hao)</span>
                      <span className="font-mono text-brand-text">
                        {formatVND(orderSummary.rawMachineCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Labor Cost (Nhân công)</span>
                      <span className="font-mono text-brand-text">
                        {formatVND(orderSummary.rawLaborCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-text-muted">Fixed Items Cost (Hao hụt/Bao bì)</span>
                      <span className="font-mono text-brand-text">
                        {formatVND(orderSummary.rawFixedItemsCost)}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-brand-border" />

                  {/* Raw COGS */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-text">Raw COGS (Giá vốn thô)</span>
                    <span className="font-mono text-lg font-semibold text-brand-text">
                      {formatVND(orderSummary.rawCOGS)}
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
                        {formatVND(orderSummary.suggestedRetailPrice)}
                      </span>
                    </div>
                    <p className="relative mt-1 text-xs text-brand-text-muted font-semibold">
                      {markupText}
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="mt-6 space-y-2">
                    <h4 className="text-sm font-medium text-brand-text-muted">
                      Items Summary / Danh Sách Sản Phẩm
                    </h4>
                    {orderSummary.items.map((item, index) => {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1 rounded border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-brand-text">
                              {item.productTemplateId ? item.templateName : `Item #${index + 1}`}
                            </span>
                            <span className="font-mono text-brand-text font-semibold">
                              ×{item.quantity}
                            </span>
                          </div>
                          {item.productTemplateId && (
                            <div className="flex items-center justify-between text-xs text-brand-text-muted font-mono">
                              <span>Unit: {formatVND(item.actualUnitPrice)}</span>
                              <span>Total: {formatVND(item.totalPrice)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </main>
  )
}
