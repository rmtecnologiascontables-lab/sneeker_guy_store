import React from 'react';
import { Product, OrderStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { StatusPipeline } from './StatusPipeline';
import { MoreHorizontal, Edit2, Trash2, ArrowUpRight, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductCardProps {
  product: Product;
  globalMarkup?: number;
  onEdit: (p: Product) => void;
  onStatusChange: (id: string, s: OrderStatus) => void;
  onDelete: (id: string) => void;
}

export function ProductCard({ product, globalMarkup = 35, onEdit, onStatusChange, onDelete }: ProductCardProps) {
  const [showActions, setShowActions] = React.useState(false);
  const [justUpdated, setJustUpdated] = React.useState(false);

  const displayPriceMxn = (product.sellPriceMxn && product.sellPriceMxn > 0) 
    ? product.sellPriceMxn 
    : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

  React.useEffect(() => {
    if (justUpdated) {
      const timer = setTimeout(() => setJustUpdated(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  const handleStatusChange = (status: OrderStatus) => {
    onStatusChange(product.id, status);
    setJustUpdated(true);
  };

  // Status mapping for labels
  const getStatusLabel = (status: OrderStatus) => {
    switch(status) {
      case 'COMPRADO': return '📦 Comprado USA';
      case 'EN_RUTA': return '✈️ En Ruta Zafi';
      case 'EN_BODEGA': return '📍 Recibido Zafi';
      case 'ENVIADO': return '🚚 Enviado MX';
      case 'ENTREGADO': return '✅ Entregado';
      default: return status;
    }
  };

  // Status mapping for pills
  const getStatusStyle = (status: OrderStatus) => {
    switch(status) {
      case 'ENTREGADO': return 'bg-[#E6F4EA] text-[#1E7E34]';
      case 'EN_BODEGA': return 'bg-[#FFF4E5] text-[#B45309]';
      case 'COMPRADO': return 'bg-[#F0F2F1] text-[#333]';
      case 'EN_RUTA': return 'bg-[#E1F5FE] text-[#0288D1]';
      case 'ENVIADO': return 'bg-[#FCE8E8] text-[#C53030]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -4, backgroundColor: '#FBFCFB' }}
      whileTap={{ scale: 0.98 }}
      className="bg-white border border-brand-border rounded-xl overflow-hidden flex flex-col h-full hover:border-brand-ink/40 transition-all hover:shadow-xl hover:shadow-black/5 group"
    >
      <div className="relative aspect-video bg-gray-50 border-b border-brand-border">
        <img 
          src={product.imageUrl || 'https://picsum.photos/seed/placeholder/400/400'} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/400/400';
          }}
        />
        <div className="absolute top-3 right-3 z-10">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowActions(!showActions)}
            className="w-8 h-8 rounded-md bg-white/90 backdrop-blur-md border border-brand-border shadow-sm flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors"
          >
            <MoreHorizontal size={16} />
          </motion.button>
          
          {showActions && (
            <div className="absolute top-10 right-0 w-32 bg-white rounded-lg shadow-xl border border-brand-border py-1 z-20">
              <button 
                onClick={() => { onEdit(product); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-[#F8FAF9] text-brand-ink"
              >
                <Edit2 size={14} /> Editar
              </button>
              <button 
                onClick={() => { onDelete(product.id); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-[#FCE8E8] text-[#C53030]"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          {product.destino && (
             <span className="px-2 py-1 rounded-md bg-brand-ink text-white text-[9px] font-bold uppercase tracking-wider">
               {product.destino.replace('_', ' ')}
             </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-brand-label uppercase tracking-wider">{product.sku}</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                product.quantity <= product.minStock ? "bg-red-50 text-red-600 border border-red-100" : "bg-brand-ink text-white"
              )}>
                {product.quantity} uds
              </span>
              <div className="relative group/status flex items-center">
                <select 
                  value={product.currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  className={cn(
                    "pl-2 pr-6 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border border-transparent appearance-none transition-all hover:ring-2 hover:ring-brand-ink/10",
                    getStatusStyle(product.currentStatus),
                    justUpdated && "ring-2 ring-brand-accent scale-105"
                  )}
                >
                  <option value="COMPRADO">📦 Comprado</option>
                  <option value="EN_RUTA">✈️ En Ruta</option>
                  <option value="EN_BODEGA">📍 En Zafi</option>
                  <option value="ENVIADO">🚚 Enviado</option>
                  <option value="ENTREGADO">✅ Entregado</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 pointer-events-none opacity-50" />
                
                <AnimatePresence>
                  {justUpdated && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-accent text-white rounded-full p-1"
                    >
                      <Check size={8} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <h4 className="text-15px font-bold text-brand-ink line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-brand-muted">{product.brand}</span>
            <span className="w-1 h-1 rounded-full bg-brand-border" />
            <span className="text-[12px] text-brand-muted">{product.size || 'No Size'}</span>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-brand-border mt-auto">
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Tarjeta</span>
            <span className="px-1.5 py-0.5 rounded bg-brand-accent/5 border border-brand-accent/20 text-brand-accent font-bold text-[9px] uppercase">{product.card || '-'}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Boutique</span>
            <span className="text-brand-ink font-bold">{product.boutique || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Cliente</span>
            <span className="text-brand-ink font-bold">{product.clientName || 'STOCK DISPONIBLE'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[11px] text-brand-label font-bold uppercase tracking-wider block mb-0.5">Precio Sugerido</span>
              <span className="text-[18px] font-black text-brand-ink leading-none">
                ${displayPriceMxn.toLocaleString()} <span className="text-[10px] opacity-40">MXN</span>
              </span>
              {(product.quantity > 1) && (
                <div className="text-[10px] text-brand-ink font-bold mt-0.5 bg-brand-ink/5 px-1.5 py-0.5 rounded block w-fit">
                  Total Pedido: ${(displayPriceMxn * product.quantity).toLocaleString()} MXN
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-brand-label font-bold uppercase tracking-wider block mb-0.5">Costo Unit.</span>
              <span className="text-[13px] font-mono font-bold text-brand-muted">
                {formatCurrency(product.buyPriceUsd || 0)}
              </span>
              <div className="text-[10px] text-brand-muted mt-0.5">
                MXN: $${ (product.buyPriceMxn || 0).toLocaleString() }
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
