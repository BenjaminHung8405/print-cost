"use client";

import React, { useEffect, useState } from "react";
import Big from "big.js";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiProduct,
  ApiMaterial,
  ApiFixedItem,
  ApiOperationalConfigs,
  createProduct,
  updateProduct,
} from "@/core/api/client";
import {
  formatDecimal,
  formatVND,
  parseFloatDecimal,
} from "@/core/utils/format";
import { calculateProductCosts } from "@/core/calculation/engine";
import {
  X,
  Trash2,
  Coins,
  Cpu,
  Clock,
  Sparkles,
  TrendingUp,
  Package,
  Plus,
} from "lucide-react";

interface ProductFormProps {
  isOpen: boolean;
  productData?: ApiProduct | null; // Null means creating new
  materials: ApiMaterial[];
  fixedItemsCatalog: ApiFixedItem[];
  operationalConfigs: ApiOperationalConfigs;
  onClose: () => void;
  onSave: () => void;
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export function ProductForm({
  isOpen,
  productData,
  materials,
  fixedItemsCatalog,
  operationalConfigs,
  onClose,
  onSave,
  onSuccessMessage,
  onErrorMessage,
}: ProductFormProps) {
  // Form input states
  const [name, setName] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | "">("");
  const [weightGram, setWeightGram] = useState("");
  const [printTimeSeconds, setPrintTimeSeconds] = useState(0);
  const [laborTimeMinutes, setLaborTimeMinutes] = useState("0");
  const [batchQuantity, setBatchQuantity] = useState("1");

  // Batch Helper States
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchWeightGram, setBatchWeightGram] = useState("");
  const [batchHours, setBatchHours] = useState("0");
  const [batchMinutes, setBatchMinutes] = useState("0");
  const [batchSeconds, setBatchSeconds] = useState("0");
  const [batchMobileTimeStr, setBatchMobileTimeStr] = useState("00:00:00");
  const [batchLaborTimeMinutes, setBatchLaborTimeMinutes] = useState("0");

  // Margin Override state
  const [isMarginOverridden, setIsMarginOverridden] = useState(false);
  const [marginOverridePercent, setMarginOverridePercent] = useState("");

  // Fixed Items (Selected catalog items + quantities)
  const [selectedFixedItems, setSelectedFixedItems] = useState<
    { fixed_item_id: number; quantity: number }[]
  >([]);

  // TimeInput Desktop states
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [secondsVal, setSecondsVal] = useState("0");

  // TimeInput Mobile flat text state
  const [mobileTimeStr, setMobileTimeStr] = useState("00:00:00");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive device width check
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Sync state when productData changes
  useEffect(() => {
    if (productData) {
      setName(productData.name);
      setSelectedMaterialId(productData.material_id);
      setWeightGram(productData.weight_gram.toString());
      setLaborTimeMinutes(productData.labor_time_minutes.toString());
      
      const qty = productData.batch_quantity || 1;
      setBatchQuantity(qty.toString());

      const seconds = productData.print_time_seconds;
      setPrintTimeSeconds(seconds);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      setHours(h.toString());
      setMinutes(m.toString());
      setSecondsVal(s.toString());
      setMobileTimeStr(
        `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );

      if (qty > 1) {
        setIsBatchMode(true);
        // Hydration of Batch values: unit_value * batch_quantity (using Big to avoid JS floating issues)
        const bWeight = new Big(productData.weight_gram).times(qty).round(2, Big.roundHalfUp).toNumber();
        setBatchWeightGram(bWeight.toString());

        const totalSecs = seconds * qty;
        const bh = Math.floor(totalSecs / 3600);
        const bm = Math.floor((totalSecs % 3600) / 60);
        const bs = totalSecs % 60;
        setBatchHours(bh.toString());
        setBatchMinutes(bm.toString());
        setBatchSeconds(bs.toString());
        setBatchMobileTimeStr(
          `${bh.toString().padStart(2, "0")}:${bm
            .toString()
            .padStart(2, "0")}:${bs.toString().padStart(2, "0")}`
        );

        setBatchLaborTimeMinutes((productData.labor_time_minutes * qty).toString());
      } else {
        setIsBatchMode(false);
        setBatchWeightGram("");
        setBatchHours("0");
        setBatchMinutes("0");
        setBatchSeconds("0");
        setBatchMobileTimeStr("00:00:00");
        setBatchLaborTimeMinutes("0");
      }

      if (productData.margin_override !== null) {
        setIsMarginOverridden(true);
        setMarginOverridePercent(
          Math.round(productData.margin_override * 100).toString()
        );
      } else {
        setIsMarginOverridden(false);
        setMarginOverridePercent("");
      }

      const items = productData.fixed_items.map((fi) => ({
        fixed_item_id: fi.id,
        quantity: fi.quantity || 1,
      }));
      setSelectedFixedItems(items);
    } else {
      setName("");
      setSelectedMaterialId(materials[0]?.id || "");
      setWeightGram("");
      setLaborTimeMinutes("0");
      setBatchQuantity("1");
      setPrintTimeSeconds(0);
      setHours("0");
      setMinutes("0");
      setSecondsVal("0");
      setMobileTimeStr("00:00:00");
      setIsMarginOverridden(false);
      setMarginOverridePercent("");
      setSelectedFixedItems([]);

      setIsBatchMode(false);
      setBatchWeightGram("");
      setBatchHours("0");
      setBatchMinutes("0");
      setBatchSeconds("0");
      setBatchMobileTimeStr("00:00:00");
      setBatchLaborTimeMinutes("0");
    }
  }, [productData, isOpen, materials]);

  const isDirty = React.useMemo(() => {
    if (productData) {
      const nameDiff = name !== productData.name;
      const matDiff = selectedMaterialId !== productData.material_id;
      
      const parsedWeight = parseFloatDecimal(weightGram);
      const weightDiff = isNaN(parsedWeight) ? false : parsedWeight !== productData.weight_gram;
      
      const parsedLabor = parseInt(laborTimeMinutes, 10);
      const laborDiff = isNaN(parsedLabor) ? false : parsedLabor !== productData.labor_time_minutes;
      
      const timeDiff = printTimeSeconds !== productData.print_time_seconds;
      
      const batchQtyDiff = (productData.batch_quantity || 1) !== (parseInt(batchQuantity, 10) || 1);
      
      const hasMarginOverride = productData.margin_override !== null;
      const marginOverrideDiff = isMarginOverridden !== hasMarginOverride || 
        (isMarginOverridden && productData.margin_override !== null && marginOverridePercent !== Math.round(productData.margin_override * 100).toString());
      
      const initialFixedItems = productData.fixed_items.map(fi => ({
        fixed_item_id: fi.id,
        quantity: fi.quantity || 1
      })).sort((a, b) => a.fixed_item_id - b.fixed_item_id);
      
      const currentFixedItems = selectedFixedItems.map(fi => ({
        fixed_item_id: fi.fixed_item_id,
        quantity: fi.quantity
      })).sort((a, b) => a.fixed_item_id - b.fixed_item_id);
      
      const fixedItemsDiff = JSON.stringify(initialFixedItems) !== JSON.stringify(currentFixedItems);

      return nameDiff || matDiff || weightDiff || laborDiff || timeDiff || batchQtyDiff || marginOverrideDiff || fixedItemsDiff;
    } else {
      const nameDiff = name !== "";
      const matDiff = selectedMaterialId !== (materials[0]?.id || "");
      const weightDiff = weightGram !== "";
      const laborDiff = laborTimeMinutes !== "0";
      const timeDiff = printTimeSeconds !== 0;
      const batchQtyDiff = batchQuantity !== "1";
      const marginOverrideDiff = isMarginOverridden || marginOverridePercent !== "";
      const fixedItemsDiff = selectedFixedItems.length > 0;
      
      return nameDiff || matDiff || weightDiff || laborDiff || timeDiff || batchQtyDiff || marginOverrideDiff || fixedItemsDiff;
    }
  }, [
    productData,
    name,
    selectedMaterialId,
    weightGram,
    laborTimeMinutes,
    printTimeSeconds,
    batchQuantity,
    isMarginOverridden,
    marginOverridePercent,
    selectedFixedItems,
    materials
  ]);

  useEffect(() => {
    if (isOpen) {
      (window as any).isFormDirty = isDirty;
    } else {
      (window as any).isFormDirty = false;
    }
    return () => {
      (window as any).isFormDirty = false;
    };
  }, [isOpen, isDirty]);

  const handleCloseAttempt = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "Bạn có các thay đổi chưa lưu. Bạn có chắc chắn muốn đóng và hủy bỏ các thay đổi?"
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Handle Desktop Time field changes
  const updatePrintTimeFromHMS = (h: string, m: string, s: string) => {
    const hh = parseInt(h, 10) || 0;
    const mm = parseInt(m, 10) || 0;
    const ss = parseInt(s, 10) || 0;
    const total = hh * 3600 + mm * 60 + ss;
    setPrintTimeSeconds(total);

    // Sync mobile text field
    const pad = (num: number) => num.toString().padStart(2, "0");
    setMobileTimeStr(`${pad(hh)}:${pad(mm)}:${pad(ss)}`);
  };

  // Normalise mobile time on blur (e.g. "4500" => "00:45:00")
  const handleMobileTimeBlur = () => {
    const clean = mobileTimeStr.replace(/[^0-9]/g, "");
    const padded = clean.padStart(6, "0");
    const hhStr = padded.slice(0, 2);
    const mmStr = padded.slice(2, 4);
    const ssStr = padded.slice(4, 6);

    let hh = parseInt(hhStr, 10) || 0;
    let mm = parseInt(mmStr, 10) || 0;
    let ss = parseInt(ssStr, 10) || 0;

    // Carrying over excess seconds and minutes
    if (ss >= 60) {
      mm += Math.floor(ss / 60);
      ss = ss % 60;
    }
    if (mm >= 60) {
      hh += Math.floor(mm / 60);
      mm = mm % 60;
    }

    const formatted = `${hh.toString().padStart(2, "0")}:${mm
      .toString()
      .padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
    setMobileTimeStr(formatted);

    const total = hh * 3600 + mm * 60 + ss;
    setPrintTimeSeconds(total);

    // Sync desktop fields
    setHours(hh.toString());
    setMinutes(mm.toString());
    setSecondsVal(ss.toString());
  };

  const handleModeToggle = (checked: boolean) => {
    setIsBatchMode(checked);
    if (checked) {
      // Initialize batch fields from unit fields
      const qty = parseInt(batchQuantity, 10) || 1;
      const validQty = qty > 1 ? qty : 5; // default to 5 if current batch quantity is <= 1
      if (qty <= 1) {
        setBatchQuantity(validQty.toString());
      }
      const activeQty = qty <= 1 ? validQty : qty;

      const w = parseFloatDecimal(weightGram) || 0;
      const bWeight = new Big(w).times(activeQty).round(2, Big.roundHalfUp).toNumber();
      setBatchWeightGram(bWeight.toString());

      const totalSecs = printTimeSeconds * activeQty;
      const bh = Math.floor(totalSecs / 3600);
      const bm = Math.floor((totalSecs % 3600) / 60);
      const bs = totalSecs % 60;
      setBatchHours(bh.toString());
      setBatchMinutes(bm.toString());
      setBatchSeconds(bs.toString());
      setBatchMobileTimeStr(
        `${bh.toString().padStart(2, "0")}:${bm
          .toString()
          .padStart(2, "0")}:${bs.toString().padStart(2, "0")}`
      );

      const bLabor = (parseInt(laborTimeMinutes, 10) || 0) * activeQty;
      setBatchLaborTimeMinutes(bLabor.toString());
    } else {
      setBatchQuantity("1");
      setBatchWeightGram("");
      setBatchHours("0");
      setBatchMinutes("0");
      setBatchSeconds("0");
      setBatchMobileTimeStr("00:00:00");
      setBatchLaborTimeMinutes("0");
    }
  };

  const handleBatchWeightChange = (val: string) => {
    setBatchWeightGram(val);
    const qty = parseInt(batchQuantity, 10) || 1;
    if (qty > 0) {
      const w = parseFloatDecimal(val) || 0;
      const unitW = new Big(w).div(qty).round(2, Big.roundHalfUp).toNumber();
      setWeightGram(unitW.toString());
    }
  };

  const handleBatchLaborChange = (val: string) => {
    setBatchLaborTimeMinutes(val);
    const qty = parseInt(batchQuantity, 10) || 1;
    if (qty > 0) {
      const laborM = parseInt(val, 10) || 0;
      const unitLabor = Math.max(0, Math.round(laborM / qty));
      setLaborTimeMinutes(unitLabor.toString());
    }
  };

  const updateUnitPrintTimeFromBatchHMS = (hStr: string, mStr: string, sStr: string) => {
    const qty = parseInt(batchQuantity, 10) || 1;
    if (qty > 0) {
      const bh = parseInt(hStr, 10) || 0;
      const bm = parseInt(mStr, 10) || 0;
      const bs = parseInt(sStr, 10) || 0;
      const totalSecs = bh * 3600 + bm * 60 + bs;
      const unitSecs = Math.max(1, Math.round(totalSecs / qty));
      setPrintTimeSeconds(unitSecs);

      // Sync unit HMS inputs
      const uh = Math.floor(unitSecs / 3600);
      const um = Math.floor((unitSecs % 3600) / 60);
      const us = unitSecs % 60;
      setHours(uh.toString());
      setMinutes(um.toString());
      setSecondsVal(us.toString());

      const pad = (num: number) => num.toString().padStart(2, "0");
      setMobileTimeStr(`${pad(uh)}:${pad(um)}:${pad(us)}`);
    }
  };

  const handleBatchMobileTimeBlur = () => {
    const clean = batchMobileTimeStr.replace(/[^0-9]/g, "");
    const padded = clean.padStart(6, "0");
    const hhStr = padded.slice(0, 2);
    const mmStr = padded.slice(2, 4);
    const ssStr = padded.slice(4, 6);

    let hh = parseInt(hhStr, 10) || 0;
    let mm = parseInt(mmStr, 10) || 0;
    let ss = parseInt(ssStr, 10) || 0;

    if (ss >= 60) {
      mm += Math.floor(ss / 60);
      ss = ss % 60;
    }
    if (mm >= 60) {
      hh += Math.floor(mm / 60);
      mm = mm % 60;
    }

    const formatted = `${hh.toString().padStart(2, "0")}:${mm
      .toString()
      .padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
    setBatchMobileTimeStr(formatted);

    setBatchHours(hh.toString());
    setBatchMinutes(mm.toString());
    setBatchSeconds(ss.toString());

    updateUnitPrintTimeFromBatchHMS(hh.toString(), mm.toString(), ss.toString());
  };

  const handleBatchQuantityChange = (val: string) => {
    setBatchQuantity(val);
    const qty = parseInt(val, 10) || 1;
    if (qty > 0 && isBatchMode) {
      // Recalculate unit weight
      const w = parseFloatDecimal(batchWeightGram) || 0;
      const unitW = new Big(w).div(qty).round(2, Big.roundHalfUp).toNumber();
      setWeightGram(unitW.toString());

      // Recalculate unit print time
      const bh = parseInt(batchHours, 10) || 0;
      const bm = parseInt(batchMinutes, 10) || 0;
      const bs = parseInt(batchSeconds, 10) || 0;
      const totalSecs = bh * 3600 + bm * 60 + bs;
      const unitSecs = Math.max(1, Math.round(totalSecs / qty));
      setPrintTimeSeconds(unitSecs);

      const uh = Math.floor(unitSecs / 3600);
      const um = Math.floor((unitSecs % 3600) / 60);
      const us = unitSecs % 60;
      setHours(uh.toString());
      setMinutes(um.toString());
      setSecondsVal(us.toString());
      setMobileTimeStr(`${uh.toString().padStart(2, "0")}:${um.toString().padStart(2, "0")}:${us.toString().padStart(2, "0")}`);

      // Recalculate unit labor
      const laborM = parseInt(batchLaborTimeMinutes, 10) || 0;
      const unitLabor = Math.max(0, Math.round(laborM / qty));
      setLaborTimeMinutes(unitLabor.toString());
    }
  };

  // Find currently selected material
  const currentMaterial = materials.find((m) => m.id === selectedMaterialId);

  // Dynamic inheritance margin label
  const marginLabel = currentMaterial
    ? `Mặc định theo nhựa (Ví dụ: ${currentMaterial.name} - ${Math.round(
        currentMaterial.default_margin * 100
      )}%)`
    : "Vui lòng chọn loại nhựa để lấy biên mặc định";

  // Build inputs for the Client-side pricing engine
  const calculationInput = {
    weight_gram: parseFloatDecimal(weightGram) || 0,
    price_per_kg: currentMaterial?.price_per_kg || 0,
    fail_rate: currentMaterial?.fail_rate || 1.0,
    print_time_seconds: printTimeSeconds,
    machine_depreciation_per_hour:
      Number(operationalConfigs.machine_depreciation_per_hour) || 0,
    labor_time_minutes: parseInt(laborTimeMinutes, 10) || 0,
    labor_cost_per_minute:
      Number(operationalConfigs.labor_cost_per_minute) || 0,
    fixed_items: selectedFixedItems.map((s) => {
      const catalogItem = fixedItemsCatalog.find(
        (fi) => fi.id === s.fixed_item_id
      );
      return {
        cost: catalogItem?.cost || 0,
        quantity: s.quantity,
      };
    }),
    margin_override: isMarginOverridden
      ? (parseFloatDecimal(marginOverridePercent) || 0) / 100
      : null,
    default_margin: currentMaterial?.default_margin || 0.4,
    batch_quantity: parseInt(batchQuantity, 10) || 1,
  };

  // Run Client-side calculations
  let results = {
    rawMaterialCost: 0,
    rawMachineCost: 0,
    rawLaborCost: 0,
    rawFixedItemsCost: 0,
    totalCOGS: 0,
    appliedMargin: 0.4,
    suggestedPrice: 0,
    finalUnitPrice: 0,
  };

  try {
    results = calculateProductCosts(calculationInput);
  } catch (err) {
    // Suppress transient errors
  }

  // Filter out chosen items for conditional display dropdown
  const remainingFixedItems = fixedItemsCatalog.filter(
    (item) => !selectedFixedItems.some((s) => s.fixed_item_id === item.id)
  );

  // Form submission logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onErrorMessage("Tên sản phẩm không được phép để trống");
      return;
    }
    if (selectedMaterialId === "") {
      onErrorMessage("Vui lòng chọn loại nhựa");
      return;
    }
    const weightNum = parseFloatDecimal(weightGram);
    if (isNaN(weightNum) || weightNum <= 0) {
      onErrorMessage("Trọng lượng sản phẩm phải lớn hơn 0");
      return;
    }
    if (printTimeSeconds <= 0) {
      onErrorMessage("Thời gian in phải lớn hơn 0 giây");
      return;
    }
    const laborNum = parseInt(laborTimeMinutes, 10);
    if (isNaN(laborNum) || laborNum < 0) {
      onErrorMessage("Thời gian công thợ không được phép âm");
      return;
    }
    const batchQtyNum = parseInt(batchQuantity, 10);
    if (isNaN(batchQtyNum) || batchQtyNum <= 0) {
      onErrorMessage("Cỡ lô (Số lượng trong mẻ in) phải là số nguyên lớn hơn 0");
      return;
    }
    if (isMarginOverridden) {
      const overrideVal = parseFloatDecimal(marginOverridePercent);
      if (isNaN(overrideVal) || overrideVal < 0 || overrideVal > 100) {
        onErrorMessage("Biên lợi nhuận ghi đè phải từ 0% đến 100%");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        material_id: Number(selectedMaterialId),
        weight_gram: weightNum,
        print_time_seconds: printTimeSeconds,
        labor_time_minutes: laborNum,
        batch_quantity: batchQtyNum,
        margin_override: isMarginOverridden
          ? parseFloatDecimal(marginOverridePercent) / 100
          : null,
        fixed_items: selectedFixedItems,
      };

      if (productData) {
        await updateProduct(productData.id, payload);
        onSuccessMessage(`Đã cập nhật sản phẩm ${name.trim()} thành công.`);
      } else {
        await createProduct(payload);
        onSuccessMessage(`Đã thêm sản phẩm ${name.trim()} thành công.`);
      }
      onSave();
    } catch (err: any) {
      onErrorMessage(
        err.message || "Không thể lưu sản phẩm. Vui lòng kiểm tra lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleCloseAttempt()}>
      <DialogPrimitive.Portal>
        {/* Backdrop background shadow */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Form Drawer box */}
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => {
            if (isDirty) e.preventDefault(); // Block close on outside clicks if dirty
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) e.preventDefault(); // Block close on ESC key if dirty
          }}
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-4xl border-l border-border bg-card text-card-foreground shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right h-screen flex flex-col focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-mono font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                {productData ? "CẬP NHẬT MẪU SẢN PHẨM" : "THÊM SẢN PHẨM MỚI"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground mt-1 font-sans">
                {productData
                  ? `Chỉnh sửa cấu hình sản phẩm mã ID: #${productData.id}`
                  : "Định nghĩa chi tiết phôi nhựa, thời gian và các chi phí phụ kèm theo sản phẩm."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
              <span className="sr-only">Đóng</span>
            </DialogPrimitive.Close>
          </div>

          {/* Drawer Body - Split screen (Forms left, Pricing receipt right) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Left Column: Input Fields */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 flex flex-col justify-between h-full lg:pr-2"
            >
              <div className="space-y-5">
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="product-name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Tên sản phẩm
                  </Label>
                  <Input
                    id="product-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={(e) => {
                      const target = e.target;
                      setTimeout(() => target.select(), 50);
                    }}
                    placeholder="Ví dụ: Keycap Dragon, Fishbone Mini"
                    disabled={isSubmitting}
                    autoComplete="off"
                    required
                  />
                </div>

                {/* 2. Material Select */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="product-material"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Loại phôi nhựa sử dụng
                  </Label>
                  <select
                    id="product-material"
                    value={selectedMaterialId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedMaterialId(id === "" ? "" : Number(id));
                    }}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer dark:bg-input/30"
                    required
                  >
                    <option value="" disabled>
                      -- Chọn cuộn nhựa --
                    </option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({formatVND(m.price_per_kg)}/kg)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Mode Toggle for Batch Helper */}
                <div className="flex items-center justify-between bg-muted/10 border border-border p-3 rounded-lg gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Hỗ trợ nhập theo mẻ in</span>
                    <span className="text-[10px] text-muted-foreground">Tự động chia nhỏ thông số mẻ in thành thông số đơn vị.</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isBatchMode}
                    onClick={() => handleModeToggle(!isBatchMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      isBatchMode ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isBatchMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isBatchMode ? (
                  <>
                    {/* Batch Mode Inputs */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Batch Quantity */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="product-batch"
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          Cỡ lô (SL/mẻ)
                        </Label>
                        <div className="relative flex items-center">
                          <Input
                            id="product-batch"
                            type="number"
                            min="2"
                            value={batchQuantity}
                            onChange={(e) => handleBatchQuantityChange(e.target.value)}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="5"
                            className="text-right pr-8 font-mono text-xs"
                            disabled={isSubmitting}
                            autoComplete="off"
                            required
                          />
                          <span className="absolute right-2 text-[10px] font-mono text-muted-foreground">
                            pcs
                          </span>
                        </div>
                      </div>

                      {/* Total Weight */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="product-batch-weight"
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          Tổng cân nặng mẻ (g)
                        </Label>
                        <div className="relative flex items-center">
                          <Input
                            id="product-batch-weight"
                            type="text"
                            value={batchWeightGram}
                            onChange={(e) => handleBatchWeightChange(e.target.value)}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="0.00"
                            className="text-right pr-6 font-mono text-xs"
                            disabled={isSubmitting}
                            autoComplete="off"
                            required
                          />
                          <span className="absolute right-2.5 text-[10px] font-mono text-muted-foreground">
                            g
                          </span>
                        </div>
                      </div>

                      {/* Total Labor */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="product-batch-labor"
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          Tổng công thợ mẻ (m)
                        </Label>
                        <div className="relative flex items-center">
                          <Input
                            id="product-batch-labor"
                            type="number"
                            min="0"
                            value={batchLaborTimeMinutes}
                            onChange={(e) => handleBatchLaborChange(e.target.value)}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="0"
                            className="text-right pr-8 font-mono text-xs"
                            disabled={isSubmitting}
                            autoComplete="off"
                            required
                          />
                          <span className="absolute right-2 text-[10px] font-mono text-muted-foreground">
                            m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Print Time for Batch */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="print-time"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Tổng thời gian in mẻ (HH:MM:SS)
                      </Label>

                      {isMobile ? (
                        <div className="space-y-1">
                          <Input
                            id="print-time-batch-mobile"
                            type="text"
                            value={batchMobileTimeStr}
                            onChange={(e) => setBatchMobileTimeStr(e.target.value)}
                            onBlur={handleBatchMobileTimeBlur}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="Ví dụ: 013500"
                            className="font-mono text-center text-sm"
                            disabled={isSubmitting}
                            autoComplete="off"
                          />
                          <span className="text-[10px] text-muted-foreground block leading-tight">
                            Gõ chuỗi phẳng (Ví dụ: 4500 cho 45 phút, 13500 cho 1
                            giờ 35 phút) để tự động căn chỉnh.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-muted/20 border border-border rounded-lg p-1.5 flex-1 justify-center">
                            {/* Hours */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                value={batchHours}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchHours(val);
                                  updateUnitPrintTimeFromBatchHMS(val, batchMinutes, batchSeconds);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                giờ
                              </span>
                            </div>
                            <span className="text-muted-foreground/80 font-bold">
                              :
                            </span>

                            {/* Minutes */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={batchMinutes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchMinutes(val);
                                  updateUnitPrintTimeFromBatchHMS(batchHours, val, batchSeconds);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                phút
                              </span>
                            </div>
                            <span className="text-muted-foreground/80 font-bold">
                              :
                            </span>

                            {/* Seconds */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={batchSeconds}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchSeconds(val);
                                  updateUnitPrintTimeFromBatchHMS(batchHours, batchMinutes, val);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                giây
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Warning Message */}
                    <div className="text-[10px] text-amber-500 font-sans italic">
                      * Phôi mẻ được quy đổi từ đơn vị gốc trong kho (Có thể chênh lệch nhỏ do làm tròn).
                    </div>
                  </>
                ) : (
                  <>
                    {/* Unit SKU Mode Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Weight */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="product-weight"
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          Trọng lượng đơn vị (g)
                        </Label>
                        <div className="relative flex items-center">
                          <Input
                            id="product-weight"
                            type="text"
                            value={weightGram}
                            onChange={(e) => setWeightGram(e.target.value)}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="0.00"
                            className="text-right pr-6 font-mono text-xs"
                            disabled={isSubmitting}
                            autoComplete="off"
                            required
                          />
                          <span className="absolute right-2.5 text-[10px] font-mono text-muted-foreground">
                            g
                          </span>
                        </div>
                      </div>

                      {/* Labor minutes */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="product-labor"
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          Công thợ đơn vị (m)
                        </Label>
                        <div className="relative flex items-center">
                          <Input
                            id="product-labor"
                            type="number"
                            min="0"
                            value={laborTimeMinutes}
                            onChange={(e) => setLaborTimeMinutes(e.target.value)}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="0"
                            className="text-right pr-8 font-mono text-xs"
                            disabled={isSubmitting}
                            autoComplete="off"
                            required
                          />
                          <span className="absolute right-2 text-[10px] font-mono text-muted-foreground">
                            m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Print Time */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="print-time"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Thời gian in đơn vị (HH:MM:SS)
                      </Label>

                      {isMobile ? (
                        <div className="space-y-1">
                          <Input
                            id="print-time-mobile"
                            type="text"
                            value={mobileTimeStr}
                            onChange={(e) => setMobileTimeStr(e.target.value)}
                            onBlur={handleMobileTimeBlur}
                            onFocus={(e) => {
                              const target = e.target;
                              setTimeout(() => target.select(), 50);
                            }}
                            placeholder="Ví dụ: 013500"
                            className="font-mono text-center text-sm"
                            disabled={isSubmitting}
                            autoComplete="off"
                          />
                          <span className="text-[10px] text-muted-foreground block leading-tight">
                            Gõ chuỗi phẳng (Ví dụ: 4500 cho 45 phút, 13500 cho 1
                            giờ 35 phút) để tự động căn chỉnh.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-muted/20 border border-border rounded-lg p-1.5 flex-1 justify-center">
                            {/* Hours */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                value={hours}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setHours(val);
                                  updatePrintTimeFromHMS(val, minutes, secondsVal);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                giờ
                              </span>
                            </div>
                            <span className="text-muted-foreground/80 font-bold">
                              :
                            </span>

                            {/* Minutes */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={minutes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMinutes(val);
                                  updatePrintTimeFromHMS(hours, val, secondsVal);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                phút
                              </span>
                            </div>
                            <span className="text-muted-foreground/80 font-bold">
                              :
                            </span>

                            {/* Seconds */}
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={secondsVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSecondsVal(val);
                                  updatePrintTimeFromHMS(hours, minutes, val);
                                }}
                                onFocus={(e) => {
                                  const target = e.target;
                                  setTimeout(() => target.select(), 50);
                                }}
                                className="w-12 text-center font-mono text-sm bg-transparent outline-none border-b border-transparent focus:border-primary pr-0.5"
                                placeholder="00"
                                disabled={isSubmitting}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                                giây
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 5. Dynamic Margin Override Switch */}
                <div className="space-y-2.5 p-3.5 bg-muted/20 border border-border rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Thiết lập biên lợi nhuận riêng
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {!isMarginOverridden ? marginLabel : "Áp dụng biên lợi nhuận riêng cho sản phẩm này"}
                      </span>
                    </div>
                    {/* Native Toggle Switch styled clean */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMarginOverridden}
                        onChange={(e) => {
                          setIsMarginOverridden(e.target.checked);
                          if (!e.target.checked) setMarginOverridePercent("");
                          else {
                            // Pre-fill with current material default margin for smooth starting editing
                            const currentDefault = currentMaterial
                              ? Math.round(currentMaterial.default_margin * 100)
                              : 40;
                            setMarginOverridePercent(currentDefault.toString());
                          }
                        }}
                        disabled={isSubmitting}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Smooth slide container (Conditional Display) */}
                  {isMarginOverridden && (
                    <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label
                        htmlFor="margin-override-input"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Biên Lợi Nhuận Ghi Đè (%)
                      </Label>
                      <div className="relative flex items-center w-28 justify-self-end">
                        <Input
                          id="margin-override-input"
                          type="number"
                          min="0"
                          max="99"
                          value={marginOverridePercent}
                          onChange={(e) => setMarginOverridePercent(e.target.value)}
                          onFocus={(e) => {
                            const target = e.target;
                            setTimeout(() => target.select(), 50);
                          }}
                          placeholder="40"
                          className="text-right pr-8 font-mono h-9"
                          disabled={isSubmitting}
                          required={isMarginOverridden}
                          autoComplete="off"
                        />
                        <span className="absolute right-3 text-xs font-mono text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Fixed Items conditional displays */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">
                      Chi phí phụ kiện & bao bì kèm theo
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Đã chọn: {selectedFixedItems.length} món
                    </span>
                  </div>

                  {/* Conditional dropdown selector */}
                  {remainingFixedItems.length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => {
                        const id = parseInt(e.target.value, 10);
                        if (!isNaN(id)) {
                          setSelectedFixedItems((prev) => [
                            ...prev,
                            { fixed_item_id: id, quantity: 1 },
                          ]);
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer dark:bg-input/30"
                    >
                      <option value="" disabled>
                        + Thêm phụ kiện hoặc bao bì đính kèm...
                      </option>
                      {remainingFixedItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (
                          {item.item_type === "packaging" ? "Bao bì" : "Phụ kiện"}
                          ) - {formatVND(item.cost)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    fixedItemsCatalog.length > 0 && (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/10 border border-border p-2 rounded text-center">
                        Đã chọn toàn bộ danh mục vật tư phụ.
                      </p>
                    )
                  )}

                  {/* Conditional List displaying chosen items */}
                  <div className="space-y-2 mt-2 max-h-[190px] overflow-y-auto pr-1">
                    {selectedFixedItems.map((item) => {
                      const details = fixedItemsCatalog.find(
                        (fi) => fi.id === item.fixed_item_id
                      );
                      if (!details) return null;
                      return (
                        <div
                          key={item.fixed_item_id}
                          className="flex items-center justify-between p-2 bg-muted/40 border border-border rounded-lg animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          <div className="flex flex-col flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[8px] px-1 py-0.5 rounded font-mono font-semibold uppercase shrink-0 ${
                                  details.item_type === "packaging"
                                    ? "bg-cyan-950/40 border border-cyan-800 text-cyan-400"
                                    : "bg-purple-950/40 border border-purple-800 text-purple-400"
                                }`}
                              >
                                {details.item_type === "packaging"
                                  ? "Bao bì"
                                  : "Phụ kiện"}
                              </span>
                              <span className="text-xs text-foreground font-semibold truncate">
                                {details.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Đơn giá: {formatVND(details.cost)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Qty incrementors */}
                            <div className="flex items-center border border-border rounded bg-card h-7">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFixedItems((prev) =>
                                    prev.map((p) =>
                                      p.fixed_item_id === item.fixed_item_id
                                        ? {
                                            ...p,
                                            quantity: Math.max(1, p.quantity - 1),
                                          }
                                        : p
                                    )
                                  );
                                }}
                                disabled={item.quantity <= 1 || isSubmitting}
                                className="px-1.5 h-full text-xs hover:bg-muted text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="px-1.5 text-xs font-mono font-bold w-5 text-center select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFixedItems((prev) =>
                                    prev.map((p) =>
                                      p.fixed_item_id === item.fixed_item_id
                                        ? { ...p, quantity: p.quantity + 1 }
                                        : p
                                    )
                                  );
                                }}
                                disabled={isSubmitting}
                                className="px-1.5 h-full text-xs hover:bg-muted text-muted-foreground"
                              >
                                +
                              </button>
                            </div>

                            {/* Trash delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFixedItems((prev) =>
                                  prev.filter(
                                    (p) => p.fixed_item_id !== item.fixed_item_id
                                  )
                                );
                              }}
                              disabled={isSubmitting}
                              className="p-1 rounded text-rose-500 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {selectedFixedItems.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/20 border border-dashed border-border rounded-lg">
                        Chưa chọn phụ kiện hay bao bì kèm theo.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6 lg:mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseAttempt}
                  className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground font-sans"
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-500 font-sans font-bold shadow-md shadow-blue-950/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : productData
                    ? "Cập nhật sản phẩm"
                    : "Lưu sản phẩm"}
                </Button>
              </div>
            </form>

            {/* Right Column: Pricing calculation receipt sidebar */}
            <div className="space-y-5 lg:pl-4 lg:border-l lg:border-border">
              <div className="bg-card p-4 rounded-xl border border-border space-y-4 relative overflow-hidden">
                {/* Accent top stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400" />

                <div className="flex items-center gap-2 text-foreground border-b border-border pb-2">
                  <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                    CƠ CẤU GIÁ VỐN & DOANH THU REAL-TIME
                  </h3>
                </div>

                {/* Calculation breakdown */}
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3 relative">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-border pb-2 font-mono">
                    <span>HÓA ĐƠN CHI TIẾT SẢN PHẨM</span>
                    <span className="text-blue-500 font-bold">
                      {name || "Sản phẩm chưa đặt tên"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {/* Material Cost */}
                    <div className="flex justify-between text-muted-foreground leading-relaxed">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        {calculationInput.batch_quantity > 1 ? (
                          `Nhựa (Phân bổ ${calculationInput.weight_gram}g / ${calculationInput.batch_quantity} cái):`
                        ) : (
                          `Nhựa (${calculationInput.weight_gram}g x fail):`
                        )}
                      </span>
                      <span>{formatVND(results.rawMaterialCost)}</span>
                    </div>
                    {currentMaterial && (
                      <span className="text-[10px] text-muted-foreground/60 block pl-5 -mt-1 font-mono">
                        Chi tiết: {currentMaterial.name} ({formatDecimal(currentMaterial.price_per_kg/1000, 1)}đ/g), fail-rate {currentMaterial.fail_rate}x
                      </span>
                    )}

                    {/* Machine Depreciation Cost */}
                    <div className="flex justify-between text-muted-foreground leading-relaxed mt-2">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        {calculationInput.batch_quantity > 1 ? (
                          `Khấu hao máy (Phân bổ ${Math.floor(printTimeSeconds / 3600)}h${Math.floor((printTimeSeconds % 3600) / 60)}m / ${calculationInput.batch_quantity} cái):`
                        ) : (
                          `Khấu hao máy (${Math.floor(printTimeSeconds / 3600)}h${Math.floor((printTimeSeconds % 3600) / 60)}m):`
                        )}
                      </span>
                      <span>{formatVND(results.rawMachineCost)}</span>
                    </div>

                    {/* Labor Cost */}
                    <div className="flex justify-between text-muted-foreground leading-relaxed">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        {calculationInput.batch_quantity > 1 ? (
                          `Nhân công (Phân bổ ${calculationInput.labor_time_minutes}m / ${calculationInput.batch_quantity} cái):`
                        ) : (
                          `Nhân công làm nguội (${calculationInput.labor_time_minutes}m):`
                        )}
                      </span>
                      <span>{formatVND(results.rawLaborCost)}</span>
                    </div>

                    {/* Accessories cost */}
                    <div className="flex justify-between text-muted-foreground leading-relaxed">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        Bao bì & Phụ kiện kèm theo:
                      </span>
                      <span>{formatVND(results.rawFixedItemsCost)}</span>
                    </div>
                    {selectedFixedItems.length > 0 && (
                      <div className="pl-5 space-y-0.5 text-[10px] text-muted-foreground/60">
                        {selectedFixedItems.map((fi) => {
                          const det = fixedItemsCatalog.find(
                            (c) => c.id === fi.fixed_item_id
                          );
                          if (!det) return null;
                          return (
                            <div key={fi.fixed_item_id} className="flex justify-between">
                              <span>• {det.name} (x{fi.quantity})</span>
                              <span>{formatVND(det.cost * fi.quantity)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border-t border-dashed border-border my-2"></div>

                    {/* COGS total */}
                    <div className="flex justify-between text-foreground font-bold text-sm bg-muted/80 p-2 rounded border border-border">
                      <span>{calculationInput.batch_quantity > 1 ? "GIÁ VỐN ĐƠN VỊ (COGS):" : "TỔNG GIÁ VỐN (COGS):"}</span>
                      <span className="text-foreground">{formatVND(results.totalCOGS)}</span>
                    </div>
                  </div>

                  {/* Profit Margin Info */}
                  <div className="pt-2 flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Biên lợi nhuận áp dụng:</span>
                    <span className="font-bold text-blue-500">
                      {Math.round(results.appliedMargin * 100)}%
                      {isMarginOverridden && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950/40 border border-amber-800 text-amber-400 ml-1">
                          ghi đè
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="border-t border-dashed border-border my-1"></div>

                  {/* Raw suggested price */}
                  <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                    <span>Giá gợi ý thô:</span>
                    <span>{formatVND(results.suggestedPrice)}</span>
                  </div>

                  {/* FINAL ROUNDED SUGGESTED PRICE */}
                  <div className="bg-emerald-950/20 dark:bg-emerald-950/20 border border-emerald-600/30 dark:border-emerald-900/40 rounded-xl p-3.5 mt-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-4 w-4 shrink-0" /> GIÁ BÁN GỢI Ý (LÀM TRÒN)
                    </span>
                    <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-widest animate-in fade-in duration-300">
                      {formatVND(results.finalUnitPrice)}
                    </span>
                    <span className="text-[9px] text-muted-foreground/80 font-mono mt-1 leading-tight">
                      Đã làm tròn chẵn đến 100đ gần nhất (Round Half-Up) theo cơ chế database
                    </span>
                  </div>
                </div>
              </div>

              {/* Reference Widget showing workshop parameters */}
              <div className="bg-muted/10 border border-border p-4 rounded-xl space-y-3">
                <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block">
                  CẤU HÌNH VẬN HÀNH XƯỞNG THAM CHIẾU
                </span>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>• Khấu hao máy/giờ:</span>
                    <span className="text-foreground">
                      {formatVND(Number(operationalConfigs.machine_depreciation_per_hour))}/giờ
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>• Công thợ làm nguội/phút:</span>
                    <span className="text-foreground">
                      {formatVND(Number(operationalConfigs.labor_cost_per_minute))}/phút
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
