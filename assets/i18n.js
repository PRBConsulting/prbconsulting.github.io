/* PRB Consulting · idioma y región de las apps.
   ES = español (Venezuela, $ y Bs). EN-CA = inglés para Canadá (CAD, HST). EN-US = inglés para Estados Unidos (USD, sales tax).
   La interfaz se escribe en español y, en inglés, se traduce al pintar la pantalla con el diccionario de abajo. */
(function () {
  'use strict';
  let r = 'ES';
  try { r = localStorage.getItem('prb-region') || ((navigator.language || '').toLowerCase().startsWith('en') ? ((navigator.language || '').toLowerCase().includes('ca') ? 'CA' : 'US') : 'ES'); } catch (e) { /* sin almacenamiento */ }
  if (!['ES', 'CA', 'US'].includes(r)) r = 'ES';
  const en = r !== 'ES';
  const P = window.PRB = {
    region: r, en, lang: en ? 'en' : 'es',
    loc: en ? 'en-US' : 'es-VE',
    cur: r === 'CA' ? 'CAD' : 'USD',
    tax: r === 'CA' ? 'HST' : r === 'US' ? 'Sales tax' : 'IVA',
    taxRate: r === 'CA' ? 13 : r === 'US' ? 7 : 16,
    sfx: en ? '-' + r.toLowerCase() : '',
    pagos: r === 'CA' ? ['Cash', 'Debit (Interac)', 'Credit card', 'E-transfer', 'Cheque'] : r === 'US' ? ['Cash', 'Debit card', 'Credit card', 'Zelle', 'Check'] : null,
    fecha: (iso) => !iso ? '' : r === 'CA' ? iso.slice(0, 10) : r === 'US' ? iso.slice(5, 7) + '/' + iso.slice(8, 10) + '/' + iso.slice(0, 4) : iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4),
    num: (v) => { let s = String(v ?? '').trim(); if (en) s = s.replace(/,/g, ''); else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const x = parseFloat(s); return isFinite(x) ? x : NaN; },
    setRegion(x) { try { localStorage.setItem('prb-region', x); } catch (e) { /* nada */ } location.reload(); }
  };
  document.documentElement.lang = P.lang;
  document.documentElement.dataset.region = r;

  /* ---------- diccionario ES → EN ---------- */
  const T = P.tax;
  const D = {
    // navegación y títulos
    'Día a día': 'Day to day', 'Mercancía': 'Stock', 'Sistema': 'System', 'Mi dinero': 'My money', 'Planificar': 'Plan', 'Costos': 'Costs',
    'Panel': 'Dashboard', 'Vender': 'Sell', 'Cierre de caja': 'Cash count', 'Configuración': 'Settings', 'Caja rápida': 'Fast checkout',
    'Facturar a cliente': 'Invoice a customer', 'Facturar': 'Invoice', 'Cuentas por cobrar': 'Accounts receivable', 'Cuentas por pagar': 'Accounts payable',
    'Costos y equilibrio': 'Costs & break-even', 'Costos y punto de equilibrio': 'Costs & break-even point', 'Estado de resultados': 'Income statement', 'Simulador': 'Simulator',
    'Metas de ahorro': 'Savings goals', 'Movimientos': 'Transactions', 'Presupuesto': 'Budget', 'Resumen': 'Summary', 'Cuentas': 'Accounts',
    'Compras, ventas e inventario': 'Purchases, sales & inventory', 'Gestión comercial y costos': 'Sales, operations & costs', 'Ingresos, gastos y ahorro': 'Income, spending & savings',
    'Finanzas personales': 'Personal finance', 'Finanzas': 'Finance',
    // barra y pie
    'Demo · tus datos se guardan solo en este navegador': 'Demo · your data stays in this browser', 'datos en tu navegador': 'data in your browser', 'tus datos se guardan solo en este navegador': 'your data stays only in this browser', 'Alquiler': 'Rent', 'unid.': 'units', 'cuentas': 'accounts', 'precio': 'price', 'costo': 'cost', 'MC': 'CM', 'Total (Bs a la tasa de hoy)': 'Total', 'Sueldos': 'Wages', 'Servicios': 'Utilities', 'Demo ·': 'Demo ·',
    'hecho por': 'made by', 'Demo con datos ficticios: lo que registres se guarda solo en este navegador. Puedes volver a los datos ficticios en Configuración.': 'Demo with fictitious data: whatever you enter is saved only in this browser. You can go back to the fictitious data in Settings.',
    // portada
    'Sistemas simples para': 'Simple systems to', 'ordenar tu negocio': 'run your business',
    'Pruébalos aquí mismo con datos ficticios. No hace falta registrarte: lo que cargues se queda guardado solo en tu navegador.': 'Try them right here with fictitious data. No sign-up needed: whatever you enter stays saved in your browser only.',
    'Disponible': 'Available', 'Próximamente': 'Coming soon', 'Abrir la app →': 'Open the app →', 'Sitio web': 'Website', 'Todos los datos de las demos son ficticios.': 'All demo data is fictitious.', 'Hecho por PRB Consulting': 'Made by PRB Consulting',
    'Compras, ventas e inventario para bodegas y negocios pequeños. Precios en $ y Bs con la tasa del día, ganancia por venta y cierre de caja.': 'Purchases, sales and inventory for corner stores and small businesses. Profit per sale, reorder alerts and end-of-day cash count.',
    'Ingresos y gastos en $ y Bs, saldo por cuenta, presupuesto por categoría y metas de ahorro con cuánto guardar cada mes.': 'Income and spending by account, budget by category, and savings goals that tell you how much to put aside each month.',
    'Para empresas: caja rápida, facturación con IVA, cuentas por cobrar y por pagar, costos, punto de equilibrio, estado de resultados y simulador.': 'For companies: fast checkout, invoicing with sales tax, receivables and payables, costs, break-even point, income statement and a what-if simulator.',
    // comunes
    'Guardar': 'Save', 'Cancelar': 'Cancel', 'Cerrar': 'Close', 'Listo': 'Done', 'Imprimir': 'Print', 'Editar': 'Edit', 'Borrar': 'Delete', 'Anular': 'Void', 'Ajustar': 'Adjust',
    'Sí, anular': 'Yes, void it', 'Sí, continuar': 'Yes, continue', 'No': 'No', 'Sí': 'Yes', 'Vaciar': 'Clear', 'Limpiar': 'Clear', 'Volver': 'Back', 'Elegir…': 'Choose…',
    'Descargar CSV': 'Download CSV', 'Descargar respaldo (.json)': 'Download backup (.json)', 'Cargar respaldo': 'Load backup', 'Respaldo': 'Backup', 'Respaldo cargado': 'Backup loaded',
    'Empezar de nuevo': 'Start over', 'Empezar en blanco': 'Start blank', 'Volver a los datos ficticios': 'Back to fictitious data', 'Datos ficticios cargados': 'Fictitious data loaded',
    'Si quieres conservar algo, descarga un respaldo antes.': 'If you want to keep anything, download a backup first.', 'Se borra lo que registraste y se cargan los datos ficticios.': 'Everything you entered is erased and the fictitious data is loaded.',
    'Tus datos viven solo en este navegador. Descarga un respaldo para pasarlos a otro equipo o guardarlos.': 'Your data lives only in this browser. Download a backup to move it to another device or keep it safe.',
    'Tus datos viven solo en este navegador. Descarga un respaldo para pasarlos a otro equipo.': 'Your data lives only in this browser. Download a backup to move it to another device.',
    'No se pudo guardar en este navegador': 'Could not save in this browser', 'Permite ventanas emergentes para imprimir': 'Allow pop-ups to print', 'Guardado': 'Saved',
    'Hoy': 'Today', 'hoy': 'today', 'Fecha': 'Date', 'Hora': 'Time', 'Día': 'Day', 'Desde': 'From', 'Hasta': 'To', 'Mes': 'Month', 'Período': 'Period', 'Nota': 'Note', 'Opcional': 'Optional',
    'Cliente': 'Customer', 'Clientes': 'Customers', 'Proveedor': 'Supplier', 'Proveedores': 'Suppliers', 'Producto': 'Product', 'Productos': 'Products', 'productos': 'products',
    'Cant.': 'Qty', 'Cantidad': 'Quantity', 'Precio': 'Price', 'Total': 'Total', 'Subtotal': 'Subtotal', 'Exist.': 'Stock', 'Existencia': 'Stock', 'Mín.': 'Min', 'Mínimo': 'Minimum',
    'Estado': 'Status', 'Código': 'Code', 'Barras': 'Barcode', 'Código de barras': 'Barcode', 'Categoría': 'Category', 'Unidad': 'Unit', 'Nombre': 'Name', 'Margen': 'Margin', 'Pago': 'Payment',
    'Forma de pago': 'Payment method', 'Monto': 'Amount', 'Cuenta': 'Account', 'Tipo': 'Type', 'Detalle': 'Details', 'Todos': 'All', 'Todas': 'All', 'Buscar': 'Search', 'Buscar…': 'Search…',
    'Inventario': 'Inventory', 'Compras': 'Purchases', 'Ventas': 'Sales', 'ventas': 'sales', 'Factura': 'Invoice', 'Facturas': 'Invoices', 'facturas': 'invoices', 'factura': 'invoice',
    'Agotado': 'Out of stock', 'Reponer': 'Reorder', 'Por reponer': 'To reorder', 'por reponer': 'to reorder', 'Inactivo': 'Inactive', 'Activo': 'Active', 'Anulada': 'Voided', 'ANULADA': 'VOIDED', 'Pagada': 'Paid',
    'Vencida': 'Overdue', 'Vence hoy': 'Due today', 'Vence en': 'Due in', 'Vence': 'Due', 'vence': 'due', 'Contado': 'Paid now', 'Crédito': 'On account', 'Condición': 'Terms', 'días': 'days', 'día': 'day', ' d': ' d',
    'Saldo': 'Balance', 'Cobrado': 'Collected', 'Pagado': 'Paid', 'Debe': 'Owes', 'Cobrar': 'Collect', 'Pagar': 'Pay', 'Ganancia': 'Profit', 'ganancia': 'profit',
    'Total $': 'Total', 'Precio $': 'Price', 'Costo $': 'Cost', 'Monto $': 'Amount', 'Saldo $': 'Balance', 'Subtotal $': 'Subtotal', 'Costo unit. $': 'Unit cost', 'Valor a costo $': 'Value at cost', 'Monto en $': 'Amount',
    'Efectivo $': 'Cash', 'Transferencia': 'Bank transfer', 'Punto de venta': 'Card', 'Pago móvil': 'Mobile payment', 'Zelle': 'Zelle',
    // X3 Lite: panel y vender
    'Ventas de hoy': "Today's sales", 'Ganancia de hoy': "Today's profit", 'Ventas del mes': 'Sales this month', 'Inventario a costo': 'Inventory at cost', 'Ventas de los últimos 14 días': 'Sales, last 14 days',
    'Lo más vendido este mes': 'Best sellers this month', 'Últimas ventas': 'Latest sales', 'Todo el inventario está sobre el mínimo': 'All stock is above the minimum', 'Armar compra con estos productos': 'Build a purchase order with these',
    'Sin ventas este mes': 'No sales this month', 'No hay ventas': 'No sales',
    'Busca o toca un producto para agregarlo. El sistema revisa la existencia y calcula el total en $ y en bolívares con la tasa del día.': 'Search or tap a product to add it. The system checks stock and adds up the total.',
    'Buscar por nombre o código…': 'Search by name or code…', 'Venta actual': 'Current sale', 'Agrega productos desde la lista': 'Add products from the list', 'Cliente (opcional)': 'Customer (optional)',
    'No hay productos con ese nombre. Puedes crearlo en Inventario.': 'No product with that name. You can create it in Inventory.', 'No hay productos con ese nombre.': 'No product with that name.',
    'Ver venta': 'View sale', 'Recibo N°': 'Receipt #', 'registrada': 'recorded', 'Venta': 'Sale', 'Venta anulada': 'Sale voided', 'Anular venta': 'Void sale',
    'La mercancía vuelve al inventario y deja de contar en caja.': 'The items go back to inventory and stop counting in the cash count.', 'Se anula la venta de': 'This voids the sale of', 'del': 'from',
    'No hay más existencia de': 'No more stock of', 'No hay más existencia': 'No more stock', 'Solo hay': 'Only', 'en existencia': 'in stock', 'Existencia insuficiente': 'Not enough stock',
    'Todas las ventas registradas. Toca el número para ver el recibo. Anular una venta devuelve la mercancía al inventario.': 'Every sale recorded. Tap the number to see the receipt. Voiding a sale puts the items back in inventory.',
    'Vendido': 'Sold', 'Ticket promedio': 'Average ticket',
    'Lo que debió entrar por cada forma de pago. Cuenta el efectivo, escribe lo que hay y el sistema te dice la diferencia.': 'What should have come in by payment method. Count the cash, type what you have, and the system shows the difference.',
    'Contado': 'Counted', 'Diferencia': 'Difference', 'por banco': 'by bank', 'Nota del cierre': 'Cash count note', 'Ej.: se dio vuelto en Bs': 'E.g.: gave change from the till',
    'Guardar cierre': 'Save cash count', 'Actualizar cierre': 'Update cash count', 'Cierres anteriores': 'Previous counts', 'Aún no hay cierres': 'No counts yet', 'Cerrado': 'Closed', 'Cuadra': 'Balanced', 'Falta': 'Short', 'Sobra': 'Over',
    'Escribe el efectivo contado': 'Enter the counted cash', 'Cierre del': 'Cash count for', 'guardado': 'saved',
    'La existencia se calcula sola: inicial + compras − ventas ± ajustes. El costo es promedio ponderado y se actualiza con cada compra.': 'Stock calculates itself: opening + purchases − sales ± adjustments. Cost is a weighted average updated with every purchase.',
    'Existencia = inicial + compras − ventas ± ajustes. El costo es promedio ponderado y se actualiza con cada compra.': 'Stock = opening + purchases − sales ± adjustments. Cost is a weighted average updated with every purchase.',
    'Todas las categorías': 'All categories', '+ Nuevo producto': '+ New product', 'Mín': 'Min', 'Precio Bs': 'Price Bs', 'Valor a costo': 'Value at cost', 'Movimientos': 'History',
    'valor a precio de venta': 'value at selling price', 'Sin productos': 'No products',
    'Registra la factura del proveedor: la mercancía entra al inventario y el costo promedio se recalcula.': "Enter the supplier's invoice: items go into inventory and the average cost is recalculated.",
    'Registra la factura del proveedor. La mercancía entra al inventario, el costo promedio se recalcula y, si es a crédito, queda en cuentas por pagar.': "Enter the supplier's invoice. Items go into inventory, the average cost is recalculated and, if bought on account, it goes to accounts payable.",
    'Nueva compra': 'New purchase', 'N° de factura': 'Invoice #', '+ Agregar línea': '+ Add line', 'Registrar compra': 'Record purchase', 'Últimas 15 compras': 'Last 15 purchases', 'Aún no hay compras': 'No purchases yet', 'No hay compras': 'No purchases',
    'Compra registrada': 'Purchase recorded', 'Compra anulada': 'Purchase voided', 'Anular compra': 'Void purchase', 'Compra': 'Purchase', 'Falta el proveedor': 'Supplier missing', 'Elige el proveedor': 'Choose the supplier',
    'Agrega al menos un producto': 'Add at least one product', 'Hay una línea sin producto': 'A line has no product', 'Cantidad inválida': 'Invalid quantity', 'Cantidad inválida en': 'Invalid quantity for', 'Costo inválido': 'Invalid cost', 'Costo inválido en': 'Invalid cost for',
    'No se puede anular: ya se vendió parte de': "Can't void: part of it was already sold:", 'La mercancía de esta compra': 'The items from this purchase', 'sale del inventario. El costo promedio actual no cambia.': 'leave inventory. The current average cost does not change.',
    'Nuevo producto': 'New product', 'Editar producto': 'Edit product', 'Existencia mínima': 'Minimum stock', 'Precio de venta $': 'Selling price', 'Existencia inicial': 'Opening stock', 'Activo (se puede vender y comprar)': 'Active (can be sold and bought)',
    'Producto guardado': 'Product saved', 'Falta el nombre': 'Name missing', 'Revisa el costo y el precio': 'Check the cost and price', 'Ya existe un producto con ese código': 'A product with that code already exists', 'Ya existe ese código': 'That code already exists',
    'Ojo: el precio está por debajo del costo': 'Heads up: price is below cost', 'ganas': 'you make', 'por unidad': 'per unit', 'precio en Bs': 'price in Bs',
    'Existencia en sistema': 'Stock on record', 'Motivo': 'Reason', 'Cantidad a sacar': 'Quantity to remove', 'Cantidad contada': 'Counted quantity', 'Cantidad (+ suma, − resta)': 'Quantity (+ adds, − removes)',
    'Registrar ajuste': 'Record adjustment', 'Ajuste registrado': 'Adjustment recorded', 'Ajuste': 'Adjustment', 'Merma o daño': 'Shrinkage or damage', 'Vencido': 'Expired', 'Conteo físico': 'Physical count', 'Consumo interno': 'Internal use', 'Corrección': 'Correction',
    'nueva existencia': 'new stock', 'impacto': 'impact', 'La existencia no puede quedar negativa': 'Stock cannot go negative', 'Escribe una cantidad': 'Enter a quantity', 'El conteo coincide, no hay ajuste': 'The count matches, no adjustment needed',
    'Se muestran los 60 movimientos más recientes de': 'Showing the 60 most recent of',
    'Datos del negocio, tasa del día y respaldo.': 'Business details and backup.', 'Negocio': 'Business', 'Nombre del negocio': 'Business name',
    'Qué hace este sistema': 'What this system does', 'Punto de venta con búsqueda, control de existencia y total en $ y Bs.': 'Point of sale with search and stock control.',
    'Compras que suben el inventario y recalculan el costo promedio.': 'Purchases that add to inventory and recalculate average cost.', 'Ajustes de inventario (merma, conteo físico) y movimientos por producto.': 'Inventory adjustments (shrinkage, physical count) and history per product.',
    'Cierre de caja por forma de pago con diferencia del efectivo contado.': 'End-of-day cash count by payment method, with the difference against counted cash.', 'Ganancia por venta y por período, alertas de reposición y exportes a CSV.': 'Profit per sale and per period, reorder alerts and CSV exports.',
    'Se borra todo: productos, ventas, compras y cierres. Quedas con el sistema vacío para cargar tu negocio.': 'Everything is erased: products, sales, purchases and cash counts. You get an empty system to set up your business.',
    'Sistema vacío. Empieza creando tus productos': 'Empty system. Start by creating your products', 'Ese archivo no es un respaldo de X3 DATA Lite': "That file isn't an X3 DATA Lite backup",
    // X3: panel, facturar, CxC, CxP
    'Ventas del mes sin IVA': 'Sales this month before tax', 'Margen de contribución': 'Contribution margin', 'Por cobrar': 'Receivable', 'vencido': 'overdue', 'Por pagar': 'Payable', 'vence en 7 días': 'due in 7 days',
    '¿Ya cubrimos los costos fijos del mes?': 'Have we covered this month’s fixed costs?', 'Punto de equilibrio del mes': "This month's break-even point", 'Los costos fijos de': 'Fixed costs of', 'se cubrieron el': 'were covered on',
    'Desde ahí, cada venta deja': 'From then on, each sale leaves', 'de ganancia. Utilidad del mes hasta hoy': 'as profit. Profit this month so far', 'Faltan': 'You need', 'en ventas para cubrir los costos fijos de': 'more in sales to cover fixed costs of',
    'Al ritmo actual se llega': 'At the current pace you get there', 'cerca del día': 'around day', 'del mes': 'of the month', 'al día': 'as of day',
    'Punto de equilibrio = costos fijos ÷ % de margen de contribución.': 'Break-even point = fixed costs ÷ contribution margin %.', 'Ver el análisis completo': 'See the full analysis', 'Lo que más deja este mes': 'Biggest contributors this month',
    'Facturas vencidas': 'Overdue invoices', 'Todo sobre el mínimo': 'Everything above minimum',
    'Elige el cliente, agrega productos y el sistema revisa la existencia, aplica el IVA a lo gravado y lleva la factura a crédito o contado.': 'Choose the customer, add products, and the system checks stock, applies ' + T + ' to taxable items and records the invoice as paid or on account.',
    'Buscar producto por nombre o código…': 'Search product by name or code…', 'Cliente de contado': 'Walk-in customer', 'Base imponible': 'Taxable amount', 'Exento': 'Tax-exempt', 'Exento de IVA': 'Tax-exempt',
    'Emitir factura': 'Issue invoice', 'Factura N°': 'Invoice #', 'emitida': 'issued', 'FACTURA ANULADA': 'INVOICE VOIDED', 'Pagos': 'Payments', 'Registrar cobro': 'Record payment', 'Cobrar factura': 'Collect invoice',
    'Monto inválido': 'Invalid amount', 'El monto es mayor que el saldo': 'Amount is more than the balance', 'Abono registrado · queda': 'Payment recorded · remaining', 'Factura pagada completa': 'Invoice paid in full',
    'Anular factura': 'Void invoice', 'Factura anulada': 'Invoice voided', 'La mercancía vuelve al inventario y la factura deja de contar en ventas y cuentas por cobrar.': 'The items go back to inventory and the invoice stops counting in sales and receivables.',
    'Todas las ventas con su IVA, condición y saldo. Toca el número para ver la factura.': 'Every sale with its ' + T + ', terms and balance. Tap the number to see the invoice.', '+ Facturar': '+ Invoice',
    'Con saldo': 'With balance', 'Vencidas': 'Overdue', 'Pagadas': 'Paid', 'Anuladas': 'Voided', 'Ventas sin IVA': 'Sales before tax', 'IVA facturado': T + ' invoiced', 'Saldo pendiente': 'Outstanding balance', 'No hay facturas': 'No invoices',
    'Quién te debe, cuánto y desde cuándo. La antigüedad se cuenta desde la fecha de vencimiento de cada factura.': 'Who owes you, how much and since when. Aging is counted from each invoice’s due date.',
    'Total por cobrar': 'Total receivable', 'Vencido': 'Overdue', 'del total': 'of total', 'Cobrado este mes': 'Collected this month', 'Vendido a crédito este mes': 'Sold on account this month',
    'Antigüedad de saldos por cliente': 'Aging by customer', 'Por vencer': 'Not yet due', '1 a 15 días': '1–15 days', '16 a 30 días': '16–30 days', 'Más de 30': 'Over 30', 'Facturas pendientes': 'Open invoices', 'Nadie te debe. 🎉': 'Nobody owes you. 🎉',
    'Estado de cuenta': 'Statement', 'estado de cuenta de': 'statement for', 'Concepto': 'Description', 'Cargo': 'Charge', 'Abono': 'Payment', 'Saldo actual': 'Current balance', 'Últimos 40 movimientos.': 'Last 40 entries.',
    'Datos del cliente y sus días de crédito. Lo que compra y lo que debe se calcula solo.': 'Customer details and credit terms. What they buy and owe is calculated automatically.', '+ Nuevo cliente': '+ New customer',
    'Compras 90 días': 'Purchases, 90 days', 'Días promedio de pago': 'Average days to pay', 'Paga tarde': 'Pays late', 'Sin clientes': 'No customers', 'Nuevo cliente': 'New customer', 'Editar cliente': 'Edit customer',
    'Nombre o razón social': 'Name or legal name', 'RIF / C.I.': 'Business no.', 'RIF': 'Business no.', 'Días de crédito (0 = contado)': 'Credit days (0 = pay now)', 'Días de crédito': 'Credit days', 'Cliente guardado': 'Customer saved',
    'Lo que le debes a tus proveedores, ordenado por fecha de vencimiento, para planificar los pagos de la semana.': 'What you owe suppliers, sorted by due date, to plan the week’s payments.',
    'Total por pagar': 'Total payable', 'Vence en los próximos 7 días': 'Due in the next 7 days', 'Por cobrar en 7 días (para cubrirlo)': 'Receivable in 7 days (to cover it)',
    'Con quién compras, a cuántos días te dan crédito y cuánto les debes.': 'Who you buy from, their credit terms and how much you owe them.', '+ Nuevo proveedor': '+ New supplier', 'Sin proveedores': 'No suppliers',
    'Nuevo proveedor': 'New supplier', 'Editar proveedor': 'Edit supplier', 'Proveedor guardado': 'Supplier saved', 'Pagar compra': 'Pay purchase', 'Registrar pago': 'Record payment', 'Pago registrado': 'Payment recorded', 'Mayor que el saldo': 'More than the balance',
    'Precio sin IVA $': 'Price before tax', 'margen de contribución por unidad': 'contribution margin per unit',
    // costos
    'Cuánto hay que vender para no perder, qué producto deja más y cuánto margen de seguridad tienes.': 'How much you need to sell not to lose money, which product contributes most, and your margin of safety.',
    'Últimos 30 días': 'Last 30 days', 'Últimos 60 días': 'Last 60 days', 'Últimos 90 días': 'Last 90 days', 'unidades': 'units', 'Punto de equilibrio del período': 'Break-even point for the period',
    'Margen de seguridad: cuánto pueden caer las ventas antes de perder': 'Margin of safety: how far sales can drop before a loss', 'Gráfico de equilibrio': 'Break-even chart', 'Equilibrio': 'Break-even', 'Tus ventas': 'Your sales',
    'Ingresos': 'Revenue', 'Costo total (fijo + variable)': 'Total cost (fixed + variable)', 'Costo fijo · eje: ventas en $': 'Fixed cost · axis: sales in $', 'Cómo se calcula': 'How it’s calculated',
    'Ventas (sin IVA)': 'Sales (before tax)', 'Costo de la mercancía vendida': 'Cost of goods sold', 'Otros costos variables': 'Other variable costs', 'de ventas': 'of sales', 'Costos fijos del período': 'Fixed costs for the period',
    'Utilidad operativa': 'Operating profit', 'Punto de equilibrio = costos fijos ÷ % de margen de contribución =': 'Break-even point = fixed costs ÷ contribution margin % =', 'En un mes': 'Per month',
    'Margen de contribución por producto': 'Contribution margin by product', 'Unid.': 'Units', 'Costo var.': 'Var. cost', 'MC unit.': 'CM / unit', 'MC %': 'CM %', 'Aporte total': 'Total contribution', '% de ventas': '% of sales',
    'Sin ventas en el período': 'No sales in the period',
    'El aporte total es lo que cada producto deja para pagar los costos fijos y la ganancia. Un margen bajo con mucho volumen puede aportar más que uno alto que casi no se vende.': 'Total contribution is what each product leaves to pay fixed costs and profit. A low margin with high volume can contribute more than a high margin that barely sells.',
    'Costos fijos mensuales': 'Monthly fixed costs', 'Total al mes': 'Total per month', '+ Agregar costo fijo': '+ Add fixed cost', 'Otros variables %': 'Other variable %', 'Nuevo costo fijo': 'New fixed cost',
    'Costos variables "otros": comisiones, empaques, delivery; se calculan como % de las ventas.': '"Other" variable costs: commissions, packaging, delivery; calculated as a % of sales.', 'Porcentaje inválido': 'Invalid percentage',
    'Ventas, costos y utilidad del mes, comparado con el mes anterior.': 'Sales, costs and profit for the month, compared with the previous month.',
    'El mes en curso incluye costos fijos proporcionales a los días transcurridos.': 'The current month includes fixed costs prorated to the days elapsed.',
    'Ventas netas': 'Net sales', 'Utilidad bruta': 'Gross profit', 'Venta promedio por factura': 'Average sale per invoice', '% ventas': '% sales', 'Variación': 'Change',
    'Ventas netas (sin IVA)': 'Net sales (before tax)', '= Utilidad bruta': '= Gross profit', '= Margen de contribución': '= Contribution margin', 'Total costos fijos': 'Total fixed costs', '= Utilidad operativa': '= Operating profit',
    '¿Qué pasa si…? Mueve los controles y mira cómo cambian la utilidad y el punto de equilibrio. Base: los últimos 30 días. No cambia tus datos.': 'What if…? Move the sliders and see how profit and the break-even point change. Based on the last 30 days. Your data is not changed.',
    'Supuestos': 'Assumptions', 'Precio de venta': 'Selling price', 'Unidades vendidas': 'Units sold', 'Costo de la mercancía': 'Cost of goods', 'Costos fijos': 'Fixed costs', 'Volver a cero': 'Reset',
    'Subo precio 5% y vendo 3% menos': 'Raise price 5%, sell 3% less', 'Proveedor sube 8%': 'Supplier raises 8%', 'Resultado (30 días)': 'Result (30 days)', 'Con los cambios': 'With changes', 'Costos variables': 'Variable costs', 'Punto de equilibrio': 'Break-even point',
    'Mueve un control para ver el efecto.': 'Move a slider to see the effect.', 'Con estos cambios ganarías': 'With these changes you would make', 'más cada 30 días.': 'more every 30 days.', 'menos cada 30 días.': 'less every 30 days.',
    'Con un': 'With', 'más de precio podrías vender hasta': 'higher price you could sell up to', 'menos de unidades y ganar lo mismo.': 'fewer units and earn the same.',
    'Datos de la empresa, impuestos, tasa y respaldo.': 'Company details, tax and backup.', 'Empresa': 'Company', 'Razón social': 'Legal name', 'IVA inválido': 'Invalid tax rate',
    'Se borra todo y queda el sistema vacío para cargar tu empresa: productos, clientes, proveedores y costos fijos.': 'Everything is erased and you get an empty system to set up your company: products, customers, suppliers and fixed costs.',
    'Sistema vacío. Empieza por tus productos y costos fijos': 'Empty system. Start with your products and fixed costs', 'Ese archivo no es un respaldo de X3 DATA': "That file isn't an X3 DATA backup",
    // caja rápida
    'Hoy en esta caja': 'Today at this register', 'Escanea o escribe código / nombre · 3*código para 3 unidades': 'Scan or type code / name · 3*code for 3 units', 'agrega': 'adds', 'antes del código pone la cantidad': 'before the code sets the quantity',
    'o': 'or', 'con la caja vacía para cobrar': 'with an empty box to pay', 'quita el último': 'removes the last one', 'cancela': 'cancels', 'Más vendidos · un toque': 'Best sellers · one tap', 'Venta en curso': 'Current sale',
    'Cancelar venta': 'Cancel sale', 'Escanea o toca un producto': 'Scan or tap a product', 'incluye': 'includes', 'Cobrar · F2': 'Pay · F2', 'Recibido en': 'Received in', 'Vuelto': 'Change', 'Volver (Esc)': 'Back (Esc)', 'Confirmar (Enter)': 'Confirm (Enter)',
    'Confirma que el pago llegó y presiona Enter.': 'Confirm the payment went through and press Enter.', 'El monto recibido no alcanza': 'Amount received is not enough', 'lista': 'done', 'vuelto': 'change', 'No encontré': 'Not found:', 'Ver factura': 'View invoice',
    // finanzas
    'Resumen de': 'Summary for', 'Todo convertido a dólares. Los movimientos en Bs usan la tasa del día en que se hicieron.': 'Everything in one view for the selected month.', '+ Movimiento': '+ Transaction',
    'Ingresos del mes': 'Income this month', 'Gastos del mes': 'Spending this month', 'Gastaste más de lo que entró': 'You spent more than you earned', 'Ahorro del mes': 'Saved this month', 'de lo que entró': 'of income', 'Dinero total hoy en': 'Total money today across',
    'Ingresos y gastos, últimos 6 meses': 'Income and spending, last 6 months', 'Gastos': 'Spending', '¿En qué se fue el dinero?': 'Where did the money go?', 'Total gastado': 'Total spent', 'Saldo por cuenta': 'Balance by account',
    'Presupuesto del mes': 'Budget this month', 'Te pasaste en': 'You went over on', 'Vas dentro del presupuesto en todas las categorías.': "You're within budget in every category.", 'Ver todo el presupuesto': 'See the whole budget', 'Aún no tienes presupuesto.': "You don't have a budget yet.", 'Créalo aquí': 'Create it here', 'de': 'of',
    'Cada ingreso, gasto o cambio entre cuentas. Toca uno para editarlo.': 'Every income, expense or transfer between accounts. Tap one to edit it.', 'Entre cuentas': 'Transfer', 'Nota…': 'Note…', '+ Nuevo': '+ New',
    'No hay movimientos con esos filtros': 'No transactions match these filters', 'movimientos': 'transactions', 'ingresos': 'income', 'gastos': 'spending', 'En $': 'Amount',
    'Dónde está tu dinero. El saldo se calcula solo: saldo inicial + ingresos − gastos ± cambios entre cuentas.': 'Where your money is. Balance calculates itself: opening balance + income − spending ± transfers.',
    'Pasar dinero entre cuentas': 'Transfer between accounts', '+ Nueva cuenta': '+ New account', 'Moneda': 'Currency', 'Saldo inicial': 'Opening balance', 'Saldo hoy': 'Balance today', 'Dólares': 'Dollars', 'Bolívares': 'Bolívares',
    'Nueva cuenta': 'New account', 'Editar cuenta': 'Edit account', 'Cuenta guardada': 'Account saved', 'Cuenta borrada': 'Account deleted', 'Ej.: Banco, efectivo, billetera': 'E.g.: chequing, cash, wallet', 'La moneda no se puede cambiar porque la cuenta ya tiene movimientos.': "Currency can't be changed because the account already has transactions.",
    'Cuánto quieres gastar por categoría cada mes, y cómo vas. Escribe el tope y se guarda solo.': 'How much you want to spend per category each month, and how you’re doing. Type the limit and it saves itself.',
    'Presupuesto del mes': 'Budget this month', 'Gastado': 'Spent', 'Te queda': 'Left', 'Te pasaste': 'Over by', 'Del mes transcurrido': 'Of the month elapsed', 'Tope mensual $': 'Monthly limit', 'Avance': 'Progress', 'Disponible': 'Available',
    'Pasado': 'Over', 'Va rápido': 'Going fast', 'Bien': 'On track', '"Va rápido" significa que gastaste más de lo que corresponde a los días que van del mes.': '"Going fast" means you spent more than the share of the month that has passed.',
    'Para qué estás ahorrando, cuánto llevas y cuánto tienes que guardar cada mes para llegar a tiempo.': "What you're saving for, how much you have, and how much to put aside each month to get there on time.",
    '+ Nueva meta': '+ New goal', '¡Meta cumplida!': 'Goal reached!', 'guarda': 'save', 'al mes': 'per month', 'meses': 'months', 'para el': 'by', '+ Aportar': '+ Contribute', 'Ver aportes': 'Contributions',
    'Aún no tienes metas. Crea la primera: un fondo de emergencia de 3 meses de gastos es un buen comienzo.': "No goals yet. Create your first one: an emergency fund of 3 months of expenses is a good start.",
    'Nueva meta': 'New goal', 'Editar meta': 'Edit goal', '¿Para qué ahorras?': 'What are you saving for?', 'Ej.: fondo de emergencia': 'E.g.: emergency fund', 'Monto objetivo $': 'Target amount', 'Fecha límite (opcional)': 'Deadline (optional)',
    'Meta guardada': 'Goal saved', 'Aportar a': 'Contribute to', 'Monto $ (negativo si sacaste)': 'Amount (negative if you took money out)', 'Aporte guardado': 'Contribution saved', 'Aportes': 'Contributions', 'Sin aportes': 'No contributions', 'Escribe el monto objetivo': 'Enter the target amount', 'Escribe un monto': 'Enter an amount',
    'Nuevo movimiento': 'New transaction', 'Editar movimiento': 'Edit transaction', 'Gasto': 'Expense', 'Ingreso': 'Income', 'Ej.: mercado del sábado': "E.g.: Saturday's groceries", 'Escribe un monto mayor que cero': 'Enter an amount greater than zero',
    'Gasto guardado': 'Expense saved', 'Ingreso guardado': 'Income saved', 'Movimiento borrado': 'Transaction deleted', 'Primero crea una cuenta': 'Create an account first', 'Necesitas al menos dos cuentas': 'You need at least two accounts',
    'Editar cambio entre cuentas': 'Edit transfer', 'Sale de': 'From', 'Entra a': 'To', 'Monto que sale': 'Amount out', 'Monto que entra': 'Amount in', 'Ej.: cambio a bolívares': 'E.g.: move to savings', 'Elige dos cuentas distintas': 'Choose two different accounts', 'Revisa los montos': 'Check the amounts', 'Cambio entre cuentas guardado': 'Transfer saved',
    'Si las monedas son distintas, el monto que entra se calcula con la tasa del día; puedes corregirlo si te cambiaron a otra tasa.': 'If the currencies differ, adjust the amount in to what you actually received.',
    'Categorías, tasa y respaldo.': 'Categories and backup.', 'General': 'General', 'Categorías de gasto (una por línea)': 'Spending categories (one per line)', 'Categorías de ingreso': 'Income categories',
    'Debe haber al menos una categoría de cada tipo': 'You need at least one category of each type', 'Se borra todo y quedas con dos cuentas vacías para empezar.': 'Everything is erased and you start with two empty accounts.',
    'Listo. Ajusta tus cuentas y su saldo inicial': 'Done. Set up your accounts and their opening balance', 'Ese archivo no es un respaldo de Finanzas': "That file isn't a Finance backup",
    'Mi negocio': 'My business', 'Mi empresa': 'My company', 'Mis finanzas': 'My finances', 'Otros gastos': 'Other spending', 'Otros ingresos': 'Other income',
    // meses
    'enero': 'January', 'febrero': 'February', 'marzo': 'March', 'abril': 'April', 'mayo': 'May', 'junio': 'June', 'julio': 'July', 'agosto': 'August', 'septiembre': 'September', 'octubre': 'October', 'noviembre': 'November', 'diciembre': 'December',
    'ene': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'abr': 'Apr', 'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug', 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dic': 'Dec',
    'Ingresos ': 'Income ', 'Gastos ': 'Spending ', 'a las': 'at'
  };
  D['IVA'] = T;

  if (en) {
    const keys = Object.keys(D).filter((k) => k.trim()).sort((a, b) => b.length - a.length);
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RE = new RegExp('(?<![\\p{L}\\d])(' + keys.map(escRe).join('|') + ')(?![\\p{L}])', 'gu');
    const tr = (s) => (s && /[\p{L}]/u.test(s) ? s.replace(RE, (m) => D[m]) : s);
    P.t = tr;
    const walk = (n) => {
      if (n.nodeType === 3) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
      if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.closest?.('[data-raw]')) return;
      for (const a of ['placeholder', 'aria-label', 'title']) if (n.hasAttribute(a)) { const o = n.getAttribute(a), v = tr(o); if (v !== o) n.setAttribute(a, v); }
      n.childNodes.forEach(walk);
    };
    let obs;
    const start = () => obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    obs = new MutationObserver((ms) => { obs.disconnect(); ms.forEach((m) => { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); }); start(); });
    document.addEventListener('DOMContentLoaded', () => { document.title = tr(document.title); walk(document.body); start(); });
  } else P.t = (s) => s;

  /* ---------- selector de idioma en la barra ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.prb-bar, .hero .w'); if (!bar) return;
    const box = document.createElement('span'); box.className = 'prb-lang'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Idioma / Language');
    [['ES', 'ES', 'Español · Venezuela'], ['CA', 'EN · CA', 'English · Canada'], ['US', 'EN · US', 'English · United States']].forEach(([k, t, title]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.title = title; if (k === r) b.className = 'on'; b.onclick = () => P.setRegion(k); box.appendChild(b);
    });
    const demo = bar.querySelector('.demo'); if (demo) bar.insertBefore(box, demo); else bar.appendChild(box);
  });
})();
