"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiProduct,
  ApiMaterial,
  ApiFixedItem,
  ApiOperationalConfigs,
  deleteProduct,
} from "@/core/api/client";
import { formatVND, formatDecimal } from "@/core/utils/format";
import { calculateProductCosts } from "@/core/calculation/engine";
import {
  Search,
  ArrowUpDown,
  Edit,
  Trash2,
  Package,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

// Formatter for time duration in seconds (H:MM:SS)
function formatTimeHMS(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface ProductListProps {
  products: ApiProduct[];
  materials: ApiMaterial[];
  fixedItemsCatalog: ApiFixedItem[];
  operationalConfigs: ApiOperationalConfigs;
  onEdit: (product: ApiProduct) => void;
  onRefresh: () => void;
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

// Sub-component for accessory popover cell
function FixedItemsPopoverCell({
  items,
}: {
  items: { id: number; name: string; quantity: number; item_type: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!items || items.length === 0) {
    return <span className="text-muted-foreground text-xs italic">—</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-blue-950/20 border border-blue-900 text-blue-400 hover:bg-blue-950/40 transition-colors shrink-0 cursor-pointer"
      >
        {items.length} vật tư
      </button>

      {isOpen && (
        <>
          {/* Overlay to catch clicks outside the popover */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          {/* Popover popup positioned top-center */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-3 bg-popover border border-border rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-popover border-r border-b border-border rotate-45" />
            <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block border-b border-border pb-1 mb-1.5">
              Danh sách chi tiết
            </span>
            <div className="space-y-1.5 font-mono text-xs max-h-32 overflow-y-auto">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex justify-between items-center text-foreground gap-2"
                >
                  <span className="truncate flex-1 text-left" title={it.name}>
                    • {it.name}
                  </span>
                  <span className="text-muted-foreground/80 shrink-0 font-semibold">
                    x{it.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ProductList({
  products,
  materials,
  fixedItemsCatalog,
  operationalConfigs,
  onEdit,
  onRefresh,
  onSuccessMessage,
  onErrorMessage,
}: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<
    number | "all"
  >("all");

  // Sorting state
  const [sortBy, setSortBy] = useState<"name" | "cogs" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Deletion confirmation state
  const [productToDelete, setProductToDelete] = useState<ApiProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pre-calculate prices and parameters using client-side calculation engine
  const processedProducts = useMemo(() => {
    return products.map((product) => {
      const material = materials.find((m) => m.id === product.material_id);
      const pricing = calculateProductCosts({
        weight_gram: product.weight_gram,
        price_per_kg: material?.price_per_kg || 0,
        fail_rate: material?.fail_rate || 1.0,
        print_time_seconds: product.print_time_seconds,
        machine_depreciation_per_hour:
          Number(operationalConfigs.machine_depreciation_per_hour) || 0,
        labor_time_minutes: product.labor_time_minutes,
        labor_cost_per_minute:
          Number(operationalConfigs.labor_cost_per_minute) || 0,
        fixed_items: product.fixed_items.map((fi) => ({
          cost: fi.cost || 0,
          quantity: fi.quantity || 1,
        })),
        margin_override: product.margin_override,
        default_margin: material?.default_margin || 0.4,
      });

      return {
        ...product,
        pricing,
        material_name: material?.name || "Không rõ",
      };
    });
  }, [products, materials, operationalConfigs]);

  // Filter and Sort processed list
  const filteredProducts = useMemo(() => {
    let result = [...processedProducts];

    // 1. Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // 2. Material filter
    if (selectedMaterialFilter !== "all") {
      result = result.filter((p) => p.material_id === selectedMaterialFilter);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA: any = a.name.toLowerCase();
      let valB: any = b.name.toLowerCase();

      if (sortBy === "cogs") {
        valA = a.pricing.totalCOGS;
        valB = b.pricing.totalCOGS;
      } else if (sortBy === "price") {
        valA = a.pricing.finalUnitPrice;
        valB = b.pricing.finalUnitPrice;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [processedProducts, searchTerm, selectedMaterialFilter, sortBy, sortOrder]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      onSuccessMessage(
        `Đã xóa sản phẩm mẫu ${productToDelete.name} thành công.`
      );
      setProductToDelete(null);
      onRefresh();
    } catch (err: any) {
      onErrorMessage(
        err.message || "Xóa sản phẩm mẫu thất bại. Vui lòng kiểm tra lại."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sản phẩm mẫu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4"
          />
        </div>

        {/* Filter Dropdown and Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedMaterialFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMaterialFilter(
                  val === "all" ? "all" : Number(val)
                );
              }}
              className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              <option value="all">Tất cả loại nhựa</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  Nhựa: {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Wrapper */}
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground select-none">
              <th
                onClick={() => toggleSort("name")}
                className="py-3 px-4 text-left font-bold cursor-pointer hover:text-foreground transition-colors h-10"
              >
                <div className="flex items-center gap-1">
                  Tên sản phẩm
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
              </th>
              <th className="py-3 px-4 font-bold h-10">Loại nhựa</th>
              <th className="py-3 px-4 font-bold h-10">Thông số in</th>
              <th className="py-3 px-4 font-bold text-center h-10">Vật tư kèm</th>
              <th
                onClick={() => toggleSort("cogs")}
                className="py-3 px-4 text-right font-bold cursor-pointer hover:text-foreground transition-colors h-10"
              >
                <div className="flex items-center justify-end gap-1">
                  Giá vốn (COGS)
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("price")}
                className="py-3 px-4 text-right font-bold cursor-pointer hover:text-foreground transition-colors h-10"
              >
                <div className="flex items-center justify-end gap-1">
                  Giá bán gợi ý
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
              </th>
              <th className="py-3 px-4 text-center font-bold h-10 w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans text-xs">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-muted/10 transition-colors group"
              >
                {/* 1. Name */}
                <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                  {product.name}
                </td>

                {/* 2. Material Name */}
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/20 border border-blue-900/60 text-blue-400">
                    {product.material_name}
                  </span>
                </td>

                {/* 3. Printing Parameters */}
                <td className="py-3.5 px-4 leading-normal text-muted-foreground">
                  <div>
                    • Trọng lượng:{" "}
                    <strong className="text-foreground font-mono">
                      {formatDecimal(product.weight_gram, 2)}g
                    </strong>
                  </div>
                  <div>
                    • Thời gian in:{" "}
                    <strong className="text-foreground font-mono">
                      {formatTimeHMS(product.print_time_seconds)}
                    </strong>
                  </div>
                  {product.labor_time_minutes > 0 && (
                    <div>
                      • Công thợ:{" "}
                      <strong className="text-foreground font-mono">
                        {product.labor_time_minutes} phút
                      </strong>
                    </div>
                  )}
                </td>

                {/* 4. Accessories Popover Cell */}
                <td className="py-3.5 px-4 text-center">
                  <FixedItemsPopoverCell items={product.fixed_items} />
                </td>

                {/* 5. COGS */}
                <td className="py-3.5 px-4 text-right font-mono text-foreground font-medium">
                  {formatVND(product.pricing.totalCOGS)}
                </td>

                {/* 6. Suggested Price */}
                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="flex flex-col items-end">
                    <span>{formatVND(product.pricing.finalUnitPrice)}</span>
                    <span className="text-[9px] text-muted-foreground/60 font-semibold font-sans mt-0.5">
                      Biên: {Math.round(product.pricing.appliedMargin * 100)}%
                    </span>
                  </div>
                </td>

                {/* 7. Actions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      title="Chỉnh sửa sản phẩm"
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded text-rose-500 hover:bg-rose-950/30 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <span className="text-sm font-semibold">
                      Không tìm thấy sản phẩm mẫu nào
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">
                      Hãy thêm sản phẩm mới hoặc điều chỉnh bộ tìm kiếm/lọc nhựa.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" /> Xác nhận xóa sản phẩm
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              Bạn có chắc chắn muốn xóa sản phẩm mẫu{" "}
              <strong className="text-foreground font-mono">
                {productToDelete.name}
              </strong>{" "}
              không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={() => setProductToDelete(null)}
                className="text-xs"
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-rose-600 text-white hover:bg-rose-500 text-xs font-bold"
                disabled={isDeleting}
              >
                {isDeleting ? "Đang xóa..." : "Đồng ý xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
