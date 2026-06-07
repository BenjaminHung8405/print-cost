import Big from 'big.js';
import type { ApiProduct, ApiOperationalConfigs } from '@/core/api/client';

// Configure Big.js rounding globally: ROUND_HALF_UP (mode 1) per DB Schema V4
Big.RM = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Re-export ApiProduct as the canonical ProductTemplate shape used across UI
// ─────────────────────────────────────────────────────────────────────────────
export type { ApiProduct as ProductTemplate } from '@/core/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format Vietnamese Dong with thousands separator.
 * Example: 24900 → "24.900 đ"
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert seconds to human-readable hours/minutes string.
 * Example: 5700 → "1h 35m"
 */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Convert hours + minutes to total seconds for API payloads.
 */
export function toSeconds(hours: number, minutes: number): number {
  return hours * 3600 + minutes * 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUNDING — mirrors DB function round_to_100 (Round Half-Up to nearest 100 VND)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round a Big value to the nearest 100 VND (ROUND_HALF_UP).
 * Throws if the value is negative (mirrors DB constraint).
 */
export function roundTo100(rawValue: Big): number {
  if (rawValue.lt(0)) {
    throw new Error('LỖI HỆ THỐNG: Giá trị tài chính không được phép âm');
  }
  // Big.RM = 1 (ROUND_HALF_UP) is set globally
  return rawValue.div(100).round(0).times(100).toNumber();
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING CALCULATIONS
// All intermediate calculations use big.js to avoid floating-point drift.
// Only the final suggested price (or custom override) is rounded to 100 VND.
// ─────────────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  rawMaterialCost: number;
  rawMachineCost: number;
  rawLaborCost: number;
  rawFixedItemsCost: number; // real accumulated fixed items cost from DB
  rawCOGS: number;
  margin: number;
  rawRetailPrice: number;
  finalRetailPrice: number;
}

export interface MaterialConfig {
  price_per_kg: number;
  fail_rate: number;
  default_margin: number;
}

/**
 * Primary calculation function.
 * Pass the resolved material config alongside the product and operational configs.
 *
 * @param product       Full ApiProduct returned from GET /api/products
 * @param materialConfig Resolved material properties (price, fail rate, margin)
 * @param configs       Operational configs from GET /api/operational-configs
 * @param overridePrintTimeSeconds  Optional print time override (seconds)
 * @param overridePrice Optional explicit price override (will be rounded to 100 VND)
 */
export function calculateItemCostsWithMaterial(
  product: ApiProduct,
  materialConfig: MaterialConfig,
  configs: ApiOperationalConfigs,
  overridePrintTimeSeconds?: number,
  overridePrice?: number
): CostBreakdown {
  const printTime = overridePrintTimeSeconds ?? product.print_time_seconds;

  const weightGram  = new Big(product.weight_gram);
  const pricePerKg  = new Big(materialConfig.price_per_kg);
  const failRate    = new Big(materialConfig.fail_rate);
  const printSecs   = new Big(printTime);
  const laborMins   = new Big(product.labor_time_minutes);
  const machineRate = new Big(configs.machine_depreciation_per_hour);
  const laborRate   = new Big(configs.labor_cost_per_minute);

  // Formula 1: Raw Material Cost = weight_g × (price_per_kg / 1000) × fail_rate
  const rawMaterialCost = weightGram.times(pricePerKg.div(1000)).times(failRate);

  // Formula 2: Raw Machine Cost = (print_time_seconds / 3600) × depreciation_per_hour
  const rawMachineCost = printSecs.div(3600).times(machineRate);

  // Formula 3: Raw Labor Cost = labor_time_minutes × labor_cost_per_minute
  const rawLaborCost = laborMins.times(laborRate);

  // Formula 4: Raw Fixed Items Cost = Σ (fixed_item.cost × fixed_item.quantity)
  // Uses ACTUAL costs from DB (not a hardcoded 2400 VND constant)
  const rawFixedItemsCost = product.fixed_items.reduce((acc, fi) => {
    return acc.plus(new Big(fi.cost).times(fi.quantity));
  }, new Big(0));

  // Formula 5: Raw Unit COGS
  const rawCOGS = rawMaterialCost
    .plus(rawMachineCost)
    .plus(rawLaborCost)
    .plus(rawFixedItemsCost);

  // Formula 6: Margin (product override takes precedence over material default)
  const margin =
    product.margin_override !== null && product.margin_override !== undefined
      ? product.margin_override
      : materialConfig.default_margin;
  const marginBig = new Big(margin);

  // Formula 7: Raw Retail Price = rawCOGS / (1 - margin)
  const rawRetailPrice = rawCOGS.div(new Big(1).minus(marginBig));

  // Formula 8: Final Retail Price — round to 100 VND (ROUND_HALF_UP) unless overridden
  const finalRetailPrice = overridePrice !== undefined && overridePrice !== null
    ? roundTo100(new Big(overridePrice))
    : roundTo100(rawRetailPrice);

  return {
    rawMaterialCost:   rawMaterialCost.toNumber(),
    rawMachineCost:    rawMachineCost.toNumber(),
    rawLaborCost:      rawLaborCost.toNumber(),
    rawFixedItemsCost: rawFixedItemsCost.toNumber(),
    rawCOGS:           rawCOGS.toNumber(),
    margin,
    rawRetailPrice:    rawRetailPrice.toNumber(),
    finalRetailPrice,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER-LEVEL TOTALS
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productId: string; // string because it comes from Select component value
  quantity: number;
  overridePrintTimeSeconds?: number;
  overridePrice?: number;
  overrideMargin?: number | null;
  useMarginOverride?: boolean;
}

export interface OrderTotals {
  totalMaterialCost: number;
  totalMachineCost: number;
  totalLaborCost: number;
  totalFixedItemsCost: number;
  totalCOGS: number;
  totalPrice: number;
  totalPrintTimeSeconds: number;
  items: {
    id: string;
    productId: string;
    final_unit_price: number;
    total_item_price: number;
    raw_unit_cogs: number;
    applied_margin: number;
    safety_margin: number;
    is_below_safety: boolean;
  }[];
  is_bulk_pricing: boolean;
}

export function calculateOrderTotals(
  items: OrderItem[],
  products: ApiProduct[],
  materialMap: Record<number, MaterialConfig>,
  configs: ApiOperationalConfigs,
  orderMarginOverride?: number | null
): OrderTotals {
  let totalMaterialCost    = new Big(0);
  let totalMachineCost     = new Big(0);
  let totalLaborCost       = new Big(0);
  let totalFixedItemsCost  = new Big(0);
  let totalCOGS            = new Big(0);
  let totalPrice           = new Big(0);
  let totalPrintTimeSeconds = 0;

  const processedItems: OrderTotals['items'] = [];

  for (const item of items) {
    const product = products.find(p => String(p.id) === item.productId);
    if (!product) continue;

    const matConfig = materialMap[product.material_id];
    if (!matConfig) continue;

    const costs = calculateItemCostsWithMaterial(
      product,
      matConfig,
      configs,
      item.overridePrintTimeSeconds,
      item.overridePrice
    );

    const qty = new Big(item.quantity);
    const printTime = item.overridePrintTimeSeconds ?? product.print_time_seconds;

    totalMaterialCost   = totalMaterialCost.plus(new Big(costs.rawMaterialCost).times(qty));
    totalMachineCost    = totalMachineCost.plus(new Big(costs.rawMachineCost).times(qty));
    totalLaborCost      = totalLaborCost.plus(new Big(costs.rawLaborCost).times(qty));
    totalFixedItemsCost = totalFixedItemsCost.plus(new Big(costs.rawFixedItemsCost).times(qty));
    
    const rawCOGS = new Big(costs.rawCOGS);
    totalCOGS = totalCOGS.plus(rawCOGS.times(qty));

    // Margin determination and rounding
    let finalUnitPrice: number;
    let appliedMargin: number;

    if (item.useMarginOverride && item.overrideMargin !== undefined && item.overrideMargin !== null) {
      appliedMargin = item.overrideMargin;
      const rawSuggested = rawCOGS.div(new Big(1).minus(new Big(appliedMargin)));
      finalUnitPrice = roundTo100(rawSuggested);
    } else if (item.overridePrice !== undefined && item.overridePrice !== null) {
      // Individual item price override takes precedence
      finalUnitPrice = roundTo100(new Big(item.overridePrice));
      if (finalUnitPrice > 0 && rawCOGS.gt(0)) {
        appliedMargin = new Big(1).minus(rawCOGS.div(new Big(finalUnitPrice))).round(4).toNumber();
      } else {
        appliedMargin = 0;
      }
    } else if (orderMarginOverride !== undefined && orderMarginOverride !== null) {
      appliedMargin = orderMarginOverride;
      const rawSuggested = rawCOGS.div(new Big(1).minus(new Big(appliedMargin)));
      finalUnitPrice = roundTo100(rawSuggested);
    } else {
      appliedMargin = costs.margin;
      finalUnitPrice = costs.finalRetailPrice;
    }

    const totalItemPrice = new Big(finalUnitPrice).times(qty);
    totalPrice = totalPrice.plus(totalItemPrice);
    totalPrintTimeSeconds += printTime * item.quantity;

    const safetyMargin = product.margin_override ?? matConfig.default_margin;
    const isBelowSafety = appliedMargin < safetyMargin;

    processedItems.push({
      id: item.id,
      productId: item.productId,
      final_unit_price: finalUnitPrice,
      total_item_price: totalItemPrice.toNumber(),
      raw_unit_cogs: rawCOGS.toNumber(),
      applied_margin: appliedMargin,
      safety_margin: safetyMargin,
      is_below_safety: isBelowSafety,
    });
  }

  return {
    totalMaterialCost:    totalMaterialCost.toNumber(),
    totalMachineCost:     totalMachineCost.toNumber(),
    totalLaborCost:       totalLaborCost.toNumber(),
    totalFixedItemsCost:  totalFixedItemsCost.toNumber(),
    totalCOGS:            totalCOGS.toNumber(),
    totalPrice:           totalPrice.toNumber(),
    totalPrintTimeSeconds,
    items: processedItems,
    is_bulk_pricing: orderMarginOverride !== undefined && orderMarginOverride !== null,
  };
}
