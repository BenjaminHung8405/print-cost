import { redirect } from 'next/navigation';

/**
 * /fixed-items — Route độc lập đã được hợp nhất vào AppShell Cấu hình.
 * Redirect cứng về /configs/fixed-items để giữ Single Source of Truth.
 */
export default function FixedItemsPage() {
  redirect('/configs/fixed-items');
}
