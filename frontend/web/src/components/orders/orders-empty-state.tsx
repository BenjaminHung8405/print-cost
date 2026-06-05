'use client'

import { PackageSearch } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'

export function OrdersEmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-64">
        <div className="flex flex-col items-center justify-center text-center">
          <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-foreground font-semibold text-lg">
            Không tìm thấy đơn hàng
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Thử thay đổi bộ lọc hoặc tạo đơn hàng mới.
          </p>
        </div>
      </TableCell>
    </TableRow>
  )
}
