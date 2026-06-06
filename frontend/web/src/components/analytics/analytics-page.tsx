'use client';

import React, { useEffect, useState } from 'react';
import { Wrench, Sparkles, TrendingUp, AlertTriangle, AlertCircle, ShoppingBag, Layers, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SvgCharts } from './svg-charts';
import {
  getAnalyticsSummary,
  getAnalyticsMaterials,
  getAnalyticsMachines,
  resetMachineMaintenance,
  AnalyticsSummaryResult,
  MaterialAnalytics,
  MachineAnalytics,
} from '@/core/api/client';

export function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummaryResult | null>(null);
  const [materials, setMaterials] = useState<MaterialAnalytics[]>([]);
  const [machines, setMachines] = useState<MachineAnalytics | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [sumRes, matRes, machRes] = await Promise.all([
        getAnalyticsSummary(),
        getAnalyticsMaterials(),
        getAnalyticsMachines(),
      ]);
      setSummary(sumRes);
      setMaterials(matRes);
      setMachines(machRes);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu Analytics:', err);
      setError(err.message || 'Không thể kết nối tới backend API. Hãy kiểm tra kết nối mạng của bạn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMaintenanceReset = async () => {
    if (!confirm('Bạn có chắc chắn muốn thiết lập lại (Reset) mốc bảo trì cho máy in? Hành động này sẽ đặt giờ chạy kể từ lần bảo trì trước về 0.')) {
      return;
    }

    try {
      setResetting(true);
      const result = await resetMachineMaintenance();
      if (machines) {
        setMachines({
          ...machines,
          reset_hours: result.reset_hours,
          hours_since_maintenance: result.hours_since_maintenance,
          needs_maintenance: result.needs_maintenance,
        });
      }
      alert('Đã thiết lập lại mốc bảo trì thành công!');
    } catch (err: any) {
      alert(`Lỗi thiết lập lại bảo trì: ${err.message || 'Không xác định'}`);
    } finally {
      setResetting(false);
    }
  };

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Row skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/40 border-border/60">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
        {/* Chart skeleton */}
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-6 h-80" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/50 flex items-center justify-center text-rose-500 mb-4 border border-rose-800">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-mono text-xl font-bold mb-2">Không thể tải báo cáo hiệu suất</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-6">{error}</p>
        <Button onClick={() => { setLoading(true); loadData(); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
          Thử lại
        </Button>
      </div>
    );
  }

  const totals = summary?.totals || {
    total_revenue: 0,
    total_cogs: 0,
    total_wasted_cogs: 0,
    total_profit: 0,
    total_orders: 0,
  };

  // Maintenance threshold progress (limit max to 100%)
  const maintenancePercentage = machines
    ? Math.min((machines.hours_since_maintenance / machines.maintenance_hours_threshold) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
          THỐNG KÊ HIỆU SUẤT XƯỞNG IN
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Báo cáo doanh số bán hàng, lượng tiêu hao vật liệu và mốc vận hành thiết bị phần cứng
        </p>
      </div>

      {/* =========================================================================
          1. KPI METRIC CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="bg-card border-border hover:border-emerald-500/40 transition-colors duration-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doanh thu</span>
              <p className="text-xl lg:text-2xl font-bold text-foreground font-mono">
                {formatCurrency(totals.total_revenue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* COGS Card */}
        <Card className="bg-card border-border hover:border-amber-500/40 transition-colors duration-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giá vốn (COGS)</span>
              <p className="text-xl lg:text-2xl font-bold text-foreground font-mono">
                {formatCurrency(totals.total_cogs)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-center text-amber-500">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="bg-card border-border hover:border-cyan-500/40 transition-colors duration-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lợi nhuận ròng</span>
              <p className="text-xl lg:text-2xl font-bold text-foreground font-mono">
                {formatCurrency(totals.total_profit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center text-cyan-500">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Orders Card */}
        <Card className="bg-card border-border hover:border-primary/40 transition-colors duration-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đơn đã tạo</span>
              <p className="text-xl lg:text-2xl font-bold text-foreground font-mono">
                {totals.total_orders} đơn
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          2. SVG GRAPH & WASTED COST WARNING
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Chart Column (2 cols width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <SvgCharts data={summary?.monthly || []} />

          {/* Wasted Cost (hao hụt đơn hủy) Warning block */}
          {totals.total_wasted_cogs > 0 && (
            <div className="rounded-xl border border-rose-900 bg-rose-950/20 p-4 flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-rose-400">
                  Hao hụt nhựa do Hủy đơn (Wasted Cost)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hệ thống ghi nhận tổng cộng <strong className="text-rose-400 font-semibold">{formatCurrency(totals.total_wasted_cogs)}</strong> chi phí nguyên vật liệu và khấu hao hao tổn từ các đơn hàng bị hủy đã đánh dấu tính hao hụt. Giá trị này đã được trừ trực tiếp vào lợi nhuận ròng của xưởng.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Columns (1 col width on desktop) */}
        <div className="space-y-6">
          {/* =========================================================================
              3. MATERIAL WEIGHT TRACKERS
              ========================================================================= */}
          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Tiêu Thụ Vật Liệu
              </h3>
              
              {materials.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Chưa phát sinh tiêu thụ nhựa</p>
              ) : (
                <div className="space-y-4">
                  {materials.map((mat, idx) => {
                    const weightKg = mat.total_weight_consumed / 1000;
                    // Find max weight in list to scale bars
                    const maxWeight = Math.max(...materials.map(m => m.total_weight_consumed), 1000);
                    const barWidth = `${(mat.total_weight_consumed / maxWeight) * 100}%`;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{mat.material_name}</span>
                          <span className="font-mono text-muted-foreground">{weightKg.toFixed(2)} kg</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            style={{ width: barWidth }}
                            className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* =========================================================================
              4. MACHINE RUNTIME & MAINTENANCE CHECKLIST
              ========================================================================= */}
          {machines && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Bảo Trì Máy In
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${machines.needs_maintenance ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {machines.needs_maintenance ? 'Cần bảo trì' : 'Bình thường'}
                    </span>
                  </div>
                </div>

                {/* KPI Display */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                      {machines.hours_since_maintenance.toFixed(1)}h
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Tổng giờ chạy: {machines.total_print_time_hours.toFixed(1)}h
                    </span>
                  </div>

                  {/* Progress towards 100h mark */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Mốc bảo trì tiếp theo</span>
                      <span>100 giờ chạy</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        style={{ width: `${maintenancePercentage}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          machines.needs_maintenance ? 'bg-rose-600' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Warning label if needs_maintenance */}
                  {machines.needs_maintenance && (
                    <div className="rounded-lg bg-rose-950/40 border border-rose-900/60 p-2.5 flex gap-2 items-start text-[11px] text-rose-300 leading-relaxed">
                      <Activity className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>CẢNH BÁO PHẦN CỨNG:</strong> Máy in đã chạy liên tục vượt ngưỡng 100 giờ mà chưa tra mỡ bò / cân bàn. Hãy kiểm tra trục z và bấm reset sau khi hoàn tất.
                      </span>
                    </div>
                  )}

                  {/* Reset action button */}
                  <Button
                    onClick={handleMaintenanceReset}
                    disabled={resetting}
                    variant="outline"
                    className="w-full mt-2 border-border hover:bg-muted text-foreground gap-2 cursor-pointer transition-colors duration-150 h-10 font-semibold"
                  >
                    <Wrench className="w-4 h-4 text-primary" />
                    <span>{resetting ? 'Đang cập nhật...' : 'Bảo trì xong — Reset'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
