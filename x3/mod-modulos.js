/* X3 DATA · encender y apagar módulos: un comercio ve solo compra y venta; una fábrica suma producción, etc. */
(function () {
  'use strict';
  const H = window.X3H; if (!H || H.EN) return;
  const M = [
    ['prod', '🥣', 'Producción', 'Para quien fabrica lo que vende: recetas, producción del día, lotes con vencimiento y lista de compras.'],
    ['dist', '🚚', 'Distribución', 'Para quien despacha a clientes: precios por tipo de cliente, rutas, notas de entrega y cobranza por zona.'],
    ['forma', '🖨️', 'Forma libre', 'Imprime las facturas en las formas de la imprenta y lleva el control de los números de control.'],
    ['nomina', '👥', 'Nómina', 'Liquidaciones, vacaciones, utilidades, prestaciones y la quincena, según la LOTTT.']
  ];
  H.V.modulos = () => '<h1>Módulos</h1><p class="sub">Enciende solo lo que tu negocio usa. Lo apagado desaparece del menú y no se pierde nada: si lo vuelves a encender, todo sigue ahí.</p>' +
    '<div class="tiles">' + M.map((m) => { const on = H.S.mods[m[0]] !== false; return '<label class="tile" style="cursor:pointer"><div class="ic">' + m[1] + '</div><div style="flex:1"><b>' + m[2] + '</b><span>' + m[3] + '</span><div style="margin-top:8px"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="X.modOn(\'' + m[0] + '\',this.checked)"> ' + (on ? 'Encendido' : 'Apagado') + '</div></div></label>'; }).join('') + '</div>' +
    '<div class="card"><h3>Lo que siempre está</h3><p class="hint" style="margin:0">Ventas y caja, facturación con IVA, inventario, compras, cuentas por cobrar y por pagar, costos, punto de equilibrio y estado de resultados.</p></div>';
  window.X.modOn = (k, v) => { H.S.mods[k] = v; H.save(); H.go(true); H.toast(v ? 'Módulo encendido' : 'Módulo apagado'); };
  H.mods.push({ id: 'modulos', ensure: (st) => { st.mods = st.mods || { prod: true, dist: true, forma: true, nomina: true }; } });
  const g = H.NAV.find((x) => x[0] === 'Sistema'); g[1].unshift(['modulos', 'Módulos']);
})();
