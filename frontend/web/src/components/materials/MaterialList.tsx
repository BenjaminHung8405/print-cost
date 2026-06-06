'use client';

import React, { useState } from 'react';
import { Search, Edit2, Trash2, ArrowUpDown, Coins, Sparkles, Percent } from 'lucide-react';

interface ApiMaterial {
  id: number;
  name: string;
  price_per_kg: number;
  fail_rate: number;
  default_margin: number;
}

interface MaterialListProps {
  materials: ApiMaterial[];
  onEdit: (material: ApiMaterial) => void;
  onDelete: (material: ApiMaterial) => void;
  isLoading: boolean;
}

type SortField = 'name' | 'price' | 'fail_rate' | 'margin';
type SortOrder = 'asc' | 'desc';

export default function MaterialList({
  materials,
  onEdit,
  onDelete,
  isLoading,
}: MaterialListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Handle sort trigger
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort items
  const filteredMaterials = materials.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    let aVal: any = a[sortField === 'price' ? 'price_per_kg' : sortField === 'margin' ? 'default_margin' : sortField];
    let bVal: any = b[sortField === 'price' ? 'price_per_kg' : sortField === 'margin' ? 'default_margin' : sortField];

    if (sortField === 'name') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  return (
    <div className="space-y-4">
      {/* Search and filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm loại nhựa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
          />
        </div>

        <div className="text-xs font-mono text-slate-500 self-end sm:self-center">
          Hiển thị {sortedMaterials.length} / {materials.length} loại nhựa
        </div>
      </div>

      {/* Grid or Table list */}
      <div className="overflow-x-auto rounded-lg border border-border bg-slate-900/20">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-900/40 text-slate-400 font-mono text-xs uppercase tracking-wider">
              <th className="py-3.5 px-4 font-semibold">Mã ID</th>
              <th className="py-3.5 px-4 font-semibold cursor-pointer select-none hover:text-slate-200 transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5">
                  Tên loại nhựa
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold cursor-pointer select-none hover:text-slate-200 transition-colors" onClick={() => handleSort('price')}>
                <div className="flex items-center gap-1.5">
                  Giá mua / kg
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold">Giá / Gram</th>
              <th className="py-3.5 px-4 font-semibold cursor-pointer select-none hover:text-slate-200 transition-colors" onClick={() => handleSort('fail_rate')}>
                <div className="flex items-center gap-1.5">
                  Hao hụt (Fail Rate)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold cursor-pointer select-none hover:text-slate-200 transition-colors" onClick={() => handleSort('margin')}>
                <div className="flex items-center gap-1.5">
                  Lợi nhuận Biên
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              // Loading Skeleton lines
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 w-8 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-8 w-16 bg-slate-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : sortedMaterials.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-sm">
                  Không tìm thấy loại nhựa nào tương ứng.
                </td>
              </tr>
            ) : (
              sortedMaterials.map((item) => {
                // Determine material badge color based on name (soft colors mapping to OLED)
                let colorClass = 'bg-slate-950 text-slate-400 border-slate-800';
                if (/pla/i.test(item.name)) colorClass = 'bg-blue-950/40 text-blue-400 border-blue-900/30';
                else if (/petg/i.test(item.name)) colorClass = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30';
                else if (/abs/i.test(item.name)) colorClass = 'bg-amber-950/40 text-amber-400 border-amber-900/30';
                else if (/tpu/i.test(item.name)) colorClass = 'bg-purple-950/40 text-purple-400 border-purple-900/30';

                const priceGram = item.price_per_kg / 1000;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-900/30 transition-all duration-150 group"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">#{item.id}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${colorClass}`}>
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                      {Math.round(item.price_per_kg).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                      {priceGram.toFixed(1)} đ/g
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      x{Number(item.fail_rate).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                      {Math.round(item.default_margin * 100)}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 rounded text-slate-400 hover:text-primary hover:bg-slate-800 transition-colors"
                          title="Sửa thông số"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-950/40 transition-colors"
                          title="Xóa loại nhựa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
