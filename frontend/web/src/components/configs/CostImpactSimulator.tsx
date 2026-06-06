"use client";

import React, { useState, useEffect } from "react";
import Big from "big.js";
import {
  TrendingUp,
  Sparkles,
  Layers,
  Cpu,
  Coins,
  Info,
  Package,
} from "lucide-react";
import {
  ApiOperationalConfigs,
  ApiProduct,
  ApiMaterial,
} from "@/core/api/client";
import { formatVND, parseFloatDecimal } from "@/core/utils/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Configure Big.js globally for this module
Big.RM = 1; // ROUND_HALF_UP

interface Props {
  /** Configs đã lưu trên DB (baseline để so sánh) */
  dbConfigs: ApiOperationalConfigs;
  /** Configs đang được draft trên form (để tính delta) */
  draftConfigs: ApiOperationalConfigs;
  /** Danh sách sản phẩm để chọn làm mẫu */
  products: ApiProduct[];
  /** Danh sách vật liệu để tra cứu price_per_kg & fail_rate */
  materials: ApiMaterial[];
  /** isDirty từ form cha — dùng để kiểm soát hiển thị delta */
  isDirty: boolean;
}

interface PricingBreakdown {
  materialCost: number;
  machineCost: number;
  laborCost: number;
  fixedItemsCost: number;
  cogs: number;
  suggestedPrice: number;
  margin: number;
  materialName: string;
}

function computePricing(
  product: ApiProduct,
  material: ApiMaterial,
  configs: ApiOperationalConfigs,
  overrides: { weight: string; hours: string; minutes: string; laborMinutes: string }
): PricingBreakdown {
  const weightVal = parseFloatDecimal(overrides.weight) || 0;
  const hoursVal = parseInt(overrides.hours, 10) || 0;
  const minutesVal = parseInt(overrides.minutes, 10) || 0;
  const totalSeconds = hoursVal * 3600 + minutesVal * 60;
  const laborMinutesVal = parseInt(overrides.laborMinutes, 10) || 0;

  const pricePerKgBig = new Big(material.price_per_kg);
  const failRateBig = new Big(material.fail_rate);
  const weightBig = new Big(weightVal);
  const printTimeSecsBig = new Big(totalSeconds);
  const laborMinutesBig = new Big(laborMinutesVal);

  // 1. Raw Material Cost = Weight * (PricePerKg / 1000) * FailRate
  const matCost = weightBig.times(pricePerKgBig.div(1000)).times(failRateBig);

  // 2. Raw Machine Cost = (Seconds / 3600) * DepreciationPerHour
  const machCost = printTimeSecsBig
    .div(3600)
    .times(new Big(configs.machine_depreciation_per_hour));

  // 3. Raw Labor Cost = LaborMinutes * LaborCostPerMinute
  const labCost = laborMinutesBig.times(new Big(configs.labor_cost_per_minute));

  // 4. Fixed Items Cost (sum across attached items)
  let fixedCostBig = new Big(0);
  if (product.fixed_items && product.fixed_items.length > 0) {
    product.fixed_items.forEach((item) => {
      fixedCostBig = fixedCostBig.plus(new Big(item.cost).times(item.quantity));
    });
  }

  // 5. Total COGS
  const totalCogs = matCost.plus(machCost).plus(labCost).plus(fixedCostBig);

  // 6. Suggested Price (round to nearest 100 VND — roundTo100)
  const margin = product.margin_override ?? material.default_margin;
  let finalPrice = 0;
  if (margin < 1) {
    const rawPrice = totalCogs.div(new Big(1).sub(margin));
    finalPrice = rawPrice.div(100).round(0).times(100).toNumber();
  }

  return {
    materialCost: matCost.toNumber(),
    machineCost: machCost.toNumber(),
    laborCost: labCost.toNumber(),
    fixedItemsCost: fixedCostBig.toNumber(),
    cogs: totalCogs.toNumber(),
    suggestedPrice: finalPrice,
    margin,
    materialName: material.name,
  };
}

export function CostImpactSimulator({
  dbConfigs,
  draftConfigs,
  products,
  materials,
  isDirty,
}: Props) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [simWeight, setSimWeight] = useState<string>("");
  const [simHours, setSimHours] = useState<string>("");
  const [simMinutes, setSimMinutes] = useState<string>("");
  const [simLaborMinutes, setSimLaborMinutes] = useState<string>("");

  // Auto-populate when product selection changes
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
      setSimHours(Math.floor(product.print_time_seconds / 3600).toString());
      setSimMinutes(
        Math.floor((product.print_time_seconds % 3600) / 60).toString()
      );
      setSimLaborMinutes(product.labor_time_minutes.toString());
    }
  }, [selectedProductId, products]);

  const overrides = {
    weight: simWeight,
    hours: simHours,
    minutes: simMinutes,
    laborMinutes: simLaborMinutes,
  };

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id.toString() === selectedProductId)
    : null;
  const selectedMaterial = selectedProduct
    ? materials.find((m) => m.id === selectedProduct.material_id)
    : null;

  const dbPricing =
    selectedProduct && selectedMaterial
      ? computePricing(selectedProduct, selectedMaterial, dbConfigs, overrides)
      : null;

  const draftPricing =
    selectedProduct && selectedMaterial
      ? computePricing(selectedProduct, selectedMaterial, draftConfigs, overrides)
      : null;

  // Compute deltas (only meaningful when form is dirty)
  const cogsDelta =
    dbPricing && draftPricing && isDirty
      ? new Big(draftPricing.cogs).sub(dbPricing.cogs)
      : new Big(0);

  const priceDelta =
    dbPricing && draftPricing && isDirty
      ? new Big(draftPricing.suggestedPrice).sub(dbPricing.suggestedPrice)
      : new Big(0);

  // Badge styling helpers
  const cogsBadge = (() => {
    if (isDirty && cogsDelta.gt(0))
      return {
        cls: "text-rose-400 bg-rose-950/30 border border-rose-800/50",
        txt: `+${formatVND(cogsDelta.toNumber())} (Chi phí tăng)`,
      };
    if (isDirty && cogsDelta.lt(0))
      return {
        cls: "text-emerald-400 bg-emerald-950/30 border border-emerald-800/50",
        txt: `${formatVND(cogsDelta.toNumber())} (Tối ưu chi phí)`,
      };
    return {
      cls: "text-zinc-400 bg-zinc-800/50 border border-zinc-700/50",
      txt: "0 đ (Không thay đổi)",
    };
  })();

  const priceBadge = (() => {
    if (isDirty && priceDelta.gt(0))
      return {
        cls: "text-rose-400 bg-rose-950/30 border border-rose-800/50",
        txt: `+${formatVND(priceDelta.toNumber())} (Giá tăng)`,
      };
    if (isDirty && priceDelta.lt(0))
      return {
        cls: "text-emerald-400 bg-emerald-950/30 border border-emerald-800/50",
        txt: `${formatVND(priceDelta.toNumber())} (Giá giảm)`,
      };
    return {
      cls: "text-zinc-400 bg-zinc-800/50 border border-zinc-700/50",
      txt: "0 đ (Không thay đổi)",
    };
  })();

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Accent top bar */}
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
        Nạp trực tiếp một sản phẩm từ danh mục để chạy thử nghiệm biến đổi
        giá vốn (COGS) và giá bán đề xuất khi bạn thay đổi các thông số vận
        hành ở Form bên trái.
      </p>

      {/* Product dropdown */}
      <div className="space-y-1.5 mb-6">
        <Label
          htmlFor="sim-product-select"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Chọn sản phẩm mẫu chạy thử
        </Label>
        <select
          id="sim-product-select"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:border-cyan-500 text-foreground"
        >
          <option value="">-- Chọn một sản phẩm mẫu --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id.toString()}>
              {p.name} ({p.material_name})
            </option>
          ))}
        </select>
      </div>

      {selectedProductId && dbPricing && draftPricing ? (
        <div className="space-y-6">
          {/* Parameter override inputs */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tinh chỉnh thông số sản phẩm mẫu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Weight */}
              <div className="space-y-1">
                <Label
                  htmlFor="sim-weight"
                  className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider"
                >
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

              {/* Print time HH:MM */}
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

              {/* Labor minutes */}
              <div className="space-y-1">
                <Label
                  htmlFor="sim-labor"
                  className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider"
                >
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

          {/* Comparison table */}
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
                {/* Material */}
                <tr>
                  <td className="p-3 font-medium flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Chi phí nhựa ({draftPricing.materialName})</span>
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight">
                    {formatVND(dbPricing.materialCost)}
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                    {formatVND(draftPricing.materialCost)}
                  </td>
                </tr>
                {/* Machine */}
                <tr>
                  <td className="p-3 font-medium flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Khấu hao máy in</span>
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight">
                    {formatVND(dbPricing.machineCost)}
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                    {formatVND(draftPricing.machineCost)}
                  </td>
                </tr>
                {/* Labor */}
                <tr>
                  <td className="p-3 font-medium flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Công thợ hoàn thiện</span>
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight">
                    {formatVND(dbPricing.laborCost)}
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                    {formatVND(draftPricing.laborCost)}
                  </td>
                </tr>
                {/* Fixed items (only if present) */}
                {draftPricing.fixedItemsCost > 0 && (
                  <tr>
                    <td className="p-3 font-medium flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5 shrink-0" />
                      <span>Phụ kiện & Bao bì đóng gói</span>
                    </td>
                    <td className="p-3 text-right font-mono tracking-tight">
                      {formatVND(dbPricing.fixedItemsCost)}
                    </td>
                    <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                      {formatVND(draftPricing.fixedItemsCost)}
                    </td>
                  </tr>
                )}
                {/* COGS */}
                <tr className="bg-muted/10 font-bold border-t border-border">
                  <td className="p-3 uppercase">Giá vốn gốc (COGS)</td>
                  <td className="p-3 text-right font-mono tracking-tight">
                    {formatVND(dbPricing.cogs)}
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                    {formatVND(draftPricing.cogs)}
                  </td>
                </tr>
                {/* Margin */}
                <tr className="text-muted-foreground">
                  <td className="p-3 italic">Biên lợi nhuận áp dụng</td>
                  <td className="p-3 text-right font-mono tracking-tight">
                    {(dbPricing.margin * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-cyan-400">
                    {(draftPricing.margin * 100).toFixed(0)}%
                  </td>
                </tr>
                {/* Suggested price */}
                <tr className="bg-primary/5 font-extrabold border-t-2 border-primary/20 text-sm">
                  <td className="p-3 uppercase text-primary">
                    Giá bán gợi ý (Làm tròn 100đ)
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-foreground">
                    {formatVND(dbPricing.suggestedPrice)}
                  </td>
                  <td className="p-3 text-right font-mono tracking-tight text-emerald-400">
                    {formatVND(draftPricing.suggestedPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Delta badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                Biến động giá vốn (COGS)
              </span>
              <div
                className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold tracking-tight ${cogsBadge.cls}`}
              >
                {cogsBadge.txt}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                Biến động giá bán đề xuất
              </span>
              <div
                className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold tracking-tight ${priceBadge.cls}`}
              >
                {priceBadge.txt}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3 bg-muted/5">
          <Info className="h-8 w-8 text-muted-foreground/60" />
          <div>
            <span className="text-xs font-bold text-foreground block uppercase font-mono tracking-wider">
              Chưa chọn sản phẩm mẫu
            </span>
            <span className="text-xs text-muted-foreground max-w-xs block leading-relaxed mt-1">
              Hãy chọn một sản phẩm mẫu từ danh mục ở trên để bắt đầu chạy
              tính toán so sánh biến động chi phí vận hành.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
