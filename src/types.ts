export type OrderStatus = 'COMPRADO' | 'EN_RUTA' | 'EN_BODEGA' | 'ENVIADO' | 'ENTREGADO';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  size?: string;
  buyPriceUsd: number;
  exchangeRate: number;
  buyPriceMxn: number;
  totalBuyPriceUsd?: number;
  totalBuyPriceMxn?: number;
  sellPriceMxn?: number;
  profit?: number;
  amountPaid?: number;
  isPaid?: boolean;
  isDelivered?: boolean;
  isReviewed?: boolean;
  fbPublished?: boolean;
  boutique?: string;
  card?: string;
  quantity: number;
  minStock: number;
  currentStatus: OrderStatus;
  destino?: 'EL PASO' | 'DALLAS' | 'DIRECTO A MEXICO';
  imageUrl?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientIg?: string;
  referido_por?: string;
  referenciado_por?: string; // Col H
  metodo_pago_cliente?: string; // Col I
  tipo_compra?: string; // Col N
  costo_envio_usa?: number; // Col T
  estado_envio_usa?: string; // Col U
  estado_entrega_usa?: string; // Col V
  ubicacion_actual?: string; // Col W
  fecha_ingreso_zafiro?: string; // Col X
  incluido_en_corte_zafiro?: string; // Col Y
  estado_entrega_mx?: string; // Col Z
  fecha_entrega_cliente?: string; // Col AA
  anticipo_abonado?: number; // Col AB
  total_pagado?: number; // Col AC
  saldo_pendiente?: number; // Col AD
  abonado_amex?: number; // Col AE
  utilidad_tomada?: number; // Col AF
  revisado_rodrigo?: string; // Col AG
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isShowcase?: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  ig_handle?: string;
  referido_por?: string;
  fecha_alta?: string;
  total_pedidos?: number;
  total_comprado?: number;
  notes?: string;
  tipo_de_pago?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CustomerOrder {
  id_cliente: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  ig_handle?: string;
  referido_por?: string;
  tipo_de_pago?: string;
  modelo_seleccionado: string;
  sku_referencia?: string;
  talla: string;
  cantidad: number;
  precio_unitario?: number;
  total_mxn?: number;
  notas: string;
  fecha_pedido: string;
  status: 'Pendiente' | 'Procesado' | 'Enviado' | 'Entregado';
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalValueUsd: number;
  totalValueMxn: number;
  statusCounts: Record<OrderStatus, number>;
}
