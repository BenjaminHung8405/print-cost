import Big from 'big.js';

// Global Round Half-Up configuration for Big.js
Big.RM = 1;

export interface CalculateInput {
  weight_gram: number;
  price_per_kg: number;
  fail_rate: number;
  print_time_seconds: number;
  machine_depreciation_per_hour: number;
  labor_time_minutes: number;
  labor_cost_per_minute: number;
  fixed_items: { cost: number; quantity: number }[];
  margin_override?: number | null;
  default_margin: number;
  batch_quantity?: number;
}

/**
 * Rounds a financial value to the nearest 100 VND (Round Half-Up).
 * Throws an exception if the raw value is negative.
 */
export function roundTo100(rawValue: Big): number {
  if (rawValue.lt(0)) {
    throw new Error('LỖI HỆ THỐNG: Giá trị tài chính không được phép âm');
  }
  const divided = rawValue.div(100);
  const rounded = divided.round(0); // Big.RM = 1 (ROUND_HALF_UP)
  return rounded.times(100).toNumber();
}

/**
 * Main pricing engine function on the client.
 * Computes all constituent costs, Suggested Retail Price, and Final Suggested Price.
 */
export const calculateProductCosts = (input: CalculateInput) => {
  // Ensure non-negative defensive inputs
  const weight = new Big(Math.max(0, input.weight_gram));
  const pricePerKg = new Big(Math.max(0, input.price_per_kg));
  const failRate = new Big(Math.max(1, input.fail_rate));
  const printSeconds = new Big(Math.max(0, input.print_time_seconds));
  const deprPerHour = new Big(Math.max(0, input.machine_depreciation_per_hour));
  const laborMinutes = new Big(Math.max(0, input.labor_time_minutes));
  const laborCostPerMin = new Big(Math.max(0, input.labor_cost_per_minute));
  const batchQty = new Big(Math.max(1, input.batch_quantity || 1));

  // 1. Chi phí vật liệu mẻ: Trọng lượng * (Giá 1kg / 1000) * Hệ số hỏng
  const rawMaterialCostTotal = weight.times(pricePerKg.div(1000)).times(failRate);
  const rawMaterialCost = rawMaterialCostTotal.div(batchQty);

  // 2. Chi phí máy mẻ: (Số giây in / 3600) * Khấu hao giờ
  const rawMachineCostTotal = printSeconds.div(3600).times(deprPerHour);
  const rawMachineCost = rawMachineCostTotal.div(batchQty);

  // 3. Chi phí nhân công mẻ: Số phút * Giá mỗi phút
  const rawLaborCostTotal = laborMinutes.times(laborCostPerMin);
  const rawLaborCost = rawLaborCostTotal.div(batchQty);

  // 4. Chi phí phụ kiện đính kèm (Tính theo đơn vị sản phẩm nên không chia lô)
  const rawFixedItemsCost = input.fixed_items.reduce((sum, item) => {
    const cost = new Big(Math.max(0, item.cost));
    const qty = new Big(Math.max(0, item.quantity));
    return sum.plus(cost.times(qty));
  }, new Big(0));

  // 5. TỔNG GIÁ VỐN ĐƠN VỊ (COGS)
  const totalCOGS = rawMaterialCost
    .plus(rawMachineCost)
    .plus(rawLaborCost)
    .plus(rawFixedItemsCost);

  // 6. Xác định Biên lợi nhuận áp dụng (Margin Override or Default)
  const appliedMargin =
    input.margin_override !== undefined && input.margin_override !== null
      ? input.margin_override
      : input.default_margin;

  // 7. Tính Giá bán gợi ý (Bảo vệ lỗi chia cho 0)
  let suggestedPrice = new Big(0);
  let finalUnitPrice = 0;

  if (appliedMargin < 1) {
    suggestedPrice = totalCOGS.div(new Big(1).minus(appliedMargin));
    // Gọi hàm làm tròn Half-Up về 100đ gần nhất
    finalUnitPrice = roundTo100(suggestedPrice);
  }

  return {
    rawMaterialCost: Number(rawMaterialCost.toFixed(4)),
    rawMachineCost: Number(rawMachineCost.toFixed(4)),
    rawLaborCost: Number(rawLaborCost.toFixed(4)),
    rawFixedItemsCost: Number(rawFixedItemsCost.toFixed(4)),
    totalCOGS: Number(totalCOGS.toFixed(4)),
    appliedMargin,
    suggestedPrice: Number(suggestedPrice.toFixed(4)),
    finalUnitPrice, // Con số to màu xanh lục bảo hiển thị trên UI
  };
};
