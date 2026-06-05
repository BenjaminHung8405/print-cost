import Big from 'big.js';

// ===============================
// SEED DATA (matching DB Schema V4)
// TODO: Replace these constants with API calls when backend endpoints are ready.
// GET /api/materials   → MATERIALS
// GET /api/templates   → PRODUCT_TEMPLATES
// GET /api/config      → MACHINE_DEPRECIATION_PER_HOUR, LABOR_COST_PER_MINUTE, DEFAULT_PACKAGING_COST
// ===============================

export const MATERIALS: Record<string, {
  price_per_kg: number;
  fail_rate: number;
  default_margin: number;
}> = {
  PLA:  { price_per_kg: 250000, fail_rate: 1.10, default_margin: 0.40 },
  PETG: { price_per_kg: 203000, fail_rate: 1.00, default_margin: 0.30 },
  ABS:  { price_per_kg: 280000, fail_rate: 1.15, default_margin: 0.35 },
  TPU:  { price_per_kg: 350000, fail_rate: 1.05, default_margin: 0.45 },
};

export const MACHINE_DEPRECIATION_PER_HOUR = 5000; // VND/hour
export const LABOR_COST_PER_MINUTE = 500;          // VND/minute
export const DEFAULT_PACKAGING_COST = 2400;        // VND per item

export interface ProductTemplate {
  id: string;
  name: string;
  material: keyof typeof MATERIALS;
  weightGram: number;
  printTimeSeconds: number;
  laborMinutes: number;
  marginOverride: number | null;
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { id: "1", name: "Keycap (PLA)",           material: "PLA",  weightGram: 16.88, printTimeSeconds: 5700,  laborMinutes: 0,  marginOverride: null },
  { id: "2", name: "Phone Case (PETG)",      material: "PETG", weightGram: 40.0,  printTimeSeconds: 7200,  laborMinutes: 10, marginOverride: null },
  { id: "3", name: "Miniature Figure (PLA)", material: "PLA",  weightGram: 25.0,  printTimeSeconds: 10800, laborMinutes: 15, marginOverride: null },
  { id: "4", name: "Artistic Bust (ABS)",    material: "ABS",  weightGram: 150.0, printTimeSeconds: 28800, laborMinutes: 30, marginOverride: 0.50 },
  { id: "5", name: "Custom Project (TPU)",   material: "TPU",  weightGram: 100.0, printTimeSeconds: 21600, laborMinutes: 20, marginOverride: null },
];

// ===============================
// CURRENCY FORMATTING
// ===============================

/**
 * Format Vietnamese Dong with thousands separator as period.
 * Example: 24900 → "24.900 đ"
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
}

// ===============================
// TIME FORMATTING
// ===============================

/**
 * Convert seconds to hours and minutes string.
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
 * Convert hours and minutes to total seconds.
 */
export function toSeconds(hours: number, minutes: number): number {
  return (hours * 3600) + (minutes * 60);
}

// ===============================
// PRICING CALCULATIONS (using big.js for precision)
// All intermediate calculations use Big to avoid floating-point drift.
// Final price is rounded to nearest 100 VND (ROUND_HALF_UP) per DB Schema V4 spec.
// ===============================

export interface CostBreakdown {
  rawMaterialCost: number;
  rawMachineCost: number;
  rawLaborCost: number;
  rawPackagingCost: number;
  rawCOGS: number;
  margin: number;
  rawRetailPrice: number;
  finalRetailPrice: number;
}

export function calculateItemCosts(
  product: ProductTemplate,
  overridePrintTimeSeconds?: number,
  overridePrice?: number
): CostBreakdown {
  const materialConfig = MATERIALS[product.material];
  const printTime = overridePrintTimeSeconds ?? product.printTimeSeconds;

  // Use big.js for all intermediate calculations
  const weightGram = new Big(product.weightGram);
  const pricePerKg = new Big(materialConfig.price_per_kg);
  const failRate = new Big(materialConfig.fail_rate);
  const printSeconds = new Big(printTime);
  const laborMinutes = new Big(product.laborMinutes);
  const machineRate = new Big(MACHINE_DEPRECIATION_PER_HOUR);
  const laborRate = new Big(LABOR_COST_PER_MINUTE);
  const packagingCost = new Big(DEFAULT_PACKAGING_COST);

  // Raw Material Cost = weight_g × (price_per_kg / 1000) × fail_rate
  const rawMaterialCost = weightGram
    .times(pricePerKg.div(1000))
    .times(failRate);

  // Raw Machine Cost = (print_time_seconds / 3600) × 5000
  const rawMachineCost = printSeconds
    .div(3600)
    .times(machineRate);

  // Raw Labor Cost = labor_minutes × 500
  const rawLaborCost = laborMinutes.times(laborRate);

  // Raw COGS = rawMaterialCost + rawMachineCost + rawLaborCost + 2400
  const rawCOGS = rawMaterialCost
    .plus(rawMachineCost)
    .plus(rawLaborCost)
    .plus(packagingCost);

  // Margin = product.marginOverride ?? material.default_margin
  const margin = product.marginOverride ?? materialConfig.default_margin;
  const marginBig = new Big(margin);

  // Raw Retail Price = rawCOGS / (1 - margin)
  const rawRetailPrice = rawCOGS.div(new Big(1).minus(marginBig));

  // Round to nearest 100 VND (ROUND_HALF_UP)
  const finalRetailPrice = overridePrice
    ? overridePrice
    : Math.round(rawRetailPrice.toNumber() / 100) * 100;

  return {
    rawMaterialCost: rawMaterialCost.toNumber(),
    rawMachineCost: rawMachineCost.toNumber(),
    rawLaborCost: rawLaborCost.toNumber(),
    rawPackagingCost: packagingCost.toNumber(),
    rawCOGS: rawCOGS.toNumber(),
    margin,
    rawRetailPrice: rawRetailPrice.toNumber(),
    finalRetailPrice,
  };
}

/**
 * Calculate total costs for multiple items with quantities.
 */
export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  overridePrintTimeSeconds?: number;
  overridePrice?: number;
}

export interface OrderTotals {
  totalMaterialCost: number;
  totalMachineCost: number;
  totalLaborCost: number;
  totalPackagingCost: number;
  totalCOGS: number;
  totalPrice: number;
  totalPrintTimeSeconds: number;
}

export function calculateOrderTotals(items: OrderItem[]): OrderTotals {
  let totalMaterialCost = new Big(0);
  let totalMachineCost = new Big(0);
  let totalLaborCost = new Big(0);
  let totalPackagingCost = new Big(0);
  let totalCOGS = new Big(0);
  let totalPrice = new Big(0);
  let totalPrintTimeSeconds = 0;

  for (const item of items) {
    const product = PRODUCT_TEMPLATES.find(p => p.id === item.productId);
    if (!product) continue;

    const costs = calculateItemCosts(
      product,
      item.overridePrintTimeSeconds,
      item.overridePrice
    );
    const qty = new Big(item.quantity);
    const printTime = item.overridePrintTimeSeconds ?? product.printTimeSeconds;

    totalMaterialCost = totalMaterialCost.plus(new Big(costs.rawMaterialCost).times(qty));
    totalMachineCost = totalMachineCost.plus(new Big(costs.rawMachineCost).times(qty));
    totalLaborCost = totalLaborCost.plus(new Big(costs.rawLaborCost).times(qty));
    totalPackagingCost = totalPackagingCost.plus(new Big(costs.rawPackagingCost).times(qty));
    totalCOGS = totalCOGS.plus(new Big(costs.rawCOGS).times(qty));
    totalPrice = totalPrice.plus(new Big(costs.finalRetailPrice).times(qty));
    totalPrintTimeSeconds += printTime * item.quantity;
  }

  return {
    totalMaterialCost: totalMaterialCost.toNumber(),
    totalMachineCost: totalMachineCost.toNumber(),
    totalLaborCost: totalLaborCost.toNumber(),
    totalPackagingCost: totalPackagingCost.toNumber(),
    totalCOGS: totalCOGS.toNumber(),
    totalPrice: totalPrice.toNumber(),
    totalPrintTimeSeconds,
  };
}
