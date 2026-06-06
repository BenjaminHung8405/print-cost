import Big from 'big.js';
import { CalculateRequestInput } from './schemas';

// Configure Big.js to use ROUND_HALF_UP (Round mode = 1)
Big.RM = 1;

/**
 * Rounds a financial value to the nearest 100 VND (Round Half-Up).
 * Throws an exception if the raw value is negative.
 */
export function roundTo100(rawValue: Big): number {
  if (rawValue.lt(0)) {
    throw new Error('LỖI HỆ THỐNG: Giá trị tài chính không được phép âm');
  }
  
  // Algorithm: Round(X / 100) * 100
  const divided = rawValue.div(100);
  const rounded = divided.round(0); 
  
  return rounded.times(100).toNumber();
}

/**
 * Calculates raw material cost (Filament cost including fail rate)
 */
export function calculateMaterialCost(weightGram: number, pricePerKg: number, failRate: number): Big {
  if (weightGram < 0 || pricePerKg < 0 || failRate < 1) {
    throw new Error('LỖI HỆ THỐNG: Các thông số chi phí vật liệu không hợp lệ');
  }
  // Formula: Weight * (Price / 1000) * FailRate
  return Big(weightGram).times(Big(pricePerKg).div(1000)).times(failRate);
}

/**
 * Calculates raw machine cost (Power + Depreciation)
 */
export function calculateMachineCost(printTimeSeconds: number, depreciationPerHour: number): Big {
  if (printTimeSeconds < 0 || depreciationPerHour < 0) {
    throw new Error('LỖI HỆ THỐNG: Các thông số chi phí máy không hợp lệ');
  }
  // Formula: (Seconds / 3600) * DepreciationPerHour
  return Big(printTimeSeconds).div(3600).times(depreciationPerHour);
}

/**
 * Calculates raw labor cost
 */
export function calculateLaborCost(laborTimeMinutes: number, laborCostPerMinute: number): Big {
  if (laborTimeMinutes < 0 || laborCostPerMinute < 0) {
    throw new Error('LỖI HỆ THỐNG: Các thông số chi phí nhân công không hợp lệ');
  }
  // Formula: Minutes * LaborCostPerMinute
  return Big(laborTimeMinutes).times(laborCostPerMinute);
}

/**
 * Calculates total raw fixed items cost (Accessories + Packaging)
 */
export function calculateFixedItemsCost(items: Array<{ cost: number; quantity: number }>): Big {
  return items.reduce((sum, item) => {
    if (item.cost < 0 || item.quantity <= 0) {
      throw new Error('LỖI HỆ THỐNG: Thông số vật tư phụ không hợp lệ');
    }
    return sum.plus(Big(item.cost).times(item.quantity));
  }, Big(0));
}

/**
 * Main function of the calculation engine.
 * Computes all component costs, Suggested Retail Price, and Final Suggested Price.
 */
export function calculateProductCosts(input: CalculateRequestInput) {
  const {
    material,
    operational_config,
    weight_gram,
    print_time_seconds,
    labor_time_minutes,
    margin_override,
    fixed_items,
    batch_quantity,
  } = input;

  const batchQty = new Big(Math.max(1, batch_quantity || 1));

  // 1. Calculate component raw costs for the batch
  const rawMaterialCostTotal = calculateMaterialCost(weight_gram, material.price_per_kg, material.fail_rate);
  const rawMachineCostTotal = calculateMachineCost(print_time_seconds, operational_config.machine_depreciation_per_hour);
  const rawLaborCostTotal = calculateLaborCost(labor_time_minutes, operational_config.labor_cost_per_minute);
  
  // 2. Divide by batch quantity to get unit costs
  const rawMaterialCost = rawMaterialCostTotal.div(batchQty);
  const rawMachineCost = rawMachineCostTotal.div(batchQty);
  const rawLaborCost = rawLaborCostTotal.div(batchQty);
  const rawFixedItemsCost = calculateFixedItemsCost(fixed_items); // Already unit-level

  // 3. Calculate Raw Unit COGS
  const rawUnitCogs = rawMaterialCost
    .plus(rawMachineCost)
    .plus(rawLaborCost)
    .plus(rawFixedItemsCost);

  // 4. Determine the margin to use
  const margin = margin_override !== undefined && margin_override !== null
    ? margin_override
    : material.default_margin;

  if (margin === 1.0) {
    throw new Error('LỖI HỆ THỐNG: Biên lợi nhuận không được phép bằng 1.00 (100%)');
  }

  // 5. Suggested retail price before rounding
  // Formula: Raw Unit COGS / (1 - Margin)
  const rawSuggestedPrice = rawUnitCogs.div(Big(1).minus(margin));

  // 6. Final Suggested Price (rounded to nearest 100)
  const finalSuggestedPrice = roundTo100(rawSuggestedPrice);

  // Return clean JS numbers matching database decimal precision (NUMERIC(12, 4) for raw values)
  return {
    raw_material_cost: Number(rawMaterialCost.toFixed(4)),
    raw_machine_cost: Number(rawMachineCost.toFixed(4)),
    raw_labor_cost: Number(rawLaborCost.toFixed(4)),
    raw_fixed_items_cost: Number(rawFixedItemsCost.toFixed(4)),
    raw_unit_cogs: Number(rawUnitCogs.toFixed(4)),
    raw_suggested_price: Number(rawSuggestedPrice.toFixed(4)),
    final_suggested_price: finalSuggestedPrice,
    applied_margin: margin,
  };
}
