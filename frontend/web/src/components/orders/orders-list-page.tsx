'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ExternalLink, AlertTriangle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { OrderStatusBadge } from './order-status-badge'
import { OrderActionsDropdown } from './order-actions-dropdown'
import { OrderDetailsDialog } from './order-details-dialog'
import { OrdersTableSkeleton } from './orders-table-skeleton'
import { OrdersEmptyState } from './orders-empty-state'
import {
  type OrderStatus,
  STATUS_CONFIG,
  formatVND,
  formatDateTime,
  formatItemsSummary,
  formatOrderCode,
  isOrderLocked,
  VALID_NEXT_STATES,
} from '@/lib/orders'
import { getOrders, updateOrderStatus } from '@/core/api/client'
import type { ApiOrder } from '@/core/api/client'

type FilterStatus = OrderStatus | 'all'

/** State held while waiting for the user to confirm loss counting on cancellation */
interface PendingCancellation {
  orderId: number
  newStatus: OrderStatus
}

export function OrdersListPage() {
  const router = useRouter()

  // ── Data & loading state ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // ── Ironclad Lock: cancellation confirmation dialog ───────────────────────
  const [pendingCancellation, setPendingCancellation] = useState<PendingCancellation | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // ── Inline error / success banner ─────────────────────────────────────────
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // ── Fetch orders on mount ─────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getOrders()
      setOrders(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // ── Computed ──────────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: orders.length,
      draft: 0, printing: 0, completed: 0,
      shipping: 0, delivered: 0, cancelled: 0,
    }
    orders.forEach(o => { counts[o.status]++ })
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.customer_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  // ── Status change handler — intercepts cancellation for loss prompt ────────
  const handleStatusChange = useCallback((orderId: number, newStatus: OrderStatus) => {
    if (newStatus === 'cancelled') {
      // Show the loss-counting confirmation dialog before proceeding
      setPendingCancellation({ orderId, newStatus })
      return
    }
    void commitStatusChange(orderId, newStatus, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Perform the actual API call — called from both the direct and dialog paths */
  const commitStatusChange = useCallback(
    async (orderId: number, newStatus: OrderStatus, isLossCounted: boolean) => {
      setIsUpdatingStatus(true)
      setActionError(null)
      setActionSuccess(null)
      try {
        await updateOrderStatus(orderId, newStatus, isLossCounted)
        setActionSuccess('Đã cập nhật trạng thái đơn hàng thành công.')
        // Re-fetch to get the latest DB state (including any server-side lock changes)
        await fetchOrders()
        // Close details dialog if it's open for this order
        setSelectedOrder(prev =>
          prev?.id === orderId ? null : prev
        )
        setIsDetailsOpen(prev => (selectedOrder?.id === orderId ? false : prev))
      } catch (err: unknown) {
        // Surface the backend's Vietnamese error (covers P0001 Ironclad Lock errors)
        const message =
          err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng.'
        setActionError(message)
      } finally {
        setIsUpdatingStatus(false)
        setPendingCancellation(null)
      }
    },
    [fetchOrders, selectedOrder?.id]
  )

  /** User confirms cancellation WITH loss counting */
  const handleConfirmCancelWithLoss = useCallback(() => {
    if (!pendingCancellation) return
    void commitStatusChange(pendingCancellation.orderId, 'cancelled', true)
  }, [pendingCancellation, commitStatusChange])

  /** User confirms cancellation WITHOUT loss counting */
  const handleConfirmCancelNoLoss = useCallback(() => {
    if (!pendingCancellation) return
    void commitStatusChange(pendingCancellation.orderId, 'cancelled', false)
  }, [pendingCancellation, commitStatusChange])

  const handleViewDetails = useCallback((order: ApiOrder) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }, [])

  const handleExportInvoice = useCallback((order: ApiOrder) => {
    // Module 4 placeholder — invoice export
    console.log('Export invoice for order:', formatOrderCode(order.id))
  }, [])

  const handleCreateOrder = useCallback(() => {
    router.push('/orders/create')
  }, [router])

  // Auto-clear banners after 4 s
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [actionSuccess])

  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 6000)
    return () => clearTimeout(t)
  }, [actionError])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div>
        <div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                QUẢN LÝ ĐƠN HÀNG
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Theo dõi vòng đời đơn hàng và trạng thái vận hành xưởng in
              </p>
            </div>
            <Button
              onClick={handleCreateOrder}
              className="bg-emerald-600 hover:bg-emerald-500 text-white transition-colors duration-150 cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo đơn mới
            </Button>
          </div>

          {/* Feedback banners */}
          {actionSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-400">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Initial load error */}
          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-700 bg-rose-950/60 px-4 py-4 text-sm text-rose-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Không thể kết nối đến máy chủ</p>
                <p className="mt-1 text-rose-500">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-2 underline hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Smart Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 pb-4 border-b border-border mb-6">
            <div className="relative w-full lg:w-[30%]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm tên khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="w-full lg:w-[70%] overflow-x-auto">
              <Tabs
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as FilterStatus)}
                className="w-full"
              >
                <TabsList className="bg-muted p-1 h-auto flex-wrap justify-start gap-1">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150"
                  >
                    Tất cả ({statusCounts.all})
                  </TabsTrigger>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => (
                    <TabsTrigger
                      key={status}
                      value={status}
                      className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150"
                    >
                      {STATUS_CONFIG[status].label} ({statusCounts[status]})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Orders Data Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">Mã đơn</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Khách hàng</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Ngày tạo</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Chi tiết món</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Trạng thái</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Tổng tiền</TableHead>
                    <TableHead className="text-muted-foreground font-semibold w-12">
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <OrdersTableSkeleton />
                  ) : filteredOrders.length === 0 ? (
                    <OrdersEmptyState />
                  ) : (
                    filteredOrders.map((order) => {
                      const itemsSummary = formatItemsSummary(order.items)
                      const locked = isOrderLocked(order)
                      return (
                        <TableRow
                          key={order.id}
                          className="border-border hover:bg-muted/50 transition-colors duration-150"
                        >
                          {/* Order Code */}
                          <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              #{formatOrderCode(order.id)}
                              {locked && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-popover border-border text-popover-foreground">
                                    Đơn hàng đã bị khóa cứng — tính hao hụt xưởng
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                          </TableCell>

                          {/* Customer */}
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground">{order.customer_name}</p>
                              {order.customer_contact && (
                                <a
                                  href={order.customer_contact}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors duration-150 cursor-pointer"
                                >
                                  <span>Liên hệ</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Created At */}
                          <TableCell className="font-mono text-muted-foreground text-sm whitespace-nowrap">
                            {formatDateTime(order.created_at)}
                          </TableCell>

                          {/* Items Summary */}
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block max-w-[200px] truncate text-foreground cursor-default">
                                  {itemsSummary}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="bg-popover border-border text-popover-foreground max-w-xs"
                              >
                                {itemsSummary}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>

                          {/* Total Price */}
                          <TableCell className="text-right font-mono font-bold text-foreground whitespace-nowrap">
                            {formatVND(order.total_final_invoice_price)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <OrderActionsDropdown
                              order={order}
                              onStatusChange={handleStatusChange}
                              onViewDetails={handleViewDetails}
                              onExportInvoice={handleExportInvoice}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />

        {/* ── Ironclad Lock: Loss Counting Confirmation Dialog ─────────────── */}
        <Dialog
          open={!!pendingCancellation}
          onOpenChange={(open) => { if (!open) setPendingCancellation(null) }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Xác nhận Hủy Đơn Hàng
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                Bạn có muốn tính hao hụt nhựa của đơn hàng này vào chi phí vận hành xưởng không?
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-3">
                <p className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Cảnh báo: Không thể hoàn tác
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nếu chọn <strong className="text-foreground">Có — Tính hao hụt</strong>, đơn hàng sẽ bị khóa cứng vĩnh viễn bởi hệ thống. Mọi thao tác chỉnh sửa sau đó đều bị từ chối.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingCancellation(null)}
                disabled={isUpdatingStatus}
                className="border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Quay lại
              </Button>
              <Button
                variant="outline"
                onClick={handleConfirmCancelNoLoss}
                disabled={isUpdatingStatus}
                className="border-border text-foreground hover:bg-muted cursor-pointer"
              >
                {isUpdatingStatus ? 'Đang xử lý...' : 'Không — Hủy bình thường'}
              </Button>
              <Button
                onClick={handleConfirmCancelWithLoss}
                disabled={isUpdatingStatus}
                className="bg-rose-700 hover:bg-rose-600 text-white cursor-pointer"
              >
                {isUpdatingStatus ? 'Đang xử lý...' : 'Có — Tính hao hụt (Khóa cứng)'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
