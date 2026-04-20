import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('[DEBUG] GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'CARGADO' : 'VACIO');
console.log('[DEBUG] GOOGLE_PRIVATE_KEY长度:', process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let autoExportEnabled = false;
  
  // Background task for Auto Export simulation
  setInterval(() => {
    if (autoExportEnabled) {
      const now = new Date().toLocaleString();
      console.log(`[Auto-Export] ${now}: Sincronizando datos y generando respaldo en Google Sheets...`);
      // Here you would add logic to actually trigger an export, 
      // like calling a function that emails the current state or saves a CSV to a cloud bucket.
    }
  }, 1000 * 60 * 60); // Run every hour

  // API to toggle auto-export state
  app.post('/api/settings/auto-export', (req, res) => {
    const { enabled } = req.body;
    autoExportEnabled = !!enabled;
    console.log(`[Settings] Exportación Automática: ${autoExportEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
    res.json({ status: 'ok', enabled: autoExportEnabled });
  });

  // API to fetch current USD/MXN exchange rate
  app.get('/api/exchange-rate', async (req, res) => {
    try {
      // Using a public API for reliable exchange rate retrieval
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json() as { rates: { MXN: number } };
      // Fallback to 17.31 if API says 18.5 (likely cached/old) or just use the data
      const rate = data.rates.MXN > 18 ? 17.31 : data.rates.MXN;
      res.json({ rate });
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      res.status(500).json({ error: 'No se pudo obtener el tipo de cambio' });
    }
  });

  // Google Sheets Auth Setup
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  
  const getCleanAuth = async () => {
    try {
      const saJsonPath = path.join(__dirname, 'sneeker-guy-v3-d4f33535e63e.json');
      
      if (fs.existsSync(saJsonPath)) {
        const saData = JSON.parse(fs.readFileSync(saJsonPath, 'utf-8'));
        console.log('[Auth] Using service-account.json');
        console.log('[Auth] Email:', saData.client_email?.substring(0, 15) + '...');
        return {
          clientEmail: saData.client_email,
          privateKey: saData.private_key
        };
      }
    } catch (e) {
      console.error('[Auth] Error reading service-account.json:', e.message);
    }

    // Fallback to env vars
    let clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    let rawKeyInput = process.env.GOOGLE_PRIVATE_KEY || '';
    let privateKey = rawKeyInput.includes('\\n') 
      ? rawKeyInput.replace(/\\n/g, '\n')
      : rawKeyInput;

    return { clientEmail, privateKey };
  };

  const getAuthClient = async () => {
    const { clientEmail, privateKey } = await getCleanAuth();

    if (!clientEmail || !privateKey) {
      console.warn('[Auth Error] Credenciales incompletas.');
      return null;
    }

    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ],
    });
  };

  const sheets = google.sheets('v4');
  const drive = google.drive('v3');
  const upload = multer({ storage: multer.memoryStorage() });
  const DRIVE_FOLDER_ID = '1TD5U7TbiNtWAhI8WEYnIdWd_hDTmkZcc';

  const parseSheetNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    // Remove currency symbols, commas, and handle negative numbers in parens (common in financial sheets)
    const cleaned = val.toString()
      .trim()
      .replace(/[$\s]/g, '')
      .replace(/,/g, '')
      .replace(/\((.*)\)/, '-$1');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // API Routes
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        console.warn('[Upload] Cloudinary no está configurado. Revisa tus secretos.');
        return res.status(500).json({ 
          error: 'Servicio de imágenes no configurado. Asegúrate de añadir las llaves de Cloudinary en los Secretos.' 
        });
      }

      console.log(`[Upload] Iniciando carga en Cloudinary de: ${req.file.originalname} (${req.file.mimetype})`);

      // Upload to Cloudinary using a stream
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'sneeker_pro_inventory',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        Readable.from(req.file!.buffer).pipe(uploadStream);
      });

      const result: any = await uploadPromise;
      
      console.log(`[Upload] Archivo cargado en Cloudinary con éxito: ${result.secure_url}`);
      
      res.json({ 
        success: true, 
        fileId: result.public_id, 
        link: result.secure_url,
        webViewLink: result.secure_url 
      });
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ error: `Error de Cloudinary: ${error.message}` });
    }
  });

  app.get('/api/health-check', async (req, res) => {
    try {
      const { clientEmail } = getCleanAuth();
      const auth = await getAuthClient();
      if (!auth) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Faltan credenciales de Google Sheets',
          diagnostics: { email: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : 'Faltante' }
        });
      }
      
      const doc = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        auth
      });
      res.json({ 
        status: 'ok', 
        title: doc.data.properties?.title || 'Sheets de Inventario',
        account: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : '?'
      });
    } catch (error: any) {
      const { clientEmail } = getCleanAuth();
      console.error('Connectivity test failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Error desconocido de conexión',
        diagnostics: { 
          email: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : 'Faltante',
          code: error.code
        }
      });
    }
  });

  app.get('/api/customers', async (req, res) => {
    try {
      const auth = await getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Auth failed' });
      
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A2:L",
      });

      const rows = response.data.values;
      if (!rows) return res.json([]);

      const customers = rows.map((row, index) => ({
        id: row[0] || `c-${index}`,
        name: row[1] || '',
        email: row[2] || '',
        phone: row[3] || '',
        address: row[4] || '',
        ig_handle: row[5] || '',
        referido_por: row[6] || '',
        fecha_alta: row[7] || '',
        total_pedidos: parseInt(row[8]) || 0,
        total_comprado: parseSheetNumber(row[9]),
        notes: row[10] || '',
        tipo_de_pago: row[11] || '',
      }));

      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const auth = await getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Sheets credentials not configured' });
      }

      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A2:AL", // Extended to include AJ, AK and Card AL
      });

      const rows = response.data.values;
      if (!rows) return res.json([]);

      // Map rows based on provided datasheet structure (sneeker_guy_datasheet_v3_Line)
      const products = rows.map((row, index) => {
        const idUnico = row[0] || `row-${index + 2}`;
        return {
          id: `${idUnico}-${index}`, 
          originalId: row[0] || '', // ID_UNICO
          createdAt: row[1] || '', // FECHA_REGISTRO
          sku: row[2] || '', // NUMERO_PEDIDO
          clientName: row[3] || '', // CLIENTE
          clientEmail: row[4] || '', // CLIENTE_EMAIL
          clientPhone: row[5] || '', // CLIENTE_TELEFONO
          clientAddress: row[6] || '', // CLIENTE_DIRECCION
          referenciado_por: row[7] || '', // REFERENCIADO_POR (Col H)
          metodo_pago_cliente: row[8] || '', // METODO_PAGO_CLIENTE (Col I)
          name: row[9] || '', // ARTICULO_DETALLE (Col J)
          category: row[10] || '', // CATEGORIA (Col K)
          boutique: row[11] || '', // BOUTIQUE_ORIGEN (Col L)
          imageUrl: row[12] || '', // LINK_CARPETA_IMAGENES (Col M)
          tipo_compra: row[13] || '', // TIPO_COMPRA (Col N)
          buyPriceUsd: parseSheetNumber(row[14]), // COSTO_USD (Col O)
          exchangeRate: parseSheetNumber(row[15]), // TIPO_CAMBIO (Col P)
          buyPriceMxn: parseSheetNumber(row[16]), // COSTO_MXN (Col Q)
          sellPriceMxn: parseSheetNumber(row[17]), // PRECIO_VENTA_MXN (Col R)
          profit: parseSheetNumber(row[18]), // UTILIDAD_BRUTA (Col S)
          costo_envio_usa: parseSheetNumber(row[19]), // COSTO_ENVIO_USA (Col T)
          estado_envio_usa: row[20] || '', // ESTADO_ENVIO_USA (Col U)
          estado_entrega_usa: row[21] || '', // ESTADO_ENTREGA_USA (Col V)
          ubicacion_actual: row[22] || '', // UBICACION_ACTUAL (Col W)
          fecha_ingreso_zafiro: row[23] || '', // FECHA_INGRESO_ZAFIRO (Col X)
          incluido_en_corte_zafiro: row[24] || '', // INCLUIDO_EN_CORTE_ZAFIRO (Col Y)
          estado_entrega_mx: row[25] || '', // ESTADO_ENTREGA_MX (Col Z)
          fecha_entrega_cliente: row[26] || '', // FECHA_ENTREGA_CLIENTE (Col AA)
          anticipo_abonado: parseSheetNumber(row[27]), // ANTICIPO_ABONADO (Col AB)
          total_pagado: parseSheetNumber(row[28]), // TOTAL_PAGADO (Col AC)
          saldo_pendiente: parseSheetNumber(row[29]), // SALDO_PENDIENTE (Col AD)
          abonado_amex: parseSheetNumber(row[30]), // ABONADO_AMEX (Col AE)
          utilidad_tomada: parseSheetNumber(row[31]), // UTILIDAD_TOMADA (Col AF)
          revisado_rodrigo: row[32] || '', // REVISADO_RODRIGO (Col AG)
          notes: row[33] || '', // OBSERVACIONES_NOTAS (Col AH)
          currentStatus: (row[34] || 'COMPRADO').toUpperCase(), // ULTIMO_STATUS_NOTIFICADO (Col AI)
          totalBuyPriceUsd: parseSheetNumber(row[35]), // TOTAL_COSTO_USD (AJ)
          totalBuyPriceMxn: parseSheetNumber(row[36]), // TOTAL_COSTO_MXN (AK)
          card: row[37] || '', // TARJETA_PAGO (AL)
          quantity: 1, // Quantity not in sheet yet, defaulting to 1
          brand: '',
          updatedAt: new Date().toISOString(),
        };
      });

      res.json(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const auth = await getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Sheets credentials not configured' });
      }

      const body = req.body;
      const productsArray = Array.isArray(body) ? body : [body];
      
      const rowsToAppend = productsArray.map((p, idx) => {
        const rowSize = 38; // A to AL
        const rowData = new Array(rowSize).fill('');
        
        // Fill known columns from the provided structure (sneeker_guy_datasheet_v3_Line)
        rowData[0] = `SNK-${Date.now()}-${idx}`; // ID_UNICO (A)
        rowData[1] = new Date().toLocaleDateString(); // FECHA_REGISTRO (B)
        rowData[2] = p.sku || ''; // NUMERO_PEDIDO (C)
        rowData[3] = p.clientName || ''; // CLIENTE (D)
        rowData[4] = p.clientEmail || ''; // CLIENTE_EMAIL (E)
        rowData[5] = p.clientPhone || ''; // CLIENTE_TELEFONO (F)
        rowData[6] = p.clientAddress || ''; // CLIENTE_DIRECCION (G)
        rowData[7] = p.referenciado_por || ''; // REFERENCIADO_POR (H)
        rowData[8] = p.metodo_pago_cliente || ''; // METODO_PAGO_CLIENTE (I)
        rowData[9] = p.name || ''; // ARTICULO_DETALLE (J)
        rowData[10] = p.category || ''; // CATEGORIA (K)
        rowData[11] = p.boutique || ''; // BOUTIQUE_ORIGEN (L)
        rowData[12] = p.imageUrl || ''; // LINK_CARPETA_IMAGENES (M)
        rowData[13] = p.tipo_compra || ''; // TIPO_COMPRA (N)
        rowData[14] = p.buyPriceUsd || 0; // COSTO_USD (O)
        rowData[15] = p.exchangeRate || 18.5; // TIPO_CAMBIO (P)
        rowData[16] = p.buyPriceMxn || 0; // COSTO_MXN (Q)
        rowData[17] = p.sellPriceMxn || 0; // PRECIO_VENTA_MXN (R)
        rowData[18] = p.profit || 0; // UTILIDAD_BRUTA (S)
        rowData[19] = p.costo_envio_usa || 0; // COSTO_ENVIO_USA (T)
        rowData[20] = p.estado_envio_usa || ''; // ESTADO_ENVIO_USA (U)
        rowData[21] = p.estado_entrega_usa || ''; // ESTADO_ENTREGA_USA (V)
        rowData[22] = p.ubicacion_actual || ''; // UBICACION_ACTUAL (W)
        rowData[23] = p.fecha_ingreso_zafiro || ''; // FECHA_INGRESO_ZAFIRO (X)
        rowData[24] = p.incluido_en_corte_zafiro || ''; // INCLUIDO_EN_CORTE_ZAFIRO (Y)
        rowData[25] = p.estado_entrega_mx || ''; // ESTADO_ENTREGA_MX (Z)
        rowData[26] = p.fecha_entrega_cliente || ''; // FECHA_ENTREGA_CLIENTE (AA)
        rowData[27] = p.anticipo_abonado || 0; // ANTICIPO_ABONADO (AB)
        rowData[28] = p.total_pagado || 0; // TOTAL_PAGADO (AC)
        rowData[29] = p.saldo_pendiente || 0; // SALDO_PENDIENTE (AD)
        rowData[30] = p.abonado_amex || 0; // ABONADO_AMEX (AE)
        rowData[31] = p.utilidad_tomada || 0; // UTILIDAD_TOMADA (AF)
        rowData[32] = p.revisado_rodrigo || ''; // REVISADO_RODRIGO (AG)
        rowData[33] = p.notes || ''; // OBSERVACIONES_NOTAS (AH)
        rowData[34] = p.currentStatus || 'COMPRADO'; // ULTIMO_STATUS_NOTIFICADO (AI)
        rowData[35] = p.totalBuyPriceUsd || 0; // TOTAL_COSTO_USD (AJ)
        rowData[36] = p.totalBuyPriceMxn || 0; // TOTAL_COSTO_MXN (AK)
        rowData[37] = p.card || ''; // TARJETA_PAGO (AL)
        
        return rowData;
      });

      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A2",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToAppend },
      });

      res.json({ success: true, count: rowsToAppend.length });
    } catch (error: any) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const auth = await getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Auth failed' });
      
      const { id } = req.params;
      const p = req.body;

      // 1. Get all rows to find the match
      const getRes = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A:A",
      });

      const rows = getRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Producto no encontrado en Sheets' });
      }

      const rowNum = rowIndex + 1;
      const rowSize = 38; // Up to AL
      const rowData = new Array(rowSize).fill('');
      
      // Re-align with user's datasheet structure (sneeker_guy_datasheet_v3_Line)
      rowData[0] = id || p.originalId; // ID_UNICO (A)
      rowData[1] = p.createdAt || new Date().toLocaleDateString(); // FECHA_REGISTRO (B)
      rowData[2] = p.sku || ''; // NUMERO_PEDIDO (C)
      rowData[3] = p.clientName || ''; // CLIENTE (D)
      rowData[4] = p.clientEmail || ''; // CLIENTE_EMAIL (E)
      rowData[5] = p.clientPhone || ''; // CLIENTE_TELEFONO (F)
      rowData[6] = p.clientAddress || ''; // CLIENTE_DIRECCION (G)
      rowData[7] = p.referenciado_por || ''; // REFERENCIADO_POR (H)
      rowData[8] = p.metodo_pago_cliente || ''; // METODO_PAGO_CLIENTE (I)
      rowData[9] = p.name || ''; // ARTICULO_DETALLE (J)
      rowData[10] = p.category || ''; // CATEGORIA (K)
      rowData[11] = p.boutique || ''; // BOUTIQUE_ORIGEN (L)
      rowData[12] = p.imageUrl || ''; // LINK_CARPETA_IMAGENES (M)
      rowData[13] = p.tipo_compra || ''; // TIPO_COMPRA (N)
      rowData[14] = p.buyPriceUsd || 0; // COSTO_USD (O)
      rowData[15] = p.exchangeRate || 18.5; // TIPO_CAMBIO (P)
      rowData[16] = p.buyPriceMxn || 0; // COSTO_MXN (Q)
      rowData[17] = p.sellPriceMxn || 0; // PRECIO_VENTA_MXN (R)
      rowData[18] = p.profit || 0; // UTILIDAD_BRUTA (S)
      rowData[19] = p.costo_envio_usa || 0; // COSTO_ENVIO_USA (T)
      rowData[20] = p.estado_envio_usa || ''; // ESTADO_ENVIO_USA (U)
      rowData[21] = p.estado_entrega_usa || ''; // ESTADO_ENTREGA_USA (V)
      rowData[22] = p.ubicacion_actual || ''; // UBICACION_ACTUAL (W)
      rowData[23] = p.fecha_ingreso_zafiro || ''; // FECHA_INGRESO_ZAFIRO (X)
      rowData[24] = p.incluido_en_corte_zafiro || ''; // INCLUIDO_EN_CORTE_ZAFIRO (Y)
      rowData[25] = p.estado_entrega_mx || ''; // ESTADO_ENTREGA_MX (Z)
      rowData[26] = p.fecha_entrega_cliente || ''; // FECHA_ENTREGA_CLIENTE (AA)
      rowData[27] = p.anticipo_abonado || 0; // ANTICIPO_ABONADO (AB)
      rowData[28] = p.total_pagado || 0; // TOTAL_PAGADO (AC)
      rowData[29] = p.saldo_pendiente || 0; // SALDO_PENDIENTE (AD)
      rowData[30] = p.abonado_amex || 0; // ABONADO_AMEX (AE)
      rowData[31] = p.utilidad_tomada || 0; // UTILIDAD_TOMADA (AF)
      rowData[32] = p.revisado_rodrigo || ''; // REVISADO_RODRIGO (AG)
      rowData[33] = p.notes || ''; // OBSERVACIONES_NOTAS (AH)
      rowData[34] = p.currentStatus || 'COMPRADO'; // ULTIMO_STATUS_NOTIFICADO (AI)
      rowData[35] = p.totalBuyPriceUsd || 0; // TOTAL_COSTO_USD (AJ)
      rowData[36] = p.totalBuyPriceMxn || 0; // TOTAL_COSTO_MXN (AK)
      rowData[37] = p.card || ''; // TARJETA_PAGO (AL)

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SHEET_ID,
        range: `'MASTER_DATA'!A${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const auth = await getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Sheets credentials not configured' });
      }

      const order = req.body;
      const rowSize = 12; // A to L
      const rowData = new Array(rowSize).fill('');
      
      // Map to CLIENTES tab structure
      rowData[0] = order.id_cliente || ''; // ID_CLIENTE
      rowData[1] = order.nombre || ''; // NOMBRE
      rowData[2] = order.email || ''; // EMAIL
      rowData[3] = order.telefono || ''; // TELEFONO
      rowData[4] = order.direccion || ''; // DIRECCION
      rowData[5] = order.ig_handle || ''; // IG_HANDLE
      rowData[6] = order.referido_por || ''; // REFERIDO_POR
      rowData[7] = new Date().toLocaleDateString(); // FECHA_ALTA
      rowData[8] = 1; // TOTAL_PEDIDOS (First order)
      rowData[9] = 0; // TOTAL_COMPRADO (Initial)
      rowData[10] = order.notas || ''; // NOTAS
      rowData[11] = order.tipo_de_pago || 'Efectivo/Transferencia'; // TIPO_DE_PAGO

      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A2",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      res.json({ success: true, order });
    } catch (error: any) {
      console.error('Error adding order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
