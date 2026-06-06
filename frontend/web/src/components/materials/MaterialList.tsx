"use client";

import React, { useState } from "react";
import { Search, Edit3, Trash2, ArrowUpDown, ChevronUp, ChevronDown, HelpCircle } from "lucide-react";
import { ApiMaterial, deleteMaterial } from "@/core/api/client";
import { formatVND, formatDecimal } from "@/core/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface MaterialListProps {
  materials: ApiMaterial[];
  onEdit: (material: ApiMaterial) => void;
  onRefresh: () => void;
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

type SortField = "name" | "price_per_kg" | "fail_rate" | "default_margin";
type SortOrder = "asc" | "desc";

export function MaterialList({
  materials,
  onEdit,
  onRefresh,
  onSuccessMessage,
  onErrorMessage,
}: MaterialListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Deletion confirmation modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<ApiMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle sorting toggles
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter and sort materials
  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  // Handle actual deletion action
  const confirmDelete = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMaterial(materialToDelete.id);
      onSuccessMessage(`Đã xóa loại nhựa ${materialToDelete.name} thành công.`);
      setDeleteConfirmOpen(false);
      setMaterialToDelete(null);
      onRefresh();
    } catch (err: any) {
      onErrorMessage(err.message || "Không thể xóa loại nhựa. Vui lòng kiểm tra lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (material: ApiMaterial) => {
    setMaterialToDelete(material);
    setDeleteConfirmOpen(true);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground opacity-60" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Header Row */}
      <div className="flex items-center justify-between gap-4 bg-muted/20 p-1.5 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm loại nhựa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Hiển thị: <span className="text-foreground font-bold">{sortedMaterials.length}</span> / {materials.length} loại
        </div>
      </div>

      {/* Main Table Wrapper */}
      <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center hover:text-foreground focus:outline-none transition-colors"
                >
                  Tên loại nhựa {renderSortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3 text-right">
                <button
                  onClick={() => handleSort("price_per_kg")}
                  className="flex items-center justify-end hover:text-foreground focus:outline-none transition-colors w-full"
                >
                  Giá mua / kg {renderSortIcon("price_per_kg")}
                </button>
              </TableHead>
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3 text-right hidden md:table-cell">
                Giá vốn / gram
              </TableHead>
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3 text-right hidden md:table-cell">
                <button
                  onClick={() => handleSort("fail_rate")}
                  className="flex items-center justify-end hover:text-foreground focus:outline-none transition-colors w-full"
                >
                  Tỷ lệ hỏng {renderSortIcon("fail_rate")}
                </button>
              </TableHead>
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3 text-right">
                <button
                  onClick={() => handleSort("default_margin")}
                  className="flex items-center justify-end hover:text-foreground focus:outline-none transition-colors w-full"
                >
                  Biên LN mặc định {renderSortIcon("default_margin")}
                </button>
              </TableHead>
              <TableHead className="h-10 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground py-3 text-center w-28">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaterials.length === 0 ? (
              <TableRow className="hover:bg-transparent border-border">
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground font-sans italic">
                  Không tìm thấy loại nhựa nào phù hợp với từ khóa tìm kiếm.
                </TableCell>
              </TableRow>
            ) : (
              sortedMaterials.map((m) => {
                // Derived unit price per gram
                const pricePerGram = m.price_per_kg / 1000;
                // Scale margin display
                const marginPercentage = Math.round(m.default_margin * 100);

                return (
                  <TableRow
                    key={m.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    {/* name (bold tag design) */}
                    <TableCell className="font-semibold py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground">{m.name}</span>
                        {m.is_in_use && (
                          <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-mono text-muted-foreground uppercase">
                            Đang dùng
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* purchase price */}
                    <TableCell className="text-right py-3.5 font-mono text-foreground">
                      {formatVND(m.price_per_kg)}
                    </TableCell>

                    {/* cost per gram */}
                    <TableCell className="text-right py-3.5 font-mono text-muted-foreground hidden md:table-cell">
                      {formatDecimal(pricePerGram, 1)} đ/g
                    </TableCell>

                    {/* fail rate */}
                    <TableCell className="text-right py-3.5 font-mono text-muted-foreground hidden md:table-cell">
                      x{formatDecimal(m.fail_rate, 2)}
                    </TableCell>

                    {/* default margin */}
                    <TableCell className="text-right py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {marginPercentage}%
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(m)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                          title="Sửa thông số"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <TooltipProvider>
                          {m.is_in_use ? (
                            /* Wrapped in a relative div so hover triggers correctly on disabled child button */
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-block">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    className="h-7 w-7 text-muted-foreground/45 bg-transparent rounded cursor-not-allowed"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover border-border text-popover-foreground font-mono text-[10px]">
                                Không thể xóa: Loại nhựa này đang được dùng trong các Sản phẩm mẫu.
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(m)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                              title="Xóa nhựa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border border-border text-foreground max-w-sm rounded-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-sm font-mono font-bold uppercase tracking-wider text-destructive">
              Xác nhận xóa nhựa?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bạn có chắc chắn muốn xóa loại nhựa{" "}
              <span className="font-mono text-foreground font-bold">
                {materialToDelete?.name}
              </span>
              ? Hành động này sẽ gỡ bỏ hoàn toàn phôi nhựa khỏi cấu hình xưởng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setMaterialToDelete(null);
              }}
              className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs"
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold text-xs"
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
