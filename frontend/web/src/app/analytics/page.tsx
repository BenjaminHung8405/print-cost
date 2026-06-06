import { Metadata } from 'next';
import { AnalyticsPage } from '@/components/analytics/analytics-page';

export const metadata: Metadata = {
  title: 'Thống kê hiệu suất xưởng in | PrintCost',
  description: 'Báo cáo doanh thu, giá vốn, lợi nhuận ròng, lượng nhựa tiêu thụ và bảo trì máy in 3D.',
};

export default function Page() {
  return <AnalyticsPage />;
}
