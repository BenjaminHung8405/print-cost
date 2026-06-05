'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerInfoCard } from '@/components/create-order/customer-info-card';
import { OrderItemCard } from '@/components/create-order/order-item-card';
import { PricingReceipt } from '@/components/create-order/pricing-receipt';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  calculateItemCostsWithMaterial,
  calculateOrderTotals,
  toSeconds,
  type MaterialConfig,
  type OrderItem,
} from '@/lib/pricing';
import {
  getProducts,
  getMaterials,
  getOperationalConfigs,
  createOrder,
} from '@/core/api/client';
import type { ApiProduct, ApiMaterial, ApiOperationalConfigs } from '@/core/api/client';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OrderItemState extends OrderItem {
  overrideHours?: number;
  overrideMinutes?: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Skeleton placeholder shown while the 3 API calls are in-flight
function OrderPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm">Đang tải dữ liệu cấu hình xưởng in...</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateOrderPage() {
  const router = useRouter();

  // ── Bootstrap data (loaded once from API) ─────────────────────────────────
  const [products, setProducts] = useState<ApiProduct[] | null>(null);
  const [materials, setMaterials] = useState<ApiMaterial[] | null>(null);
  const [configs, setConfigs] = useState<ApiOperationalConfigs | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // ── Customer info ──────────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  // ── Order items ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<OrderItemState[]>([
    { id: generateId(), productId: '', quantity: 1 },
  ]);

  // ── Submission state ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Parallel bootstrap: load products, materials, configs in one go ────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([getProducts(), getMaterials(), getOperationalConfigs()])
      .then(([p, m, c]) => {
        if (cancelled) return;
        setProducts(p);
        setMaterials(m);
        setConfigs(c);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải cấu hình xưởng in.';
        setBootstrapError(msg);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Material map: id → MaterialConfig (for pricing engine) ────────────────
  const materialMap = useMemo<Record<number, MaterialConfig>>(() => {
    if (!materials) return {};
    return Object.fromEntries(
      materials.map(m => [
        m.id,
        {
          price_per_kg: m.price_per_kg,
          fail_rate: m.fail_rate,
          default_margin: m.default_margin,
        },
      ])
    );
  }, [materials]);

  // ── Item management ────────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: generateId(), productId: '', quantity: 1 }]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateItemProduct = useCallback((itemId: string, productId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              productId,
              overrideHours: undefined,
              overrideMinutes: undefined,
              overridePrice: undefined,
              overridePrintTimeSeconds: undefined,
            }
          : item
      )
    );
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, quantity } : item))
    );
  }, []);

  const updateItemOverrideTime = useCallback(
    (itemId: string, hours?: number, minutes?: number) => {
      setItems(prev =>
        prev.map(item => {
          if (item.id !== itemId) return item;
          const product = products?.find(p => String(p.id) === item.productId);
          if (!product) return item;
          let overridePrintTimeSeconds: number | undefined;
          if (hours !== undefined || minutes !== undefined) {
            const defaultHours = Math.floor(product.print_time_seconds / 3600);
            const defaultMinutes = Math.floor((product.print_time_seconds % 3600) / 60);
            const h = hours ?? defaultHours;
            const m = minutes ?? defaultMinutes;
            overridePrintTimeSeconds = toSeconds(h, m);
          }
          return { ...item, overrideHours: hours, overrideMinutes: minutes, overridePrintTimeSeconds };
        })
      );
    },
    [products]
  );

  const updateItemOverridePrice = useCallback((itemId: string, price?: number) => {
    setItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, overridePrice: price } : item))
    );
  }, []);

  // ── Real-time totals ───────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!products || !configs || Object.keys(materialMap).length === 0) {
      return null;
    }
    const validItems = items.filter(item => item.productId !== '');
    return calculateOrderTotals(validItems, products, materialMap, configs);
  }, [items, products, materialMap, configs]);

  // ── Suggested price per item (used by OrderItemCard) ──────────────────────
  const getSuggestedPrice = useCallback(
    (product: ApiProduct): number => {
      const matConfig = materialMap[product.material_id];
      if (!matConfig || !configs) return 0;
      const costs = calculateItemCostsWithMaterial(product, matConfig, configs);
      return costs.finalRetailPrice;
    },
    [materialMap, configs]
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid = useMemo(
    () =>
      customerName.trim() !== '' &&
      items.some(item => item.productId !== ''),
    [customerName, items]
  );

  // ── Form submission ────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOrder({
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim() || null,
        items: items
          .filter(item => item.productId !== '')
          .map(item => ({
            product_id: Number(item.productId),
            quantity: item.quantity,
            price_override: item.overridePrice ?? null,
          })),
      });
      // Navigate back to the order list on success
      router.push(`/orders`);
      // Brief success message before navigation
      console.log(`✅ Đã tạo đơn hàng #${result.order_id} thành công.`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, customerName, customerContact, items, router]);

  // ── Guard: Skeleton while APIs are loading (pitfall #2 guard) ─────────────
  if (!products || !materials || !configs) {
    if (bootstrapError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full rounded-lg border border-rose-800 bg-rose-950/40 p-6 text-center space-y-4">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="font-semibold text-foreground">Không thể tải dữ liệu cấu hình</p>
            <p className="text-sm text-muted-foreground">{bootstrapError}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-border text-foreground cursor-pointer"
            >
              Thử lại
            </Button>
          </div>
        </div>
      );
    }
    return <OrderPageSkeleton />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render (data is fully loaded)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-mono text-xl font-bold text-foreground">PrintCost</h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-6">
          <h2 className="font-mono text-2xl lg:text-3xl font-bold text-foreground">
            Tạo đơn hàng
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập thông tin khách hàng và chọn sản phẩm để tính giá tự động
          </p>
        </div>

        {/* Submission error banner */}
        {submitError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Input Area */}
          <div className="lg:col-span-2 space-y-6">
            <CustomerInfoCard
              customerName={customerName}
              customerContact={customerContact}
              onNameChange={setCustomerName}
              onContactChange={setCustomerContact}
            />

            <div className="space-y-4">
              {items.map((item, index) => (
                <OrderItemCard
                  key={item.id}
                  index={index}
                  itemId={item.id}
                  productId={item.productId}
                  quantity={item.quantity}
                  overrideHours={item.overrideHours}
                  overrideMinutes={item.overrideMinutes}
                  overridePrice={item.overridePrice}
                  showDelete={items.length > 1}
                  products={products}
                  getSuggestedPrice={getSuggestedPrice}
                  onProductChange={productId => updateItemProduct(item.id, productId)}
                  onQuantityChange={quantity => updateItemQuantity(item.id, quantity)}
                  onOverrideTimeChange={(hours, minutes) =>
                    updateItemOverrideTime(item.id, hours, minutes)
                  }
                  onOverridePriceChange={price => updateItemOverridePrice(item.id, price)}
                  onDelete={() => removeItem(item.id)}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed border-border text-muted-foreground hover:border-primary hover:text-foreground gap-2 h-12 transition-colors duration-150"
            >
              <Plus className="h-4 w-4" />
              Thêm sản phẩm mẫu
            </Button>
          </div>

          {/* Right Column — Pricing Receipt */}
          <div className="lg:col-span-1">
            <PricingReceipt
              totals={totals}
              onConfirm={handleConfirm}
              isValid={isValid}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
