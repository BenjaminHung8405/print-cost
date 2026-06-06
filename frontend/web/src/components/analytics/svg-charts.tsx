'use client';

import React, { useState } from 'react';
import { MonthlyAnalytics } from '@/core/api/client';

interface SvgChartsProps {
  data: MonthlyAnalytics[];
}

export function SvgCharts({ data }: SvgChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback if no data is present
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-xl bg-card text-muted-foreground text-sm">
        Chưa có dữ liệu thống kê theo tháng
      </div>
    );
  }

  // Dimensions
  const width = 800;
  const height = 320;
  const paddingTop = 40;
  const paddingBottom = 40;
  const paddingLeft = 70;
  const paddingRight = 30;

  // Find max value for scaling (ensure at least 1,000,000 to avoid division by zero)
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.cogs, d.profit, d.wasted_cogs)),
    100000
  ) * 1.15; // Add 15% headroom

  const scaleY = (val: number) => {
    const chartHeight = height - paddingTop - paddingBottom;
    return height - paddingBottom - (val / maxVal) * chartHeight;
  };

  const scaleX = (index: number) => {
    const chartWidth = width - paddingLeft - paddingRight;
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  // Generate grid lines
  const gridLinesCount = 5;
  const gridLines = Array.from({ length: gridLinesCount }, (_, i) => {
    const val = (maxVal / (gridLinesCount - 1)) * i;
    return {
      y: scaleY(val),
      label: formatShortCurrency(val),
    };
  });

  // Helpers to build SVG paths
  const getPathData = (key: 'revenue' | 'cogs' | 'profit') => {
    if (data.length === 0) return '';
    return data
      .map((d, index) => {
        const x = scaleX(index);
        const y = scaleY(d[key]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const getAreaPathData = (key: 'revenue' | 'cogs' | 'profit') => {
    const linePath = getPathData(key);
    if (!linePath) return '';
    const firstX = scaleX(0);
    const lastX = scaleX(data.length - 1);
    const baseY = height - paddingBottom;
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  // Currency formatter
  function formatShortCurrency(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return `${value.toFixed(0)} đ`;
  }

  function formatFullCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  return (
    <div className="relative bg-card border border-border rounded-xl p-5 select-none">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-mono text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Biểu Đồ Tài Chính Xưởng In
        </h3>
        
        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-500 rounded-full" />
            <span className="text-muted-foreground">Doanh thu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded-full" />
            <span className="text-muted-foreground">Chi phí</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-500 rounded-full" />
            <span className="text-muted-foreground">Lợi nhuận</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas wrapper */}
      <div className="relative overflow-x-auto">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="min-w-[700px] overflow-visible"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="cogs-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((line, idx) => (
            <g key={idx} className="opacity-40">
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={line.y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-muted-foreground"
              >
                {line.label}
              </text>
            </g>
          ))}

          {/* Filled Areas under paths */}
          {data.length > 1 && (
            <>
              <path d={getAreaPathData('revenue')} fill="url(#revenue-grad)" />
              <path d={getAreaPathData('cogs')} fill="url(#cogs-grad)" />
              <path d={getAreaPathData('profit')} fill="url(#profit-grad)" />
            </>
          )}

          {/* Line paths */}
          <path
            d={getPathData('revenue')}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={getPathData('cogs')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={getPathData('profit')}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Invisible interactive hover vertical bars */}
          {data.map((d, index) => {
            const cx = scaleX(index);
            const colWidth = (width - paddingLeft - paddingRight) / Math.max(data.length - 1, 1);
            return (
              <g key={index}>
                {/* Vertical interactive line */}
                {hoveredIndex === index && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={height - paddingBottom}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-primary/30"
                  />
                )}

                {/* Hotspot overlay */}
                <rect
                  x={cx - colWidth / 2}
                  y={paddingTop}
                  width={colWidth}
                  height={height - paddingTop - paddingBottom}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Nodes with outline */}
                {data.length === 1 || hoveredIndex === index ? (
                  <>
                    {/* Revenue Node */}
                    <circle
                      cx={cx}
                      cy={scaleY(d.revenue)}
                      r="4.5"
                      fill="#10b981"
                      stroke="var(--background)"
                      strokeWidth="1.5"
                    />
                    {/* COGS Node */}
                    <circle
                      cx={cx}
                      cy={scaleY(d.cogs)}
                      r="4.5"
                      fill="#f59e0b"
                      stroke="var(--background)"
                      strokeWidth="1.5"
                    />
                    {/* Profit Node */}
                    <circle
                      cx={cx}
                      cy={scaleY(d.profit)}
                      r="4.5"
                      fill="#06b6d4"
                      stroke="var(--background)"
                      strokeWidth="1.5"
                    />
                  </>
                ) : null}
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, index) => {
            const x = scaleX(index);
            // Show all labels if <= 6 months, else show first, last, and dynamic intervals
            const shouldShow =
              data.length <= 6 ||
              index === 0 ||
              index === data.length - 1 ||
              index === Math.floor(data.length / 2);

            if (!shouldShow) return null;

            return (
              <text
                key={index}
                x={x}
                y={height - paddingBottom + 20}
                textAnchor="middle"
                className="text-[10px] font-mono fill-muted-foreground"
              >
                {d.month}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Hover Floating Details Card */}
      {hoveredIndex !== null && (
        <div className="absolute top-16 left-20 bg-card/95 backdrop-blur-md border border-border p-3.5 rounded-xl shadow-xl space-y-2 z-10 w-52 pointer-events-none transition-all duration-75">
          <p className="text-xs font-mono font-bold text-foreground border-b border-border pb-1">
            Tháng: {data[hoveredIndex].month}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doanh thu:</span>
              <span className="font-semibold text-emerald-500">
                {formatFullCurrency(data[hoveredIndex].revenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chi phí:</span>
              <span className="font-semibold text-amber-500">
                {formatFullCurrency(data[hoveredIndex].cogs)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hao hụt (hủy):</span>
              <span className="font-semibold text-rose-500">
                {formatFullCurrency(data[hoveredIndex].wasted_cogs)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
              <span className="text-muted-foreground font-medium">Lợi nhuận:</span>
              <span className="font-bold text-cyan-500">
                {formatFullCurrency(data[hoveredIndex].profit)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
