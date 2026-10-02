// MestiCha · lógica de la página (tienda, personalizador, carrito, pedido)
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const porId = id => PRODUCTOS.find(p => p.id === id);

  // ---------- Textos que dependen de CONFIG ----------
  const linkWhatsapp = CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}` : CONFIG.whatsappQR;
  $("#linkInstagram").href = CONFIG.instagram;
  $("#footerInstagram").href = CONFIG.instagram;
  $("#footerWhatsapp").href = linkWhatsapp;
  $("#anio").textContent = new Date().getFullYear();
  $("#avisoAnticipacion").textContent = `🗓️ Las tortas se preparan a pedido: haz tu pedido con al menos ${CONFIG.diasAnticipacion} días de anticipación.`;
  $("#faqAnticipacion").textContent = `Para tortas, al menos ${CONFIG.diasAnticipacion} días antes. Para galletas y pupcakes, consúltanos: muchas veces tenemos listas.`;
  $("#faqDespacho").textContent = CONFIG.costoDespacho
    ? `Sí, en ${CONFIG.zonaDespacho} (${clp(CONFIG.costoDespacho)} referencial, según comuna). También puedes retirar sin costo.`
    : `Sí, en ${CONFIG.zonaDespacho}. El costo depende de la comuna y lo coordinamos por WhatsApp. También puedes retirar.`;

  // ---------- Menú móvil ----------
  const nav = $("#nav"), btnMenu = $("#btnMenu");
  btnMenu.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    btnMenu.setAttribute("aria-expanded", abierto);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => nav.classList.remove("abierto")));

  // ---------- Tienda ----------
  const grid = $("#productos");
  function pintarProductos(filtro = "todos") {
    const lista = PRODUCTOS.filter(p =>
      filtro === "todos" || p.categoria === filtro || p.para.includes(filtro));
    grid.innerHTML = lista.map((p, i) => `
      <article class="producto" style="animation-delay:${i * 50}ms">
        <div class="producto__foto">
          <img src="${p.img}" alt="${esc(p.nombre)}" loading="lazy">
          ${p.etiqueta ? `<span class="producto__etiqueta">${esc(p.etiqueta)}</span>` : ""}
          <span class="producto__para" title="Apto para">${p.para.map(x => x === "perro" ? "🐶" : "🐱").join(" ")}</span>
        </div>
        <div class="producto__info">
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion)}</p>
          <div class="producto__pie">
            <span class="precio">${p.personalizable ? "<small>desde</small>" : ""}${clp(p.precio)}</span>
            ${p.personalizable
              ? `<button class="btn btn--primario" data-personalizar="${p.id}">Personalizar</button>`
              : `<button class="btn btn--primario" data-agregar="${p.id}">Agregar</button>`}
          </div>
        </div>
      </article>`).join("") || `<p class="centrado">Pronto tendremos productos aquí 🐾</p>`;
  }
  pintarProductos();

  $("#filtros").addEventListener("click", e => {
    const b = e.target.closest(".filtro");
    if (!b) return;
    $$(".filtro").forEach(x => x.classList.toggle("activo", x === b));
    pintarProductos(b.dataset.filtro);
  });

  grid.addEventListener("click", e => {
    const add = e.target.closest("[data-agregar]");
    const per = e.target.closest("[data-personalizar]");
    if (add) agregar({ id: add.dataset.agregar });
    if (per) {
      selTipo.value = per.dataset.personalizar;
      const p = porId(per.dataset.personalizar);
      if (p.para.length === 1) $(`input[name=especie][value=${p.para[0]}]`).checked = true;
      actualizarPreview();
      $("#personaliza").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("#tortaNombre").focus({ preventScroll: true }), 600);
    }
  });

  // ---------- Galería y testimonios ----------
  $("#galeriaGrid").innerHTML = GALERIA.map(g => `
    <figure><img src="${g.img}" alt="${esc(g.texto)}" loading="lazy"><figcaption>${esc(g.texto)}</figcaption></figure>`).join("");

  $("#testimoniosGrid").innerHTML = TESTIMONIOS.map(t => `
    <article class="testimonio${t.img ? "" : " testimonio--destacado"}">
      ${t.img ? `<div class="testimonio__foto"><img src="${t.img}" alt="" loading="lazy"></div>` : ""}
      <div class="testimonio__cuerpo">
        <blockquote>${esc(t.texto)}</blockquote>
        <div class="testimonio__autor">${esc(t.autor)}</div>
        <div class="testimonio__detalle">${esc(t.detalle)}</div>
      </div>
    </article>`).join("");

  // ---------- Personalizador ----------
  const selTipo = $("#tortaTipo");
  selTipo.innerHTML = PRODUCTOS.filter(p => p.personalizable)
    .map(p => `<option value="${p.id}">${esc(p.nombre)} · ${clp(p.precio)}</option>`).join("");

  $("#colores").innerHTML = COLORES_DECORACION.map((c, i) => `
    <label class="color" title="${c.nombre}">
      <input type="radio" name="color" value="${c.id}" ${i === 0 ? "checked" : ""} aria-label="${c.nombre}">
      <span style="background:${c.hex}"></span>
    </label>`).join("");

  // Rosetas alrededor de la torta
  const borde = $("#previewBorde");
  const N = 18;
  borde.innerHTML = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    return `<i style="transform:translate(-50%,-50%) rotate(${a}rad) translateY(-400%)"></i>`;
  }).join("");

  const preview = $("#tortaPreview");
  function datosTorta() {
    const color = COLORES_DECORACION.find(c => c.id === $("input[name=color]:checked").value);
    return {
      id: selTipo.value,
      nombre: $("#tortaNombre").value.trim(),
      edad: $("#tortaEdad").value.trim(),
      especie: $("input[name=especie]:checked").value,
      color,
      nota: $("#tortaNota").value.trim(),
    };
  }
  function actualizarPreview() {
    const d = datosTorta();
    preview.style.setProperty("--color", d.color.hex);
    $("#previewNombre").textContent = d.nombre || "Tu peludo";
    $("#previewEdad").textContent = d.edad || "";
    $("#previewIcono").textContent = d.especie === "gato" ? "🐱" : "🦴";
    $("#tortaPrecio").textContent = clp(porId(d.id).precio);
    $("#tortaError").hidden = true;
  }
  $("#formTorta").addEventListener("input", actualizarPreview);
  $("#formTorta").addEventListener("change", actualizarPreview);
  actualizarPreview();

  $("#formTorta").addEventListener("submit", e => {
    e.preventDefault();
    const d = datosTorta();
    if (!d.nombre) { $("#tortaError").hidden = false; $("#tortaNombre").focus(); return; }
    const detalle = [
      `Para: ${d.nombre}${d.edad ? ` (${d.edad} ${d.edad === "1" ? "año" : "años"})` : ""}`,
      d.especie === "gato" ? "Gato" : "Perro",
      `Color ${d.color.nombre.toLowerCase()}`,
      d.nota && `Nota: ${d.nota}`,
    ].filter(Boolean).join(" · ");
    agregar({ id: d.id, detalle });
    e.target.reset();
    actualizarPreview();
  });

  // ---------- Carrito ----------
  const CLAVE = "mesticha-carrito";
  let carrito = [];
  try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { carrito = []; }
  carrito = carrito.filter(it => porId(it.id));
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch {} };

  function agregar({ id, detalle = "" }) {
    const existente = carrito.find(it => it.id === id && it.detalle === detalle);
    if (existente) existente.cant++;
    else carrito.push({ id, detalle, cant: 1 });
    guardar(); pintarCarrito();
    const n = $("#contadorCarrito");
    n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop");
    aviso(`${porId(id).nombre} agregado al carrito 🐾`);
  }

  const subtotal = () => carrito.reduce((s, it) => s + porId(it.id).precio * it.cant, 0);
  const textoItems = () => carrito.map(it => {
    const p = porId(it.id);
    return `• ${it.cant} x ${p.nombre} — ${clp(p.precio * it.cant)}${it.detalle ? `\n   ${it.detalle}` : ""}`;
  });
  const linkWA = texto => CONFIG.whatsapp
    ? `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`
    : CONFIG.whatsappQR;

  function pintarCarrito() {
    $("#contadorCarrito").textContent = carrito.reduce((s, it) => s + it.cant, 0);
    const vacio = carrito.length === 0;
    $("#carritoVacio").hidden = !vacio;
    $("#carritoPie").hidden = vacio;
    $("#carritoItems").innerHTML = carrito.map((it, i) => {
      const p = porId(it.id);
      return `
      <li class="item">
        <img src="${p.img}" alt="">
        <div>
          <div class="item__nombre">${esc(p.nombre)}</div>
          ${it.detalle ? `<div class="item__detalle">${esc(it.detalle)}</div>` : ""}
          <div class="item__cant">
            <button data-menos="${i}" aria-label="Quitar uno">−</button>
            <span>${it.cant}</span>
            <button data-mas="${i}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <div>
          <div class="item__precio">${clp(p.precio * it.cant)}</div>
          <button class="item__quitar" data-quitar="${i}">Quitar</button>
        </div>
      </li>`;
    }).join("");
    $("#ckSubtotal").textContent = clp(subtotal());
  }

  $("#carritoItems").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const i = +(b.dataset.mas ?? b.dataset.menos ?? b.dataset.quitar);
    if ("mas" in b.dataset) carrito[i].cant++;
    if ("menos" in b.dataset && --carrito[i].cant < 1) carrito.splice(i, 1);
    if ("quitar" in b.dataset) carrito.splice(i, 1);
    guardar(); pintarCarrito();
  });

  // ---------- Paneles (carrito y modales) ----------
  const velo = $("#velo"), panel = $("#carrito");
  const bloquear = si => { document.body.style.overflow = si ? "hidden" : ""; document.body.classList.toggle("bloqueado", si); };
  function abrirCarrito() { panel.classList.add("abierto"); panel.setAttribute("aria-hidden", "false"); velo.hidden = false; bloquear(true); }
  function cerrarTodo() {
    panel.classList.remove("abierto"); panel.setAttribute("aria-hidden", "true"); velo.hidden = true;
    $$(".modal").forEach(m => m.hidden = true);
    bloquear(false);
  }
  function abrirModal(id) {
    panel.classList.remove("abierto"); velo.hidden = true;
    $$(".modal").forEach(m => m.hidden = m.id !== id);
    bloquear(true);
    $(`#${id} .modal__caja`).scrollTop = 0;
  }
  $("#abrirCarrito").addEventListener("click", abrirCarrito);
  velo.addEventListener("click", cerrarTodo);
  document.addEventListener("click", e => { if (e.target.closest("[data-cerrar]")) cerrarTodo(); });
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) cerrarTodo(); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarTodo(); });

  $("#pedirWhatsapp").addEventListener("click", async () => {
    const texto = ["¡Hola MestiCha! 🐾 Quiero pedir:", "", ...textoItems(), "", `Subtotal: ${clp(subtotal())}`].join("\n");
    if (!CONFIG.whatsapp) { try { await navigator.clipboard.writeText(texto); } catch {} aviso("Pedido copiado 📋 Pégalo en el chat"); }
    window.open(linkWA(texto), "_blank");
  });

  // ---------- Checkout ----------
  const fechaMin = new Date();
  fechaMin.setDate(fechaMin.getDate() + CONFIG.diasAnticipacion);
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("#pgFecha").min = iso(fechaMin);
  $("#demoAviso").hidden = !Servicios.pagos.modoDemo;

  $("#metodosPago").innerHTML = Servicios.pagos.metodos.map((m, i) => `
    <label class="metodo">
      <input type="radio" name="pgMetodo" value="${m.id}" ${i === 0 ? "checked" : ""}>
      <span><i>${m.icono}</i><b>${m.nombre}</b><small>${m.detalle}</small></span>
    </label>`).join("");

  const pgEntrega = () => $("input[name=pgEntrega]:checked").value;
  const pgMetodo = () => Servicios.pagos.metodos.find(m => m.id === $("input[name=pgMetodo]:checked").value);
  const pgDespacho = () => pgEntrega() === "despacho" ? CONFIG.costoDespacho : 0;

  function pintarResumen() {
    $("#resumenItems").innerHTML = carrito.map(it => {
      const p = porId(it.id);
      return `<li><span>${it.cant} × ${esc(p.nombre)}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}</span><b>${clp(p.precio * it.cant)}</b></li>`;
    }).join("");
    const esDespacho = pgEntrega() === "despacho";
    $("#pgDireccionBox").hidden = !esDespacho;
    $("#rsDespachoLinea").hidden = !esDespacho;
    $("#rsDespacho").textContent = CONFIG.costoDespacho ? clp(CONFIG.costoDespacho) : "A convenir";
    $("#rsSubtotal").textContent = clp(subtotal());
    const total = subtotal() + pgDespacho();
    $("#rsTotal").textContent = clp(total);
    $("#btnPagar").textContent = pgMetodo().id === "transferencia" ? "Confirmar pedido" : `Pagar ${clp(total)}`;
  }
  $("#formPago").addEventListener("change", pintarResumen);

  function abrirCheckout() {
    const c = Servicios.cuenta.actual();
    $("#pagoFormulario").hidden = false; $("#pagoProcesando").hidden = true; $("#pagoExito").hidden = true;
    $("#pgError").hidden = true;
    $("#sesionInfo").hidden = !c;
    $("#pgCrearCuentaBox").hidden = !!c;
    if (c) {
      $("#sesionInfo").textContent = `Comprando como ${c.nombre} ✔`;
      $("#pgNombre").value = c.nombre; $("#pgEmail").value = c.email; $("#pgTelefono").value = c.telefono;
      $("#pgOkContacto").checked = c.consentimiento.whatsapp || c.consentimiento.email;
    }
    pintarResumen();
    abrirModal("modalPago");
  }
  $("#irAPagar").addEventListener("click", abrirCheckout);

  const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const telOk = t => t.replace(/\D/g, "").length >= 8;

  $("#formPago").addEventListener("submit", async e => {
    e.preventDefault();
    const d = {
      nombre: $("#pgNombre").value.trim(),
      email: $("#pgEmail").value.trim(),
      telefono: $("#pgTelefono").value.trim(),
      direccion: $("#pgDireccion").value.trim(),
      fecha: $("#pgFecha").value,
    };
    const falta = !d.nombre ? "Escribe tu nombre." :
      !emailOk(d.email) ? "Revisa tu correo." :
      !telOk(d.telefono) ? "Revisa tu número de WhatsApp." :
      pgEntrega() === "despacho" && !d.direccion ? "Indica comuna y dirección para el despacho." :
      !d.fecha ? "Elige la fecha en que lo necesitas." :
      d.fecha < $("#pgFecha").min ? `Necesitamos al menos ${CONFIG.diasAnticipacion} días de anticipación.` : "";
    $("#pgError").textContent = falta; $("#pgError").hidden = !falta;
    if (falta) return;

    // Cuenta: crear si lo pidió, o actualizar el consentimiento si ya existe
    const ok = $("#pgOkContacto").checked;
    let cliente = Servicios.cuenta.actual();
    if (!cliente && $("#pgCrearCuenta").checked) {
      cliente = await Servicios.cuenta.crear({ ...d, okWhatsapp: ok, okEmail: ok });
    } else if (cliente) {
      cliente = await Servicios.cuenta.actualizar({
        telefono: d.telefono,
        consentimiento: { whatsapp: ok, email: ok, fecha: new Date().toISOString() },
      });
    }
    pintarCuenta();

    const metodo = pgMetodo();
    const pedido = await Servicios.pedidos.crear({
      clienteId: cliente?.id ?? null,
      cliente: { nombre: d.nombre, email: d.email, telefono: d.telefono },
      items: carrito.map(it => ({ id: it.id, nombre: porId(it.id).nombre, detalle: it.detalle, cant: it.cant, precio: porId(it.id).precio })),
      entrega: { tipo: pgEntrega(), direccion: d.direccion, fecha: d.fecha },
      subtotal: subtotal(), despacho: pgDespacho(), total: subtotal() + pgDespacho(),
      pago: { metodo: metodo.id, estado: "iniciado" },
    });

    $("#pagoFormulario").hidden = true;
    $("#pagoProcesando").hidden = metodo.id === "transferencia";
    $("#procMetodo").textContent = metodo.nombre;
    const r = await Servicios.pagos.iniciar(pedido);
    mostrarExito(pedido, r.estado);
    carrito = []; guardar(); pintarCarrito();
  });

  function mostrarExito(pedido, estado) {
    const [a, m, dd] = pedido.entrega.fecha.split("-");
    const fecha = `${dd}-${m}-${a}`;
    const pagado = estado === "pagado";
    $("#pagoProcesando").hidden = true;
    $("#pagoExito").hidden = false;
    $("#exitoTitulo").textContent = pagado ? "¡Pago recibido! 🎂" : "¡Pedido reservado!";
    $("#exitoTexto").innerHTML = pagado
      ? `Tu pedido <b>${pedido.id}</b> quedó confirmado para el <b>${fecha}</b>. Te escribiremos a <b>${esc(pedido.cliente.email)}</b> y por WhatsApp.`
      : `Tu pedido <b>${pedido.id}</b> queda reservado para el <b>${fecha}</b>. Transfiere <b>${clp(pedido.total)}</b> y envíanos el comprobante por WhatsApp.`;
    const t = CONFIG.transferencia;
    $("#exitoTransferencia").hidden = pagado;
    $("#exitoTransferencia").innerHTML = pagado ? "" : [
      ["Titular", t.titular], ["RUT", t.rut], ["Banco", t.banco], ["Tipo", t.tipoCuenta], ["N° cuenta", t.numero], ["Correo", t.email], ["Monto", clp(pedido.total)],
    ].map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join("");

    const texto = [
      `¡Hola MestiCha! 🐾 ${pagado ? "Acabo de pagar" : "Hice"} el pedido ${pedido.id}${pagado ? "" : " y adjunto el comprobante de transferencia"}:`,
      "",
      ...pedido.items.map(it => `• ${it.cant} x ${it.nombre}${it.detalle ? ` (${it.detalle})` : ""}`),
      "",
      `Total: ${clp(pedido.total)}`,
      pedido.entrega.tipo === "despacho" ? `Despacho a: ${pedido.entrega.direccion}` : "Entrega: retiro",
      `Fecha: ${fecha}`,
      `Nombre: ${pedido.cliente.nombre}`,
    ].join("\n");
    $("#exitoWhatsapp").textContent = pagado ? "Avisar por WhatsApp" : "Enviar comprobante por WhatsApp";
    $("#exitoWhatsapp").href = linkWA(texto);
  }

  // ---------- Cuenta ----------
  const fechaCorta = s => { const [a, m, d] = s.slice(0, 10).split("-"); return `${d}-${m}-${a}`; };

  function pintarCuenta() {
    const c = Servicios.cuenta.actual();
    $("#abrirCuenta").classList.toggle("activa", !!c);
    $("#cuentaEtiqueta").textContent = c ? c.nombre.split(" ")[0] : "Mi cuenta";
    $("#formCuenta").hidden = !!c;
    $("#perfil").hidden = !c;
    if (!c) return;
    $("#pfNombre").textContent = c.nombre.split(" ")[0];
    $("#pfEmail").textContent = c.email;
    $("#pfTelefono").textContent = c.telefono;
    $("#pfOkWhatsapp").checked = c.consentimiento.whatsapp;
    $("#pfOkEmail").checked = c.consentimiento.email;
    $("#pfMascotas").innerHTML = c.mascotas.length
      ? c.mascotas.map(m => `<li><span>${m.especie === "gato" ? "🐱" : "🐶"} <b>${esc(m.nombre)}</b></span><small>${m.cumpleanos ? `🎂 ${fechaCorta(m.cumpleanos)}` : "sin fecha"}</small></li>`).join("")
      : `<li><small>Aún no agregas a tu peludo.</small></li>`;
    const ps = Servicios.pedidos.delCliente();
    $("#pfPedidos").innerHTML = ps.length
      ? ps.map(p => `<li><span><b>${p.id}</b> · ${clp(p.total)}<br><small>${fechaCorta(p.creado)} · ${p.items.length} producto${p.items.length > 1 ? "s" : ""}</small></span>
          <span class="estado${p.pago.estado === "pagado" ? "" : " estado--pendiente"}">${p.pago.estado === "pagado" ? "Pagado" : "Pendiente"}</span></li>`).join("")
      : `<li><small>Todavía no tienes pedidos.</small></li>`;
  }

  $("#abrirCuenta").addEventListener("click", () => { pintarCuenta(); abrirModal("modalCuenta"); });

  $("#formCuenta").addEventListener("submit", async e => {
    e.preventDefault();
    const d = {
      nombre: $("#ctNombre").value.trim(),
      email: $("#ctEmail").value.trim(),
      telefono: $("#ctTelefono").value.trim(),
      okWhatsapp: $("#ctOkWhatsapp").checked,
      okEmail: $("#ctOkEmail").checked,
      mascotas: $("#ctMascota").value.trim()
        ? [{ nombre: $("#ctMascota").value.trim(), especie: $("#ctEspecie").value, cumpleanos: $("#ctCumple").value || null }]
        : [],
    };
    const falta = !d.nombre ? "Escribe tu nombre." : !emailOk(d.email) ? "Revisa tu correo." : !telOk(d.telefono) ? "Revisa tu número de WhatsApp." : "";
    $("#ctError").textContent = falta; $("#ctError").hidden = !falta;
    if (falta) return;
    await Servicios.cuenta.crear(d);
    e.target.reset();
    pintarCuenta();
    aviso(`¡Bienvenid@ a MestiCha, ${d.nombre.split(" ")[0]}! 🐾`);
  });

  $("#perfil").addEventListener("change", e => {
    if (!e.target.matches("#pfOkWhatsapp, #pfOkEmail")) return;
    Servicios.cuenta.actualizar({
      consentimiento: { whatsapp: $("#pfOkWhatsapp").checked, email: $("#pfOkEmail").checked, fecha: new Date().toISOString() },
    });
    aviso("Preferencias guardadas");
  });

  $("#cerrarSesion").addEventListener("click", () => {
    Servicios.cuenta.cerrarSesion();
    pintarCuenta();
    cerrarTodo();
    aviso("Sesión cerrada");
  });

  // ---------- WhatsApp flotante ----------
  const wa = $("#waFlotante");
  wa.href = linkWA("¡Hola MestiCha! 🐾 Tengo una consulta:");
  setTimeout(() => { wa.classList.add("saluda"); setTimeout(() => wa.classList.remove("saluda"), 4000); }, 2500);

  // ---------- Toast ----------
  let tToast;
  function aviso(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("visible");
    clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove("visible"), 2600);
  }

  pintarCarrito();
  pintarCuenta();
})();
