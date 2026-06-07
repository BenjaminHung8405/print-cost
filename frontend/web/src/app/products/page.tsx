"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  Layers,
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  Package,
} from "lucide-react";
import {
  ApiProduct,
  ApiMaterial,
  ApiFixedItem,
  ApiOperationalConfigs,
  getProducts,
  getMaterials,
  getFixedItems,
  getOperationalConfigs,
} from "@/core/api/client";
import { formatVND, formatDecimal } from "@/core/utils/format";
import { calculateProductCosts } from "@/core/calculation/engine";
import { ProductList } from "@/components/products/ProductList";
import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [fixedItemsCatalog, setFixedItemsCatalog] = useState<ApiFixedItem[]>([]);
  const [operationalConfigs, setOperationalConfigs] =
    useState<ApiOperationalConfigs | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Fetch all required data from backend
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsData, materialsData, fixedItemsData, configsData] =
        await Promise.all([
          getProducts(),
          getMaterials(),
          getFixedItems(),
          getOperationalConfigs(),
        ]);
      setProducts(productsData);
      setMaterials(materialsData);
      // Map ApiFixedItemCatalog to ApiFixedItem format
      const mappedFixedItems = fixedItemsData.map((item) => ({
        id: item.id,
        name: item.name,
        item_type: item.item_type,
        cost: item.cost,
        quantity: 1, // catalog base quantity
      }));
      setFixedItemsCatalog(mappedFixedItems);
      setOperationalConfigs(configsData);
    } catch (err: any) {
      setError(
        err.message ||
          "Không thể tải thông tin sản phẩm mẫu và cấu hình vận hành từ máy chủ."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger auto-dismiss toast
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // KPI Calculations
  const totalCount = products.length;

  const kpis = React.useMemo(() => {
    if (totalCount === 0 || !operationalConfigs) {
      return { avgCOGS: 0, avgPrice: 0 };
    }

    let totalCOGS = 0;
    let totalSuggestedPrice = 0;

    products.forEach((product) => {
      const material = materials.find((m) => m.id === product.material_id);
      try {
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

        totalCOGS += pricing.totalCOGS;
        totalSuggestedPrice += pricing.finalUnitPrice;
      } catch (e) {
        // Skip invalid rows in summary
      }
    });

    return {
      avgCOGS: Math.round(totalCOGS / totalCount),
      avgPrice: Math.round(totalSuggestedPrice / totalCount),
    };
  }, [products, materials, operationalConfigs, totalCount]);

  const handleEditProduct = (product: ApiProduct) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setIsDrawerOpen(true);
  };

  const handleFormSave = () => {
    setIsDrawerOpen(false);
    setSelectedProduct(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased pb-12">
      {/* 1. Header & Navigation breadcrumbs */}
      <div className="border-b border-border bg-card/20 py-4 px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>HỆ THỐNG</span>
              <span>/</span>
              <span className="text-muted-foreground">DANH MỤC SẢN PHẨM MẪU</span>
            </div>
            <h1 className="text-xl md:text-2xl font-mono font-bold tracking-wider text-foreground mt-1.5 uppercase">
              QUẢN LÝ SẢN PHẨM MẪU
            </h1>
          </div>

          <div className="flex items-center gap-2 mt-3 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="border-border hover:bg-muted font-sans font-semibold text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProduct}
              disabled={isLoading || materials.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-500 font-sans font-bold text-xs shadow-md shadow-blue-950/20"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm sản phẩm mẫu
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 py-6 px-6 md:px-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 flex gap-3 text-rose-500 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold uppercase font-mono tracking-wider block">
                Lỗi tải cấu hình hệ thống
              </span>
              <p className="text-xs leading-relaxed opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg h-8 w-8 flex items-center justify-center shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Warning if no materials exist */}
        {!isLoading && materials.length === 0 && (
          <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 flex gap-3 text-amber-500">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold uppercase font-mono tracking-wider block">
                Chưa cấu hình loại nhựa
              </span>
              <p className="text-xs leading-relaxed opacity-90">
                Hệ thống chưa có loại nhựa nào. Vui lòng chuyển hướng sang mục{" "}
                <strong className="text-foreground">Cấu hình / Danh mục nhựa</strong> để tạo
                phôi nhựa trước khi thiết lập sản phẩm.
              </p>
            </div>
          </div>
        )}

        {/* 3. KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Products */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-md flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-blue-950/20 border border-blue-900 text-blue-500 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                Tổng số sản phẩm mẫu
              </span>
              {isLoading ? (
                <div className="h-6 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-mono font-bold text-foreground">
                  {totalCount} <span className="text-xs text-muted-foreground font-sans font-normal">mẫu</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Average COGS */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-md flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-cyan-950/20 border border-cyan-800 text-cyan-500 rounded-lg">
              <Coins className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                Giá vốn trung bình (COGS)
              </span>
              {isLoading ? (
                <div className="h-6 w-28 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-mono font-bold text-foreground">
                  {formatVND(kpis.avgCOGS)}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Average Suggested Price */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-md flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-emerald-950/20 border border-emerald-900 text-emerald-500 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                Giá bán gợi ý trung bình
              </span>
              {isLoading ? (
                <div className="h-6 w-28 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatVND(kpis.avgPrice)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Table view or Loading skeleton */}
        {isLoading ? (
          <div className="space-y-3 bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex gap-4 mb-4">
              <div className="h-10 bg-muted animate-pulse rounded-lg flex-1 max-w-sm" />
              <div className="h-10 bg-muted animate-pulse rounded-lg w-32" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="h-14 bg-muted/40 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <ProductList
            products={products}
            materials={materials}
            fixedItemsCatalog={fixedItemsCatalog}
            operationalConfigs={operationalConfigs!}
            onEdit={handleEditProduct}
            onRefresh={fetchData}
            onSuccessMessage={(msg) => showToast(msg, "success")}
            onErrorMessage={(msg) => showToast(msg, "error")}
          />
        )}
      </div>

      {/* 5. Product Form Drawer */}
      {operationalConfigs && (
        <ProductForm
          key={selectedProduct?.id || "new-product"}
          isOpen={isDrawerOpen}
          productData={selectedProduct}
          materials={materials}
          fixedItemsCatalog={fixedItemsCatalog}
          operationalConfigs={operationalConfigs}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedProduct(null);
          }}
          onSave={handleFormSave}
          onSuccessMessage={(msg) => showToast(msg, "success")}
          onErrorMessage={(msg) => showToast(msg, "error")}
        />
      )}

      {/* 6. Success/Error Toast notification overlay */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl bg-card animate-in slide-in-from-bottom-5 duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-mono font-bold text-foreground">
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-muted-foreground hover:text-foreground ml-2 rounded p-0.5 hover:bg-muted"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}
