"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiOperationalConfigs, updateOperationalConfigs } from "@/core/api/client";
import { formatVND, parseVNDInteger } from "@/core/utils/format";
import { AlertCircle, CheckCircle2, Info, Save, Settings, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Props {
  /** Dữ liệu gốc từ DB, truyền vào từ page cha */
  initialData: ApiOperationalConfigs;
  /** Callback khi lưu thành công — trả về giá trị mới để page cha cập nhật state */
  onSaveSuccess: (updated: ApiOperationalConfigs) => void;
  /** Optional: callback real-time để page cha theo dõi draft values cho simulator */
  onDraftChange?: (draft: ApiOperationalConfigs) => void;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

export function OperationalConfigForm({ initialData, onSaveSuccess, onDraftChange }: Props) {
  // Draft state — giá trị đang gõ trên form
  const [machineDepreciation, setMachineDepreciation] = useState<number>(
    initialData.machine_depreciation_per_hour
  );
  const [laborCost, setLaborCost] = useState<number>(
    initialData.labor_cost_per_minute
  );

  // Raw input strings (dùng khi input đang focused)
  const [rawMachineInput, setRawMachineInput] = useState<string>(
    initialData.machine_depreciation_per_hour.toString()
  );
  const [rawLaborInput, setRawLaborInput] = useState<string>(
    initialData.labor_cost_per_minute.toString()
  );

  const [isMachineFocused, setIsMachineFocused] = useState(false);
  const [isLaborFocused, setIsLaborFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync lại khi initialData thay đổi (khi page cha fetch xong)
  useEffect(() => {
    setMachineDepreciation(initialData.machine_depreciation_per_hour);
    setLaborCost(initialData.labor_cost_per_minute);
    setRawMachineInput(initialData.machine_depreciation_per_hour.toString());
    setRawLaborInput(initialData.labor_cost_per_minute.toString());
  }, [initialData]);

  // isDirty: so sánh draft với initialData (giá trị đã lưu trên DB)
  const isDirty =
    machineDepreciation !== initialData.machine_depreciation_per_hour ||
    laborCost !== initialData.labor_cost_per_minute;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Focus / Blur handlers ──────────────────────────────────────────────────
  const handleMachineFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsMachineFocused(true);
    setRawMachineInput(machineDepreciation === 0 ? "" : machineDepreciation.toString());
    setTimeout(() => e.target.select(), 50);
  };

  const handleMachineBlur = () => {
    setIsMachineFocused(false);
    const parsed = parseVNDInteger(rawMachineInput);
    setMachineDepreciation(parsed);
    setRawMachineInput(parsed.toString());
    onDraftChange?.({ machine_depreciation_per_hour: parsed, labor_cost_per_minute: laborCost });
  };

  const handleLaborFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsLaborFocused(true);
    setRawLaborInput(laborCost === 0 ? "" : laborCost.toString());
    setTimeout(() => e.target.select(), 50);
  };

  const handleLaborBlur = () => {
    setIsLaborFocused(false);
    const parsed = parseVNDInteger(rawLaborInput);
    setLaborCost(parsed);
    setRawLaborInput(parsed.toString());
    onDraftChange?.({ machine_depreciation_per_hour: machineDepreciation, labor_cost_per_minute: parsed });
  };

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await updateOperationalConfigs({
        machine_depreciation_per_hour: machineDepreciation,
        labor_cost_per_minute: laborCost,
      });
      // Notify parent to update its state (simulator sẽ tự re-render)
      onSaveSuccess(updated);
      showToast("Cập nhật chi phí vận hành thành công!", "success");
    } catch (err: any) {
      showToast(err.message || "Cập nhật thất bại. Vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />

        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-emerald-500" />
          <h2 className="font-mono text-base font-bold tracking-wide uppercase text-foreground">
            Tham Số Vận Hành Gốc
          </h2>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          Cấu hình chi phí khấu hao máy và công thợ để hệ thống tự động tính
          toán giá thành cho tất cả sản phẩm trong xưởng in.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Field 1: Machine Depreciation */}
          <div className="space-y-2">
            <Label
              htmlFor="machine-depreciation"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Khấu hao máy / giờ (VND)
            </Label>
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
            <span className="text-[10px] text-muted-foreground block">
              Khấu hao hao mòn máy và điện năng tiêu thụ trên mỗi giờ chạy.
            </span>
          </div>

          {/* Field 2: Labor Cost */}
          <div className="space-y-2">
            <Label
              htmlFor="labor-cost"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Công thợ làm nguội / phút (VND)
            </Label>
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

          {/* Status indicator */}
          {!isDirty && (
            <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground font-mono">
              <Info className="h-3 w-3" />
              <span>Cấu hình trùng khớp với dữ liệu máy chủ</span>
            </div>
          )}
        </form>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-2xl min-w-72 ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
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
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-current/50 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
