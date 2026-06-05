import React from 'react';

export const metadata = {
  title: 'PrintCost - Quản lý xưởng in 3D',
  description: 'Hệ thống tính toán giá vốn và quản lý đơn hàng xưởng in 3D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
      </body>
    </html>
  );
}
