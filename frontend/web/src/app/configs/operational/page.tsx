"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApiOperationalConfigs,
  ApiProduct,
  ApiMaterial,
  getOperationalConfigs,
  getProducts,
  getMaterials,
} from "@/core/api/client";
import { OperationalConfigForm } from "@/components/configs/OperationalConfigForm";
import { CostImpactSimulator } from "@/components/configs/CostImpactSimulator";

export default function OperationalConfigPage() {
  const [dbConfigs, setDbConfigs] = useState<ApiOperationalConfigs | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<ApiOperationalConfigs | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [configsData, productsData, materialsData] = await Promise.all([
        getOperationalConfigs(),
        getProducts(),
        getMaterials(),
      ]);
      setDbConfigs(configsData);
      setDraftConfigs(configsData); // Draft starts equal to DB state
      setProducts(productsData);
      setMaterials(materialsData);
    } catch (err: any) {
      setError(err.message || "Không thể tải cấu hình gốc từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When form saves successfully → update dbConfigs so simulator baseline refreshes
  const handleSaveSuccess = (updated: ApiOperationalConfigs) => {
    setDbConfigs(updated);
    setDraftConfigs(updated);
  };

  // isDirty: draft differs from DB (used to control simulator delta display)
  const isDirty =
    !!dbConfigs &&
    !!draftConfigs &&
    (draftConfigs.machine_depreciation_per_hour !==
      dbConfigs.machine_depreciation_per_hour ||
      draftConfigs.labor_cost_per_minute !== dbConfigs.labor_cost_per_minute);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm font-mono text-muted-foreground">
          Đang tải cấu hình máy chủ LAN...
        </span>
      </div>
    );
  }

  if (error || !dbConfigs || !draftConfigs) {
    return (
      <div className="space-y-4">
        <div className="bg-rose-950/30 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Đã xảy ra lỗi hệ thống</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Column 1: Settings Form */}
      <div className="lg:col-span-5">
        <OperationalConfigForm
          initialData={dbConfigs}
          onSaveSuccess={handleSaveSuccess}
          onDraftChange={(draft) => setDraftConfigs(draft)}
        />
      </div>

      {/* Column 2: Cost Impact Simulator */}
      <div className="lg:col-span-7">
        <CostImpactSimulator
          dbConfigs={dbConfigs}
          draftConfigs={draftConfigs}
          products={products}
          materials={materials}
          isDirty={isDirty}
        />
      </div>
    </div>
  );
}
