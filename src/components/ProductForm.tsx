import React from 'react';
import { Product, OrderStatus, Customer } from '../types';
import { X, Search, Upload, Loader2, Image as ImageIcon, CreditCard, Calculator, Plus, ChevronRight, RefreshCcw, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ProductFormProps {
  product?: Product;
  customers?: Customer[];
  boutiques?: string[];
  categories?: string[];
  globalMarkup?: number;
  onSave: (p: Partial<Product>) => void;
  onClose: () => void;
}

const CATEGORIES = ['CALZADO', 'ROPA', 'ELECTRONICOS', 'JOYERIA', 'ACCESORIOS', 'HOGAR', 'OTROS'];
const STATUSES: OrderStatus[] = ['COMPRADO', 'EN_RUTA', 'EN_BODEGA', 'ENVIADO', 'ENTREGADO'];
const DESTINOS = ['EL PASO', 'DALLAS', 'DIRECTO A MEXICO'];

const POPULAR_BOUTIQUES = [
  // Footwear & Clothing
  'StockX', 'GOAT', 'SNKRS', 'Nike App/Store', 'Adidas Confirmed', 'Foot Locker', 
  'Finish Line', 'Champs Sports', 'JD Sports', 'Flight Club', 'Stadium Goods', 
  'Dick\'s Sporting Goods', 'Nordstrom', 'Macy\'s', 'Saks Fifth Avenue', 
  'Bloomingdale\'s', 'Neiman Marcus', 'PacSun', 'Zumiez', 'Farfetch', 
  'SSENSE', 'Fear of God', 'Supreme', 'Kith',
  // Electronics
  'Best Buy', 'Apple Store', 'B&H Photo Video', 'Adorama', 'Newegg', 
  'Microsoft Store', 'GameStop', 'Walmart', 'Target', 'Amazon USA'
].sort();

export function ProductForm({ product, customers = [], boutiques = [], categories = [], globalMarkup = 35, onSave, onClose }: ProductFormProps) {
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [showCustomerSearch, setShowCustomerSearch] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isFetchingRate, setIsFetchingRate] = React.useState(false);
  const [activeItemIndex, setActiveItemIndex] = React.useState(0);

  React.useEffect(() => {
    // Only auto-fetch for new registrations (where exchangeRate is 0 or default)
    if (!product && commonData.exchangeRate === 0) {
      fetchExchangeRate();
    }
  }, []);

  // Common fields shared across all items in this session
  const [commonData, setCommonData] = React.useState({
    destino: product?.destino || 'EL_PASO',
    exchangeRate: product?.exchangeRate || 17.31,
  });

  // Individual item fields
  const [items, setItems] = React.useState<any[]>(
    product ? [{
      name: product.name,
      brand: product.brand,
      category: product.category,
      size: product.size,
      quantity: product.quantity,
      buyPriceUsd: product.buyPriceUsd,
      buyPriceMxn: product.buyPriceMxn,
      totalBuyPriceUsd: product.totalBuyPriceUsd,
      totalBuyPriceMxn: product.totalBuyPriceMxn,
      sellPriceMxn: (product.sellPriceMxn && product.sellPriceMxn > 0) 
        ? product.sellPriceMxn 
        : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100))),
      notes: product.notes,
      sku: product.sku,
      imageUrl: product.imageUrl,
      card: product.card || '',
      boutique: product.boutique || '',
      currentStatus: product.currentStatus || 'COMPRADO',
      clientName: product.clientName || '',
      clientEmail: product.clientEmail || '',
      clientPhone: product.clientPhone || '',
      clientAddress: product.clientAddress || '',
      clientIg: product.clientIg || '',
      referido_por: product.referido_por || '',
      referenciado_por: product.referenciado_por || '',
      metodo_pago_cliente: product.metodo_pago_cliente || '',
    }] : [{
      name: '',
      brand: '',
      category: 'Lifestyle',
      size: '',
      quantity: 1,
      buyPriceUsd: 0,
      buyPriceMxn: 0,
      totalBuyPriceUsd: 0,
      totalBuyPriceMxn: 0,
      sellPriceMxn: 0,
      notes: '',
      sku: `TSG${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 90000 + 10000)}`,
      imageUrl: '',
      card: '',
      boutique: '',
      currentStatus: 'COMPRADO',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientIg: '',
      referido_por: '',
      referenciado_por: '',
      metodo_pago_cliente: 'Efectivo/Transferencia',
      isShowcase: product?.isShowcase || false,
    }]
  );

  const addItem = () => {
    setItems([...items, {
      name: '',
      brand: '',
      category: 'Lifestyle',
      size: '',
      quantity: 1,
      buyPriceUsd: 0,
      buyPriceMxn: 0,
      totalBuyPriceUsd: 0,
      totalBuyPriceMxn: 0,
      sellPriceMxn: 0,
      notes: '',
      sku: `TSG${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 90000 + 10000)}`,
      imageUrl: '',
      card: '',
      boutique: '',
      currentStatus: 'COMPRADO',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientIg: '',
      referido_por: '',
      referenciado_por: '',
      metodo_pago_cliente: 'Efectivo/Transferencia',
      isShowcase: false,
    }]);
    setActiveItemIndex(items.length);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setActiveItemIndex(Math.max(0, index - 1));
  };

  const fetchExchangeRate = async () => {
    setIsFetchingRate(true);
    try {
      const response = await fetch('/api/exchange-rate');
      if (response.ok) {
        const data = await response.json();
        setCommonData(prev => ({ ...prev, exchangeRate: data.rate }));
        // Also update all items buyPriceMxn based on new rate
        setItems(items.map(item => ({
          ...item,
          buyPriceMxn: Math.round(item.buyPriceUsd * data.rate)
        })));
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    } finally {
      setIsFetchingRate(false);
    }
  };

  const updateItem = (index: number, fields: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...fields };
    setItems(newItems);
  };

  // Merge popular boutiques with existing ones from inventory
  const allBoutiques = React.useMemo(() => {
    const combined = new Set([...POPULAR_BOUTIQUES, ...boutiques]);
    return Array.from(combined).sort();
  }, [boutiques]);

  const allCategories = React.useMemo(() => {
    const combined = new Set([...CATEGORIES, ...categories]);
    return Array.from(combined).sort();
  }, [categories]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectCustomer = (c: Customer) => {
    updateItem(activeItemIndex, {
      clientName: c.name,
      clientEmail: c.email,
      clientPhone: c.phone,
      clientAddress: c.address,
      clientIg: c.ig_handle || '',
      referido_por: c.referido_por || ''
    });
    setCustomerSearch('');
    setShowCustomerSearch(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const body = new FormData();
    body.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body,
      });

      if (response.ok) {
        const data = await response.json();
        updateItem(itemIndex, { imageUrl: data.link });
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Error de conexión al subir imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProducts = items.map(item => ({
      ...commonData,
      ...item,
      totalBuyPriceUsd: item.quantity * item.buyPriceUsd,
      totalBuyPriceMxn: Math.round(item.quantity * item.buyPriceMxn),
    }));
    
    // If editing, it's always single item
    if (product) {
      onSave(finalProducts[0]);
    } else {
      onSave(finalProducts);
    }
  };

  const currentItem = items[activeItemIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-brand-border overflow-hidden h-[95vh] lg:h-[90vh] flex flex-col m-2"
      >
        <div className="px-5 lg:px-8 py-4 lg:py-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 transition-colors">
          <div>
            <span className="text-[10px] lg:text-[12px] uppercase tracking-widest text-brand-label font-bold block mb-1">
              {product ? 'Edición de Logística' : 'Nueva Compra Consolidada'}
            </span>
            <h2 className="text-18px lg:text-22px font-bold text-brand-ink leading-none">
              {product ? 'Editar Artículo' : 'Registro de Pedido Master'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {!product && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">{items.length} Artículos</span>
              </div>
            )}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-md bg-[#F8FAF9] flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors border border-brand-border"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Panel: Global Logistic Settings */}
          <div className="w-full lg:w-[380px] border-r border-brand-border bg-[#FBFBFB] overflow-y-auto p-5 lg:p-6 space-y-6">
            <section className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">Destino Global de Pedido</label>
                <select 
                  value={commonData.destino}
                  onChange={e => setCommonData({ ...commonData, destino: e.target.value as any })}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg outline-none focus:border-brand-ink text-xs font-bold bg-white"
                >
                  {DESTINOS.map(d => <option key={d} value={d.replace(' ', '_')}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest flex items-center justify-between">
                  T.C. Base
                  <button
                    type="button"
                    onClick={fetchExchangeRate}
                    disabled={isFetchingRate}
                    className="text-brand-accent hover:underline flex items-center gap-1 normal-case"
                  >
                    {isFetchingRate ? <Loader2 size={8} className="animate-spin" /> : <RefreshCcw size={8} />}
                    Auto
                  </button>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={commonData.exchangeRate}
                  onChange={e => setCommonData({ ...commonData, exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg outline-none focus:border-brand-ink text-xs font-mono bg-white"
                />
              </div>
            </section>
          </div>

          {/* Right Panel: Items Dynamic List */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {!product && (
              <div className="px-6 py-4 border-b border-brand-border flex items-center gap-3 overflow-x-auto scrollbar-hide">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveItemIndex(idx)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2",
                      activeItemIndex === idx 
                        ? "bg-brand-ink text-white border-brand-ink" 
                        : "bg-[#F8FAF9] text-brand-muted border-brand-border hover:bg-[#F0F2F1]"
                    )}
                  >
                    Artículo {idx + 1}
                    {items.length > 1 && (
                       <X 
                        size={12} 
                        className="hover:text-red-400 cursor-pointer" 
                        onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                       />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="p-2 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-all flex items-center justify-center shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 pb-40 lg:pb-32">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-ink">Modelo / Artículo</label>
                    <input 
                      type="text" 
                      required
                      value={currentItem.name}
                      onChange={e => updateItem(activeItemIndex, { name: e.target.value })}
                      placeholder="Nike Air Jordan 1..."
                      className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink transition-colors text-sm font-bold"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-ink">Tienda / Boutique</label>
                      <input 
                        type="text" 
                        list="boutique-options"
                        required
                        value={currentItem.boutique}
                        onChange={e => updateItem(activeItemIndex, { boutique: e.target.value })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm font-bold"
                        placeholder="Ej: StockX"
                      />
                      <datalist id="boutique-options">
                        {allBoutiques.map(b => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-ink">Tarjeta de Pago</label>
                      <input 
                        type="text" 
                        list="card-options"
                        value={currentItem.card}
                        onChange={e => updateItem(activeItemIndex, { card: e.target.value })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm font-bold"
                        placeholder="Amex, Visa..."
                      />
                      <datalist id="card-options">
                        <option value="Amex Platinum" />
                        <option value="Visa Business" />
                        <option value="Mastercard" />
                        <option value="Efectivo" />
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-muted">Status Inicial</label>
                      <select 
                        value={currentItem.currentStatus}
                        onChange={e => updateItem(activeItemIndex, { currentStatus: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl text-sm"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-muted">Marca</label>
                      <input 
                        type="text" 
                        value={currentItem.brand}
                        onChange={e => updateItem(activeItemIndex, { brand: e.target.value })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-muted">Talla</label>
                      <input 
                        type="text" 
                        value={currentItem.size}
                        onChange={e => updateItem(activeItemIndex, { size: e.target.value })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-muted">Categoría</label>
                      <input 
                        type="text" 
                        list="cat-options"
                        value={currentItem.category}
                        onChange={e => updateItem(activeItemIndex, { category: e.target.value })}
                        className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm"
                      />
                      <datalist id="cat-options">
                        {allCategories.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-muted">Cantidad</label>
                    <input 
                      type="number" 
                      min="1"
                      value={currentItem.quantity}
                      onChange={e => updateItem(activeItemIndex, { quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-brand-border bg-[#FBFBFB] flex items-center justify-center relative overflow-hidden group">
                    {currentItem.imageUrl ? (
                      <>
                        <img 
                          src={currentItem.imageUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button"
                          onClick={() => updateItem(activeItemIndex, { imageUrl: '' })}
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                        <ImageIcon size={40} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Subir Imagen</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={e => handleImageUpload(e, activeItemIndex)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-brand-ink" size={24} />
                        <span className="text-[10px] font-bold uppercase">Subiendo...</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-muted">URL Imagen (Opcional)</label>
                    <input 
                      type="url" 
                      value={currentItem.imageUrl}
                      onChange={e => updateItem(activeItemIndex, { imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-brand-border rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-brand-border">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator size={14} className="text-brand-muted" />
                    <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">Costo Unitario USD</label>
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    value={currentItem.buyPriceUsd}
                    onChange={e => {
                      const usd = parseFloat(e.target.value) || 0;
                      const mxn = Math.round(usd * commonData.exchangeRate);
                      const suggestedSellMxn = Math.round(mxn * (1 + (globalMarkup / 100)));
                      updateItem(activeItemIndex, { 
                        buyPriceUsd: usd, 
                        buyPriceMxn: mxn,
                        sellPriceMxn: suggestedSellMxn
                      });
                    }}
                    className="w-full px-4 py-3 bg-brand-ink text-white border-none rounded-xl text-lg font-mono font-bold outline-none focus:ring-4 focus:ring-brand-ink/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                   <div className="flex items-center gap-2 mb-1">
                    <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">Costo Unit MXN</label>
                  </div>
                  <div className="w-full px-4 py-3 bg-[#F8FAF9] border border-brand-border rounded-xl text-lg font-mono font-bold text-brand-ink/50">
                    ${(currentItem.buyPriceMxn || 0).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest italic">Precio Venta Sugerido</label>
                  </div>
                  <input 
                    type="number" 
                    value={currentItem.sellPriceMxn || ''}
                    onChange={e => updateItem(activeItemIndex, { sellPriceMxn: parseFloat(e.target.value) || 0 })}
                    placeholder="MXN"
                    className="w-full px-4 py-3 border border-brand-border rounded-xl text-lg font-mono font-bold outline-none focus:ring-4 focus:ring-brand-ink/5 transition-all text-brand-ink placeholder:text-brand-border"
                  />
                </div>
              </div>

              {/* Totals Preview */}
              <div className="bg-brand-ink/5 border border-brand-ink/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] block mb-1">Resumen del Artículo</span>
                  <p className="text-sm font-bold text-brand-ink leading-tight">
                    {currentItem.name || 'Sin nombre'} x {currentItem.quantity} uds
                  </p>
                </div>
                <div className="flex gap-8 text-right underline underline-offset-8 decoration-2 decoration-brand-accent/20">
                  <div>
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Subtotal USD</span>
                    <span className="text-xl font-bold text-brand-ink font-mono">${(currentItem.quantity * currentItem.buyPriceUsd).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Subtotal MXN</span>
                    <span className="text-xl font-bold text-brand-accent font-mono">${(currentItem.quantity * currentItem.buyPriceMxn).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-muted">Notas Internas / SKU {currentItem.sku}</label>
                <textarea 
                  rows={2}
                  value={currentItem.notes}
                  onChange={e => updateItem(activeItemIndex, { notes: e.target.value })}
                  placeholder="Instrucciones especiales para este artículo..."
                  className="w-full px-4 py-3 border border-brand-border rounded-xl outline-none focus:border-brand-ink text-sm resize-none"
                />
              </div>

              {/* Customer Allocation Section (Moved here from Left Panel) */}
              <div className="pt-6 border-t border-brand-border space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentItem.isShowcase ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white text-brand-muted border border-brand-border"
                    )}>
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-ink">Añadir a Vitrina</h4>
                      <p className="text-[10px] text-brand-muted uppercase tracking-wider">Visible en SneekerPortal</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={currentItem.isShowcase}
                      onChange={e => updateItem(activeItemIndex, { isShowcase: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-brand-ink">Asignación de Cliente</h3>
                    <p className="text-[10px] text-brand-muted uppercase tracking-wider">¿Para quién es este artículo?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    className="text-[10px] font-bold text-brand-ink bg-white border border-brand-border px-3 py-1.5 rounded-lg hover:bg-brand-ink hover:text-white transition-all flex items-center gap-2"
                  >
                    <Search size={12} /> {showCustomerSearch ? 'Cerrar Buscador' : 'Buscar en Lista'}
                  </button>
                </div>

                {showCustomerSearch && (
                  <div className="bg-[#F8FAF9] border border-brand-border rounded-xl p-3 space-y-3 shadow-inner">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Filtrar por nombre, email o teléfono..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-brand-border rounded-lg outline-none focus:border-brand-ink bg-white"
                    />
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#E0E5E2] bg-white rounded-lg border border-brand-border">
                      {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left p-3 hover:bg-brand-ink hover:text-white transition-colors group"
                        >
                          <div className="text-sm font-bold">{c.name}</div>
                          <div className="text-[10px] opacity-60">{c.email} • {c.phone}</div>
                        </button>
                      )) : (
                        <div className="p-4 text-center text-[10px] uppercase font-bold text-brand-muted">No se encontraron clientes</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Nombre Cliente</label>
                    <input 
                      type="text" 
                      value={currentItem.clientName}
                      onChange={e => updateItem(activeItemIndex, { clientName: e.target.value })}
                      placeholder="Nombre o 'STOCK'"
                      className="w-full px-4 py-2 border border-brand-border rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Instagram</label>
                    <input 
                      type="text" 
                      value={currentItem.clientIg}
                      onChange={e => updateItem(activeItemIndex, { clientIg: e.target.value })}
                      placeholder="@usuario"
                      className="w-full px-4 py-2 border border-brand-border rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Método Pago Cliente</label>
                    <select 
                      value={currentItem.metodo_pago_cliente}
                      onChange={e => updateItem(activeItemIndex, { metodo_pago_cliente: e.target.value })}
                      className="w-full px-4 py-2 border border-brand-border rounded-lg text-xs font-bold"
                    >
                      <option value="Efectivo/Transferencia">Efectivo/Transferencia</option>
                      <option value="Tarjeta">Tarjeta (+Comisión)</option>
                      <option value="Crédito">Crédito / Apartado</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <footer className="w-full lg:absolute lg:bottom-0 lg:left-0 bg-white/90 backdrop-blur-md border-t border-brand-border px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20">
            <div className="flex items-center gap-4 text-brand-muted">
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Total Consolidado</span>
                 <span className="text-15px font-bold text-brand-ink font-mono">
                   USD ${(items.reduce((sum, item) => sum + (item.quantity * item.buyPriceUsd), 0)).toFixed(2)}
                 </span>
               </div>
               <div className="w-px h-6 bg-brand-border" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Inversión Final</span>
                 <span className="text-15px font-bold text-brand-accent font-mono">
                   MXN ${(items.reduce((sum, item) => sum + (item.quantity * item.buyPriceMxn), 0)).toLocaleString()}
                 </span>
               </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-brand-muted hover:text-brand-ink text-sm transition-all border border-transparent hover:border-brand-border"
              >
                Cancelar
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="flex-1 md:flex-none px-10 py-3 rounded-xl font-bold bg-brand-ink text-white hover:bg-black transition-all text-sm shadow-xl shadow-black/10 flex items-center justify-center gap-2"
              >
                {product ? 'Actualizar Cambios' : `Registrar ${items.length} Artículos`}
                <span className="opacity-40"><ChevronRight size={16} /></span>
              </motion.button>
            </div>
          </footer>
        </form>
      </motion.div>
    </div>
  );
}
