import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calculator
} from 'lucide-react';
import { Product } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface FinanceViewProps {
  products: Product[];
  globalMarkup?: number;
  onUpdateMarkup?: (val: number) => void;
}

export function FinanceView({ products, globalMarkup = 35, onUpdateMarkup }: FinanceViewProps) {
  const stats = React.useMemo(() => {
    const totalCostoUsd = products.reduce((acc, p) => acc + (p.buyPriceUsd * (p.quantity || 1)), 0);
    const totalCostoMxn = products.reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
    const totalVentaMxn = products.reduce((acc, p) => acc + ((p.sellPriceMxn || 0) * (p.quantity || 1)), 0);
    const totalUtilidad = products.reduce((acc, p) => acc + ((p.profit || 0) * (p.quantity || 1)), 0);
    
    // Category Breakdown
    const categoryData: Record<string, { name: string, value: number }> = {};
    products.forEach(p => {
      const cat = p.category || 'Otros';
      if (!categoryData[cat]) categoryData[cat] = { name: cat, value: 0 };
      categoryData[cat].value += (p.buyPriceMxn * (p.quantity || 1));
    });

    const categoryChartData = Object.values(categoryData).sort((a, b) => b.value - a.value);

    // Status Breakdown for Cash Flow
    const statusData = [
      { name: 'Comprado', value: products.filter(p => p.currentStatus === 'COMPRADO').length },
      { name: 'Tránsito', value: products.filter(p => p.currentStatus === 'EN_RUTA').length },
      { name: 'En Stock', value: products.filter(p => p.currentStatus === 'EN_BODEGA').length },
      { name: 'Entregado', value: products.filter(p => p.currentStatus === 'ENTREGADO').length },
    ];

    return {
      totalCostoUsd,
      totalCostoMxn,
      totalVentaMxn,
      totalUtilidad,
      categoryChartData,
      statusData
    };
  }, [products]);

  const COLORS = ['#141414', '#5A5A40', '#F27D26', '#00FF00', '#FF4E00', '#5A5A40'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-ink">Resumen Financiero</h2>
          <p className="text-sm text-brand-muted font-medium">Análisis detallado de inversión y rentabilidad</p>
        </div>
        <div className="flex items-center gap-2 bg-[#F8FAF9] px-4 py-2 rounded-xl border border-brand-border">
          <Clock className="text-brand-muted" size={16} />
          <span className="text-xs font-bold text-brand-ink uppercase tracking-tight">Actualizado: {new Date().toLocaleDateString()}</span>
        </div>
      </header>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceCard 
          title="Inversión Total (USD)" 
          value={formatCurrency(stats.totalCostoUsd)}
          icon={<DollarSign className="text-brand-ink" size={20} />}
          trend={+2.4}
          color="bg-white"
        />
        <FinanceCard 
          title="Inversión Total (MXN)" 
          value={`$${Math.round(stats.totalCostoMxn).toLocaleString()}`}
          icon={<Wallet className="text-[#5A5A40]" size={20} />}
          trend={+1.2}
          color="bg-white"
        />
        <FinanceCard 
          title="Venta Proyectada" 
          value={`$${Math.round(stats.totalVentaMxn).toLocaleString()}`}
          icon={<TrendingUp className="text-[#F27D26]" size={20} />}
          trend={+5.8}
          color="bg-white"
        />
        <FinanceCard 
          title="Utilidad Estimada" 
          value={`$${Math.round(stats.totalUtilidad).toLocaleString()}`}
          icon={<Calculator className="text-green-600" size={20} />}
          trend={+12.4}
          color="bg-[#F0F2F1]"
          highlight
        />
      </div>

      {/* Pricing Management Section */}
      <div className="bg-brand-ink text-white rounded-2xl p-6 lg:p-8 shadow-2xl shadow-brand-ink/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
              <Calculator size={24} className="text-brand-accent" />
              Gestión de Precios Sugeridos
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Define un margen de utilidad base que se aplicará automáticamente a todos los nuevos artículos ingresados. 
              Esto facilita la visualización inmediata del <b>Precio Venta Sugerido</b> para tus clientes en la vitrina.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-center gap-6 shrink-0">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Margen de Utilidad Base</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={globalMarkup}
                  onChange={(e) => onUpdateMarkup?.(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-transparent text-3xl font-bold font-mono text-brand-accent outline-none border-b-2 border-brand-accent/30 focus:border-brand-accent transition-all text-center"
                />
                <span className="text-3xl font-bold text-brand-accent">%</span>
              </div>
            </div>
            
            <div className="h-px sm:h-12 w-12 sm:w-px bg-white/10" />

            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Ejemplo de Cálculo</span>
              <p className="text-xs text-gray-400 font-medium">
                Costo: $100 <br />
                Venta: <span className="text-white font-bold">${Math.round(100 * (1 + (globalMarkup / 100)))} MXN</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown Chart */}
        <div className="lg:col-span-2 bg-white border border-brand-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-brand-ink uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Inversión por Categoría (MXN)
            </h3>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={stats.categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#8E9299' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#8E9299' }}
                  tickFormatter={(val) => `$${(val / 1000)}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAF9' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E4E3E0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution */}
        <div className="bg-white border border-brand-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-brand-ink uppercase tracking-widest flex items-center gap-2 mb-8">
            <PieChartIcon size={16} /> Distribución de Stock
          </h3>
          <div className="h-[250px] w-full min-h-[250px]">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {stats.statusData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2 text-brand-muted">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {item.name}
                </div>
                <span className="text-brand-ink">{item.value} unidades</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ title, value, icon, trend, color, highlight }: { title: string, value: string, icon: React.ReactNode, trend: number, color: string, highlight?: boolean }) {
  return (
    <div className={cn("p-6 rounded-2xl border border-brand-border transition-all hover:shadow-lg hover:shadow-black/5", color)}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-[#F8FAF9] rounded-xl border border-brand-border">
          {icon}
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full", trend > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-brand-label uppercase tracking-widest">{title}</p>
        <h3 className={cn("text-2xl font-bold font-mono tracking-tight", highlight ? "text-brand-ink" : "text-brand-ink")}>{value}</h3>
      </div>
    </div>
  );
}

function Clock({ className, size }: { className?: string, size?: number }) {
  return <ClockIcon className={className} size={size} />;
}
import { Clock as ClockIcon } from 'lucide-react';
