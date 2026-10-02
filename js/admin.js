// MestiCha · panel de administración (dashboard, pedidos, clientes, productos)
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
  const clpCorto = n => n >= 1e6 ? "$" + (n / 1e6).toFixed(1).replace(".", ",") + " M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + " mil" : "$" + n;
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const S = Servicios;
  const E = S.pedidos.etapas;
  const DIA = 864e5;

  const isoLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const hoyIso = () => isoLocal(new Date());
  const fechaCorta = f => { const [a, m, d] = f.split("-"); return `${d}-${m}-${a}`; };
  const fechaLocal = iso => new Date(iso).toLocaleDateString("es-CL");
  const fechaHora = iso => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const diaSemana = f => new Date(f + "T12:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });

  const pagado = p => p.etapa !== "cancelado" && p.pago.estado === "pagado";
  const activo = p => p.etapa !== "entregado" && p.etapa !== "cancelado";
  const porPagar = p => p.etapa === "recibido" && p.pago.estado !== "pagado" && ["transferencia", "efectivo"].includes(p.pago.metodo);
  const etiquetaEtapa = p => porPagar(p) ? "⏳ Por pagar" : `${E[p.etapa].icono} ${E[p.etapa].titulo}`;
  const badge = p => `<span class="estado estado--${p.etapa}${porPagar(p) ? " estado--espera" : ""}">${etiquetaEtapa(p)}</span>`;
  const METODOS = { webpay: "Webpay", mercadopago: "Mercado Pago", transferencia: "Transferencia", efectivo: "Efectivo" };
  const ORIGENES = { whatsapp: "📱 WhatsApp", instagram: "📸 Instagram", presencial: "🤝 En persona", telefono: "☎️ Llamada", otro: "💬 Otro" };
  const origenDe = p => p.origen ? ORIGENES[p.origen] : "🛒 Web";

  // WhatsApp al cliente
  const telWA = t => { let d = String(t).replace(/\D/g, ""); if (d.length === 9 && d[0] === "9") d = "56" + d; return d; };
  const linkCliente = (tel, texto) => `https://wa.me/${telWA(tel)}?text=${encodeURIComponent(texto)}`;
  const MENSAJES = {
    recibido:    p => `Recibimos tu pedido ${p.id} 🐾 Para confirmarlo, transfiere ${clp(p.total)} y envíanos el comprobante por aquí.`,
    confirmado:  p => `¡Confirmamos tu pedido ${p.id}! 💳 Ya lo tenemos en agenda para el ${fechaCorta(p.entrega.fecha)}.`,
    preparando:  p => `Estamos preparando tu pedido ${p.id} 🧁 con mucho cariño.`,
    listo:       p => `¡Tu pedido ${p.id} está listo para retirar! 🏠`,
    "en-camino": p => `¡Tu pedido ${p.id} va en camino! 🚚`,
    entregado:   p => `¡Gracias por tu compra! 🎉 Esperamos que lo disfruten. ¿Nos mandas una foto del festejo? 📸`,
    cancelado:   p => `Tu pedido ${p.id} fue cancelado. Cualquier duda, escríbenos por aquí.`,
  };
  const mensajeEtapa = p => `¡Hola ${p.cliente.nombre.split(" ")[0]}! ${MENSAJES[p.etapa](p)}\n— MestiCha Pet Bakery`;

  // ---------- Toast / tooltip ----------
  let tToast;
  function aviso(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("visible");
    clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove("visible"), 2600);
  }
  const tip = $("#tooltip");
  const mostrarTip = (html, x, y) => { tip.innerHTML = html; tip.hidden = false; tip.style.left = x + "px"; tip.style.top = y + "px"; };
  const ocultarTip = () => { tip.hidden = true; };

  // ---------- Acceso ----------
  function entrar() {
    $("#pantallaLogin").hidden = true;
    $("#panel").hidden = false;
    ir(location.hash.slice(1) || "dashboard");
  }
  $("#formAdmin").addEventListener("submit", async e => {
    e.preventDefault();
    if (await S.admin.entrar($("#admEmail").value, $("#admClave").value)) entrar();
    else { $("#admError").hidden = false; $("#admClave").select(); }
  });
  $("#admSalir").addEventListener("click", () => { S.admin.salir(); location.hash = ""; location.reload(); });

  // ---------- Navegación ----------
  const TITULOS = { dashboard: "Dashboard", pedidos: "Pedidos", clientes: "Clientes", productos: "Productos", config: "Configuración" };
  function ir(vista) {
    if (!TITULOS[vista]) vista = "dashboard";
    $$(".vista").forEach(v => v.hidden = v.dataset.vista !== vista);
    $$("#admNav button").forEach(b => b.classList.toggle("activo", b.dataset.vista === vista));
    $("#vistaTitulo").textContent = TITULOS[vista];
    history.replaceState(null, "", "#" + vista);
    pintar(vista);
  }
  $("#admNav").addEventListener("click", e => { const b = e.target.closest("[data-vista]"); if (b) ir(b.dataset.vista); });

  function pintar(vista = $$(".vista").find(v => !v.hidden)?.dataset.vista) {
    const activos = S.pedidos.todos().filter(activo).length;
    $("#badgePedidos").textContent = activos; $("#badgePedidos").hidden = !activos;
    ({ dashboard: pintarDashboard, pedidos: pintarPedidos, clientes: pintarClientes, productos: pintarProductos, config: pintarConfig })[vista]?.();
  }

  // ======================= DASHBOARD =======================
  let dias = 30;
  let verTabla = false;
  $("#rango").addEventListener("click", e => {
    const b = e.target.closest("[data-dias]"); if (!b) return;
    dias = +b.dataset.dias;
    $$("#rango button").forEach(x => x.classList.toggle("activo", x === b));
    pintarDashboard();
  });
  $("#toggleTabla").addEventListener("click", () => {
    verTabla = !verTabla;
    $("#toggleTabla").textContent = verTabla ? "Ver como gráfico" : "Ver como tabla";
    pintarDashboard();
  });
  $("#btnEjemplo").addEventListener("click", () => {
    if (S.admin.hayEjemplo()) { S.admin.borrarEjemplo(); aviso("Datos de ejemplo borrados"); }
    else { S.admin.cargarEjemplo(); aviso("Cargamos 8 clientes y 26 pedidos de ejemplo"); }
    pintar();
  });

  function pintarDashboard() {
    $("#btnEjemplo").textContent = S.admin.hayEjemplo() ? "🗑 Borrar datos de ejemplo" : "✨ Cargar datos de ejemplo";
    const ped = S.pedidos.todos();
    const clientes = S.admin.clientes();
    const ahora = Date.now();
    const desde = ahora - dias * DIA, antes = desde - dias * DIA;
    const enRango = (p, a, b) => { const t = new Date(p.creado).getTime(); return t >= a && t < b; };
    const actuales = ped.filter(p => enRango(p, desde, ahora + DIA) && p.etapa !== "cancelado");
    const previos = ped.filter(p => enRango(p, antes, desde) && p.etapa !== "cancelado");
    const ventas = actuales.filter(pagado).reduce((s, p) => s + p.total, 0);
    const ventasPrev = previos.filter(pagado).reduce((s, p) => s + p.total, 0);
    const nPag = actuales.filter(pagado).length;
    const porCobrar = ped.filter(p => p.etapa === "recibido" && p.pago.metodo === "transferencia");
    const nuevos = clientes.filter(c => new Date(c.creado).getTime() >= desde).length;
    const delta = (a, b) => {
      if (!b) return `<span class="kpi__delta">sin datos del periodo anterior</span>`;
      const d = Math.round((a - b) / b * 100);
      return `<span class="kpi__delta ${d > 0 ? "sube" : d < 0 ? "baja" : ""}">${d > 0 ? "▲ +" : d < 0 ? "▼ " : ""}${d}% vs ${dias} días anteriores</span>`;
    };
    $("#kpis").innerHTML = [
      ["Ventas pagadas", clp(ventas), delta(ventas, ventasPrev)],
      ["Pedidos", actuales.length, `<span class="kpi__delta">${porCobrar.length ? `${porCobrar.length} por cobrar (transferencia)` : "todo cobrado"}</span>`],
      ["Ticket promedio", nPag ? clp(ventas / nPag) : "—", `<span class="kpi__delta">por pedido pagado</span>`],
      ["Clientes registrados", clientes.length, `<span class="kpi__delta ${nuevos ? "sube" : ""}">${nuevos ? `+${nuevos} nuevos en ${dias} días` : `sin nuevos en ${dias} días`}</span>`],
    ].map(([l, v, d]) => `<div class="kpi"><div class="kpi__label">${l}</div><div class="kpi__valor">${v}</div>${d}</div>`).join("");

    // Serie diaria
    const serie = [];
    for (let i = dias - 1; i >= 0; i--) {
      const f = isoLocal(new Date(ahora - i * DIA));
      const delDia = actuales.filter(p => pagado(p) && isoLocal(new Date(p.creado)) === f);
      serie.push({ f, total: delDia.reduce((s, p) => s + p.total, 0), n: delDia.length });
    }
    $("#subVentas").textContent = `Pedidos pagados · últimos ${dias} días · total ${clp(ventas)}`;
    $("#graficoVentas").hidden = verTabla;
    $("#tablaVentas").hidden = !verTabla;
    if (verTabla) {
      $("#tablaVentas").innerHTML = `<table class="tabla tabla--chica"><thead><tr><th>Día</th><th class="num">Pedidos</th><th class="num">Ventas</th></tr></thead><tbody>${
        serie.filter(s => s.n).reverse().map(s => `<tr><td>${diaSemana(s.f)}</td><td class="num">${s.n}</td><td class="num">${clp(s.total)}</td></tr>`).join("")
        || `<tr><td colspan="3" class="tabla-vacia">Sin ventas en el periodo</td></tr>`}</tbody></table>`;
    } else graficoColumnas($("#graficoVentas"), serie);

    // Etapas (pedidos activos)
    const orden = ["recibido", "confirmado", "preparando", "listo", "en-camino"];
    const conteo = orden.map(et => ({ et, n: ped.filter(p => p.etapa === et).length }));
    const max = Math.max(1, ...conteo.map(c => c.n));
    $("#graficoEtapas").innerHTML = conteo.map(c => `
      <button class="barra" data-etapa="${c.et}" title="Ver pedidos: ${E[c.et].titulo}">
        <span>${E[c.et].icono} ${c.et === "recibido" ? "Recibido / por pagar" : E[c.et].titulo}</span>
        <span class="barra__pista"><span class="barra__relleno" style="width:${c.n / max * 85}%"></span><span class="barra__n">${c.n}</span></span>
      </button>`).join("");

    // Próximas entregas
    const hoy = hoyIso(), limite = isoLocal(new Date(ahora + 3 * DIA));
    const prox = ped.filter(p => activo(p) && p.entrega.fecha <= limite).sort((a, b) => a.entrega.fecha.localeCompare(b.entrega.fecha));
    $("#proximasEntregas").innerHTML = prox.length ? prox.map(p => `
      <li><span><b>${p.id}</b> · ${esc(p.cliente.nombre)}
        <small class="${p.entrega.fecha < hoy ? "urgente" : ""}">${p.entrega.fecha < hoy ? "⚠ Atrasado · " : p.entrega.fecha === hoy ? "Hoy · " : ""}${diaSemana(p.entrega.fecha)} · ${p.entrega.tipo === "despacho" ? "🚚 despacho" : "🏠 retiro"}</small></span>
        ${badge(p)}<button class="btn btn--secundario" data-abrir="${p.id}">Ver</button></li>`).join("")
      : `<li class="vacio">No hay entregas pendientes en los próximos días 🎉</li>`;

    // Cumpleaños próximos
    const cumples = [];
    clientes.forEach(c => (c.mascotas || []).forEach(m => {
      if (!m.cumpleanos) return;
      const [, mm, dd] = m.cumpleanos.split("-");
      const d = new Date(); d.setHours(0, 0, 0, 0);
      let prox = new Date(d.getFullYear(), +mm - 1, +dd);
      if (prox < d) prox.setFullYear(prox.getFullYear() + 1);
      const falta = Math.round((prox - d) / DIA);
      if (falta <= 30) cumples.push({ c, m, falta, prox });
    }));
    cumples.sort((a, b) => a.falta - b.falta);
    $("#proximosCumples").innerHTML = cumples.length ? cumples.map(({ c, m, falta, prox }) => `
      <li><span>${m.especie === "gato" ? "🐱" : "🐶"} <b>${esc(m.nombre)}</b> de ${esc(c.nombre)}
        <small>${falta === 0 ? "¡Hoy!" : `en ${falta} día${falta > 1 ? "s" : ""}`} · ${prox.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}${c.consentimiento.whatsapp ? "" : " · no acepta WhatsApp"}</small></span>
        ${c.consentimiento.whatsapp
          ? `<a class="btn btn--wa-mini" target="_blank" rel="noopener" href="${linkCliente(c.telefono, `¡Hola ${c.nombre.split(" ")[0]}! 🎂 Se acerca el cumpleaños de ${m.nombre} (${prox.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}). ¿Le preparamos su torta MestiCha? 🐾`)}">Ofrecer torta</a>`
          : ""}</li>`).join("")
      : `<li class="vacio">Sin cumpleaños en los próximos 30 días</li>`;
  }

  $("#graficoEtapas").addEventListener("click", e => {
    const b = e.target.closest("[data-etapa]"); if (!b) return;
    $("#filtroEtapa").value = b.dataset.etapa;
    ir("pedidos");
  });

  // Columnas en SVG con tooltip por columna
  function graficoColumnas(cont, serie) {
    const W = cont.clientWidth || 600, H = cont.clientHeight || 240;
    const m = { t: 10, r: 16, b: 26, l: 58 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxV = Math.max(...serie.map(s => s.total));
    if (!maxV) {
      cont.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><line class="base" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/><text class="vacio" x="${W / 2}" y="${H / 2}" text-anchor="middle">Sin ventas en el periodo</text></svg>`;
      return;
    }
    // ticks "limpios"
    const paso0 = maxV / 4, mag = 10 ** Math.floor(Math.log10(paso0));
    const paso = [1, 2, 2.5, 5, 10].map(k => k * mag).find(v => v >= paso0);
    const tope = Math.ceil(maxV / paso) * paso;
    const y = v => m.t + ih - v / tope * ih;
    const banda = iw / serie.length;
    const ancho = Math.min(24, Math.max(3, banda - 2));
    const cada = Math.ceil(serie.length / 7);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas por día">`;
    for (let v = 0; v <= tope; v += paso) {
      svg += `<line class="${v ? "grilla" : "base"}" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="eje" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${clpCorto(v)}</text>`;
    }
    serie.forEach((s, i) => {
      const cx = m.l + banda * i + banda / 2;
      if (s.total) {
        const h = Math.max(2, y(0) - y(s.total)), r = Math.min(4, ancho / 2, h);
        const x0 = cx - ancho / 2, y0 = y(0) - h;
        svg += `<path class="col" data-i="${i}" d="M${x0},${y(0)} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + ancho - r} Q${x0 + ancho},${y0} ${x0 + ancho},${y0 + r} V${y(0)} Z"/>`;
      }
      if (i % cada === (serie.length - 1) % cada) {
        const [, mm, dd] = s.f.split("-");
        svg += `<text class="eje" x="${cx}" y="${H - 6}" text-anchor="middle">${+dd}/${+mm}</text>`;
      }
      svg += `<rect class="hit" data-i="${i}" x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ih}"/>`;
    });
    cont.innerHTML = svg + "</svg>";
    const svgEl = cont.querySelector("svg");
    svgEl.addEventListener("mousemove", e => {
      const hit = e.target.closest(".hit"); if (!hit) return;
      const i = +hit.dataset.i, s = serie[i];
      cont.classList.add("hover");
      cont.querySelectorAll(".col").forEach(c => c.classList.toggle("on", +c.dataset.i === i));
      const col = cont.querySelector(`.col[data-i="${i}"]`);
      const r = (col || hit).getBoundingClientRect();
      mostrarTip(`${diaSemana(s.f)}<br><b>${clp(s.total)}</b> · ${s.n} pedido${s.n === 1 ? "" : "s"}`, r.left + r.width / 2, col ? r.top : r.bottom);
    });
    svgEl.addEventListener("mouseleave", () => { cont.classList.remove("hover"); ocultarTip(); });
  }
  let tResize;
  addEventListener("resize", () => { clearTimeout(tResize); tResize = setTimeout(() => { if (!$('[data-vista="dashboard"].vista').hidden) pintarDashboard(); }, 150); });

  // ======================= PEDIDOS =======================
  ["#buscaPedido", "#filtroEtapa", "#filtroEntrega"].forEach(s => $(s).addEventListener("input", pintarPedidos));

  function pintarPedidos() {
    const q = $("#buscaPedido").value.trim().toLowerCase();
    const fe = $("#filtroEtapa").value, ft = $("#filtroEntrega").value;
    const hoy = hoyIso();
    const lista = S.pedidos.todos().filter(p =>
      (fe === "todos" || (fe === "activos" ? activo(p) : p.etapa === fe)) &&
      (ft === "todos" || p.entrega.tipo === ft) &&
      (!q || [p.id, p.cliente.nombre, p.cliente.email, p.cliente.telefono].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => activo(a) && activo(b) ? a.entrega.fecha.localeCompare(b.entrega.fecha) : b.creado.localeCompare(a.creado));
    $("#pedidosVacio").hidden = lista.length > 0;
    $("#tablaPedidos").innerHTML = lista.map(p => `
      <tr>
        <td data-label="Pedido"><div><b>${p.id}</b><small>${fechaLocal(p.creado)} · ${origenDe(p)}</small></div></td>
        <td data-label="Cliente"><div>${esc(p.cliente.nombre)}<small>${esc(p.cliente.telefono)}</small></div></td>
        <td data-label="Entrega"><div><span class="${activo(p) && p.entrega.fecha < hoy ? "urgente" : ""}">${fechaCorta(p.entrega.fecha)}</span><small>${p.entrega.tipo === "despacho" ? "🚚 " + esc(p.entrega.direccion) : "🏠 Retiro"}</small></div></td>
        <td data-label="Total" class="num"><div>${clp(p.total)}</div></td>
        <td data-label="Pago"><div>${METODOS[p.pago.metodo] || p.pago.metodo}<small>${p.pago.estado === "pagado" ? "✔ pagado" : "pendiente"}</small></div></td>
        <td data-label="Etapa"><div>${badge(p)}</div></td>
        <td data-label="" class="acciones"><div><button class="btn btn--secundario" data-abrir="${p.id}">Gestionar</button></div></td>
      </tr>`).join("");
  }

  // ---------- Modal pedido ----------
  let pedidoActual = null;
  const abrirModal = id => { $$(".modal").forEach(m => m.hidden = m.id !== id); document.body.style.overflow = "hidden"; };
  const cerrarModal = () => { $$(".modal").forEach(m => m.hidden = true); document.body.style.overflow = ""; };
  document.addEventListener("click", e => {
    if (e.target.closest("[data-cerrar]") || e.target.classList.contains("modal")) cerrarModal();
    const ab = e.target.closest("[data-abrir]"); if (ab) abrirPedido(ab.dataset.abrir);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarModal(); });

  function abrirPedido(id) {
    pedidoActual = id;
    pintarModalPedido();
    abrirModal("mPedido");
  }

  function pintarModalPedido() {
    const p = S.pedidos.obtener(pedidoActual); if (!p) return;
    $("#mpTitulo").innerHTML = `Pedido ${p.id} ${badge(p)}`;
    $("#mpSub").textContent = `${p.origen ? "Ingresado a mano" : "Comprado en la web"} el ${fechaHora(p.creado)} · ${origenDe(p)} · ${p.entrega.tipo === "despacho" ? "🚚 Despacho" : "🏠 Retiro"} el ${diaSemana(p.entrega.fecha)}`;
    $("#mpCliente").innerHTML = `<b>${esc(p.cliente.nombre)}</b>`
      + (p.cliente.email ? `<br>✉️ <a href="mailto:${esc(p.cliente.email)}">${esc(p.cliente.email)}</a>` : "")
      + (p.cliente.telefono ? `<br>📱 ${esc(p.cliente.telefono)}` : "")
      + (p.nota ? `<br>📝 <i>${esc(p.nota)}</i>` : "");
    $("#mpAvisar").hidden = !p.cliente.telefono;
    pintarEnvio(p);
    $("#mpItems").innerHTML = p.items.map(it => `<li><span>${it.cant} × ${esc(it.nombre)}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}${it.precioLista ? `<small class="con-dcto">🏷️ con descuento</small>` : ""}</span><b>${it.precioLista ? `<s>${clp(it.precioLista * it.cant)}</s> ` : ""}${clp(it.precio * it.cant)}</b></li>`).join("")
      + (p.despacho ? `<li><span>Despacho</span><b>${clp(p.despacho)}</b></li>` : "");
    $("#mpTotal").textContent = clp(p.total);
    $("#mpPago").textContent = `Pago: ${METODOS[p.pago.metodo] || p.pago.metodo} · ${p.pago.estado === "pagado" ? "pagado ✔" : "pendiente"}`;
    const orden = S.pedidos.etapasDe(p);
    $("#mpEtapa").innerHTML = [...orden, "cancelado"].map(et =>
      `<option value="${et}" ${et === p.etapa ? "selected" : ""}>${E[et].icono} ${et === "recibido" ? "Recibido / por pagar" : E[et].titulo}</option>`).join("");
    $("#mpHistorial").innerHTML = p.historial.map((h, i) => `
      <li class="tl ${i === p.historial.length - 1 ? "tl--actual" : "tl--hecho"}">
        <span class="tl__punto">${E[h.etapa].icono}</span>
        <div class="tl__texto"><b>${E[h.etapa].titulo}</b><small>${fechaHora(h.fecha)}</small></div>
      </li>`).join("");
    $("#mpCancelarBox").hidden = p.etapa === "cancelado";
    $("#mpCancelarBox").innerHTML = `<button class="btn-texto btn-texto--peligro" id="mpCancelar">Cancelar pedido</button>`;
  }

  // ---------- Envío del pedido: ver y editar ----------
  const tipoEnvio = () => $("input[name=feTipo]:checked")?.value || "retiro";
  function pintarEnvio(p) {
    const desp = p.entrega.tipo === "despacho";
    $("#mpEntregaVista").innerHTML = (desp
      ? `<b>🚚 Despacho</b><br>📍 ${esc(p.entrega.direccion) || "<i>sin dirección</i>"}<br>Costo: ${p.despacho ? clp(p.despacho) : "a convenir"}`
      : `<b>🏠 Retiro</b>`) + `<br>📅 ${diaSemana(p.entrega.fecha)}`
      + (p.editado ? `<br><small class="mp-editado">Editado el ${fechaHora(p.editado)}</small>` : "");
    modoEnvio(false);
  }
  function modoEnvio(si) {
    $("#formEntrega").hidden = !si;
    $("#mpEntregaVista").hidden = si;
    $("#mpEditarEntrega").hidden = si;
  }
  function refrescarFormEnvio() {
    $("#feDespachoBox").hidden = tipoEnvio() !== "despacho";
  }
  $("#mpEditarEntrega").addEventListener("click", () => {
    const p = S.pedidos.obtener(pedidoActual);
    $(`input[name=feTipo][value=${p.entrega.tipo}]`).checked = true;
    $("#feDireccion").value = p.entrega.direccion || "";
    $("#feCosto").value = p.entrega.tipo === "despacho" ? p.despacho : CONFIG.costoDespacho;
    $("#feFecha").value = p.entrega.fecha;
    $("#feError").hidden = true;
    // atajo: dirección guardada en la cuenta del cliente
    const c = S.admin.clientes().find(x => x.id === p.clienteId || x.email === (p.cliente.email || "").toLowerCase());
    const guardada = c?.direccion ? S.direccion.texto(c.direccion) : "";
    $("#feUsarGuardada").hidden = !guardada || guardada === p.entrega.direccion;
    $("#feUsarGuardada").textContent = `📋 Usar la de su cuenta: ${guardada}`;
    $("#feUsarGuardada").dataset.dir = guardada;
    refrescarFormEnvio();
    modoEnvio(true);
  });
  $("#feUsarGuardada").addEventListener("click", e => { $("#feDireccion").value = e.currentTarget.dataset.dir; e.currentTarget.hidden = true; });
  $("#formEntrega").addEventListener("change", refrescarFormEnvio);
  $("#feCancelar").addEventListener("click", () => modoEnvio(false));
  $("#formEntrega").addEventListener("submit", e => {
    e.preventDefault();
    const tipo = tipoEnvio(), direccion = $("#feDireccion").value.trim(), fecha = $("#feFecha").value;
    const falta = tipo === "despacho" && !direccion ? "Escribe la dirección de despacho." : !fecha ? "Elige la fecha de entrega." : "";
    $("#feError").textContent = falta; $("#feError").hidden = !falta;
    if (falta) return;
    const antes = S.pedidos.obtener(pedidoActual);
    const p = S.pedidos.editarEntrega(pedidoActual, { tipo, direccion, fecha, despacho: $("#feCosto").value });
    pintarModalPedido(); pintar();
    aviso(p.total !== antes.total ? `Envío actualizado · nuevo total ${clp(p.total)}` : "Envío actualizado");
  });

  $("#mpGuardarEtapa").addEventListener("click", () => {
    const et = $("#mpEtapa").value;
    S.pedidos.cambiarEtapa(pedidoActual, et);
    pintarModalPedido(); pintar();
    aviso(`Etapa actualizada: ${E[et].titulo}`);
  });
  $("#mpAvisar").addEventListener("click", () => {
    const p = S.pedidos.obtener(pedidoActual);
    window.open(linkCliente(p.cliente.telefono, mensajeEtapa(p)), "_blank");
  });
  $("#mpCancelarBox").addEventListener("click", e => {
    if (e.target.id === "mpCancelar") {
      $("#mpCancelarBox").innerHTML = `¿Cancelar este pedido? <button class="btn btn--secundario btn--chico" id="mpNo">No</button><button class="btn btn--chico mp-si" id="mpSi">Sí, cancelar</button>`;
    } else if (e.target.id === "mpNo") {
      pintarModalPedido();
    } else if (e.target.id === "mpSi") {
      S.pedidos.cambiarEtapa(pedidoActual, "cancelado");
      pintarModalPedido(); pintar();
      aviso("Pedido cancelado");
    }
  });

  // ======================= NUEVO PEDIDO (manual) =======================
  let npFilas = [];
  const fechaMinima = () => isoLocal(new Date());

  function nuevaFila() {
    const p = S.productos.lista().find(x => x.activo !== false && !x.agotado) || S.productos.lista()[0];
    return { id: p.id, cant: 1, tamano: OPCIONES_TORTA.tamanos[0].id, deco: OPCIONES_TORTA.decoraciones[0].id, mascota: "", detalle: "", precio: null };
  }
  const precioSugerido = f => {
    const p = S.productos.lista().find(x => x.id === f.id);
    if (!p) return 0;
    if (!p.personalizable) return S.productos.precio(p);
    const t = OPCIONES_TORTA.tamanos.find(x => x.id === f.tamano), d = OPCIONES_TORTA.decoraciones.find(x => x.id === f.deco);
    return S.productos.precio(p, t.precio + d.extra);
  };
  const precioFila = f => f.precio ?? precioSugerido(f);

  function abrirNuevoPedido() {
    npFilas = [nuevaFila()];
    $("#formNuevoPedido").reset();
    $("#npCliente").innerHTML = `<option value="">— Escribir datos a mano —</option>` +
      S.admin.clientes().sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(c => `<option value="${c.id}">${esc(c.nombre)} · ${esc(c.telefono)}</option>`).join("");
    $("#npEtapa").innerHTML = ["recibido", "confirmado", "preparando", "listo", "entregado"].map(et =>
      `<option value="${et}">${et === "listo" ? "🏠 Listo para retirar / 🚚 En camino" : `${E[et].icono} ${et === "recibido" ? "Recibido / por pagar" : E[et].titulo}`}</option>`).join("");
    $("#npCostoDespacho").value = CONFIG.costoDespacho;
    $("#npFecha").value = isoLocal(new Date(Date.now() + CONFIG.diasAnticipacion * DIA));
    $("#npError").hidden = true;
    pintarFilas(); pintarTotalNP();
    abrirModal("mNuevoPedido");
    setTimeout(() => $("#npCliente").focus(), 50);
  }
  $("#nuevoPedido").addEventListener("click", abrirNuevoPedido);

  // Elegir un cliente registrado completa sus datos
  $("#npCliente").addEventListener("change", e => {
    const c = S.admin.clientes().find(x => x.id === e.target.value);
    $("#npNombre").value = c?.nombre || "";
    $("#npTelefono").value = c?.telefono || "";
    $("#npEmail").value = c?.email || "";
    $("#npDireccion").value = c?.direccion ? S.direccion.texto(c.direccion) : "";
    const m = c?.mascotas?.[0];
    if (m) npFilas.forEach(f => { if (!f.mascota) f.mascota = m.nombre; });
    pintarFilas();
  });

  function pintarFilas() {
    const prods = S.productos.lista();
    $("#npItems").innerHTML = npFilas.map((f, i) => {
      const p = prods.find(x => x.id === f.id);
      return `
      <div class="np-item" data-fila="${i}">
        <div class="np-item__fila">
          <select data-campo="id" aria-label="Producto">${prods.map(x =>
            `<option value="${x.id}" ${x.id === f.id ? "selected" : ""}>${esc(x.nombre)}${x.agotado ? " (agotado)" : x.activo === false ? " (oculto)" : ""}</option>`).join("")}</select>
          <input data-campo="cant" type="number" min="1" max="99" value="${f.cant}" aria-label="Cantidad">
          ${npFilas.length > 1 ? `<button type="button" class="np-item__quitar" data-quitar-fila="${i}" aria-label="Quitar producto">✕</button>` : ""}
        </div>
        ${p?.personalizable ? `
        <div class="np-item__fila np-item__fila--torta">
          <select data-campo="tamano" aria-label="Tamaño">${OPCIONES_TORTA.tamanos.map(t => `<option value="${t.id}" ${t.id === f.tamano ? "selected" : ""}>${t.nombre}</option>`).join("")}</select>
          <select data-campo="deco" aria-label="Decoración">${OPCIONES_TORTA.decoraciones.map(d => `<option value="${d.id}" ${d.id === f.deco ? "selected" : ""}>${d.nombre}</option>`).join("")}</select>
          <input data-campo="mascota" type="text" placeholder="Nombre del peludo" value="${esc(f.mascota)}" maxlength="20">
        </div>` : ""}
        <div class="np-item__fila">
          <input data-campo="detalle" type="text" placeholder="Detalle (color, edad, nota…)" value="${esc(f.detalle)}" maxlength="80">
          <label class="np-item__precio"><span>$</span><input data-campo="precio" type="number" min="0" step="10" value="${precioFila(f)}" aria-label="Precio unitario"></label>
        </div>
      </div>`;
    }).join("");
  }

  $("#npItems").addEventListener("input", e => {
    const fila = e.target.closest("[data-fila]"), campo = e.target.dataset.campo;
    if (!fila || !campo) return;
    const f = npFilas[+fila.dataset.fila];
    if (campo === "cant") f.cant = Math.max(1, Math.round(+e.target.value || 1));
    else if (campo === "precio") f.precio = e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value));
    else {
      f[campo] = e.target.value;
      // cambiar producto, tamaño o decoración recalcula el precio sugerido
      if (["id", "tamano", "deco"].includes(campo)) { f.precio = null; pintarFilas(); }
    }
    pintarTotalNP();
  });
  $("#npItems").addEventListener("click", e => {
    const q = e.target.closest("[data-quitar-fila]"); if (!q) return;
    npFilas.splice(+q.dataset.quitarFila, 1);
    pintarFilas(); pintarTotalNP();
  });
  $("#npAgregarItem").addEventListener("click", () => { npFilas.push(nuevaFila()); pintarFilas(); pintarTotalNP(); });

  const npEntrega = () => $("input[name=npEntrega]:checked").value;
  function pintarTotalNP() {
    const sub = npFilas.reduce((s, f) => s + precioFila(f) * f.cant, 0);
    const desp = npEntrega() === "despacho" ? Math.max(0, Math.round(+$("#npCostoDespacho").value || 0)) : 0;
    $("#npDespachoBox").hidden = npEntrega() !== "despacho";
    $("#npDespachoLinea").hidden = !desp;
    $("#npDespachoValor").textContent = clp(desp);
    $("#npSubtotal").textContent = clp(sub);
    $("#npTotal").textContent = clp(sub + desp);
    return { sub, desp };
  }
  $("#formNuevoPedido").addEventListener("change", e => { if (!e.target.closest("#npItems")) pintarTotalNP(); });
  $("#npCostoDespacho").addEventListener("input", pintarTotalNP);

  $("#formNuevoPedido").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#npNombre").value.trim(), tel = $("#npTelefono").value.trim(), email = $("#npEmail").value.trim();
    const direccion = $("#npDireccion").value.trim(), fecha = $("#npFecha").value;
    const prods = S.productos.lista();
    const falta = !nombre ? "Escribe el nombre del cliente." :
      !tel && !email ? "Agrega al menos un WhatsApp o correo para contactarlo." :
      tel && tel.replace(/\D/g, "").length < 8 ? "Revisa el WhatsApp." :
      email && !emailValido(email) ? "Revisa el correo." :
      !npFilas.length ? "Agrega al menos un producto." :
      npFilas.some(f => prods.find(p => p.id === f.id)?.personalizable && !f.mascota.trim()) ? "Escribe el nombre del peludo para la torta." :
      npEntrega() === "despacho" && !direccion ? "Indica la dirección de despacho." :
      !fecha ? "Elige la fecha de entrega." : "";
    $("#npError").textContent = falta; $("#npError").hidden = !falta;
    if (falta) return;

    const { sub, desp } = pintarTotalNP();
    const items = npFilas.map(f => {
      const p = prods.find(x => x.id === f.id);
      const partes = [];
      if (p.personalizable) {
        const t = OPCIONES_TORTA.tamanos.find(x => x.id === f.tamano), d = OPCIONES_TORTA.decoraciones.find(x => x.id === f.deco);
        partes.push(`${t.nombre} · ${d.nombre}`, `Para: ${f.mascota.trim()}`);
      }
      if (f.detalle.trim()) partes.push(f.detalle.trim());
      return { id: p.id, nombre: p.nombre, detalle: partes.join(" · "), cant: f.cant, precio: precioFila(f) };
    });
    const clienteId = $("#npCliente").value || null;
    const metodo = $("#npMetodo").value;
    const ped = await S.pedidos.crearManual({
      clienteId,
      cliente: { nombre, email, telefono: tel },
      items,
      entrega: { tipo: npEntrega(), direccion, fecha },
      subtotal: sub, despacho: desp, total: sub + desp,
      pago: { metodo, estado: $("#npPagado").value === "si" ? "pagado" : "pendiente" },
      origen: $("#npOrigen").value,
      nota: $("#npNota").value.trim(),
    }, $("#npEtapa").value);
    cerrarModal();
    $("#filtroEtapa").value = "todos"; $("#buscaPedido").value = "";
    pintar();
    aviso(`Pedido ${ped.id} guardado 🐾`);
    abrirPedido(ped.id);
  });

  // ======================= CLIENTES =======================
  $("#buscaCliente").addEventListener("input", pintarClientes);

  function resumenClientes() {
    const ped = S.pedidos.todos();
    return S.admin.clientes().map(c => {
      const suyos = ped.filter(p => p.clienteId === c.id || p.cliente.email.toLowerCase() === c.email);
      return { ...c, nPedidos: suyos.length, gastado: suyos.filter(pagado).reduce((s, p) => s + p.total, 0) };
    }).sort((a, b) => b.creado.localeCompare(a.creado));
  }

  function pintarClientes() {
    const q = $("#buscaCliente").value.trim().toLowerCase();
    const lista = resumenClientes().filter(c => !q ||
      [c.nombre, c.email, c.telefono, ...(c.mascotas || []).map(m => m.nombre)].join(" ").toLowerCase().includes(q));
    $("#clientesVacio").hidden = lista.length > 0;
    $("#tablaClientes").innerHTML = lista.map(c => `
      <tr>
        <td data-label="Cliente"><div><b>${esc(c.nombre)}</b>${c.demo ? "<small>ejemplo</small>" : ""}</div></td>
        <td data-label="Contacto"><div>${esc(c.email)}<small>${esc(c.telefono)}</small>${c.direccion ? `<small>📍 ${esc(S.direccion.texto(c.direccion))}</small>` : ""}</div></td>
        <td data-label="Peludos"><div>${(c.mascotas || []).map(m => `${m.especie === "gato" ? "🐱" : "🐶"} ${esc(m.nombre)}${m.cumpleanos ? `<small>🎂 ${fechaCorta(m.cumpleanos).slice(0, 5)}</small>` : ""}`).join("<br>") || "<small>—</small>"}</div></td>
        <td data-label="Pedidos" class="num"><div>${c.nPedidos}</div></td>
        <td data-label="Total gastado" class="num"><div>${clp(c.gastado)}</div></td>
        <td data-label="Avisos"><div><span class="${c.consentimiento.whatsapp ? "si" : "no"}">${c.consentimiento.whatsapp ? "✔" : "✖"} WhatsApp</span><br><span class="${c.consentimiento.email ? "si" : "no"}">${c.consentimiento.email ? "✔" : "✖"} Correo</span></div></td>
        <td data-label="Registro"><div>${fechaLocal(c.creado)}</div></td>
      </tr>`).join("");
  }

  // CSV para el futuro bot / campañas
  $("#exportarCSV").addEventListener("click", () => {
    const filas = [["nombre", "correo", "whatsapp", "direccion", "acepta_whatsapp", "acepta_correo", "mascotas", "cumpleanos", "pedidos", "total_gastado", "registrado"]];
    resumenClientes().forEach(c => filas.push([c.nombre, c.email, c.telefono, S.direccion.texto(c.direccion), c.consentimiento.whatsapp ? "si" : "no", c.consentimiento.email ? "si" : "no",
      (c.mascotas || []).map(m => m.nombre).join(" / "), (c.mascotas || []).map(m => m.cumpleanos || "").join(" / "), c.nPedidos, c.gastado, c.creado.slice(0, 10)]));
    const csv = "﻿" + filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `clientes-mesticha-${hoyIso()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ======================= PRODUCTOS =======================
  const CATEGORIAS = { tortas: "Tortas", pupcakes: "Pupcakes", galletas: "Galletas" };

  // Precio en la tarjeta del panel: "Antes $X · Ahora $Y" si tiene descuento vigente
  function precioPanel(p) {
    const lista = p.personalizable ? desdeTorta() : p.precio, final = S.productos.precio(p, lista);
    const desde = p.personalizable ? "<small>desde</small> " : "";
    const hasta = p.descuentoHasta && S.productos.descuento(p) ? `<small class="aprod__hasta">hasta el ${fechaCorta(p.descuentoHasta)}</small>` : "";
    const vencida = p.descuento && !S.productos.descuento(p) ? `<small class="aprod__hasta">promo terminada</small>` : "";
    return final < lista ? `${desde}<s>${clp(lista)}</s> <span class="aprod__ahora">${clp(final)}</span>${hasta}` : `${desde}${clp(lista)}${vencida}`;
  }
  // Vista previa en el formulario mientras se escribe el %
  function vistaPromo() {
    const pctv = Math.round(+$("#prDescuento").value || 0);
    const pers = $("#prPersonalizable").checked;
    const base = pers ? desdeTorta() : Math.round(+$("#prPrecio").value || 0);
    const hasta = $("#prDescuentoHasta").value;
    $("#prPromoVista").innerHTML = pctv > 0 && pctv <= 90 && base
      ? `En la tienda: <b>Antes <s>${clp(base)}</s> · Ahora ${clp(Math.round(base * (1 - pctv / 100) / 10) * 10)}</b>${pers ? " (y el mismo % en cada tamaño)" : ""}${hasta ? ` hasta el ${fechaCorta(hasta)}` : ""}.`
      : "Sin descuento.";
  }
  ["#prDescuento", "#prDescuentoHasta", "#prPrecio", "#prPersonalizable"].forEach(sel => $(sel).addEventListener("input", vistaPromo));
  $("#prPersonalizable").addEventListener("change", vistaPromo);
  $("#formProducto").addEventListener("input", () => { $("#prError").hidden = true; });

  function pintarProductos() {
    $("#gridProductos").innerHTML = S.productos.lista().map(p => `
      <article class="aprod${p.activo === false ? " inactivo" : ""}${p.agotado ? " agotado" : ""}">
        <div class="aprod__foto">
          ${p.img ? `<img src="${esc(p.img)}" alt="">` : ""}
          <span class="aprod__estado">${p.activo === false ? "🙈 Oculto" : p.agotado ? "🚫 Agotado" : "👁 Visible"}</span>
          ${fotosDe(p).length > 1 ? `<span class="aprod__nfotos">📷 ${fotosDe(p).length}</span>` : ""}
          ${S.productos.descuento(p) ? `<span class="aprod__dcto">-${S.productos.descuento(p)}%</span>` : ""}
        </div>
        <div class="aprod__cuerpo">
          <h4>${esc(p.nombre)}</h4>
          <div class="aprod__meta">${CATEGORIAS[p.categoria] || p.categoria} · ${p.para.map(x => x === "perro" ? "🐶" : "🐱").join(" ")}${p.personalizable ? " · personalizable" : ""}${p.etiqueta ? ` · “${esc(p.etiqueta)}”` : ""}</div>
          <div class="aprod__precio">${precioPanel(p)}</div>
          <div class="aprod__acciones">
            <button data-editar="${p.id}">✏️ Editar</button>
            <button data-agotado="${p.id}" class="${p.agotado ? "stock" : ""}">${p.agotado ? "✅ Hay stock" : "🚫 Agotado"}</button>
            <button data-visible="${p.id}">${p.activo === false ? "👁 Mostrar" : "🙈 Ocultar"}</button>
            <button class="peligro" data-eliminar="${p.id}">🗑 Eliminar</button>
          </div>
        </div>
      </article>`).join("");
  }

  $("#gridProductos").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const lista = S.productos.lista();
    if (b.dataset.editar) abrirProducto(b.dataset.editar);
    if (b.dataset.agotado) {
      const p = lista.find(x => x.id === b.dataset.agotado);
      S.productos.guardar({ ...p, agotado: !p.agotado });
      pintarProductos();
      aviso(p.agotado ? `"${p.nombre}" vuelve a estar disponible` : `"${p.nombre}" marcado como agotado`);
    }
    if (b.dataset.visible) {
      const p = lista.find(x => x.id === b.dataset.visible);
      S.productos.guardar({ ...p, activo: p.activo === false });
      pintarProductos();
      aviso(p.activo === false ? "Producto visible en la tienda" : "Producto oculto de la tienda");
    }
    if (b.dataset.eliminar) {
      if (!b.classList.contains("confirma")) {
        b.classList.add("confirma"); b.textContent = "¿Seguro? Toca de nuevo";
        setTimeout(() => { if (b.isConnected) { b.classList.remove("confirma"); b.textContent = "🗑 Eliminar"; } }, 3000);
        return;
      }
      const p = lista.find(x => x.id === b.dataset.eliminar);
      S.productos.eliminar(p.id);
      pintarProductos();
      aviso(`"${p.nombre}" eliminado`);
    }
  });

  $("#restaurarProductos").addEventListener("click", e => {
    const b = e.currentTarget;
    if (!b.dataset.confirma) {
      b.dataset.confirma = "1"; b.textContent = "¿Seguro? Se pierden tus cambios · toca de nuevo";
      setTimeout(() => { delete b.dataset.confirma; b.textContent = "Restaurar catálogo original"; }, 3500);
      return;
    }
    S.productos.restaurar();
    delete b.dataset.confirma; b.textContent = "Restaurar catálogo original";
    pintarProductos();
    aviso("Catálogo original restaurado");
  });

  // ---------- Formulario de producto ----------
  let editando = null, fotos = [];
  const fotosDe = p => (p?.imgs && p.imgs.length ? p.imgs : [p?.img]).filter(Boolean);
  const desdeTorta = () => Math.min(...OPCIONES_TORTA.tamanos.map(t => t.precio));
  $("#nuevoProducto").addEventListener("click", () => abrirProducto(null));

  function abrirProducto(id) {
    const p = id ? S.productos.lista().find(x => x.id === id) : null;
    editando = p; fotos = fotosDe(p);
    $("#mprTitulo").textContent = p ? "Editar producto" : "Nuevo producto";
    $("#prNombre").value = p?.nombre || "";
    $("#prCategoria").value = p?.categoria || "tortas";
    $("#prPrecio").value = p?.precio ?? "";
    $("#prDescripcion").value = p?.descripcion || "";
    $("#prEtiqueta").value = p?.etiqueta || "";
    $("#prDescuento").value = p?.descuento || "";
    $("#prDescuentoHasta").value = p?.descuentoHasta || "";
    $("#prPerro").checked = p ? p.para.includes("perro") : true;
    $("#prGato").checked = p ? p.para.includes("gato") : false;
    $("#prPersonalizable").checked = !!p?.personalizable;
    $("#prActivo").checked = p ? p.activo !== false : true;
    $("#prAgotado").checked = !!p?.agotado;
    $("#prFoto").value = "";
    $("#prError").hidden = true;
    pintarFotos(); modoPrecio(); vistaPromo();
    abrirModal("mProducto");
    setTimeout(() => $("#prNombre").focus(), 50);
  }

  // Torta personalizada: el precio no se escribe, sale de tamaños + decoraciones
  function modoPrecio() {
    const pers = $("#prPersonalizable").checked;
    $("#prPrecioBox").hidden = pers;
    $("#prPrecioNota").hidden = !pers;
  }
  $("#prPersonalizable").addEventListener("change", modoPrecio);

  function pintarFotos() {
    $("#prFotos").innerHTML = fotos.length ? fotos.map((src, i) => `
      <div class="prod-fotos__item${i === 0 ? " principal" : ""}">
        <button type="button" class="prod-fotos__img" data-principal="${i}" title="${i ? "Hacer principal" : "Foto principal"}"><img src="${esc(src)}" alt=""></button>
        ${i === 0 ? `<span class="prod-fotos__estrella">⭐</span>` : ""}
        <button type="button" class="prod-fotos__quitar" data-quitar="${i}" aria-label="Quitar foto">✕</button>
      </div>`).join("") : `<div class="prod-fotos__vacio">📷<small>Sin fotos</small></div>`;
  }
  $("#prFotos").addEventListener("click", e => {
    const q = e.target.closest("[data-quitar]"), pr = e.target.closest("[data-principal]");
    if (q) fotos.splice(+q.dataset.quitar, 1);
    else if (pr && +pr.dataset.principal > 0) fotos.unshift(...fotos.splice(+pr.dataset.principal, 1));
    else return;
    pintarFotos();
  });

  // Reduce cada foto a 900 px y la guarda como JPG (en producción se sube a Supabase Storage)
  const achicar = f => new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", .8));
    };
    img.onerror = mal;
    img.src = URL.createObjectURL(f);
  });
  $("#prFoto").addEventListener("change", async e => {
    for (const f of e.target.files) {
      try { fotos.push(await achicar(f)); } catch { aviso(`No pudimos leer ${f.name}`); }
    }
    e.target.value = "";
    pintarFotos();
  });

  const slug = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto";

  $("#formProducto").addEventListener("submit", e => {
    e.preventDefault();
    const para = [$("#prPerro").checked && "perro", $("#prGato").checked && "gato"].filter(Boolean);
    const d = {
      nombre: $("#prNombre").value.trim(),
      categoria: $("#prCategoria").value,
      precio: $("#prPersonalizable").checked ? desdeTorta() : Math.round(+$("#prPrecio").value),
      descripcion: $("#prDescripcion").value.trim(),
      etiqueta: $("#prEtiqueta").value.trim() || undefined,
      descuento: Math.round(+$("#prDescuento").value || 0) || undefined,
      descuentoHasta: $("#prDescuento").value > 0 && $("#prDescuentoHasta").value || undefined,
      para,
      personalizable: $("#prPersonalizable").checked,
      activo: $("#prActivo").checked,
      agotado: $("#prAgotado").checked,
      img: fotos[0] || "",
      imgs: fotos.slice(),
    };
    const falta = !d.nombre ? "Escribe el nombre." : !(d.precio > 0) ? "Indica un precio mayor a 0." :
      d.descuento && (d.descuento < 1 || d.descuento > 90) ? "El descuento debe ser entre 1% y 90%." :
      d.descuentoHasta && d.descuentoHasta < isoLocal(new Date()) ? "La fecha de término de la promo ya pasó." :
      !para.length ? "Marca si es para perros, gatos o ambos." : !fotos.length ? "Sube al menos una foto del producto." : "";
    $("#prError").textContent = falta; $("#prError").hidden = !falta;
    if (falta) return;
    let id = editando?.id;
    if (!id) {
      id = slug(d.nombre);
      const base = id; let n = 2;
      while (S.productos.lista().some(p => p.id === id)) id = `${base}-${n++}`;
    }
    try {
      S.productos.guardar({ ...editando, ...d, id });
    } catch {
      $("#prError").textContent = "No hay espacio para más fotos en esta demo. Usa una imagen más liviana."; $("#prError").hidden = false;
      return;
    }
    cerrarModal();
    pintarProductos();
    aviso(editando ? "Producto actualizado" : "Producto creado · ya aparece en la tienda");
  });

  // ======================= CONFIGURACIÓN =======================
  // WhatsApp: acepta "+56 9 4083 2214", "940832214" o "56940832214"
  const normalizarWA = t => {
    let d = String(t).replace(/\D/g, "");
    if (d.length === 8) d = "569" + d;
    if (d.length === 9 && d[0] === "9") d = "56" + d;
    return d;
  };
  const verWA = d => d.length === 11 ? `+${d.slice(0, 2)} ${d[2]} ${d.slice(3, 7)} ${d.slice(7)}` : d;
  const emailValido = e => !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  function pintarConfig() {
    const c = S.config.valores(), t = c.transferencia;
    $("#cfWhatsapp").value = verWA(c.whatsapp || "");
    $("#cfInstagram").value = c.instagram || "";
    $("#cfCorreoContacto").value = c.correoContacto || "";
    $("#cfCorreoAvisos").value = c.correoAvisos || "";
    $("#cfDias").value = c.diasAnticipacion;
    $("#cfDespacho").value = c.costoDespacho;
    $("#cfZona").value = c.zonaDespacho || "";
    $("#cfTitular").value = t.titular; $("#cfRut").value = t.rut; $("#cfBanco").value = t.banco;
    $("#cfTipo").value = t.tipoCuenta; $("#cfNumero").value = t.numero; $("#cfCorreoPagos").value = t.email;
    actualizarProbarWA();
    $("#cfError").hidden = true;
    S.admin.correoActual().then(e => { $("#acEmail").value = e; });
    ["#acNueva", "#acRepite", "#acActual"].forEach(s => { $(s).value = ""; });
    $("#acError").hidden = true;
  }
  function actualizarProbarWA() {
    const d = normalizarWA($("#cfWhatsapp").value);
    $("#cfProbarWA").href = `https://wa.me/${d}?text=${encodeURIComponent("Prueba desde el panel de MestiCha 🐾")}`;
    $("#cfProbarWA").hidden = d.length !== 11;
  }
  $("#cfWhatsapp").addEventListener("input", actualizarProbarWA);

  $("#formConfig").addEventListener("submit", e => {
    e.preventDefault();
    const wa = normalizarWA($("#cfWhatsapp").value);
    const d = {
      whatsapp: wa,
      instagram: $("#cfInstagram").value.trim(),
      correoContacto: $("#cfCorreoContacto").value.trim(),
      correoAvisos: $("#cfCorreoAvisos").value.trim(),
      diasAnticipacion: Math.max(0, Math.round(+$("#cfDias").value || 0)),
      costoDespacho: Math.max(0, Math.round(+$("#cfDespacho").value || 0)),
      zonaDespacho: $("#cfZona").value.trim(),
      transferencia: {
        titular: $("#cfTitular").value.trim(), rut: $("#cfRut").value.trim(), banco: $("#cfBanco").value.trim(),
        tipoCuenta: $("#cfTipo").value.trim(), numero: $("#cfNumero").value.trim(), email: $("#cfCorreoPagos").value.trim(),
      },
    };
    const falta = wa && wa.length !== 11 ? "El WhatsApp debe ser un celular chileno, ej: +56 9 4083 2214." :
      ![d.correoContacto, d.correoAvisos, d.transferencia.email].every(emailValido) ? "Revisa los correos." :
      d.instagram && !/^https?:\/\//.test(d.instagram) ? "El Instagram debe ser un link (https://…)." : "";
    $("#cfError").textContent = falta; $("#cfError").hidden = !falta;
    if (falta) return;
    S.config.guardar(d);
    pintarConfig();
    aviso("Configuración guardada · la web ya usa los datos nuevos");
  });

  $("#formAcceso").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#acEmail").value.trim(), nueva = $("#acNueva").value, actual = $("#acActual").value;
    const falta = !emailValido(email) || !email ? "Revisa el correo." :
      nueva && nueva.length < 8 ? "La nueva contraseña debe tener al menos 8 caracteres." :
      nueva !== $("#acRepite").value ? "Las contraseñas nuevas no coinciden." :
      !actual ? "Escribe tu contraseña actual para confirmar." : "";
    $("#acError").textContent = falta; $("#acError").hidden = !falta;
    if (falta) return;
    try {
      await S.admin.cambiarAcceso({ claveActual: actual, email, claveNueva: nueva });
      pintarConfig();
      aviso(nueva ? "Acceso actualizado · usa la nueva contraseña la próxima vez" : "Correo de acceso actualizado");
    } catch (err) {
      $("#acError").textContent = err.message; $("#acError").hidden = false;
    }
  });

  // ---------- Inicio ----------
  if (S.admin.sesionActiva()) entrar();
  // Si otra pestaña (la tienda) crea pedidos, se refleja aquí
  addEventListener("storage", () => { if (!$("#panel").hidden) pintar(); });
})();
