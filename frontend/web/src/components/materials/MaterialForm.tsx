"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiMaterial, ApiOperationalConfigs, createMaterial, updateMaterial } from "@/core/api/client";
import { formatDecimal, formatVND, parseFloatDecimal, parseVNDInteger } from "@/core/utils/format";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Big from "big.js";
import { AlertTriangle, Coins, Cpu, Sparkles, TrendingUp, X } from "lucide-react";
import React, { useEffect, useState } from "react";

// Configure Big.js to round half-up globally (RM = 1)
Big.RM = 1;

interface MaterialFormProps {
  isOpen: boolean;
  materialData?: ApiMaterial | null; // Null means creating new
  operationalConfigs: ApiOperationalConfigs;
  otherMaterials: ApiMaterial[];
  onClose: () => void;
  onSave: () => void;
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

interface SimulationParams {
  weightGram: string;
  printTimeHours: string;
  printTimeMinutes: string;
  laborTimeMinutes: string;
}

export function MaterialForm({
  isOpen,
  materialData,
  operationalConfigs,
  otherMaterials,
  onClose,
  onSave,
  onSuccessMessage,
  onErrorMessage,
}: MaterialFormProps) {
  // Form input states (UI scale: defaultMargin in %)
  const [name, setName] = useState(materialData?.name || "");
  const [pricePerKg, setPricePerKg] = useState(materialData?.price_per_kg || 0);
  const [failRate, setFailRate] = useState(materialData?.fail_rate?.toString() || "1.10");
  const [defaultMargin, setDefaultMargin] = useState(
    materialData ? Math.round(materialData.default_margin * 100) : 40
  );

  // Price input focus state
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [rawPriceInput, setRawPriceInput] = useState(materialData?.price_per_kg?.toString() || "0");

  // Fail rate input focus state
  const [isFailRateFocused, setIsFailRateFocused] = useState(false);
  const [rawFailRateInput, setRawFailRateInput] = useState(materialData?.fail_rate?.toString() || "1.10");

  // Loading/submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Playground simulation parameters (State 2)
  // Default values loaded from Keycap preset baseline
  const [simParams, setSimParams] = useState<SimulationParams>({
    weightGram: "16.88",
    printTimeHours: "1",
    printTimeMinutes: "35",
    laborTimeMinutes: "0",
  });

  // Calculation Results state (State 3)
  const [simResult, setSimResult] = useState({
    materialCost: 0,
    machineCost: 0,
    laborCost: 0,
    cogs: 0,
    suggestedPrice: 0,
  });

  // Sync state if materialData changes
  useEffect(() => {
    setName(materialData?.name || "");
    setPricePerKg(materialData?.price_per_kg || 0);
    setRawPriceInput(materialData?.price_per_kg?.toString() || "0");
    setFailRate(materialData?.fail_rate?.toString() || "1.10");
    setRawFailRateInput(materialData?.fail_rate?.toString() || "1.10");
    setDefaultMargin(materialData ? Math.round(materialData.default_margin * 100) : 40);
  }, [materialData]);

  // Pricing calculator using big.js (No intermediate rounding)
  useEffect(() => {
    try {
      // Guard: Validate all operational config values are finite numbers before proceeding.
      // operationalConfigs fields come from PostgreSQL NUMERIC and can be undefined
      // if the DB is missing a seed row, causing new Big(undefined/NaN) to throw.
      const machineRate = Number(operationalConfigs.machine_depreciation_per_hour);
      const laborRate = Number(operationalConfigs.labor_cost_per_minute);
      if (!isFinite(machineRate) || !isFinite(laborRate)) return;

      const priceVal = parseVNDInteger(isPriceFocused ? rawPriceInput : pricePerKg.toString()) || 0;
      const pricePerKgBig = new Big(priceVal);

      const failRateVal = parseFloatDecimal(isFailRateFocused ? rawFailRateInput : failRate) || 1.0;
      const failRateBig = new Big(failRateVal);

      const marginBig = new Big(defaultMargin).div(100);

      const weightVal = parseFloatDecimal(simParams.weightGram) || 0;
      const weightBig = new Big(weightVal);

      // Convert hours and minutes to seconds
      const hoursVal = parseInt(simParams.printTimeHours, 10) || 0;
      const minutesVal = parseInt(simParams.printTimeMinutes, 10) || 0;
      const totalSeconds = (hoursVal * 3600) + (minutesVal * 60);
      const totalSecondsBig = new Big(totalSeconds);

      const laborMinutesVal = parseInt(simParams.laborTimeMinutes, 10) || 0;
      const laborMinutesBig = new Big(laborMinutesVal);

      // 1. Raw Material Cost = Weight * (PricePerKg / 1000) * FailRate
      const matCost = weightBig.times(pricePerKgBig.div(1000)).times(failRateBig);

      // 2. Raw Machine Cost = (Seconds / 3600) * MachineDepreciationPerHour
      const machCost = totalSecondsBig
        .div(3600)
        .times(new Big(machineRate));

      // 3. Raw Labor Cost = LaborMinutes * LaborCostPerMinute
      const labCost = laborMinutesBig.times(new Big(laborRate));

      // 4. Raw COGS = Material + Machine + Labor
      const totalCogs = matCost.plus(machCost).plus(labCost);

      // 5. Suggested price = round_to_100(COGS / (1 - Margin))
      let finalPrice = 0;
      if (marginBig.lt(1)) {
        const rawPrice = totalCogs.div(new Big(1).sub(marginBig));
        // System round_to_100 logic: Round half-up to nearest 100 VND
        const divided = rawPrice.div(100);
        const rounded = divided.round(0); // big.js global RM = 1 (ROUND_HALF_UP)
        finalPrice = rounded.times(100).toNumber();
      }

      setSimResult({
        materialCost: matCost.toNumber(),
        machineCost: machCost.toNumber(),
        laborCost: labCost.toNumber(),
        cogs: totalCogs.toNumber(),
        suggestedPrice: finalPrice,
      });
    } catch (err) {
      // Suppress expected transient errors during initial render (e.g. empty form fields)
    }
  }, [
    pricePerKg,
    rawPriceInput,
    isPriceFocused,
    failRate,
    rawFailRateInput,
    isFailRateFocused,
    defaultMargin,
    simParams,
    operationalConfigs
  ]);

  // Load baseline preset configuration parameters
  const handleLoadPreset = (weight: string, hours: string, minutes: string, labor: string) => {
    setSimParams({
      weightGram: weight,
      printTimeHours: hours,
      printTimeMinutes: minutes,
      laborTimeMinutes: labor,
    });
  };

  // Forgiving input time format auto-normalization on blur
  const handleTimeBlur = () => {
    const hoursVal = parseInt(simParams.printTimeHours, 10) || 0;
    const minutesVal = parseInt(simParams.printTimeMinutes, 10) || 0;

    if (minutesVal >= 60) {
      const extraHours = Math.floor(minutesVal / 60);
      const remainingMinutes = minutesVal % 60;
      setSimParams((prev) => ({
        ...prev,
        printTimeHours: (hoursVal + extraHours).toString(),
        printTimeMinutes: remainingMinutes.toString(),
      }));
    }
  };

  // Handle Focus on Price Input
  const handlePriceFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsPriceFocused(true);
    setRawPriceInput(pricePerKg === 0 ? "" : pricePerKg.toString());
    // Auto-select text inside the input to support quick overwrite
    setTimeout(() => {
      e.target.select();
    }, 50);
  };

  // Handle Blur on Price Input
  const handlePriceBlur = () => {
    setIsPriceFocused(false);
    const parsedValue = parseVNDInteger(rawPriceInput);
    setPricePerKg(parsedValue);
    setRawPriceInput(parsedValue.toString());
  };

  // Handle Focus on Fail Rate Input
  const handleFailRateFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFailRateFocused(true);
    setRawFailRateInput(failRate);
    setTimeout(() => {
      e.target.select();
    }, 50);
  };

  // Handle Blur on Fail Rate Input
  const handleFailRateBlur = () => {
    setIsFailRateFocused(false);
    const parsed = parseFloatDecimal(rawFailRateInput);
    const num = isNaN(parsed) || parsed < 1.0 ? 1.0 : parsed;
    setFailRate(num.toString());
    setRawFailRateInput(num.toString());
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onErrorMessage("Tên loại nhựa không được phép để trống");
      return;
    }
    if (pricePerKg <= 0) {
      onErrorMessage("Giá nhựa phải lớn hơn 0");
      return;
    }
    const failRateNum = parseFloatDecimal(failRate);
    if (isNaN(failRateNum) || failRateNum < 1.00) {
      onErrorMessage("Hệ số hao hụt (Fail Rate) phải lớn hơn hoặc bằng 1.00");
      return;
    }
    if (defaultMargin < 0 || defaultMargin > 100) {
      onErrorMessage("Biên lợi nhuận phải từ 0% đến 100%");
      return;
    }

    setIsSubmitting(true);
    try {
      // Scale Transform: convert default_margin percentage (e.g. 40) to decimal (0.40) for database
      const marginDecimal = new Big(defaultMargin).div(100).toNumber();
      const payload = {
        name: name.trim(),
        price_per_kg: pricePerKg,
        fail_rate: failRateNum,
        default_margin: marginDecimal,
      };

      if (materialData) {
        await updateMaterial(materialData.id, payload);
        onSuccessMessage(`Đã cập nhật loại nhựa ${name.trim()} thành công.`);
      } else {
        await createMaterial(payload);
        onSuccessMessage(`Đã tạo loại nhựa ${name.trim()} thành công.`);
      }
      onSave();
    } catch (err: any) {
      onErrorMessage(err.message || "Không thể lưu thông tin nhựa. Vui lòng kiểm tra lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedFailRate = parseFloat(failRate);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Darkened backdrop overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        {/* Drawer slide-over content box */}
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()} // Block clicks outside from closing drawer
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-4xl border-l border-border bg-card text-card-foreground shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right h-screen flex flex-col focus:outline-none"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-mono font-bold tracking-wider text-foreground uppercase">
                {materialData ? "CHỈNH SỬA THÔNG SỐ NHỰA" : "THÊM LOẠI NHỰA MỚI"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground mt-1 font-sans">
                {materialData
                  ? `Chỉnh sửa cấu hình phôi nhựa cho mã ID: #${materialData.id}`
                  : "Cấu hình chủng loại, giá mua và biên lợi nhuận mặc định để phân tích giá."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
              <span className="sr-only">Đóng</span>
            </DialogPrimitive.Close>
          </div>

          {/* Drawer Scrollable Body Area (split columns on desktop) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
            
            {/* Left Column: Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-5 flex flex-col justify-between h-full lg:pr-2">
              <div className="space-y-5">
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="material-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tên loại nhựa
                  </Label>
                  <Input
                    id="material-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: PLA Carbon, PETG Matte"
                    className=""
                    disabled={isSubmitting}
                    autoComplete="off"
                    required
                  />
                </div>

                {/* 2. Purchase Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="material-price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Giá mua gốc / kg (VND)
                  </Label>
                  <div className="w-44"> {/* Locked width to prevent layout shifts */}
                    <Input
                      id="material-price"
                      type={isPriceFocused ? "number" : "text"}
                      value={isPriceFocused ? rawPriceInput : formatVND(pricePerKg)}
                      onFocus={handlePriceFocus}
                      onBlur={handlePriceBlur}
                      onChange={(e) => setRawPriceInput(e.target.value)}
                      placeholder="0 đ"
                      className="text-right font-mono"
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    Tương đương: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatDecimal(pricePerKg / 1000, 0)} đ/gram</span> giá vốn thô
                  </span>
                </div>

                {/* 3. Fail Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="material-failrate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hệ số hao hụt (Fail Rate)
                  </Label>
                  <div className="w-44">
                    <Input
                      id="material-failrate"
                      type="text"
                      value={
                        isFailRateFocused
                          ? rawFailRateInput
                          : `${formatDecimal(parseFloatDecimal(failRate) || 1.0, 2)}x`
                      }
                      onFocus={handleFailRateFocus}
                      onBlur={handleFailRateBlur}
                      onChange={(e) => setRawFailRateInput(e.target.value)}
                      placeholder="1.10x"
                      className="text-right font-mono"
                      disabled={isSubmitting}
                      autoComplete="off"
                      required
                    />
                  </div>
                  {/* Soft validation warning message if multiplier exceeds 2.0x */}
                  {!isNaN(parsedFailRate) && parsedFailRate > 2.00 && (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[10px] leading-tight font-sans">
                        Hao hụt đang lớn hơn 2.00 (gấp đôi). Hãy kiểm tra định dạng số thập phân (Ví dụ: 1.10).
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground block">
                    Hệ số bù hao cho lỗi in ấn (1.10 = bù 10% khối lượng).
                  </span>
                </div>

                {/* 4. Margin Percentage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="material-margin" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Biên lợi nhuận mặc định (%)
                    </Label>
                    <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">{defaultMargin}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      id="material-margin"
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={defaultMargin}
                      onChange={(e) => setDefaultMargin(parseInt(e.target.value, 10))}
                      className="flex-1 accent-emerald-600 dark:accent-emerald-400 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={defaultMargin}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setDefaultMargin(isNaN(val) ? 0 : Math.min(Math.max(val, 0), 99));
                        }}
                        className="text-center font-mono"
                        disabled={isSubmitting}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons (Left column bottom) */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6 lg:mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground font-sans"
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 text-white hover:bg-emerald-500 font-sans font-bold shadow-md shadow-emerald-950/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : materialData ? "Cập nhật" : "Lưu loại nhựa"}
                </Button>
              </div>
            </form>

            {/* Right Column: Simulation Playground & Reference Panel */}
            <div className="space-y-5 lg:pl-4 lg:border-l lg:border-border">
              
              {/* Simulation Sandbox Panel */}
              <div className="bg-card p-4 rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-2 text-foreground border-b border-border pb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                    SANDBOX GIẢ LẬP GIÁ BÁN
                  </h3>
                </div>

                {/* Simulation input parameters */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Khối lượng</span>
                    <div className="relative flex items-center">
                      <Input
                        type="text"
                        value={simParams.weightGram}
                        onChange={(e) => setSimParams({ ...simParams, weightGram: e.target.value })}
                        className="text-right pr-6 font-mono text-xs focus-visible:ring-0 focus-visible:border-border"
                        autoComplete="off"
                      />
                      <span className="absolute right-2 text-[10px] font-mono text-muted-foreground">g</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Thời gian in</span>
                    <div className="flex items-center gap-1">
                      <div className="relative flex items-center flex-1">
                        <Input
                          type="text"
                          value={simParams.printTimeHours}
                          onBlur={handleTimeBlur}
                          onChange={(e) => setSimParams({ ...simParams, printTimeHours: e.target.value })}
                          className="text-right pr-5 font-mono text-xs focus-visible:ring-0 focus-visible:border-border"
                          autoComplete="off"
                        />
                        <span className="absolute right-1.5 text-[9px] font-mono text-muted-foreground/60">h</span>
                      </div>
                      <div className="relative flex items-center flex-1">
                        <Input
                          type="text"
                          value={simParams.printTimeMinutes}
                          onBlur={handleTimeBlur}
                          onChange={(e) => setSimParams({ ...simParams, printTimeMinutes: e.target.value })}
                          className="text-right pr-5 font-mono text-xs focus-visible:ring-0 focus-visible:border-border"
                          autoComplete="off"
                        />
                        <span className="absolute right-1.5 text-[9px] font-mono text-muted-foreground/60">m</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Công thợ</span>
                    <div className="relative flex items-center">
                      <Input
                        type="text"
                        value={simParams.laborTimeMinutes}
                        onChange={(e) => setSimParams({ ...simParams, laborTimeMinutes: e.target.value })}
                        className="text-right pr-6 font-mono text-xs focus-visible:ring-0 focus-visible:border-border"
                        autoComplete="off"
                      />
                      <span className="absolute right-2 text-[10px] font-mono text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>

                {/* Preset badges selection */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Mẫu giả định nhanh</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadPreset("16.88", "1", "35", "0")}
                      className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded text-[10px] font-mono text-foreground transition-colors text-left"
                    >
                      🗳️ Keycap: 16.88g - 1h35m - 0m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadPreset("50.00", "3", "00", "10")}
                      className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded text-[10px] font-mono text-foreground transition-colors text-left"
                    >
                      🔑 Móc khóa: 50g - 3h00m - 10m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadPreset("200.00", "12", "00", "30")}
                      className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded text-[10px] font-mono text-foreground transition-colors text-left"
                    >
                      🧸 Mô hình: 200g - 12h00m - 30m
                    </button>
                  </div>
                </div>

                {/* Calculation Receipt breakdown (Flows statically on mobile screen to prevent IME keyboard collisions) */}
                <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2.5 relative">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-border pb-1.5 font-mono">
                    <span>HÓA ĐƠN CHI PHÍ GIẢ ĐỊNH</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{name || "Chưa đặt tên"}</span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-muted-foreground/60" /> Nhựa ({simParams.weightGram}g x fail):</span>
                      <span>{formatVND(simResult.materialCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground/60" /> Máy in ({simParams.printTimeHours}h{simParams.printTimeMinutes}m):</span>
                      <span>{formatVND(simResult.machineCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground/60" /> Nhân công ({simParams.laborTimeMinutes}m):</span>
                      <span>{formatVND(simResult.laborCost)}</span>
                    </div>
                    
                    <div className="border-t border-dashed border-border my-1"></div>
                    
                    <div className="flex justify-between text-foreground font-bold">
                      <span>GIÁ VỐN GIẢ ĐỊNH (COGS):</span>
                      <span>{formatVND(simResult.cogs)}</span>
                    </div>
                  </div>

                  {/* SUGGESTED PRICE PROMINENT DISPLAY */}
                  <div className="bg-emerald-950/25 dark:bg-emerald-950/20 border border-emerald-600/20 dark:border-emerald-900/30 rounded p-2.5 mt-2 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" /> GIÁ BÁN GỢI Ý (+{defaultMargin}%)
                    </span>
                    <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      {formatVND(simResult.suggestedPrice)}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                      Đã làm tròn đến 100đ gần nhất (Round Half-Up)
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Price Reference Widget (Prevents comparison blindspots) */}
              <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-2">
                <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block">
                  THAM CHIẾU GIÁ XƯỞNG HIỆN TẠI
                </span>
                
                {otherMaterials.length === 0 ? (
                  <span className="text-xs text-muted-foreground block italic">Không có dữ liệu nhựa khác</span>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                    {otherMaterials
                      .filter(m => m.id !== materialData?.id)
                      .map((m) => (
                        <div key={m.id} className="flex items-center justify-between bg-muted/40 px-2 py-1 rounded border border-border">
                          <span className="text-xs text-foreground font-sans truncate pr-2" title={m.name}>
                            {m.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            {formatDecimal(m.price_per_kg / 1000, 0)}k/g
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
