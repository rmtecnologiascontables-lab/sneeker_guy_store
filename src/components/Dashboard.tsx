import React from 'react';
import { Product, DashboardStats, OrderStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Package, AlertTriangle, DollarSign, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  products: Product[];
}

const COLORS = ['#000000', '#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

export function Dashboard({ products }: DashboardProps) {
  const stats: DashboardStats = React.useMemo(() => {
    const s: DashboardStats = {
      totalItems: products.reduce((acc, p) => acc + p.quantity, 0),
      lowStockItems: products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length,
      totalValueUsd: products.reduce((acc, p) => acc + (p.buyPriceUsd * p.quantity), 0),
      totalValueMxn: products.reduce((acc, p) => acc + (p.buyPriceMxn * p.quantity), 0),
      statusCounts: {
        COMPRADO: 0,
        EN_RUTA: 0,
        EN_BODEGA: 0,
        ENVIADO: 0,
        ENTREGADO: 0
      }
    };
    
    products.forEach(p => {
      s.statusCounts[p.currentStatus]++;
    });
    
    return s;
  }, [products]);

  const statusLabelMap: Record<OrderStatus, string> = {
    COMPRADO: '📦 Comprado',
    EN_RUTA: '✈️ En Ruta',
    EN_BODEGA: '📍 En Zafi',
    ENVIADO: '🚚 Enviado MX',
    ENTREGADO: '✅ Entregado'
  };

  const statusData = Object.entries(stats.statusCounts).map(([name, value]) => ({ 
    name: statusLabelMap[name as OrderStatus], 
    value 
  }));
  const stockData = products.slice(0, 10).map(p => ({ name: p.name.split(' ')[0], stock: p.quantity }));

  return (
    <div className="space-y-4 lg:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <StatCard 
          title="Total SKU" 
          value={stats.totalItems.toString()} 
          delay={0.1}
        />
        <StatCard 
          title="Stock Bajo" 
          value={stats.lowStockItems.toString()} 
          color="text-[#B45309]"
          delay={0.2}
        />
        <StatCard 
          title="Valor Total" 
          value={formatCurrency(stats.totalValueUsd)} 
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-8 rounded-xl border border-brand-border min-h-[350px] lg:h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-4 lg:mb-8">
             <h3 className="font-bold text-xs lg:text-sm tracking-tight text-brand-ink">Distribución por Status</h3>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#1A1A1A' : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-xl border border-brand-border min-h-[350px] lg:h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-4 lg:mb-8">
             <h3 className="font-bold text-xs lg:text-sm tracking-tight text-brand-ink">Niveles de Inventario</h3>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F1" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#999'}} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#999'}} />
                <Tooltip cursor={{ fill: '#F8FAF9' }} />
                <Bar dataKey="stock" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "text-brand-ink", delay }: { title: string, value: string, color?: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-4 lg:p-6 rounded-xl border border-brand-border"
    >
      <div className="text-[10px] lg:text-[12px] uppercase tracking-wider text-brand-label font-bold mb-1 lg:mb-3">
        {title}
      </div>
      <div className={cn("text-20px lg:text-32px font-bold", color)}>
        {value}
      </div>
    </motion.div>
  );
}
