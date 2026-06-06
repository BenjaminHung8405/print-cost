'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Settings2, ShieldAlert, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  ApiMaterial
} from '@/core/api/client';
import MaterialList from '@/components/materials/MaterialList';
import MaterialForm from '@/components/materials/MaterialForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ApiMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion confirmation modal state
  const [deleteConfirmMaterial, setDeleteConfirmMaterial] = useState<ApiMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch all materials on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (err: any) {
      showToast('error', err.message || 'Không thể tải danh sách loại nhựa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show auto-dismiss toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Open form modal for creating new material
  const handleCreateClick = () => {
    setSelectedMaterial(null);
    setIsFormOpen(true);
  };

  // Open form modal for editing material
  const handleEditClick = (material: ApiMaterial) => {
    setSelectedMaterial(material);
    setIsFormOpen(true);
  };

  // Save changes (Create or Update)
  const handleFormSubmit = async (payload: Omit<ApiMaterial, 'id'>) => {
    setIsSubmitting(true);
    try {
      if (selectedMaterial) {
        await updateMaterial(selectedMaterial.id, payload);
        showToast('success', `Đã cập nhật loại nhựa "${payload.name}" thành công.`);
      } else {
        await createMaterial(payload);
        showToast('success', `Đã thêm loại nhựa "${payload.name}" thành công.`);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      // Re-throw to show error inside the modal form
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger deletion confirmation modal
  const handleDeleteClick = (material: ApiMaterial) => {
    setDeleteConfirmMaterial(material);
  };

  // Execute deletion call
  const handleConfirmDelete = async () => {
    if (!deleteConfirmMaterial) return;
    setIsDeleting(true);
    try {
      await deleteMaterial(deleteConfirmMaterial.id);
      showToast('success', `Đã xóa loại nhựa "${deleteConfirmMaterial.name}" thành công.`);
      setDeleteConfirmMaterial(null);
      await loadData();
    } catch (err: any) {
      console.error('Lỗi khi xóa nhựa:', err);
      // Check if this error is due to FK violation (restrict check)
      const isLinked = err.message?.includes('liên kết') || err.message?.includes('23503') || err.message?.includes('products');
      if (isLinked) {
        showToast(
          'error',
          `Không thể xóa loại nhựa "${deleteConfirmMaterial.name}" vì loại nhựa này đang được liên kết trong các Sản phẩm khác. Hãy cập nhật hoặc xóa các sản phẩm đó trước.`
        );
      } else {
        showToast('error', err.message || 'Lỗi hệ thống khi xóa loại nhựa.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI calculations
  const totalCount = materials.length;
  const avgPrice = totalCount > 0 
    ? Math.round(materials.reduce((sum, item) => sum + item.price_per_kg, 0) / totalCount)
    : 0;
  const avgMargin = totalCount > 0
    ? Math.round((materials.reduce((sum, item) => sum + item.default_margin, 0) / totalCount) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-md animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-900/60 text-emerald-300 shadow-glow'
              : 'bg-red-950/90 border-red-900/60 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 text-sm">
            <h5 className="font-bold tracking-wide">
              {toast.type === 'success' ? 'THÀNH CÔNG' : 'CÓ LỖI XẢY RA'}
            </h5>
            <p className="font-sans leading-relaxed text-slate-200">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold tracking-widest text-blue-500 uppercase flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            Cấu hình gốc &gt; Danh mục nhựa
          </div>
          <h1 className="font-mono text-2xl md:text-3xl font-black tracking-tight text-slate-100 uppercase">
            QUẢN LÝ DANH MỤC NHỰA
          </h1>
          <p className="text-sm text-slate-400 font-sans">
            Cấu hình đơn giá cuộn nhựa 1kg, hệ số bù hao rủi ro, và biên độ lợi nhuận mặc định để làm cơ sở tính toán giá thành.
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="h-11 px-6 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold text-sm transition-all shadow-md hover:shadow-glow flex items-center justify-center gap-2 active:scale-98 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhựa mới</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng số loại nhựa
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-100">
              {isLoading ? '...' : totalCount}
            </span>
            <span className="text-xs text-slate-500">cuộn nhựa</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Giá trung bình / kg
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-100">
              {isLoading ? '...' : avgPrice.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-slate-500 font-mono">đ</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Biên lợi nhuận trung bình
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-100">
              {isLoading ? '...' : `${avgMargin}%`}
            </span>
            <span className="text-xs text-slate-500">mong muốn</span>
          </div>
        </div>
      </div>

      {/* Main Material Ledger Table */}
      <div className="bg-slate-900/10 border border-border p-5 rounded-xl shadow-sm">
        <MaterialList
          materials={materials}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Create/Edit Modal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-border p-6 rounded-lg text-slate-100 shadow-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Form Nhựa</DialogTitle>
            <DialogDescription>Mô tả form nhựa</DialogDescription>
          </DialogHeader>
          <MaterialForm
            material={selectedMaterial}
            isSubmitting={isSubmitting}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Deletion Double-Confirm Modal Dialog */}
      <Dialog open={!!deleteConfirmMaterial} onOpenChange={(open) => !open && setDeleteConfirmMaterial(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border p-6 rounded-lg text-slate-100 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center text-red-500 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center font-mono text-lg font-bold uppercase tracking-wide text-slate-100">
              Xác nhận xóa loại nhựa?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-400">
              Bạn có chắc chắn muốn xóa vĩnh viễn cấu hình của loại nhựa{' '}
              <strong className="text-slate-200">"{deleteConfirmMaterial?.name}"</strong> khỏi xưởng?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 mt-4 justify-center">
            <button
              onClick={() => setDeleteConfirmMaterial(null)}
              className="flex-1 h-10 rounded-md border border-border text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors text-sm font-semibold"
              disabled={isDeleting}
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 h-10 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Xóa cấu hình</span>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
