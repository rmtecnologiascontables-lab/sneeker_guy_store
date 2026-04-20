import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Menu, 
  X, 
  Settings,
  LogOut,
  Activity,
  Table as TableIcon,
  LayoutGrid,
  DollarSign,
  Download,
  Printer,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Building2,
  Trash2,
  Users,
  Smartphone,
  RefreshCcw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OrderStatus, CustomerOrder, Customer } from './types';
import { INITIAL_PRODUCTS } from './data/mockData';
import { ProductCard } from './components/ProductCard';
import { ProductForm } from './components/ProductForm';
import { CustomerOrderForm } from './components/CustomerOrderForm';
import { Dashboard } from './components/Dashboard';
import { FinanceView } from './components/FinanceView';
import { cn, formatCurrency, formatDate, exportToCSV } from './lib/utils';

type ActiveTab = 'dashboard' | 'all' | 'pending' | 'delivered' | 'stock' | 'zafi' | 'orders' | 'finances' | 'settings';
type ViewType = 'visual' | 'excel';

export default function App() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = React.useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('dashboard');
  const [autoExport, setAutoExport] = React.useState(false);
  const [globalMarkup, setGlobalMarkup] = React.useState(35); // Default 35% markup

  const toggleAutoExport = async () => {
    const newState = !autoExport;
    setAutoExport(newState);
    try {
      await fetch('/api/settings/auto-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
    } catch (e) {
      console.error('Failed to sync auto-export setting');
    }
  };
  const [viewType, setViewType] = React.useState<ViewType>('visual');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | 'ALL'>('ALL');
  const [connectionStatus, setConnectionStatus] = React.useState<{status: 'idle' | 'testing' | 'ok' | 'error', message: string}>({status: 'idle', message: ''});
  const [justSynced, setJustSynced] = React.useState(false);

  // Load Data from API
  // Logic to calculate suggested retail price if not explicitly set
  const getSuggestedPriceMxn = (product: Product) => {
    if (product.sellPriceMxn && product.sellPriceMxn > 0) {
      return product.sellPriceMxn;
    }
    // Fallback to auto-calculated markup from cost
    const costMxn = product.buyPriceMxn || 0;
    return Math.round(costMxn * (1 + (globalMarkup / 100)));
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers')
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
      
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data);
      }

      setConnectionStatus({ status: 'ok', message: 'Conectado a Google Sheets' });
    } catch (error) {
      console.error('Error fetching products:', error);
      setConnectionStatus({ status: 'error', message: 'Error de servidor frontend-backend' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus({ status: 'testing', message: 'Probando conexión...' });
    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();
      if (data.status === 'ok') {
        setConnectionStatus({ status: 'ok', message: `Conectado: ${data.title}` });
      } else {
        setConnectionStatus({ status: 'error', message: data.message });
      }
    } catch (error) {
      setConnectionStatus({ status: 'error', message: 'Sin respuesta del servidor backend' });
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.currentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

    switch (activeTab) {
      case 'pending':
        return filtered.filter(p => p.currentStatus !== 'ENTREGADO');
      case 'delivered':
        return filtered.filter(p => p.currentStatus === 'ENTREGADO');
      case 'stock':
        return filtered.filter(p => !p.clientName || p.clientName.trim() === '');
      case 'zafi':
        return filtered.filter(p => p.destino === 'EL PASO' || (p.currentStatus as string).includes('ZAFI'));
      default:
        return filtered;
    }
  }, [products, searchQuery, statusFilter, activeTab]);

  const stats = React.useMemo(() => ({
    total: products.length,
    pending: products.filter(p => p.currentStatus !== 'ENTREGADO').length,
    lowStock: products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length,
  }), [products]);

  const handleSaveProduct = async (data: Partial<Product> | Partial<Product>[]) => {
    setIsLoading(true);
    try {
      if (editingProduct && !Array.isArray(data)) {
        // Build the full product state for update
        const updatedProduct = { ...editingProduct, ...data, updatedAt: new Date().toISOString() };
        
        const response = await fetch(`/api/products/${editingProduct.originalId || editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct),
        });

        if (response.ok) {
          setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct as Product : p));
        } else {
          const err = await response.json();
          alert(`Error al actualizar en Google Sheets: ${err.error}`);
        }
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          // Result is bulk, easiest is to reload all data to get fresh IDs
          await loadData();
        } else {
          const err = await response.json();
          alert(`Error al guardar en Google Sheets: ${err.error}`);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error de conexión al sincronizar con Google Sheets');
    } finally {
      setIsLoading(false);
      setIsFormOpen(false);
      setEditingProduct(undefined);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este artículo?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    setProducts(products.map(p => p.id === id ? { ...p, currentStatus: status, updatedAt: new Date().toISOString() } : p));
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(p => ({
      PEDIDO: p.sku,
      FECHA: formatDate(p.createdAt),
      BOUTIQUE: p.boutique || '',
      DESTINO: p.destino || '',
      ARTICULO: p.name,
      MARCA: p.brand,
      TALLA: p.size || '',
      'COSTO USD': p.buyPriceUsd,
      'COSTO MXN': p.buyPriceMxn,
      CLIENTE: p.clientName || 'STOCK',
      STATUS: p.currentStatus,
      NOTAS: p.notes || ''
    }));
    exportToCSV(exportData, `StockMaster_${activeTab}_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-black selection:text-white overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 240 : 0, 
          x: isSidebarOpen ? 0 : -240,
          opacity: 1 // Keep opacity 1 for smooth x transition
        }}
        className={cn(
          "h-full bg-white border-r border-brand-border overflow-y-auto scrollbar-hide fixed lg:relative z-50 flex flex-col transition-all duration-300 ease-in-out",
          !isSidebarOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-8 px-6 min-w-[240px]">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 bg-brand-ink rounded flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-brand-ink">StockMaster</span>
          </div>

          <nav className="space-y-1">
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<LayoutDashboard size={18} />} 
              label="Pipeline Dashboard" 
            />
            <NavItem 
              active={activeTab === 'finances'} 
              onClick={() => { setActiveTab('finances'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<DollarSign size={18} />} 
              label="Finanzas" 
            />
            <div className="pt-4 pb-2">
              <span className="px-4 text-[10px] font-bold text-brand-label uppercase tracking-widest">Vistas de Control</span>
            </div>
            <NavItem 
              active={activeTab === 'all'} 
              onClick={() => { setActiveTab('all'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Package size={18} />} 
              label="Todos los Pedidos" 
              badge={stats.total}
            />
            <NavItem 
              active={activeTab === 'pending'} 
              onClick={() => { setActiveTab('pending'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Clock size={18} />} 
              label="Pendientes" 
              badge={stats.pending}
            />
            <NavItem 
              active={activeTab === 'delivered'} 
              onClick={() => { setActiveTab('delivered'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<CheckCircle2 size={18} />} 
              label="Entregados" 
            />
            <NavItem 
              active={activeTab === 'stock'} 
              onClick={() => { setActiveTab('stock'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<FileSpreadsheet size={18} />} 
              label="Stock Disponible" 
            />
            <NavItem 
              active={activeTab === 'zafi'} 
              onClick={() => { setActiveTab('zafi'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Building2 size={18} />} 
              label="Filtro Zafi (USA)" 
            />
            <NavItem 
              active={activeTab === 'orders'} 
              onClick={() => { setActiveTab('orders'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Users size={18} />} 
              label="Órdenes de Clientes" 
              badge={customerOrders.length}
            />
            <div className="mt-6 pt-6 border-t border-brand-border">
              <button 
                onClick={() => { setIsCustomerPortalOpen(true); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white font-black uppercase italic tracking-tighter text-xs shadow-lg shadow-black/20 hover:scale-[1.02] transition-all"
              >
                <Smartphone size={16} />
                Portal Clientes
              </button>
              <NavItem 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
                icon={<Settings size={18} />} 
                label="Ajustes Sistema" 
              />
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-brand-border min-w-[240px]">
          <button className="flex items-center gap-2 text-sm font-medium text-brand-muted hover:text-brand-ink transition-colors">
            <LogOut size={16} /> Salir Sesión
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="px-4 lg:px-10 py-4 lg:h-24 flex flex-col lg:flex-row lg:items-center justify-between border-b border-brand-border bg-white sticky top-0 z-30 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] lg:text-[12px] uppercase tracking-widest text-brand-label font-bold mb-1">
              {activeTab === 'orders' ? 'Clientes' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
            <div className="flex items-center gap-3 lg:gap-4 overflow-x-auto scrollbar-hide">
              <h1 className="text-20px lg:text-28px font-bold tracking-tight text-brand-ink whitespace-nowrap">
                {activeTab === 'dashboard' ? 'Control Logístico' : activeTab === 'all' ? 'Inventario Total' : activeTab === 'pending' ? 'Pedidos en Ruta' : activeTab === 'stock' ? 'Artículos en Stock' : activeTab === 'zafi' ? 'Pedidos Zafi (El Paso)' : activeTab === 'orders' ? 'Preventa' : 'Configuración'}
              </h1>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadData}
                disabled={isLoading}
                className={cn(
                  "w-8 h-8 rounded-lg border transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center",
                  justSynced ? "bg-green-500 border-green-500 text-white" : "bg-[#F8FAF9] border-brand-border text-brand-muted hover:text-brand-ink"
                )}
                title="Sincronizar con Google Sheets"
              >
                {justSynced ? <Check size={14} /> : <Activity size={14} className={cn(isLoading && "animate-spin")} />}
              </motion.button>
              {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'orders' && (
                <div className="flex bg-[#F8FAF9] p-1 rounded-lg border border-brand-border flex-shrink-0">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewType('visual')}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all",
                      viewType === 'visual' ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink"
                    )}
                  >
                    <LayoutGrid size={12} />
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewType('excel')}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all",
                      viewType === 'excel' ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink"
                    )}
                  >
                    <TableIcon size={12} />
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 overflow-x-auto py-1 scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAF9] border border-brand-border rounded-lg mr-2 shrink-0">
              <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors hidden sm:inline", autoExport ? "text-brand-muted" : "text-brand-accent")}>{autoExport ? "ON" : "OFF"}</span>
              <button 
                type="button"
                onClick={toggleAutoExport}
                className={cn(
                  "w-8 h-4 rounded-full relative transition-all duration-300",
                  autoExport ? "bg-brand-ink" : "bg-[#D1D5DB]"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
                  autoExport ? "left-4.5" : "left-0.5"
                )} />
              </button>
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted hidden lg:inline">Exportación Automática</span>
            </div>

            {activeTab !== 'dashboard' && activeTab !== 'settings' && (
              <>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold bg-[#F8FAF9] text-brand-muted border border-brand-border hover:bg-[#F0F2F1] transition-all whitespace-nowrap"
                >
                  <Download size={14} /> <span className="hidden lg:inline">CSV</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold bg-[#F8FAF9] text-brand-muted border border-brand-border hover:bg-[#F0F2F1] transition-all whitespace-nowrap"
                >
                  <Printer size={14} /> <span className="hidden lg:inline">Imprimir</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadData}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border disabled:opacity-50",
                    justSynced ? "bg-green-500 border-green-500 text-white" : "bg-[#F8FAF9] border-brand-border text-brand-muted hover:bg-[#F0F2F1]"
                  )}
                  title="Sincronizar con Google Sheets"
                >
                  {justSynced ? <Check size={14} /> : <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />}
                  <span className="hidden lg:inline">{justSynced ? 'Sincronizado' : 'Sincronizar'}</span>
                </motion.button>
              </>
            )}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }}
              className="bg-brand-ink text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold text-xs lg:text-sm tracking-tight flex items-center gap-2 hover:bg-[#333] transition-all shadow-lg shadow-black/5 whitespace-nowrap"
            >
              <Plus size={16} /> <span>Nuevo</span>
            </motion.button>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 lg:space-y-8 flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-8 h-8 border-4 border-brand-ink/10 border-t-brand-ink rounded-full animate-spin" />
              <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Sincronizando con Google Sheets...</p>
            </div>
          )}
          
          {!isLoading && activeTab === 'dashboard' && <Dashboard products={products} />}
          {!isLoading && activeTab === 'finances' && (
            <FinanceView 
              products={products} 
              globalMarkup={globalMarkup} 
              onUpdateMarkup={setGlobalMarkup} 
            />
          )}

          {!isLoading && activeTab === 'orders' && (
            <div className="bg-white border border-brand-border rounded-xl shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
              <table className="w-full border-collapse text-[11px] lg:text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-brand-ink text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">ID Cliente</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Modelo</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Talla</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                <tbody className="divide-y divide-brand-border">
                  {customerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-brand-muted italic">No hay órdenes de clientes registradas</td>
                    </tr>
                  ) : (
                    customerOrders.map((o, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAF9] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-brand-muted">{o.id_cliente}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.fecha_pedido)}</td>
                        <td className="px-4 py-3 font-bold text-brand-ink">{o.nombre}</td>
                        <td className="px-4 py-3 text-brand-ink">
                          <div className="font-bold">{o.modelo_seleccionado}</div>
                          <div className="text-[10px] text-brand-muted">{o.sku_referencia}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{o.talla}</td>
                        <td className="px-4 py-3">{o.cantidad}</td>
                        <td className="px-4 py-3 font-bold text-brand-ink">
                          ${(o.total_mxn || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold uppercase text-[9px]">
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => setCustomerOrders(customerOrders.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && (activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'finances') && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-brand-border">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-ink transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscador inteligente (SKU, Cliente, Marca, Modelo)..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F8FAF9] border-none rounded-lg py-2.5 pl-12 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={16} className="text-brand-muted" />
                  <select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-[#F8FAF9] border-none rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-brand-ink outline-none font-bold text-sm min-w-[160px]"
                  >
                    <option value="ALL">Todos los Status</option>
                    <option value="COMPRADO">📦 Comprado en USA</option>
                    <option value="EN_RUTA">✈️ En Ruta a Zafi</option>
                    <option value="EN_BODEGA">📍 Recibido en Zafi</option>
                    <option value="ENVIADO">🚚 Enviado a México</option>
                    <option value="ENTREGADO">✅ Entregado</option>
                  </select>
                </div>
              </div>

              {viewType === 'visual' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ProductCard 
                          product={product} 
                          globalMarkup={globalMarkup}
                          onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true); }}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteProduct}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                /* Excel View */
                <div className="bg-white border border-brand-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-brand-ink text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">SKU/Pedido</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Imagen</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Boutique</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Destino</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Tarjeta</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Artículo</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Marca</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Talla</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Costo USD</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Total USD</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Total MXN</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Venta</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F8FAF9] transition-colors group">
                          <td className="px-4 py-3 font-mono font-bold text-brand-ink">{p.sku}</td>
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-md border border-brand-border bg-white overflow-hidden flex items-center justify-center">
                              {p.imageUrl ? (
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/err/40/40'; }}
                                />
                              ) : (
                                <div className="text-[8px] font-bold text-brand-muted uppercase text-center leading-none">Sin<br/>Foto</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{formatDate(p.createdAt)}</td>
                          <td className="px-4 py-3 text-brand-ink font-medium">{p.boutique || '-'}</td>
                          <td className="px-4 py-3 font-bold text-brand-label">{p.destino || 'EL PASO'}</td>
                          <td className="px-4 py-3">
                            <div className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 inline-block">
                              <span className="text-[10px] font-bold text-brand-accent uppercase">{p.card || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-brand-ink font-bold">{p.name}</td>
                          <td className="px-4 py-3 text-brand-muted">{p.brand}</td>
                          <td className="px-4 py-3 text-brand-ink">{p.size || '-'}</td>
                          <td className="px-4 py-3 font-mono text-brand-ink">{formatCurrency(p.buyPriceUsd)}</td>
                          <td className="px-4 py-3 font-mono text-brand-ink font-bold">
                            {formatCurrency(p.totalBuyPriceUsd || (p.quantity * p.buyPriceUsd))}
                          </td>
                          <td className="px-4 py-3 font-mono text-brand-muted">
                            ${Math.round(p.totalBuyPriceMxn || (p.quantity * p.buyPriceMxn)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-brand-ink text-right">
                            ${getSuggestedPriceMxn(p).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={p.currentStatus}
                              onChange={(e) => handleStatusChange(p.id, e.target.value as OrderStatus)}
                              className="bg-transparent border-none p-0 text-xs font-bold text-brand-ink outline-none cursor-pointer hover:underline"
                            >
                              <option value="COMPRADO">📦 Comprado</option>
                              <option value="EN_RUTA">✈️ En Ruta</option>
                              <option value="EN_BODEGA">📍 En Zafi</option>
                              <option value="ENVIADO">🚚 Enviado</option>
                              <option value="ENTREGADO">✅ Entregado</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-brand-ink font-medium">{p.clientName || 'STOCK'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                                className="p-1.5 rounded bg-white border border-brand-border text-brand-muted hover:text-brand-ink transition-colors"
                              >
                                <LayoutDashboard size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded bg-white border border-brand-border text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="bg-[#F8FAF9] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-brand-border">
                    <Search size={40} />
                  </div>
                  <h3 className="font-bold text-brand-muted">No se encontraron artículos en esta vista</h3>
                  <button 
                    onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setActiveTab('all'); }}
                    className="text-brand-ink font-bold text-sm hover:underline"
                  >
                    Ver todo el inventario
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto py-12">
              <div className="bg-white p-12 rounded-xl border border-brand-border shadow-xl text-center space-y-6">
                <div className="w-20 h-20 bg-[#F8FAF9] rounded-full flex items-center justify-center mx-auto text-brand-border">
                  <Settings size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ajustes StockMaster Pro</h3>
                  <p className="text-brand-muted max-w-xs mx-auto text-sm leading-relaxed">
                    Personaliza reglas de logística, tipo de cambio y gestión de bases de datos.
                  </p>
                </div>
              <div className="grid grid-cols-1 gap-4 text-left">
                <SettingsRow title="Costo Logístico Promedio" value="$12.00 USD" />
                <SettingsRow title="Tipo de Cambio Base" value="18.50" />
                <SettingsRow title="Modo Hoja de Cálculo" value="Excel Compatible" />
                <SettingsRow title="Exportación Automática" value="Desactivada" />
                
                <div className="pt-4 space-y-3">
                  <button 
                    onClick={checkConnection}
                    disabled={connectionStatus.status === 'testing'}
                    className={cn(
                      "w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
                      connectionStatus.status === 'ok' ? "bg-green-50 text-green-700 border border-green-200" :
                      connectionStatus.status === 'error' ? "bg-red-50 text-red-700 border border-red-200" :
                      "bg-brand-ink text-white hover:bg-black"
                    )}
                  >
                    {connectionStatus.status === 'testing' ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />}
                    {connectionStatus.status === 'idle' ? 'Probar Conexión con Sheets' : 
                     connectionStatus.status === 'testing' ? 'Verificando...' : 
                     'Re-verificar Conexión'}
                  </button>
                  {connectionStatus.message && (
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      connectionStatus.status === 'ok' ? "text-green-600" : "text-red-500"
                    )}>
                      {connectionStatus.message}
                    </p>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isFormOpen && (
          <ProductForm 
            product={editingProduct} 
            customers={customers}
            boutiques={Array.from(new Set(products.map(p => p.boutique).filter(Boolean))) as string[]}
            categories={Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]}
            globalMarkup={globalMarkup}
            onSave={handleSaveProduct} 
            onClose={() => { setIsFormOpen(false); setEditingProduct(undefined); }} 
          />
        )}
        {isCustomerPortalOpen && (
          <CustomerOrderForm 
            availableProducts={products.filter(p => !p.clientName || p.currentStatus === 'STOCK' || p.isShowcase)}
            globalMarkup={globalMarkup}
            onOrderSubmit={async (order) => {
              try {
                const response = await fetch('/api/orders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(order),
                });
                if (response.ok) {
                  setCustomerOrders([order, ...customerOrders]);
                  alert('¡Pedido registrado con éxito en la base de datos!');
                } else {
                  const err = await response.json();
                  alert(`Error: ${err.error || 'No se pudo sincronizar con Sheets'}`);
                }
              } catch (error) {
                console.error('Order sync error:', error);
                // Fallback to local
                setCustomerOrders([order, ...customerOrders]);
              }
            }}
            onClose={() => setIsCustomerPortalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Footer Status */}
      <div className="fixed bottom-8 left-8 z-50 pointer-events-none">
         <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="pointer-events-auto w-12 h-12 rounded-lg bg-brand-ink text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className="fixed bottom-8 right-8 pointer-events-none">
        <div className={cn(
          "flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg border shadow-sm text-[10px] uppercase tracking-widest font-bold transition-all",
          connectionStatus.status === 'ok' ? "text-green-600 border-green-200" : 
          connectionStatus.status === 'error' ? "text-red-500 border-red-200" :
          "text-brand-muted border-brand-border"
        )}>
          {connectionStatus.status === 'testing' ? (
            <Activity size={12} className="animate-spin text-brand-ink" />
          ) : (
            <Activity size={12} className={cn(connectionStatus.status === 'ok' ? "text-green-500 animate-pulse" : "text-brand-muted")} />
          )}
          {connectionStatus.status === 'ok' ? 'Conectado a Google Sheets' : 
           connectionStatus.status === 'testing' ? 'Verificando...' :
           connectionStatus.status === 'error' ? 'Error de Conexión' :
           'Estado: Offline'}
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <motion.button 
      whileTap={{ x: 4, scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all font-bold text-sm",
        active 
          ? "bg-[#F0F2F1] text-brand-ink shadow-sm" 
          : "text-brand-muted hover:bg-[#F8FAF9] hover:text-brand-ink"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-colors", active ? "text-brand-ink" : "text-brand-muted")}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          active ? "bg-white text-brand-ink" : "bg-brand-border text-brand-muted"
        )}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

function SettingsRow({ title, value }: { title: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#F8FAF9] rounded-lg border border-brand-border">
      <span className="text-xs font-bold text-brand-muted">{title}</span>
      <span className="text-xs font-mono font-bold text-brand-ink">{value}</span>
    </div>
  );
}
