"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiFixedItemCatalog, getFixedItems } from "@/core/api/client";
import { FixedItemsManager } from "@/components/configs/FixedItemsManager";

export default function FixedItemsConfigPage() {
  const [items, setItems] = useState<ApiFixedItemCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFixedItems();
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh mục vật tư phụ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm font-mono text-muted-foreground">
          Đang tải danh mục vật tư...
        </span>
      </div>
    );
  }

  if (error) {
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
    <FixedItemsManager
      items={items}
      onDataChange={setItems}
    />
  );
}
