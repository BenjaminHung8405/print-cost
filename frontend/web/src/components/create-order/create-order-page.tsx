'use client';

import { CustomerInfoCard } from '@/components/create-order/customer-info-card';
import { OrderItemCard } from '@/components/create-order/order-item-card';
import { PricingReceipt } from '@/components/create-order/pricing-receipt';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  PRODUCT_TEMPLATES,
  calculateOrderTotals,
  toSeconds,
  type OrderItem,
} from '@/lib/pricing';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface OrderItemState extends OrderItem {
  overrideHours?: number;
  overrideMinutes?: number;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function CreateOrderPage() {
  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  // Order items state
  const [items, setItems] = useState<OrderItemState[]>([
    {
      id: generateId(),
      productId: '',
      quantity: 1,
    },
  ]);

  // Add new item
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        productId: '',
        quantity: 1,
      },
    ]);
  }, []);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Update item product (reset overrides on template change)
  const updateItemProduct = useCallback((itemId: string, productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
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

  // Update item quantity
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, []);

  // Update item override time
  const updateItemOverrideTime = useCallback(
    (itemId: string, hours?: number, minutes?: number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;

          const product = PRODUCT_TEMPLATES.find(p => p.id === item.productId);
          if (!product) return item;

          let overridePrintTimeSeconds: number | undefined;
          if (hours !== undefined || minutes !== undefined) {
            const defaultHours = Math.floor(product.printTimeSeconds / 3600);
            const defaultMinutes = Math.floor((product.printTimeSeconds % 3600) / 60);
            const h = hours ?? defaultHours;
            const m = minutes ?? defaultMinutes;
            overridePrintTimeSeconds = toSeconds(h, m);
          }

          return {
            ...item,
            overrideHours: hours,
            overrideMinutes: minutes,
            overridePrintTimeSeconds,
          };
        })
      );
    },
    []
  );

  // Update item override price
  const updateItemOverridePrice = useCallback(
    (itemId: string, price?: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, overridePrice: price } : item
        )
      );
    },
    []
  );

  // Calculate totals with useMemo (only valid items)
  const totals = useMemo(() => {
    const validItems = items.filter((item) => item.productId !== '');
    return calculateOrderTotals(validItems);
  }, [items]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return (
      customerName.trim() !== '' &&
      items.some((item) => item.productId !== '')
    );
  }, [customerName, items]);

  // Handle form submission
  const handleConfirm = useCallback(() => {
    if (!isValid) return;

    // TODO: Replace with actual API call to POST /api/orders
    const orderData = {
      customer_name: customerName,
      customer_contact: customerContact || null,
      items: items
        .filter((item) => item.productId !== '')
        .map((item) => ({
          product_id: Number(item.productId),
          quantity: item.quantity,
          print_time_seconds: item.overridePrintTimeSeconds ?? undefined,
          price_override: item.overridePrice ?? null,
        })),
    };

    console.log('Order payload:', orderData);
    alert(`Đơn hàng đã được chốt!\n\nTổng tiền: ${new Intl.NumberFormat('vi-VN').format(totals.totalPrice)} đ`);
  }, [isValid, customerName, customerContact, items, totals]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-mono text-xl font-bold text-foreground">
              PrintCost
            </h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <CustomerInfoCard
              customerName={customerName}
              customerContact={customerContact}
              onNameChange={setCustomerName}
              onContactChange={setCustomerContact}
            />

            {/* Order Items */}
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
                  onProductChange={(productId) =>
                    updateItemProduct(item.id, productId)
                  }
                  onQuantityChange={(quantity) =>
                    updateItemQuantity(item.id, quantity)
                  }
                  onOverrideTimeChange={(hours, minutes) =>
                    updateItemOverrideTime(item.id, hours, minutes)
                  }
                  onOverridePriceChange={(price) =>
                    updateItemOverridePrice(item.id, price)
                  }
                  onDelete={() => removeItem(item.id)}
                />
              ))}
            </div>

            {/* Add Item Button */}
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

          {/* Right Column - Pricing Receipt */}
          <div className="lg:col-span-1">
            <PricingReceipt
              totals={totals}
              onConfirm={handleConfirm}
              isValid={isValid}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
