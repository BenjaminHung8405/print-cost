'use client';

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Clock, CircleDollarSign, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatVND, formatTime } from '@/lib/pricing';
import type { ApiProduct } from '@/core/api/client';

interface OrderItemCardProps {
  index: number;
  itemId: string;
  productId: string;
  quantity: number;
  overrideHours?: number;
  overrideMinutes?: number;
  overridePrice?: number;
  showDelete: boolean;
  /** Live list of product templates loaded from API (no mock constants) */
  products: ApiProduct[];
  /** Callback to compute the suggested price for a given product */
  getSuggestedPrice: (product: ApiProduct) => number;
  onProductChange: (productId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onOverrideTimeChange: (hours?: number, minutes?: number) => void;
  onOverridePriceChange: (price?: number) => void;
  onDelete: () => void;
}

export function OrderItemCard({
  index,
  itemId,
  productId,
  quantity,
  overrideHours,
  overrideMinutes,
  overridePrice,
  showDelete,
  products,
  getSuggestedPrice,
  onProductChange,
  onQuantityChange,
  onOverrideTimeChange,
  onOverridePriceChange,
  onDelete,
}: OrderItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedProduct = products.find(p => String(p.id) === productId);

  const getDefaultTime = (product: ApiProduct) => ({
    hours: Math.floor(product.print_time_seconds / 3600),
    minutes: Math.floor((product.print_time_seconds % 3600) / 60),
  });

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 transition-colors duration-150">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-mono text-muted-foreground font-semibold">
          Món thứ #{index + 1}
        </span>
        {showDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors duration-150"
            aria-label="Xóa sản phẩm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Product Select — dynamically populated from API */}
        <div className="flex-grow sm:w-[60%]">
          <Select value={productId || undefined} onValueChange={val => val && onProductChange(val)}>
            <SelectTrigger
              id={`product-${itemId}`}
              className="w-full h-11 bg-background border-border text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <SelectValue placeholder="Chọn mẫu sản phẩm...">
                {selectedProduct ? selectedProduct.name : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {products.map(product => (
                <SelectItem
                  key={product.id}
                  value={String(product.id)}
                  className="text-foreground hover:bg-muted focus:bg-muted"
                >
                  <span className="flex justify-between w-full gap-4">
                    <span>{product.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatVND(getSuggestedPrice(product))}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Stepper */}
        <div className="sm:w-[40%]">
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background h-11">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="h-11 w-11 rounded-none hover:bg-muted shrink-0 min-w-[44px] min-h-[44px]"
              aria-label="Giảm số lượng"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <input
              type="number"
              value={quantity}
              onChange={e => {
                const val = parseInt(e.target.value) || 1;
                onQuantityChange(Math.max(1, val));
              }}
              className="flex-1 text-center font-mono bg-transparent border-none focus:outline-none focus:ring-0 text-foreground min-w-[40px]"
              min={1}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onQuantityChange(quantity + 1)}
              className="h-11 w-11 rounded-none hover:bg-muted shrink-0 min-w-[44px] min-h-[44px]"
              aria-label="Tăng số lượng"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Override Section */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-4">
        <CollapsibleTrigger className="flex items-center justify-center w-full h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2 transition-colors duration-150 rounded-md">
          Tùy chỉnh nâng cao
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            {/* Override Print Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Ghi đè thời gian in
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative w-20">
                  <Input
                    id={`hours-${itemId}`}
                    type="number"
                    min={0}
                    value={overrideHours ?? ''}
                    onChange={e => {
                      const hours = e.target.value === '' ? undefined : parseInt(e.target.value);
                      onOverrideTimeChange(hours, overrideMinutes);
                    }}
                    placeholder={selectedProduct ? String(getDefaultTime(selectedProduct).hours) : '0'}
                    className="pr-8 h-10 bg-background border-border text-foreground font-mono text-center"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">h</span>
                </div>
                <div className="relative w-20">
                  <Input
                    id={`minutes-${itemId}`}
                    type="number"
                    min={0}
                    max={59}
                    value={overrideMinutes ?? ''}
                    onChange={e => {
                      const minutes = e.target.value === '' ? undefined : parseInt(e.target.value);
                      onOverrideTimeChange(overrideHours, minutes);
                    }}
                    placeholder={selectedProduct ? String(getDefaultTime(selectedProduct).minutes) : '0'}
                    className="pr-8 h-10 bg-background border-border text-foreground font-mono text-center"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">m</span>
                </div>
              </div>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground italic">
                  Mặc định: {formatTime(selectedProduct.print_time_seconds)}
                </p>
              )}
            </div>

            {/* Override Sale Price */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleDollarSign className="h-4 w-4" />
                Ghi đè giá bán
              </Label>
              <div className="relative">
                {!overridePrice && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                    Tự động
                  </span>
                )}
                <Input
                  type="number"
                  min={0}
                  value={overridePrice ?? ''}
                  onChange={e => {
                    const price = e.target.value === '' ? undefined : parseInt(e.target.value);
                    onOverridePriceChange(price);
                  }}
                  placeholder={
                    selectedProduct
                      ? formatVND(getSuggestedPrice(selectedProduct)).replace(' đ', '')
                      : '0'
                  }
                  className={`pr-10 h-10 bg-background border-border text-foreground font-mono ${!overridePrice ? 'pl-20' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">đ</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
