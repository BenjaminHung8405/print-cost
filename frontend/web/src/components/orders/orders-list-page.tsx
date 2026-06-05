'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ExternalLink } from 'lucide-react'
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
import { OrderStatusBadge } from './order-status-badge'
import { OrderActionsDropdown } from './order-actions-dropdown'
import { OrderDetailsDialog } from './order-details-dialog'
import { OrdersTableSkeleton } from './orders-table-skeleton'
import { OrdersEmptyState } from './orders-empty-state'
import {
  type Order,
  type OrderStatus,
  STATUS_CONFIG,
  formatVND,
  formatDateTime,
  formatItemsSummary,
} from '@/lib/orders'

// Mock data for 7 orders covering all status types
const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    code: 'OD-0024',
    customerName: 'Nguyễn Văn Minh',
    customerContact: 'https://facebook.com/nguyenvanminh',
    status: 'draft',
    isLossCounted: false,
    createdAt: new Date('2024-01-15T09:30:00'),
    updatedAt: new Date('2024-01-15T09:30:00'),
    items: [
      {
        id: 1,
        productName: 'Keycap',
        materialName: 'PLA',
        quantity: 2,
        finalUnitPrice: 25000,
        rawMaterialCost: 4642,
        rawMachineCost: 4750,
        rawLaborCost: 8000,
        rawFixedItemsCost: 1244,
        rawUnitCogs: 18636,
      },
    ],
    totalFinalInvoicePrice: 50000,
    totalRawCogs: 37272,
  },
  {
    id: 2,
    code: 'OD-0023',
    customerName: 'Trần Thị Hương',
    customerContact: 'https://zalo.me/0901234567',
    status: 'printing',
    isLossCounted: false,
    createdAt: new Date('2024-01-14T14:20:00'),
    updatedAt: new Date('2024-01-15T08:00:00'),
    items: [
      {
        id: 2,
        productName: 'Uzi Jesus',
        materialName: 'PETG',
        quantity: 1,
        finalUnitPrice: 182400,
        rawMaterialCost: 25680,
        rawMachineCost: 30917,
        rawLaborCost: 15000,
        rawFixedItemsCost: 5200,
        rawUnitCogs: 76797,
      },
    ],
    totalFinalInvoicePrice: 182400,
    totalRawCogs: 76797,
  },
  {
    id: 3,
    code: 'OD-0022',
    customerName: 'Lê Hoàng Nam',
    customerContact: 'https://facebook.com/lehoangnam95',
    status: 'printing',
    isLossCounted: false,
    createdAt: new Date('2024-01-14T10:15:00'),
    updatedAt: new Date('2024-01-14T16:30:00'),
    items: [
      {
        id: 3,
        productName: 'Fishbone',
        materialName: 'PLA',
        quantity: 3,
        finalUnitPrice: 35000,
        rawMaterialCost: 5200,
        rawMachineCost: 6500,
        rawLaborCost: 5000,
        rawFixedItemsCost: 2100,
        rawUnitCogs: 18800,
      },
      {
        id: 4,
        productName: 'Keycap',
        materialName: 'PLA',
        quantity: 5,
        finalUnitPrice: 25000,
        rawMaterialCost: 4642,
        rawMachineCost: 4750,
        rawLaborCost: 8000,
        rawFixedItemsCost: 1244,
        rawUnitCogs: 18636,
      },
    ],
    totalFinalInvoicePrice: 230000,
    totalRawCogs: 149580,
  },
  {
    id: 4,
    code: 'OD-0021',
    customerName: 'Phạm Quốc Tuấn',
    customerContact: 'https://facebook.com/tuanpham.3d',
    status: 'printing',
    isLossCounted: false,
    createdAt: new Date('2024-01-13T18:45:00'),
    updatedAt: new Date('2024-01-14T09:00:00'),
    items: [
      {
        id: 5,
        productName: 'Keycap',
        materialName: 'ABS',
        quantity: 10,
        finalUnitPrice: 28000,
        rawMaterialCost: 5100,
        rawMachineCost: 5200,
        rawLaborCost: 8000,
        rawFixedItemsCost: 1244,
        rawUnitCogs: 19544,
      },
    ],
    totalFinalInvoicePrice: 280000,
    totalRawCogs: 195440,
  },
  {
    id: 5,
    code: 'OD-0020',
    customerName: 'Vũ Thị Mai Anh',
    customerContact: 'https://zalo.me/0987654321',
    status: 'completed',
    isLossCounted: false,
    createdAt: new Date('2024-01-12T11:00:00'),
    updatedAt: new Date('2024-01-13T15:20:00'),
    items: [
      {
        id: 6,
        productName: 'Uzi Jesus',
        materialName: 'PLA',
        quantity: 2,
        finalUnitPrice: 175000,
        rawMaterialCost: 24500,
        rawMachineCost: 30917,
        rawLaborCost: 15000,
        rawFixedItemsCost: 5200,
        rawUnitCogs: 75617,
      },
    ],
    totalFinalInvoicePrice: 350000,
    totalRawCogs: 151234,
  },
  {
    id: 6,
    code: 'OD-0019',
    customerName: 'Đỗ Minh Khoa',
    customerContact: 'https://facebook.com/khoado.prints',
    status: 'completed',
    isLossCounted: false,
    createdAt: new Date('2024-01-11T16:30:00'),
    updatedAt: new Date('2024-01-12T10:00:00'),
    items: [
      {
        id: 7,
        productName: 'Fishbone',
        materialName: 'PETG',
        quantity: 1,
        finalUnitPrice: 42000,
        rawMaterialCost: 6800,
        rawMachineCost: 7200,
        rawLaborCost: 5000,
        rawFixedItemsCost: 2100,
        rawUnitCogs: 21100,
      },
    ],
    totalFinalInvoicePrice: 42000,
    totalRawCogs: 21100,
  },
  {
    id: 7,
    code: 'OD-0018',
    customerName: 'Hoàng Gia Bảo',
    customerContact: 'https://facebook.com/baohg.maker',
    status: 'shipping',
    isLossCounted: false,
    createdAt: new Date('2024-01-10T08:00:00'),
    updatedAt: new Date('2024-01-11T14:30:00'),
    items: [
      {
        id: 8,
        productName: 'Keycap',
        materialName: 'PLA',
        quantity: 20,
        finalUnitPrice: 22000,
        rawMaterialCost: 4642,
        rawMachineCost: 4750,
        rawLaborCost: 8000,
        rawFixedItemsCost: 1244,
        rawUnitCogs: 18636,
      },
      {
        id: 9,
        productName: 'Fishbone',
        materialName: 'PLA',
        quantity: 5,
        finalUnitPrice: 32000,
        rawMaterialCost: 5200,
        rawMachineCost: 6500,
        rawLaborCost: 5000,
        rawFixedItemsCost: 2100,
        rawUnitCogs: 18800,
      },
    ],
    totalFinalInvoicePrice: 600000,
    totalRawCogs: 466720,
  },
]

type FilterStatus = OrderStatus | 'all'

export function OrdersListPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Count orders by status
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: orders.length,
      draft: 0,
      printing: 0,
      completed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    }

    orders.forEach((order) => {
      counts[order.status]++
    })

    return counts
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.customerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  // Handlers
  const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      )
    )
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  const handleExportInvoice = (order: Order) => {
    // TODO: Implement invoice export
    console.log('Export invoice for order:', order.code)
  }

  const handleCreateOrder = () => {
    router.push('/orders/create')
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
                QUẢN LÝ ĐƠN HÀNG
              </h1>
              <p className="text-slate-400 text-sm mt-1">
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

          {/* Smart Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 pb-4 border-b border-slate-700 mb-6">
            {/* Search Input */}
            <div className="relative w-full lg:w-[30%]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm tên khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Tabs */}
            <div className="w-full lg:w-[70%] overflow-x-auto">
              <Tabs
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as FilterStatus)
                }
                className="w-full"
              >
                <TabsList className="bg-slate-800 p-1 h-auto flex-wrap justify-start gap-1">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100 text-slate-400 px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150"
                  >
                    Tất cả ({statusCounts.all})
                  </TabsTrigger>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(
                    (status) => (
                      <TabsTrigger
                        key={status}
                        value={status}
                        className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100 text-slate-400 px-3 py-1.5 text-sm cursor-pointer transition-colors duration-150"
                      >
                        {STATUS_CONFIG[status].label} ({statusCounts[status]})
                      </TabsTrigger>
                    )
                  )}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Orders Data Table */}
          <div className="rounded-lg border border-slate-700 bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold">
                      Mã đơn
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold">
                      Khách hàng
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold">
                      Chi tiết món
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">
                      Tổng tiền
                    </TableHead>
                    <TableHead className="text-slate-400 font-semibold w-12">
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
                      return (
                        <TableRow
                          key={order.id}
                          className="border-slate-700 hover:bg-slate-800/60 transition-colors duration-150"
                        >
                          {/* Order Code */}
                          <TableCell className="font-mono text-slate-400 whitespace-nowrap">
                            #{order.code}
                          </TableCell>

                          {/* Customer */}
                          <TableCell>
                            <div>
                              <p className="font-semibold text-slate-100">
                                {order.customerName}
                              </p>
                              {order.customerContact && (
                                <a
                                  href={order.customerContact}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150 cursor-pointer"
                                >
                                  <span>Liên hệ</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Created At */}
                          <TableCell className="font-mono text-slate-400 text-sm whitespace-nowrap">
                            {formatDateTime(order.createdAt)}
                          </TableCell>

                          {/* Items Summary */}
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block max-w-[200px] truncate text-slate-300 cursor-default">
                                  {itemsSummary}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="bg-slate-800 border-slate-700 text-slate-100 max-w-xs"
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
                          <TableCell className="text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                            {formatVND(order.totalFinalInvoicePrice)}
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
      </div>
    </TooltipProvider>
  )
}
