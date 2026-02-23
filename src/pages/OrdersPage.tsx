import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Package, Truck, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ExternalLink, Copy,
} from 'lucide-react';
import { useBrandColors } from '../hooks/useTheme';
import { useMyOrders, ORDER_STATUS_CONFIG, type OrderWithItems } from '../hooks/useOrders';
import { useToastStore } from '../stores/toastStore';
import { useBrandNavigate } from '../components/BrandLink';
import { AccountLayout } from '../components/AccountLayout';

// ─── Helpers ────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateFull(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  processing: <Package size={14} />,
  separated: <CheckCircle2 size={14} />,
  shipped: <Truck size={14} />,
  delivered: <CheckCircle2 size={14} />,
  cancelled: <XCircle size={14} />,
  refunded: <XCircle size={14} />,
};

const STATUS_FLOW = ['pending', 'processing', 'separated', 'shipped', 'delivered'];

function getPaymentLabel(method: string | null) {
  if (!method) return 'Não informado';
  const map: Record<string, string> = {
    pix: 'PIX',
    boleto: 'Boleto',
    credit_card: 'Cartão de Crédito',
    CREDIT_CARD: 'Cartão de Crédito',
    BOLETO: 'Boleto',
    PIX: 'PIX',
  };
  return map[method] || method;
}

// ─── Skeleton ───────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }`}</style>
      <div className="max-w-2xl mx-auto space-y-4 py-8 px-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex justify-between">
              <div
                className="h-4 w-28 rounded bg-gray-200"
                style={{ background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)', backgroundSize: '1000px 100%', animation: 'shimmer 2s infinite' }}
              />
              <div
                className="h-6 w-20 rounded-full bg-gray-200"
                style={{ background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)', backgroundSize: '1000px 100%', animation: 'shimmer 2s infinite' }}
              />
            </div>
            <div
              className="h-16 w-full rounded bg-gray-200"
              style={{ background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)', backgroundSize: '1000px 100%', animation: 'shimmer 2s infinite' }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Status Timeline ────────────────────────────────────

function StatusTimeline({ order, primaryColor }: { order: OrderWithItems; primaryColor: string }) {
  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
        <XCircle size={16} />
        Pedido cancelado {formatDateFull(order.cancelled_at) ? `em ${formatDateFull(order.cancelled_at)}` : ''}
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_FLOW.map((step, i) => {
        const conf = ORDER_STATUS_CONFIG[step];
        const isComplete = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center min-w-[64px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs transition-colors ${
                  isComplete ? '' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
                style={isComplete ? { backgroundColor: primaryColor, ...(isCurrent ? { '--tw-ring-color': primaryColor } as any : {}) } : isCurrent ? { '--tw-ring-color': primaryColor } as any : {}}
              >
                {STATUS_ICONS[step]}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isComplete ? 'text-gray-700' : 'text-gray-400'}`}>
                {conf.label}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div
                className={`flex-1 h-0.5 min-w-[16px] rounded ${i < currentIdx ? '' : 'bg-gray-200'}`}
                style={i < currentIdx ? { backgroundColor: primaryColor } : {}}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────────

function OrderCard({ order, primaryColor }: { order: OrderWithItems; primaryColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const conf = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;

  const firstItem = order.order_items?.[0];
  const itemCount = order.order_items?.length || 0;

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
    addToast('Número do pedido copiado!', 'info');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* First item thumbnail */}
          {firstItem?.product_image_url ? (
            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
              <img src={firstItem.product_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={18} className="text-gray-300" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-800">#{order.order_number}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${conf.color} ${conf.bgColor}`}>
                {conf.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDateShort(order.created_at)} — {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800 hidden sm:block">
            {formatCurrency(order.total)}
          </span>
          {expanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Mobile total */}
      <div className="px-5 pb-3 -mt-1 sm:hidden">
        <span className="text-sm font-bold text-gray-800">{formatCurrency(order.total)}</span>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-gray-50 pt-4">
              {/* Timeline */}
              <StatusTimeline order={order} primaryColor={primaryColor} />

              {/* Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Itens</h4>
                <div className="space-y-2.5">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product_image_url ? (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-gray-400">{item.variant_name}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(item.subtotal)}</p>
                        <p className="text-xs text-gray-400">Qtd: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking */}
              {order.tracking_code && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-4 py-3">
                  <Truck size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-800">Rastreamento</p>
                    <p className="text-sm text-blue-700 font-mono truncate">{order.tracking_code}</p>
                  </div>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={14} className="text-blue-600" />
                    </a>
                  )}
                </div>
              )}

              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Pagamento</p>
                  <p className="font-medium text-gray-700">
                    {getPaymentLabel(order.payment_method)}
                    {order.installments && order.installments > 1 ? ` (${order.installments}x)` : ''}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Frete</p>
                  <p className="font-medium text-gray-700">
                    {order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'Grátis'}
                  </p>
                </div>
                {order.discount_amount > 0 && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-0.5">Desconto</p>
                    <p className="font-medium text-green-700">
                      -{formatCurrency(order.discount_amount)}
                      {order.coupon_code && (
                        <span className="text-xs text-green-500 ml-1">({order.coupon_code})</span>
                      )}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Total</p>
                  <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                </div>
              </div>

              {/* Order number footer */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                <button onClick={copyOrderNumber} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                  <Copy size={12} />
                  Pedido #{order.order_number}
                </button>
                <span>{formatDateShort(order.created_at)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Filter Tabs ────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'processing', label: 'Preparando' },
  { key: 'separated', label: 'Separados' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'refunded', label: 'Reembolsados' },
];

// ─── Main Page ──────────────────────────────────────────

export function OrdersPage() {
  const { primaryColor } = useBrandColors();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: orders, isLoading } = useMyOrders(statusFilter);
  const navigate = useBrandNavigate();

  return (
    <AccountLayout title="Meus Pedidos" subtitle="Acompanhe o status das suas compras" icon={ShoppingBag}>
      <div>
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
          {FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  active ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: primaryColor } : {}}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && <OrdersSkeleton />}

        {/* Orders list */}
        {!isLoading && orders && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} primaryColor={primaryColor} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!orders || orders.length === 0) && (
          <div className="text-center py-16">
            <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-1">
              {statusFilter === 'all' ? 'Nenhum pedido ainda' : 'Nenhum pedido encontrado'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {statusFilter === 'all'
                ? 'Quando você fizer uma compra, seus pedidos aparecerão aqui.'
                : 'Tente outro filtro ou explore nossos produtos.'}
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag size={16} /> Explorar Produtos
            </button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
