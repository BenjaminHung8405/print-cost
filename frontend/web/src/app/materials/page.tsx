"use client";

import React, { useState, useEffect } from "react";
import { Plus, RefreshCw, Layers, Coins, TrendingUp, AlertCircle, CheckCircle2, X } from "lucide-react";
import { ApiMaterial, ApiOperationalConfigs, getMaterials, getOperationalConfigs } from "@/core/api/client";
import { formatVND, formatDecimal } from "@/core/utils/format";
import { MaterialList } from "@/components/materials/MaterialList";
import { MaterialForm } from "@/components/materials/MaterialForm";
import { Button } from "@/components/ui/button";

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [operationalConfigs, setOperationalConfigs] = useState<ApiOperationalConfigs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Material Form Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ApiMaterial | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Fetch all required data from backend
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [materialsData, configsData] = await Promise.all([
        getMaterials(),
        getOperationalConfigs(),
      ]);
      setMaterials(materialsData);
      setOperationalConfigs(configsData);
    } catch (err: any) {
      setError(err.message || "Không thể tải cấu hình vật liệu từ máy chủ LAN.");
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
    // Dismiss after 4 seconds
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // KPI calculations
  const totalCount = materials.length;
  
  const averagePrice = totalCount > 0 
    ? Math.round(materials.reduce((sum, m) => sum + Number(m.price_per_kg), 0) / totalCount)
    : 0;

  const averageMargin = totalCount > 0
    ? materials.reduce((sum, m) => sum + Number(m.default_margin), 0) / totalCount
    : 0;

  const handleEditMaterial = (material: ApiMaterial) => {
    setSelectedMaterial(material);
    setIsDrawerOpen(true);
  };

  const handleCreateMaterial = () => {
    setSelectedMaterial(null);
    setIsDrawerOpen(true);
  };

  const handleFormSave = () => {
    setIsDrawerOpen(false);
    setSelectedMaterial(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased pb-12">
      
      {/* 1. Header & Navigation breadcrumbs */}
      <div className="border-b border-border bg-card/20 py-4 px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>CẤU HÌNH GỐC</span>
              <span>/</span>
              <span className="text-muted-foreground">DANH MỤC NHỰA</span>
            </div>
            <h1 className="text-xl md:text-2xl font-mono font-bold tracking-wider text-foreground mt-1.5 uppercase">
              QUẢN LÝ DANH MỤC NHỰA
            </h1>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={isLoading}
              title="Làm mới bảng"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={handleCreateMaterial}
              className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold font-sans shadow-md shadow-emerald-950/20 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Thêm nhựa mới
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Page Content wrapper */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-8 py-6 space-y-6">
        
        {/* KPI metrics row summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total plastics */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block">
                Tổng số loại nhựa
              </span>
              <span className="text-2xl font-mono font-bold text-foreground tracking-wider">
                {isLoading ? "..." : totalCount}
              </span>
            </div>
          </div>

          {/* Card 2: Average buy price */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block">
                Giá trung bình / kg
              </span>
              <span className="text-xl font-mono font-bold text-foreground tracking-wider">
                {isLoading ? "..." : formatVND(averagePrice)}
              </span>
            </div>
          </div>

          {/* Card 3: Average margin */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider block">
                Biên lợi nhuận TB
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                {isLoading ? "..." : `${formatDecimal(averageMargin * 100, 1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Loading and Error states or List table content */}
        {isLoading ? (
          <div className="border border-border bg-card rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
            <span className="text-sm text-muted-foreground font-mono">Đang đồng bộ dữ liệu vật liệu từ máy chủ LAN...</span>
          </div>
        ) : error ? (
          <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto border-dashed">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div className="space-y-1">
              <h3 className="font-mono font-bold uppercase text-foreground text-sm">Lỗi đồng bộ dữ liệu</h3>
              <p className="text-xs text-muted-foreground max-w-md">{error}</p>
            </div>
            <Button
              onClick={fetchData}
              className="bg-muted hover:bg-muted/80 text-foreground border border-border text-xs py-1.5"
            >
              Thử tải lại
            </Button>
          </div>
        ) : (
          <MaterialList
            materials={materials}
            onEdit={handleEditMaterial}
            onRefresh={fetchData}
            onSuccessMessage={(msg) => showToast(msg, "success")}
            onErrorMessage={(msg) => showToast(msg, "error")}
          />
        )}
      </div>

      {/* 3. Form Drawer Component */}
      {operationalConfigs && (
        <MaterialForm
          key={selectedMaterial?.id || "new-material"}
          isOpen={isDrawerOpen}
          materialData={selectedMaterial}
          operationalConfigs={operationalConfigs}
          otherMaterials={materials}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedMaterial(null);
          }}
          onSave={handleFormSave}
          onSuccessMessage={(msg) => showToast(msg, "success")}
          onErrorMessage={(msg) => showToast(msg, "error")}
        />
      )}

      {/* 4. Self-dismissing toast feedback system */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-2xl min-w-72 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}>
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
              className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
