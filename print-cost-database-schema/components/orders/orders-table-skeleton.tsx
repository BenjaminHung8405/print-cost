'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

export function OrdersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index} className="border-slate-700">
          <TableCell>
            <Skeleton className="h-5 w-20 bg-slate-700/50" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 bg-slate-700/50" />
              <Skeleton className="h-4 w-24 bg-slate-700/50" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-36 bg-slate-700/50" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-40 bg-slate-700/50" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24 rounded-full bg-slate-700/50" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24 bg-slate-700/50" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded bg-slate-700/50" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
