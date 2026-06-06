"use client";

import React, { useState, useMemo } from "react";
import Big from "big.js";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Box,
  Tag,
  Calculator,
  Hash,
} from "lucide-react";
import {
  ApiFixedItemCatalog,
  CreateFixedItemPayload,
  createFixedItem,
  updateFixedItem,
  deleteFixedItem,
} from "@/core/api/client";
import { formatVND, parseVNDInteger } from "@/core/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  items: ApiFixedItemCatalog[];
  onDataChange: (items: ApiFixedItemCatalog[]) => void;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

type ItemType = "accessory" | "packaging";

const ITEM_TYPE_LABELS: Record<ItemType, { label: string; color: string }> = {
  accessory: {
    label: "Phụ kiện",
    color: "text-violet-400 bg-violet-950/30 border-violet-800/50",
  },
  packaging: {
    label: "Bao bì",
    color: "text-amber-400 bg-amber-950/30 border-amber-800/50",
  },
};

type InputMode = "direct" | "bulk";

interface EditingRow {
  id: number | null; // null = new row
  name: string;
  item_type: ItemType;
  // Chế độ nhập
  inputMode: InputMode;
  // Chế độ A — Đơn giá trực tiếp
  costInput: string;
  cost: number;
  isCostFocused: boolean;
  // Chế độ B — Tính từ gói/lô
  totalPrice: number;
  totalPriceInput: string;
  isTotalPriceFocused: boolean;
  lotQuantity: number;
  lotQuantityInput: string;
  isLotQtyFocused: boolean;
}

const EMPTY_ROW: EditingRow = {
  id: null,
  name: "",
  item_type: "packaging",
  inputMode: "direct",
  costInput: "",
  cost: 0,
  isCostFocused: false,
  totalPrice: 0,
  totalPriceInput: "",
  isTotalPriceFocused: false,
  lotQuantity: 0,
  lotQuantityInput: "",
  isLotQtyFocused: false,
};

export function FixedItemsManager({ items, onDataChange }: Props) {
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Inline edit handlers ──────────────────────────────────────────────────

  const startCreate = () => {
    setEditingRow({ ...EMPTY_ROW });
    setConfirmDeleteId(null);
  };

  const startEdit = (item: ApiFixedItemCatalog) => {
    setEditingRow({
      id: item.id,
      name: item.name,
      item_type: item.item_type,
      inputMode: "direct",
      costInput: item.cost.toString(),
      cost: item.cost,
      isCostFocused: false,
      totalPrice: 0,
      totalPriceInput: "",
      isTotalPriceFocused: false,
      lotQuantity: 0,
      lotQuantityInput: "",
      isLotQtyFocused: false,
    });
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => setEditingRow(null);

  // ── Computed unit cost (Chế độ B — Tính từ gói/lô) ──────────────────────
  // Dùng Big.js để tránh floating-point drift.
  // Guard chặt NaN / division-by-zero khi người dùng đang gõ dở.
  const computedUnitCost = useMemo((): number => {
    if (!editingRow || editingRow.inputMode !== "bulk") return editingRow?.cost ?? 0;
    const qty = Number(editingRow.lotQuantity);
    const total = Number(editingRow.totalPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(total) || total < 0) return 0;
    try {
      // round(4, 1) = 4 decimal places, ROUND_HALF_UP — khớp NUMERIC(12,4) DB
      return new Big(total).div(qty).round(4, 1).toNumber();
    } catch {
      return 0;
    }
  }, [editingRow?.inputMode, editingRow?.totalPrice, editingRow?.lotQuantity, editingRow?.cost]);

  // ── Bulk-mode input handlers ──────────────────────────────────────────────

  const handleTotalPriceFocus = () => {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      isTotalPriceFocused: true,
      totalPriceInput: editingRow.totalPrice === 0 ? "" : editingRow.totalPrice.toString(),
    });
  };

  const handleTotalPriceBlur = () => {
    if (!editingRow) return;
    const parsed = parseVNDInteger(editingRow.totalPriceInput);
    setEditingRow({ ...editingRow, isTotalPriceFocused: false, totalPrice: parsed, totalPriceInput: parsed.toString() });
  };

  const handleLotQtyFocus = () => {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      isLotQtyFocused: true,
      lotQuantityInput: editingRow.lotQuantity === 0 ? "" : editingRow.lotQuantity.toString(),
    });
  };

  const handleLotQtyBlur = () => {
    if (!editingRow) return;
    const parsed = Math.max(0, parseInt(editingRow.lotQuantityInput, 10) || 0);
    setEditingRow({ ...editingRow, isLotQtyFocused: false, lotQuantity: parsed, lotQuantityInput: parsed.toString() });
  };

  const handleCostFocus = () => {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      isCostFocused: true,
      costInput: editingRow.cost === 0 ? "" : editingRow.cost.toString(),
    });
  };

  const handleCostBlur = () => {
    if (!editingRow) return;
    const parsed = parseVNDInteger(editingRow.costInput);
    setEditingRow({
      ...editingRow,
      isCostFocused: false,
      cost: parsed,
      costInput: parsed.toString(),
    });
  };

  const handleSave = async () => {
    if (!editingRow) return;
    if (!editingRow.name.trim()) {
      showToast("Tên vật tư không được để trống.", "error");
      return;
    }


    // Xác định đơn giá cuối: direct mode dùng editingRow.cost, bulk mode dùng computedUnitCost
    const finalCost = editingRow.inputMode === "bulk" ? computedUnitCost : editingRow.cost;

    if (finalCost <= 0) {
      showToast(
        editingRow.inputMode === "bulk"
          ? "Đơn giá tính được phải lớn hơn 0. Kiểm tra lại Giá tổng và Số lượng."
          : "Đơn giá phải lớn hơn 0.",
        "error"
      );
      return;
    }

    const payload: CreateFixedItemPayload = {
      name: editingRow.name.trim(),
      item_type: editingRow.item_type,
      cost: finalCost,
    };

    setIsSubmitting(true);
    try {
      if (editingRow.id === null) {
        // CREATE
        const created = await createFixedItem(payload);
        onDataChange([...items, created]);
        showToast(`Đã thêm "${created.name}" vào danh mục.`, "success");
      } else {
        // UPDATE
        const updated = await updateFixedItem(editingRow.id, payload);
        onDataChange(items.map((i) => (i.id === updated.id ? updated : i)));
        showToast(`Đã cập nhật "${updated.name}".`, "success");
      }
      setEditingRow(null);
    } catch (err: any) {
      showToast(err.message || "Thao tác thất bại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteFixedItem(id);
      onDataChange(items.filter((i) => i.id !== id));
      showToast("Đã xóa vật tư thành công.", "success");
    } catch (err: any) {
      showToast(err.message || "Xóa thất bại.", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Split items by type for display
  const packagingItems = items.filter((i) => i.item_type === "packaging");
  const accessoryItems = items.filter((i) => i.item_type === "accessory");

  const renderItemRow = (item: ApiFixedItemCatalog) => {
    const isEditing = editingRow?.id === item.id;
    const isDeleting = deletingId === item.id;
    const isConfirmingDelete = confirmDeleteId === item.id;
    const typeInfo = ITEM_TYPE_LABELS[item.item_type];

    if (isEditing && editingRow) {
      const isBulk = editingRow.inputMode === "bulk";
      const isQtyInvalid = isBulk && (editingRow.lotQuantity <= 0);
      return (
        <tr key={item.id} className="bg-muted/20">
          <td className="p-2" colSpan={4}>
            <div className="flex flex-col gap-2">
              {/* Row 1: Name + Type + Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  autoFocus
                  value={editingRow.name}
                  onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                  className="h-8 text-sm font-sans flex-1 min-w-32"
                  placeholder="Tên vật tư..."
                />
                <select
                  value={editingRow.item_type}
                  onChange={(e) => setEditingRow({ ...editingRow, item_type: e.target.value as ItemType })}
                  className="bg-muted border border-border rounded-md px-2 py-1 text-xs font-sans focus:outline-none focus:border-primary h-8 text-foreground"
                >
                  <option value="packaging">Bao bì</option>
                  <option value="accessory">Phụ kiện</option>
                </select>
                <div className="flex items-center gap-1 ml-auto">
                  <Button size="sm" onClick={handleSave} disabled={isSubmitting || isQtyInvalid}
                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1">
                    <Save className="h-3 w-3" />
                    {isSubmitting ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSubmitting}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1">
                    <X className="h-3 w-3" />Hủy
                  </Button>
                </div>
              </div>
              {/* Row 2: Mode toggle + price inputs */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Toggle */}
                <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-mono shrink-0">
                  <button
                    onClick={() => setEditingRow({ ...editingRow, inputMode: "direct" })}
                    className={`px-2.5 py-1 transition-colors duration-150 ${
                      !isBulk ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    Trực tiếp
                  </button>
                  <button
                    onClick={() => setEditingRow({ ...editingRow, inputMode: "bulk" })}
                    className={`px-2.5 py-1 flex items-center gap-1 transition-colors duration-150 ${
                      isBulk ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    <Calculator className="h-2.5 w-2.5" />Theo lô
                  </button>
                </div>
                {!isBulk ? (
                  <Input
                    type={editingRow.isCostFocused ? "number" : "text"}
                    value={editingRow.isCostFocused ? editingRow.costInput : editingRow.cost > 0 ? formatVND(editingRow.cost) : ""}
                    onFocus={handleCostFocus} onBlur={handleCostBlur}
                    onChange={(e) => setEditingRow({ ...editingRow, costInput: e.target.value })}
                    className="h-8 text-sm font-mono text-right w-36" placeholder="Đơn giá (đ)"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Input
                      type={editingRow.isTotalPriceFocused ? "number" : "text"}
                      value={editingRow.isTotalPriceFocused ? editingRow.totalPriceInput : editingRow.totalPrice > 0 ? formatVND(editingRow.totalPrice) : ""}
                      onFocus={handleTotalPriceFocus} onBlur={handleTotalPriceBlur}
                      onChange={(e) => setEditingRow({ ...editingRow, totalPriceInput: e.target.value })}
                      className="h-8 text-sm font-mono text-right w-32" placeholder="Giá tổng (đ)"
                    />
                    <span className="text-muted-foreground text-xs font-mono">÷</span>
                    <div className="relative">
                      <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        type={editingRow.isLotQtyFocused ? "number" : "text"}
                        value={editingRow.isLotQtyFocused ? editingRow.lotQuantityInput : editingRow.lotQuantity > 0 ? editingRow.lotQuantity.toLocaleString("vi-VN") : ""}
                        onFocus={handleLotQtyFocus} onBlur={handleLotQtyBlur}
                        onChange={(e) => setEditingRow({ ...editingRow, lotQuantityInput: e.target.value })}
                        className="h-8 text-sm font-mono text-right w-24 pl-6"
                        placeholder="SL"
                      />
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">=</span>
                    {/* Live preview — real-time, no blur needed */}
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${
                      computedUnitCost > 0
                        ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-300"
                        : isQtyInvalid
                        ? "bg-rose-950/30 border-rose-700/50 text-rose-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}>
                      {computedUnitCost > 0 ? `${formatVND(computedUnitCost)}/cái` : isQtyInvalid ? "SL = 0!" : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr
        key={item.id}
        className="hover:bg-muted/20 transition-colors duration-150"
      >
        <td className="p-3 font-medium text-sm text-foreground">{item.name}</td>
        <td className="p-3">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold uppercase tracking-wider ${typeInfo.color}`}
          >
            {typeInfo.label}
          </span>
        </td>
        <td className="p-3 text-right font-mono tracking-tight text-sm text-foreground">
          {formatVND(item.cost)}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1.5 justify-end">
            {isConfirmingDelete ? (
              <>
                <span className="text-[10px] text-rose-400 font-mono mr-1">
                  Xác nhận xóa?
                </span>
                <Button
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  className="h-7 px-2 bg-rose-600 hover:bg-rose-500 text-white text-xs"
                >
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDeleteId(null)}
                  className="h-7 px-2 text-muted-foreground text-xs"
                >
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(item)}
                  disabled={!!editingRow || isDeleting}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Chỉnh sửa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  disabled={!!editingRow || isDeleting}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-950/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Xóa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderNewRow = () => {
    if (!editingRow || editingRow.id !== null) return null;
    const isBulk = editingRow.inputMode === "bulk";
    const isQtyInvalid = isBulk && editingRow.lotQuantity <= 0;
    return (
      <tr className="bg-emerald-950/10 border-t border-emerald-800/30">
        <td className="p-2" colSpan={4}>
          <div className="flex flex-col gap-2">
            {/* Row 1: Name + Type + Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                autoFocus
                value={editingRow.name}
                onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                className="h-8 text-sm font-sans flex-1 min-w-32"
                placeholder="Tên vật tư mới..."
              />
              <select
                value={editingRow.item_type}
                onChange={(e) => setEditingRow({ ...editingRow, item_type: e.target.value as ItemType })}
                className="bg-muted border border-border rounded-md px-2 py-1 text-xs font-sans focus:outline-none focus:border-primary h-8 text-foreground"
              >
                <option value="packaging">Bao bì</option>
                <option value="accessory">Phụ kiện</option>
              </select>
              <div className="flex items-center gap-1 ml-auto">
                <Button size="sm" onClick={handleSave} disabled={isSubmitting || isQtyInvalid}
                  className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1">
                  <Save className="h-3 w-3" />
                  {isSubmitting ? "Đang lưu..." : "Thêm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSubmitting}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1">
                  <X className="h-3 w-3" />Hủy
                </Button>
              </div>
            </div>
            {/* Row 2: Mode toggle + price inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-mono shrink-0">
                <button
                  onClick={() => setEditingRow({ ...editingRow, inputMode: "direct" })}
                  className={`px-2.5 py-1 transition-colors duration-150 ${
                    !isBulk ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  Trực tiếp
                </button>
                <button
                  onClick={() => setEditingRow({ ...editingRow, inputMode: "bulk" })}
                  className={`px-2.5 py-1 flex items-center gap-1 transition-colors duration-150 ${
                    isBulk ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  <Calculator className="h-2.5 w-2.5" />Theo lô
                </button>
              </div>
              {!isBulk ? (
                <Input
                  type={editingRow.isCostFocused ? "number" : "text"}
                  value={editingRow.isCostFocused ? editingRow.costInput : editingRow.cost > 0 ? formatVND(editingRow.cost) : ""}
                  onFocus={handleCostFocus} onBlur={handleCostBlur}
                  onChange={(e) => setEditingRow({ ...editingRow, costInput: e.target.value })}
                  className="h-8 text-sm font-mono text-right w-36" placeholder="Đơn giá (đ)"
                />
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Input
                    type={editingRow.isTotalPriceFocused ? "number" : "text"}
                    value={editingRow.isTotalPriceFocused ? editingRow.totalPriceInput : editingRow.totalPrice > 0 ? formatVND(editingRow.totalPrice) : ""}
                    onFocus={handleTotalPriceFocus} onBlur={handleTotalPriceBlur}
                    onChange={(e) => setEditingRow({ ...editingRow, totalPriceInput: e.target.value })}
                    className="h-8 text-sm font-mono text-right w-32" placeholder="Giá tổng (đ)"
                  />
                  <span className="text-muted-foreground text-xs font-mono">÷</span>
                  <div className="relative">
                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type={editingRow.isLotQtyFocused ? "number" : "text"}
                      value={editingRow.isLotQtyFocused ? editingRow.lotQuantityInput : editingRow.lotQuantity > 0 ? editingRow.lotQuantity.toLocaleString("vi-VN") : ""}
                      onFocus={handleLotQtyFocus} onBlur={handleLotQtyBlur}
                      onChange={(e) => setEditingRow({ ...editingRow, lotQuantityInput: e.target.value })}
                      className="h-8 text-sm font-mono text-right w-24 pl-6" placeholder="SL"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs font-mono">=</span>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${
                    computedUnitCost > 0
                      ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-300"
                      : isQtyInvalid
                      ? "bg-rose-950/30 border-rose-700/50 text-rose-400"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {computedUnitCost > 0 ? `${formatVND(computedUnitCost)}/cái` : isQtyInvalid ? "SL = 0!" : "—"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            <h2 className="font-mono text-base font-bold tracking-wide uppercase text-foreground">
              Danh Mục Phụ Kiện & Bao Bì
            </h2>
          </div>
          <Button
            onClick={startCreate}
            disabled={!!editingRow}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Thêm vật tư
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
          Quản lý danh sách vật tư phụ (bao bì, phụ kiện) dùng đính kèm vào
          sản phẩm. Đơn giá tại đây sẽ được hệ thống tự động cộng vào giá vốn
          (COGS) khi tính toán.
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <span className="text-2xl font-mono font-bold text-foreground">
              {items.length}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5 font-mono">
              Tổng vật tư
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Box className="h-4 w-4 text-amber-400" />
              <span className="text-2xl font-mono font-bold text-foreground">
                {packagingItems.length}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-mono">
              Bao bì
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Tag className="h-4 w-4 text-violet-400" />
              <span className="text-2xl font-mono font-bold text-foreground">
                {accessoryItems.length}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-mono">
              Phụ kiện
            </span>
          </div>
        </div>

        {/* Main table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground text-left">
                  <th className="p-3 w-[40%]">Tên vật tư</th>
                  <th className="p-3 w-[20%]">Loại</th>
                  <th className="p-3 w-[20%] text-right">Đơn giá</th>
                  <th className="p-3 w-[20%] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((item) => renderItemRow(item))}
                {renderNewRow()}
                {items.length === 0 && !editingRow && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-10 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 opacity-30" />
                        <span className="text-xs font-mono uppercase tracking-wider">
                          Chưa có vật tư nào trong danh mục
                        </span>
                        <span className="text-[11px]">
                          Bấm{" "}
                          <strong className="text-foreground">
                            + Thêm vật tư
                          </strong>{" "}
                          để bắt đầu.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast */}
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
