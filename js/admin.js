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
  const etiquetaEtapa = p => p.etapa === "recibido" && p.pago.metodo === "transferencia"
    ? "⏳ Por pagar" : `${E[p.etapa].icono} ${E[p.etapa].titulo}`;
  const badge = p => `<span class="estado estado--${p.etapa}${p.etapa === "recibido" && p.pago.metodo === "transferencia" ? " estado--espera" : ""}">${etiquetaEtapa(p)}</span>`;

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
  $("#formAdmin").addEventListener("submit", e => {
    e.preventDefault();
    if (S.admin.entrar($("#admClave").value)) entrar();
    else { $("#admError").hidden = false; $("#admClave").select(); }
  });
  $("#admSalir").addEventListener("click", () => { S.admin.salir(); location.hash = ""; location.reload(); });

  // ---------- Navegación ----------
  const TITULOS = { dashboard: "Dashboard", pedidos: "Pedidos", clientes: "Clientes", productos: "Productos" };
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
    ({ dashboard: pintarDashboard, pedidos: pintarPedidos, clientes: pintarClientes, productos: pintarProductos })[vista]?.();
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
        <td><b>${p.id}</b><small>${fechaLocal(p.creado)}</small></td>
        <td>${esc(p.cliente.nombre)}<small>${esc(p.cliente.telefono)}</small></td>
        <td><span class="${activo(p) && p.entrega.fecha < hoy ? "urgente" : ""}">${fechaCorta(p.entrega.fecha)}</span><small>${p.entrega.tipo === "despacho" ? "🚚 " + esc(p.entrega.direccion) : "🏠 Retiro"}</small></td>
        <td class="num">${clp(p.total)}</td>
        <td>${{ webpay: "Webpay", mercadopago: "Mercado Pago", transferencia: "Transferencia" }[p.pago.metodo]}<small>${p.pago.estado === "pagado" ? "✔ pagado" : "pendiente"}</small></td>
        <td>${badge(p)}</td>
        <td><button class="btn btn--secundario" data-abrir="${p.id}">Gestionar</button></td>
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
    $("#mpSub").textContent = `Comprado el ${fechaHora(p.creado)} · ${p.entrega.tipo === "despacho" ? "🚚 Despacho" : "🏠 Retiro"} el ${diaSemana(p.entrega.fecha)}`;
    $("#mpCliente").innerHTML = `<b>${esc(p.cliente.nombre)}</b><br>✉️ <a href="mailto:${esc(p.cliente.email)}">${esc(p.cliente.email)}</a><br>📱 ${esc(p.cliente.telefono)}${p.entrega.tipo === "despacho" ? `<br>📍 ${esc(p.entrega.direccion)}` : ""}`;
    $("#mpItems").innerHTML = p.items.map(it => `<li><span>${it.cant} × ${esc(it.nombre)}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}</span><b>${clp(it.precio * it.cant)}</b></li>`).join("")
      + (p.despacho ? `<li><span>Despacho</span><b>${clp(p.despacho)}</b></li>` : "");
    $("#mpTotal").textContent = clp(p.total);
    $("#mpPago").textContent = `Pago: ${{ webpay: "Webpay", mercadopago: "Mercado Pago", transferencia: "Transferencia" }[p.pago.metodo]} · ${p.pago.estado === "pagado" ? "pagado ✔" : "pendiente"}`;
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
        <td><b>${esc(c.nombre)}</b>${c.demo ? "<small>ejemplo</small>" : ""}</td>
        <td>${esc(c.email)}<small>${esc(c.telefono)}</small></td>
        <td>${(c.mascotas || []).map(m => `${m.especie === "gato" ? "🐱" : "🐶"} ${esc(m.nombre)}${m.cumpleanos ? `<small>🎂 ${fechaCorta(m.cumpleanos).slice(0, 5)}</small>` : ""}`).join("<br>") || "<small>—</small>"}</td>
        <td class="num">${c.nPedidos}</td>
        <td class="num">${clp(c.gastado)}</td>
        <td><span class="${c.consentimiento.whatsapp ? "si" : "no"}">${c.consentimiento.whatsapp ? "✔" : "✖"} WhatsApp</span><br><span class="${c.consentimiento.email ? "si" : "no"}">${c.consentimiento.email ? "✔" : "✖"} Correo</span></td>
        <td>${fechaLocal(c.creado)}</td>
      </tr>`).join("");
  }

  // CSV para el futuro bot / campañas
  $("#exportarCSV").addEventListener("click", () => {
    const filas = [["nombre", "correo", "whatsapp", "acepta_whatsapp", "acepta_correo", "mascotas", "cumpleanos", "pedidos", "total_gastado", "registrado"]];
    resumenClientes().forEach(c => filas.push([c.nombre, c.email, c.telefono, c.consentimiento.whatsapp ? "si" : "no", c.consentimiento.email ? "si" : "no",
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

  function pintarProductos() {
    $("#gridProductos").innerHTML = S.productos.lista().map(p => `
      <article class="aprod${p.activo === false ? " inactivo" : ""}">
        <div class="aprod__foto">
          ${p.img ? `<img src="${esc(p.img)}" alt="">` : ""}
          <span class="aprod__estado">${p.activo === false ? "🙈 Oculto" : "👁 Visible"}</span>
        </div>
        <div class="aprod__cuerpo">
          <h4>${esc(p.nombre)}</h4>
          <div class="aprod__meta">${CATEGORIAS[p.categoria] || p.categoria} · ${p.para.map(x => x === "perro" ? "🐶" : "🐱").join(" ")}${p.personalizable ? " · personalizable" : ""}${p.etiqueta ? ` · “${esc(p.etiqueta)}”` : ""}</div>
          <div class="aprod__precio">${clp(p.precio)}</div>
          <div class="aprod__acciones">
            <button data-editar="${p.id}">✏️ Editar</button>
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
  let editando = null, fotoNueva = null;
  $("#nuevoProducto").addEventListener("click", () => abrirProducto(null));

  function abrirProducto(id) {
    const p = id ? S.productos.lista().find(x => x.id === id) : null;
    editando = p; fotoNueva = null;
    $("#mprTitulo").textContent = p ? "Editar producto" : "Nuevo producto";
    $("#prNombre").value = p?.nombre || "";
    $("#prCategoria").value = p?.categoria || "tortas";
    $("#prPrecio").value = p?.precio ?? "";
    $("#prDescripcion").value = p?.descripcion || "";
    $("#prEtiqueta").value = p?.etiqueta || "";
    $("#prPerro").checked = p ? p.para.includes("perro") : true;
    $("#prGato").checked = p ? p.para.includes("gato") : false;
    $("#prPersonalizable").checked = !!p?.personalizable;
    $("#prActivo").checked = p ? p.activo !== false : true;
    $("#prFoto").value = "";
    $("#prError").hidden = true;
    vistaFoto(p?.img);
    abrirModal("mProducto");
    setTimeout(() => $("#prNombre").focus(), 50);
  }
  const vistaFoto = src => { $("#prFotoVista").innerHTML = src ? `<img src="${esc(src)}" alt="">` : "<span>📷</span>"; };

  // Reduce la foto a 900 px y la guarda como JPG (en producción se sube a Supabase Storage)
  $("#prFoto").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      fotoNueva = c.toDataURL("image/jpeg", .8);
      vistaFoto(fotoNueva);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => aviso("No pudimos leer esa imagen");
    img.src = URL.createObjectURL(f);
  });

  const slug = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto";

  $("#formProducto").addEventListener("submit", e => {
    e.preventDefault();
    const para = [$("#prPerro").checked && "perro", $("#prGato").checked && "gato"].filter(Boolean);
    const d = {
      nombre: $("#prNombre").value.trim(),
      categoria: $("#prCategoria").value,
      precio: Math.round(+$("#prPrecio").value),
      descripcion: $("#prDescripcion").value.trim(),
      etiqueta: $("#prEtiqueta").value.trim() || undefined,
      para,
      personalizable: $("#prPersonalizable").checked,
      activo: $("#prActivo").checked,
      img: fotoNueva || editando?.img || "",
    };
    const falta = !d.nombre ? "Escribe el nombre." : !(d.precio > 0) ? "Indica un precio mayor a 0." :
      !para.length ? "Marca si es para perros, gatos o ambos." : !d.img ? "Sube una foto del producto." : "";
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

  // ---------- Inicio ----------
  if (S.admin.sesionActiva()) entrar();
  // Si otra pestaña (la tienda) crea pedidos, se refleja aquí
  addEventListener("storage", () => { if (!$("#panel").hidden) pintar(); });
})();
