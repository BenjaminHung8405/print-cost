"use client";

import React, { useState, useEffect } from "react";
import Big from "big.js";
import {
  Settings,
  Save,
  TrendingUp,
  Cpu,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  Layers,
  Coins
} from "lucide-react";
import {
  ApiOperationalConfigs,
  ApiProduct,
  ApiMaterial,
  getOperationalConfigs,
  updateOperationalConfigs,
  getProducts,
  getMaterials
} from "@/core/api/client";
import { formatVND, formatDecimal, parseVNDInteger, parseFloatDecimal } from "@/core/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Configure Big.js to round half-up globally (RM = 1)
Big.RM = 1;

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function ConfigsPage() {
  // Config state (DB values)
  const [currentConfigs, setCurrentConfigs] = useState<ApiOperationalConfigs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form states (Draft values)
  const [machineDepreciation, setMachineDepreciation] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [rawMachineInput, setRawMachineInput] = useState<string>("0");
  const [rawLaborInput, setRawLaborInput] = useState<string>("0");

  const [isMachineFocused, setIsMachineFocused] = useState(false);
  const [isLaborFocused, setIsLaborFocused] = useState(false);

  // Simulator state
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [simWeight, setSimWeight] = useState<string>("");
  const [simHours, setSimHours] = useState<string>("");
  const [simMinutes, setSimMinutes] = useState<string>("");
  const [simLaborMinutes, setSimLaborMinutes] = useState<string>("");

  // Check if form is dirty (inputs differ from DB state)
  const isDirty = currentConfigs
    ? machineDepreciation !== currentConfigs.machine_depreciation_per_hour ||
      laborCost !== currentConfigs.labor_cost_per_minute
    : false;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [configsData, productsData, materialsData] = await Promise.all([
        getOperationalConfigs(),
        getProducts(),
        getMaterials()
      ]);

      setCurrentConfigs(configsData);
      setMachineDepreciation(configsData.machine_depreciation_per_hour);
      setLaborCost(configsData.labor_cost_per_minute);
      setRawMachineInput(configsData.machine_depreciation_per_hour.toString());
      setRawLaborInput(configsData.labor_cost_per_minute.toString());

      setProducts(productsData);
      setMaterials(materialsData);
    } catch (err: any) {
      setError(err.message || "Không thể tải cấu hình gốc từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync simulator parameters when selected product changes
  useEffect(() => {
    if (!selectedProductId) {
      setSimWeight("");
      setSimHours("");
      setSimMinutes("");
      setSimLaborMinutes("");
      return;
    }

    const product = products.find((p) => p.id.toString() === selectedProductId);
    if (product) {
      setSimWeight(product.weight_gram.toString());
      
      const hours = Math.floor(product.print_time_seconds / 3600);
      const minutes = Math.floor((product.print_time_seconds % 3600) / 60);
      setSimHours(hours.toString());
      setSimMinutes(minutes.toString());
      setSimLaborMinutes(product.labor_time_minutes.toString());
    }
  }, [selectedProductId, products]);

  // Form input Focus & Blur handlers
  const handleMachineFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsMachineFocused(true);
    // Use optional chaining or fallback to 0
    const value = machineDepreciation ?? 0;
    setRawMachineInput(value === 0 ? "" : value.toString());
    setTimeout(() => {
      e.target.select();
    }, 50);
  };

  const handleMachineBlur = () => {
    setIsMachineFocused(false);
    const parsedValue = parseVNDInteger(rawMachineInput);
    setMachineDepreciation(parsedValue);
    setRawMachineInput(parsedValue.toString());
  };

  const handleLaborFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsLaborFocused(true);
    // Use optional chaining or fallback to 0
    const value = laborCost ?? 0;
    setRawLaborInput(value === 0 ? "" : value.toString());
    setTimeout(() => {
      e.target.select();
    }, 50);
  };

  const handleLaborBlur = () => {
    setIsLaborFocused(false);
    const parsedValue = parseVNDInteger(rawLaborInput);
    setLaborCost(parsedValue);
    setRawLaborInput(parsedValue.toString());
  };

  // Save Settings
  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await updateOperationalConfigs({
        machine_depreciation_per_hour: machineDepreciation,
        labor_cost_per_minute: laborCost
      });
      setCurrentConfigs(updated);
      setMachineDepreciation(updated.machine_depreciation_per_hour);
      setLaborCost(updated.labor_cost_per_minute);
      setRawMachineInput(updated.machine_depreciation_per_hour.toString());
      setRawLaborInput(updated.labor_cost_per_minute.toString());
      showToast("Cập nhật chi phí vận hành thành công!", "success");
    } catch (err: any) {
      showToast(err.message || "Cập nhật thất bại. Vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pricing calculator using Big.js
  const getPricingDetails = (
    machDepr: number,
    labCostPerMin: number
  ): {
    materialCost: number;
    machineCost: number;
    laborCost: number;
    fixedItemsCost: number;
    cogs: number;
    suggestedPrice: number;
    margin: number;
    materialName: string;
  } | null => {
    if (!selectedProductId) return null;

    const product = products.find((p) => p.id.toString() === selectedProductId);
    if (!product) return null;

    const material = materials.find((m) => m.id === product.material_id);
    if (!material) return null;

    // Use customized simulator values or fallback to product defaults
    const weightVal = parseFloatDecimal(simWeight) || 0;
    const hoursVal = parseInt(simHours, 10) || 0;
    const minutesVal = parseInt(simMinutes, 10) || 0;
    const totalSeconds = (hoursVal * 3600) + (minutesVal * 60);
    const laborMinutesVal = parseInt(simLaborMinutes, 10) || 0;

    const pricePerKgBig = new Big(material.price_per_kg);
    const failRateBig = new Big(material.fail_rate);
    const weightBig = new Big(weightVal);
    const printTimeSecondsBig = new Big(totalSeconds);
    const laborMinutesBig = new Big(laborMinutesVal);

    // 1. Raw Material Cost = Weight * (PricePerKg / 1000) * FailRate
    const matCost = weightBig.times(pricePerKgBig.div(1000)).times(failRateBig);

    // 2. Raw Machine Cost = (Seconds / 3600) * DepreciationPerHour
    const machCost = printTimeSecondsBig.div(3600).times(new Big(machDepr));

    // 3. Raw Labor Cost = LaborMinutes * LaborCostPerMinute
    const labCost = laborMinutesBig.times(new Big(labCostPerMin));

    // 4. Fixed Items Cost
    let fixedCostBig = new Big(0);
    if (product.fixed_items && product.fixed_items.length > 0) {
      product.fixed_items.forEach((item) => {
        fixedCostBig = fixedCostBig.plus(new Big(item.cost).times(item.quantity));
      });
    }

    // 5. Total COGS
    const totalCogs = matCost.plus(machCost).plus(labCost).plus(fixedCostBig);

    // 6. Suggested price
    const margin = product.margin_override ?? material.default_margin;
    let finalPrice = 0;
    if (margin >= 1) {
      finalPrice = 0;
    } else {
      const rawPrice = totalCogs.div(new Big(1).sub(margin));
      
      // Round to nearest 100 VND
      const divided = rawPrice.div(100);
      const rounded = divided.round(0); // big.js global RM = 1 (ROUND_HALF_UP)
      finalPrice = rounded.times(100).toNumber();
    }

    return {
      materialCost: matCost.toNumber(),
      machineCost: machCost.toNumber(),
      laborCost: labCost.toNumber(),
      fixedItemsCost: fixedCostBig.toNumber(),
      cogs: totalCogs.toNumber(),
      suggestedPrice: finalPrice,
      margin,
      materialName: material.name
    };
  };

  // Compute Current (DB) and Draft (Inputs) outputs for Comparison
  const currentPricing = currentConfigs
    ? getPricingDetails(currentConfigs.machine_depreciation_per_hour, currentConfigs.labor_cost_per_minute)
    : null;

  const draftPricing = getPricingDetails(machineDepreciation, laborCost);

  // Calculate Deltas
  const cogsDelta = currentPricing && draftPricing && isDirty
    ? new Big(draftPricing.cogs).sub(currentPricing.cogs)
    : new Big(0);

  const priceDelta = currentPricing && draftPricing && isDirty
    ? new Big(draftPricing.suggestedPrice).sub(currentPricing.suggestedPrice)
    : new Big(0);

  // Set visual classes and text for COGS Delta Badge (Accounting view: Cost increase is bad, Cost decrease is good)
  let cogsBadgeClass = "text-zinc-400 bg-zinc-800/50 border border-zinc-700/50";
  let cogsBadgeText = "0 đ (Không thay đổi)";
  
  if (isDirty && cogsDelta.gt(0)) {
    cogsBadgeClass = "text-rose-400 bg-rose-950/30 border border-rose-800/50";
    cogsBadgeText = `+${formatVND(cogsDelta.toNumber())} (Chi phí tăng)`;
  } else if (isDirty && cogsDelta.lt(0)) {
    cogsBadgeClass = "text-emerald-400 bg-emerald-950/30 border border-emerald-800/50";
    cogsBadgeText = `${formatVND(cogsDelta.toNumber())} (Tối ưu chi phí)`;
  }

  // Set visual classes and text for Suggested Price Delta Badge
  let priceBadgeClass = "text-zinc-400 bg-zinc-800/50 border border-zinc-700/50";
  let priceBadgeText = "0 đ (Không thay đổi)";

  if (isDirty && priceDelta.gt(0)) {
    priceBadgeClass = "text-rose-400 bg-rose-950/30 border border-rose-800/50";
    priceBadgeText = `+${formatVND(priceDelta.toNumber())} (Giá tăng)`;
  } else if (isDirty && priceDelta.lt(0)) {
    priceBadgeClass = "text-emerald-400 bg-emerald-950/30 border border-emerald-800/50";
    priceBadgeText = `${formatVND(priceDelta.toNumber())} (Giá giảm)`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased pb-12">
      {/* 1. Header & Navigation Breadcrumbs */}
      <div className="border-b border-border bg-card/20 py-4 px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>CẤU HÌNH GỐC</span>
              <span>/</span>
              <span className="text-muted-foreground">CHI PHÍ VẬN HÀNH</span>
            </div>
            <h1 className="text-xl md:text-2xl font-mono font-bold tracking-wider text-foreground mt-1.5 uppercase">
              QUẢN LÝ CHI PHÍ VẬN HÀNH
            </h1>
          </div>

          <div className="shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={isLoading}
              title="Làm mới cấu hình"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Page Content Wrapper */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-8 py-6">
        {error && (
          <div className="bg-rose-950/30 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Đã xảy ra lỗi hệ thống</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm font-mono text-muted-foreground">Đang tải cấu hình máy chủ LAN...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUMN 1: Settings Form (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />
                
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-mono text-base font-bold tracking-wide uppercase text-foreground">
                    Tham Số Vận Hành Gốc
                  </h2>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Cấu hình chi phí khấu hao máy và công thợ để hệ thống tự động tính toán giá thành
                  cho tất cả sản phẩm trong xưởng in.
                </p>

                <form onSubmit={handleSaveConfigs} className="space-y-6">
                  
                  {/* Field 1: Machine Depreciation */}
                  <div className="space-y-2">
                    <Label htmlFor="machine-depreciation" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Khấu hao máy / giờ (VND)
                    </Label>
                    <div className="relative">
                      <Input
                        id="machine-depreciation"
                        type={isMachineFocused ? "number" : "text"}
                        value={
                          isMachineFocused
                            ? rawMachineInput
                            : `${formatVND(machineDepreciation)}/giờ`
                        }
                        onFocus={handleMachineFocus}
                        onBlur={handleMachineBlur}
                        onChange={(e) => setRawMachineInput(e.target.value)}
                        placeholder="0 đ/giờ"
                        className="text-right font-mono pr-4"
                        disabled={isSubmitting}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Khấu hao hao mòn máy và điện năng tiêu thụ trên mỗi giờ chạy.
                    </span>
                  </div>

                  {/* Field 2: Labor Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="labor-cost" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Công thợ làm nguội / phút (VND)
                    </Label>
                    <div className="relative">
                      <Input
                        id="labor-cost"
                        type={isLaborFocused ? "number" : "text"}
                        value={
                          isLaborFocused
                            ? rawLaborInput
                            : `${formatVND(laborCost)}/phút`
                        }
                        onFocus={handleLaborFocus}
                        onBlur={handleLaborBlur}
                        onChange={(e) => setRawLaborInput(e.target.value)}
                        placeholder="0 đ/phút"
                        className="text-right font-mono pr-4"
                        disabled={isSubmitting}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Chi phí nhân công tháo support, xử lý bề mặt và đóng gói.
                    </span>
                  </div>

                  {/* Save button */}
                  <Button
                    type="submit"
                    disabled={!isDirty || isSubmitting}
                    className={`w-full py-2.5 font-sans font-bold shadow-md gap-2 ${
                      isDirty
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? "Đang lưu cấu hình..." : "Lưu chi phí gốc"}
                  </Button>

                  {/* Status Indicator */}
                  {!isDirty && (
                    <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground font-mono">
                      <Info className="h-3 w-3" />
                      <span>Cấu hình trùng khớp với dữ liệu máy chủ</span>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* COLUMN 2: Cost Impact Simulator (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-600 to-cyan-400" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                    <h2 className="font-mono text-base font-bold tracking-wide uppercase text-foreground">
                      Bộ Mô Phỏng Tác Động Tài Chính
                    </h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 font-mono font-bold uppercase tracking-wider">
                    Bản nháp
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Nạp trực tiếp một sản phẩm từ danh mục để chạy thử nghiệm biến đổi giá vốn (COGS)
                  và giá bán đề xuất khi bạn thay đổi các thông số vận hành ở Form bên trái.
                </p>

                {/* Dropdown product template list */}
                <div className="space-y-1.5 mb-6">
                  <Label htmlFor="product-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Chọn sản phẩm mẫu chạy thử
                  </Label>
                  <select
                    id="product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Chọn một sản phẩm mẫu --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name} ({p.material_name})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProductId ? (
                  <div className="space-y-6">
                    {/* Simulator Inputs Playground */}
                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-bold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Tinh chỉnh thông số sản phẩm mẫu</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Weight override */}
                        <div className="space-y-1">
                          <Label htmlFor="sim-weight" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Khối lượng (gram)
                          </Label>
                          <Input
                            id="sim-weight"
                            type="text"
                            value={simWeight}
                            onChange={(e) => setSimWeight(e.target.value)}
                            className="h-8 font-mono text-sm"
                          />
                        </div>

                        {/* Print Time override */}
                        <div className="space-y-1 col-span-1">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Thời gian in (Giờ:Phút)
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={simHours}
                              onChange={(e) => setSimHours(e.target.value)}
                              className="h-8 font-mono text-sm text-center px-1"
                              placeholder="h"
                              title="Giờ"
                            />
                            <span className="text-muted-foreground font-mono text-xs">:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              value={simMinutes}
                              onChange={(e) => setSimMinutes(e.target.value)}
                              className="h-8 font-mono text-sm text-center px-1"
                              placeholder="m"
                              title="Phút"
                            />
                          </div>
                        </div>

                        {/* Labor Minutes override */}
                        <div className="space-y-1">
                          <Label htmlFor="sim-labor" className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Công thợ (Phút)
                          </Label>
                          <Input
                            id="sim-labor"
                            type="number"
                            min="0"
                            value={simLaborMinutes}
                            onChange={(e) => setSimLaborMinutes(e.target.value)}
                            className="h-8 font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Comparison Side-by-Side Table */}
                    {currentPricing && draftPricing && (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-border rounded-lg bg-card/50">
                          <table className="w-full text-xs font-sans">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground text-left">
                                <th className="p-3">Thành phần chi phí</th>
                                <th className="p-3 text-right">Theo DB hiện tại</th>
                                <th className="p-3 text-right text-cyan-400">Theo Form bản nháp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {/* 1. Material cost */}
                              <tr>
                                <td className="p-3 font-medium flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Chi phí nhựa ({draftPricing.materialName})</span>
                                </td>
                                <td className="p-3 text-right font-mono">{formatVND(currentPricing.materialCost)}</td>
                                <td className="p-3 text-right font-mono text-cyan-400">{formatVND(draftPricing.materialCost)}</td>
                              </tr>
                              {/* 2. Machine depreciation */}
                              <tr>
                                <td className="p-3 font-medium flex items-center gap-1.5">
                                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Khấu hao máy in</span>
                                </td>
                                <td className="p-3 text-right font-mono">{formatVND(currentPricing.machineCost)}</td>
                                <td className="p-3 text-right font-mono text-cyan-400">{formatVND(draftPricing.machineCost)}</td>
                              </tr>
                              {/* 3. Labor cost */}
                              <tr>
                                <td className="p-3 font-medium flex items-center gap-1.5">
                                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Công thợ hoàn thiện</span>
                                </td>
                                <td className="p-3 text-right font-mono">{formatVND(currentPricing.laborCost)}</td>
                                <td className="p-3 text-right font-mono text-cyan-400">{formatVND(draftPricing.laborCost)}</td>
                              </tr>
                              {/* 4. Fixed Items */}
                              {draftPricing.fixedItemsCost > 0 && (
                                <tr>
                                  <td className="p-3 font-medium text-muted-foreground">Phụ kiện & Bao bì đóng gói</td>
                                  <td className="p-3 text-right font-mono">{formatVND(currentPricing.fixedItemsCost)}</td>
                                  <td className="p-3 text-right font-mono text-cyan-400">{formatVND(draftPricing.fixedItemsCost)}</td>
                                </tr>
                              )}
                              {/* 5. Total COGS */}
                              <tr className="bg-muted/10 font-bold border-t border-border">
                                <td className="p-3 uppercase">Giá vốn gốc (COGS)</td>
                                <td className="p-3 text-right font-mono">{formatVND(currentPricing.cogs)}</td>
                                <td className="p-3 text-right font-mono text-cyan-400">{formatVND(draftPricing.cogs)}</td>
                              </tr>
                              {/* 6. Margins information */}
                              <tr className="text-muted-foreground">
                                <td className="p-3 italic">Biên lợi nhuận áp dụng</td>
                                <td className="p-3 text-right font-mono">{(currentPricing.margin * 100).toFixed(0)}%</td>
                                <td className="p-3 text-right font-mono text-cyan-400">{(draftPricing.margin * 100).toFixed(0)}%</td>
                              </tr>
                              {/* 7. Suggested Price */}
                              <tr className="bg-primary/5 font-extrabold border-t-2 border-primary/20 text-sm">
                                <td className="p-3 uppercase text-primary">Giá bán gợi ý (Làm tròn 100đ)</td>
                                <td className="p-3 text-right font-mono text-foreground">{formatVND(currentPricing.suggestedPrice)}</td>
                                <td className="p-3 text-right font-mono text-emerald-400">{formatVND(draftPricing.suggestedPrice)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Delta Comparison cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* COGS delta */}
                          <div className="bg-card border border-border rounded-lg p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                              Biến động giá vốn (COGS)
                            </span>
                            <div className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold flex items-center justify-between ${cogsBadgeClass}`}>
                              <span>{cogsBadgeText}</span>
                            </div>
                          </div>

                          {/* Suggested Price delta */}
                          <div className="bg-card border border-border rounded-lg p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                              Biến động giá bán đề xuất
                            </span>
                            <div className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold flex items-center justify-between ${priceBadgeClass}`}>
                              <span>{priceBadgeText}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3 bg-muted/5">
                    <Info className="h-8 w-8 text-muted-foreground/60" />
                    <div>
                      <span className="text-xs font-bold text-foreground block uppercase font-mono tracking-wider">
                        Chưa chọn sản phẩm mẫu
                      </span>
                      <span className="text-xs text-muted-foreground max-w-xs block leading-relaxed mt-1">
                        Hãy chọn một sản phẩm mẫu từ danh mục ở trên để bắt đầu chạy tính toán so sánh biến động chi phí vận hành.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 3. Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-2xl min-w-72 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="text-xs font-sans font-medium flex-1 leading-tight">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
