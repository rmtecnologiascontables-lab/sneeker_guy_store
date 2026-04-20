import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CustomerOrder } from '../types';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Map, 
  ShoppingBag, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Navigation,
  Loader2,
  Plus,
  CreditCard,
  Hash,
  Info
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface CustomerOrderFormProps {
  availableProducts: Product[];
  globalMarkup?: number;
  onOrderSubmit: (order: CustomerOrder) => void;
  onClose?: () => void;
}

export function CustomerOrderForm({ availableProducts, globalMarkup = 35, onOrderSubmit, onClose }: CustomerOrderFormProps) {
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    ig_handle: '',
    referido_por: '',
    tipo_de_pago: 'Transferencia/Efectivo',
  });

  const [items, setItems] = React.useState<any[]>([
    {
      modelo_seleccionado: '',
      sku_referencia: '',
      talla: '',
      cantidad: 1,
      notas: ''
    }
  ]);
  const [activeItemIndex, setActiveItemIndex] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const totalPrice = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const p = availableProducts.find(prod => prod.sku === item.sku_referencia);
      const unitPrice = p ? ((p.sellPriceMxn && p.sellPriceMxn > 0) ? p.sellPriceMxn : Math.round((p.buyPriceMxn || 0) * (1 + (globalMarkup / 100)))) : 0;
      return sum + (unitPrice * item.cantidad);
    }, 0);
  }, [items, availableProducts, globalMarkup]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateItem = (index: number, fields: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...fields };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      modelo_seleccionado: '',
      sku_referencia: '',
      talla: '',
      cantidad: 1,
      notes: ''
    }]);
    setActiveItemIndex(items.length);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setActiveItemIndex(Math.max(0, index - 1));
  };

  const handleProductSelect = (product: Product, index: number) => {
    const unitPrice = (product.sellPriceMxn && product.sellPriceMxn > 0) 
      ? product.sellPriceMxn 
      : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

    updateItem(index, { 
      modelo_seleccionado: product.name,
      sku_referencia: product.sku,
      precio_unitario: unitPrice,
      talla: '' 
    });
  };

  const scrollToCategory = (cat: string) => {
    const el = document.getElementById(`cat-${cat}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLocationRequest = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            direccion: `${prev.direccion} (GPS: ${position.coords.latitude}, ${position.coords.longitude})`.trim()
          }));
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // We send multiple orders if they are different items, or a combined structure.
    // The current api/orders takes ONE CustomerOrder. 
    // Usually these multi-item requests are better served as an array or a single payload with items.
    // I'll map them to the format the server expects.
    
    for (const item of items) {
      const order: CustomerOrder = {
        ...formData,
        ...item,
        total_mxn: (item.precio_unitario || 0) * (item.cantidad || 1),
        id_cliente: `CUST-${Date.now()}`,
        fecha_pedido: new Date().toISOString(),
        status: 'Pendiente'
      };
      await onOrderSubmit(order);
    }
    
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const currentItem = items[activeItemIndex];
  const selectedProduct = availableProducts.find(p => p.sku === currentItem.sku_referencia);
  const availableSizes = selectedProduct?.size ? [selectedProduct.size] : ['8 US', '8.5 US', '9 US', '9.5 US', '10 US', '10.5 US', '11 US'];

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl text-white">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/30">
            <CheckCircle2 size={48} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">¡Pedido Confirmado!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Tu orden ha sido registrada exitosamente. Nos pondremos en contacto contigo pronto.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-white/90 transition-all border-b-4 border-gray-300"
          >
            Volver
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans overflow-y-auto overflow-x-hidden selection:bg-white selection:text-black scrollbar-hide">
      {/* Background Decals */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[100%] lg:w-[60%] h-[100%] lg:h-[60%] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-0 lg:-right-[10%] w-[100%] lg:w-[50%] h-[100%] lg:h-[50%] bg-purple-500/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative min-h-screen flex flex-col p-4 lg:p-6 pb-40 max-w-md mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-start pt-4 mb-8 lg:mb-12">
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter italic uppercase leading-none">
              Sneeker<span className="text-white/40">Portal</span>
            </h1>
            <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 italic">
              Order Official • {step} of 2
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 lg:space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tight">Registro de Cliente</h2>
                  <p className="text-white/40 text-[12px] font-medium uppercase tracking-wider">Tus datos para la entrega</p>
                </div>

                <div className="space-y-6">
                  {/* Name */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <User size={12} /> Nombre Completo
                    </label>
                    <input 
                      type="text"
                      name="nombre"
                      required
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Instagram/Redes */}
                    <div className="group space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        REDES SOCIALES
                      </label>
                      <input 
                        type="text"
                        name="ig_handle"
                        value={formData.ig_handle}
                        onChange={handleInputChange}
                        placeholder="@tu_usuario"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold placeholder:text-white/10 focus:outline-none focus:border-white transition-all backdrop-blur-md"
                      />
                    </div>
                    {/* Referido */}
                    <div className="group space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        Referido Por
                      </label>
                      <input 
                        type="text"
                        name="referido_por"
                        value={formData.referido_por}
                        onChange={handleInputChange}
                        placeholder="Amigo, Ad, etc."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold placeholder:text-white/10 focus:outline-none focus:border-white transition-all backdrop-blur-md"
                      />
                    </div>
                  </div>

                  {/* Payment Preference */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <CreditCard size={12} /> PREFERENCIA DE PAGO
                    </label>
                    <select 
                      name="tipo_de_pago"
                      value={formData.tipo_de_pago}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md appearance-none"
                    >
                      <option value="Transferencia/Efectivo" className="bg-[#1A1A1A]">Transferencia / Efectivo</option>
                      <option value="Tarjeta de Crédito" className="bg-[#1A1A1A]">Tarjeta de Crédito / Débito</option>
                      <option value="Depósito OXXO" className="bg-[#1A1A1A]">Depósito OXXO</option>
                      <option value="Mercado Pago" className="bg-[#1A1A1A]">Mercado Pago</option>
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <Phone size={12} /> Teléfono
                    </label>
                    <input 
                      type="tel"
                      name="telefono"
                      required
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="+52 000 000 000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  {/* Email */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <Mail size={12} /> Correo Electrónico
                    </label>
                    <input 
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  {/* Address */}
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        <MapPin size={12} /> Dirección de Entrega
                      </label>
                      <button 
                        type="button"
                        onClick={handleLocationRequest}
                        disabled={isLocating}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                        {isLocating ? 'Ubicando...' : 'Obtener GPS'}
                      </button>
                    </div>
                    <textarea 
                      name="direccion"
                      required
                      value={formData.direccion}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Calle, Número, Colonia, Ciudad..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Vitrina de Productos</h2>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none">Explora nuestro stock exclusivo</p>
                  </div>

                  {/* Category Selection Sidebar/Header */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Filtrar por Categoría</span>
                      <ShoppingBag size={14} className="text-white/20" />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sticky top-0 z-20 bg-black/80 backdrop-blur-xl py-4 border-b border-white/5">
                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="px-6 py-3 rounded-2xl bg-white text-black text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-xl shadow-white/10"
                      >
                        🔥 Todos
                      </button>
                      {Array.from(new Set(availableProducts.map(p => p.category))).sort().map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => scrollToCategory(cat)}
                          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white"
                        >
                          {cat === 'CALZADO' ? '👟 ' : cat === 'ROPA' ? '👕 ' : cat === 'ELECTRONICOS' ? '📱 ' : '✨ '}
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Item Management Bar */}
                  <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      <span>Tu Selección ({items.length})</span>
                      <button 
                        type="button"
                        onClick={addItem}
                        className="text-blue-400 font-black hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} /> Nuevo Item
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {items.map((it, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={cn(
                            "px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2",
                            activeItemIndex === idx 
                              ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                              : "bg-white/5 text-white/40 border-white/10"
                          )}
                        >
                          {it.modelo_seleccionado ? it.modelo_seleccionado : `Artículo ${idx + 1}`}
                          {items.length > 1 && idx === activeItemIndex && (
                            <X size={12} className="ml-1 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeItem(idx); }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-12 pb-20">
                  {/* Vitrina Catalog grouped by Category */}
                  {Array.from(new Set(availableProducts.map(p => p.category))).map(cat => (
                    <div key={cat} id={`cat-${cat}`} className="space-y-6 scroll-mt-24">
                      <div className="flex items-center gap-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/40">{cat}</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6">
                        {availableProducts.filter(p => p.category === cat).map((p) => {
                          const isSelectedForActive = currentItem.sku_referencia === p.sku;
                          const isSelectedInAny = items.some(it => it.sku_referencia === p.sku);
                          
                          return (
                            <motion.div
                              key={p.id}
                              whileHover={{ y: -4 }}
                              onClick={() => handleProductSelect(p, activeItemIndex)}
                              className={cn(
                                "relative flex flex-col rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden group/card",
                                isSelectedForActive 
                                  ? "bg-white border-white ring-8 ring-white/10" 
                                  : isSelectedInAny
                                    ? "bg-white/10 border-white/20"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                              )}
                            >
                              <div className="aspect-square relative overflow-hidden bg-white/5">
                                <img 
                                  src={p.imageUrl || 'https://picsum.photos/seed/placeholder/400/300'} 
                                  alt={p.name} 
                                  className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className={cn(
                                  "absolute inset-0 bg-gradient-to-t transition-opacity",
                                  isSelectedForActive ? "from-black/40 to-transparent opacity-100" : "from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100"
                                )} />
                                
                                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 scale-90 group-hover/card:scale-100 transition-transform">
                                  {p.isShowcase && (
                                    <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">
                                      Promesa
                                    </div>
                                  )}
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl",
                                    isSelectedForActive ? "bg-black text-white" : "bg-white text-black"
                                  )}>
                                    {p.brand}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                  <h4 className={cn("text-xl font-black uppercase tracking-tighter leading-none flex-1", isSelectedForActive ? "text-black" : "text-white")}>
                                    {p.name}
                                  </h4>
                                  {isSelectedForActive && (
                                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center shrink-0">
                                      <CheckCircle2 size={14} className="text-white" />
                                    </div>
                                  )}
                                </div>

                                {p.notes && (
                                  <p className={cn("text-[11px] line-clamp-2 leading-relaxed font-bold uppercase tracking-wide", isSelectedForActive ? "text-black/50" : "text-white/40")}>
                                    {p.notes}
                                  </p>
                                )}

                                  <div className="flex items-end justify-between pt-4 border-t border-white/10">
                                    <div className="space-y-0.5">
                                      <span className={cn("text-[8px] font-black uppercase tracking-widest block", isSelectedForActive ? "text-black/40" : "text-white/30")}>Precio Sugerido</span>
                                      <div className={cn("text-2xl font-black italic tracking-tighter", isSelectedForActive ? "text-black" : "text-white")}>
                                        ${((p.sellPriceMxn && p.sellPriceMxn > 0) ? p.sellPriceMxn : Math.round((p.buyPriceMxn || 0) * (1 + (globalMarkup / 100)))).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className={cn("text-[8px] font-black uppercase tracking-widest block", isSelectedForActive ? "text-black/40" : "text-white/30")}>Ref. Est. USD</span>
                                      <div className={cn("text-sm font-bold font-mono italic", isSelectedForActive ? "text-black/70" : "text-white/60")}>
                                        {formatCurrency(p.buyPriceUsd * (1 + (globalMarkup / 100)))}
                                      </div>
                                    </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Selection Details (Talla, Cantidad, Pago) */}
                {selectedProduct && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-10 pt-10 border-t border-white/10"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                          <Map size={12} /> Talla US para {currentItem.modelo_seleccionado}
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        {availableSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => updateItem(activeItemIndex, { talla: size })}
                            className={cn(
                              "px-6 py-4 rounded-2xl text-[14px] font-black min-w-[72px] border transition-all shrink-0",
                              currentItem.talla === size 
                                ? "bg-white border-white text-black scale-105 shadow-xl shadow-white/20" 
                                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Item #{activeItemIndex + 1} - Cantidad</label>
                        <div className="flex items-center gap-6">
                          <button 
                            type="button" 
                            onClick={() => updateItem(activeItemIndex, { cantidad: Math.max(1, currentItem.cantidad - 1) })}
                            className="w-14 h-14 bg-white border border-white/20 rounded-2xl flex items-center justify-center font-black text-2xl text-black hover:bg-white/90"
                          >
                            -
                          </button>
                          <span className="text-3xl font-black w-10 text-center italic">{currentItem.cantidad}</span>
                          <button 
                            type="button"
                            onClick={() => updateItem(activeItemIndex, { cantidad: currentItem.cantidad + 1 })}
                            className="w-14 h-14 bg-white border border-white/20 rounded-2xl flex items-center justify-center font-black text-2xl text-black hover:bg-white/90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Notas</label>
                        <textarea 
                          name="notas"
                          value={currentItem.notas}
                          onChange={e => updateItem(activeItemIndex, { notas: e.target.value })}
                          placeholder="Instrucciones..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Persistent Sticky Checkout Bar */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent h-40 -top-10 pointer-events-none" />
          <div className="relative max-w-md mx-auto p-6 bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-[3rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col gap-6">
              {/* Persistent Total Amount */}
              <div className="flex justify-between items-end px-2">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 block">Monto Total a Pagar</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black italic tracking-tighter text-white">
                      ${totalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-black uppercase text-white/20">MXN</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 block">USD Equivalent</span>
                  <span className="text-sm font-black font-mono text-white/60">${(totalPrice / 20).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                {step === 2 && (
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-16 px-6 bg-white/5 border border-white/10 rounded-[2rem] text-white/60 hover:text-white transition-all flex items-center justify-center group"
                    title="Volver al Registro"
                  >
                    <ChevronRight size={24} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={step === 1 ? () => setStep(2) : handleSubmit}
                  disabled={isSubmitting || (step === 2 && !items.some(it => it.sku_referencia))}
                  className={cn(
                    "flex-1 h-16 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3",
                    "bg-white text-black hover:scale-[0.98] active:scale-95 disabled:opacity-30",
                    step === 2 && "bg-blue-600 text-white border-b-4 border-blue-800 shadow-blue-500/20"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Procesando
                    </>
                  ) : (
                    <>
                      {step === 1 ? 'Siguiente: Ir a Vitrina' : `Confirmar Orden (${items.length})`}
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
