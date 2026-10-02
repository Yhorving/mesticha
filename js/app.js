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
  const fotosDe = p => (p.imgs && p.imgs.length ? p.imgs : [p.img]).filter(Boolean);
  const desde = p => p.personalizable ? Math.min(...OPCIONES_TORTA.tamanos.map(t => t.precio)) : p.precio;

  function fotoProducto(p) {
    const fotos = fotosDe(p);
    if (fotos.length < 2) return `<img src="${esc(fotos[0] || "")}" alt="${esc(p.nombre)}" loading="lazy">`;
    return `
      <div class="carrusel" data-carrusel>
        <div class="carrusel__pista">${fotos.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.nombre)} · foto ${i + 1}" loading="lazy">`).join("")}</div>
        <button class="carrusel__flecha carrusel__flecha--izq" data-dir="-1" aria-label="Foto anterior">‹</button>
        <button class="carrusel__flecha carrusel__flecha--der" data-dir="1" aria-label="Foto siguiente">›</button>
        <div class="carrusel__puntos">${fotos.map((_, i) => `<button data-ir="${i}" aria-label="Ver foto ${i + 1}" class="${i ? "" : "activo"}"></button>`).join("")}</div>
      </div>`;
  }

  function pintarProductos(filtro = "todos") {
    const lista = PRODUCTOS.filter(p => p.activo !== false && (
      filtro === "todos" || p.categoria === filtro || p.para.includes(filtro)));
    grid.innerHTML = lista.map((p, i) => `
      <article class="producto" style="animation-delay:${i * 50}ms">
        <div class="producto__foto">
          ${fotoProducto(p)}
          ${p.etiqueta ? `<span class="producto__etiqueta">${esc(p.etiqueta)}</span>` : ""}
          <span class="producto__para" title="Apto para">${p.para.map(x => x === "perro" ? "🐶" : "🐱").join(" ")}</span>
        </div>
        <div class="producto__info">
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion)}</p>
          <div class="producto__pie">
            <span class="precio">${p.personalizable ? "<small>desde</small>" : ""}${clp(desde(p))}</span>
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

  // Carrusel de fotos de una tarjeta: flechas, puntos, deslizar con el dedo y avance solo
  function irAFoto(car, i) {
    const pista = $(".carrusel__pista", car);
    const n = pista.children.length;
    pista.scrollTo({ left: ((i + n) % n) * pista.clientWidth, behavior: "smooth" });
  }
  const fotoActual = car => { const p = $(".carrusel__pista", car); return Math.round(p.scrollLeft / p.clientWidth); };
  grid.addEventListener("scroll", e => {
    if (!e.target.classList?.contains("carrusel__pista")) return;
    const car = e.target.closest("[data-carrusel]"), i = fotoActual(car);
    $$(".carrusel__puntos button", car).forEach((b, k) => b.classList.toggle("activo", k === i));
  }, true);

  grid.addEventListener("click", e => {
    const car = e.target.closest("[data-carrusel]");
    const flecha = e.target.closest("[data-dir]"), punto = e.target.closest("[data-ir]");
    if (car && flecha) { irAFoto(car, fotoActual(car) + +flecha.dataset.dir); return; }
    if (car && punto) { irAFoto(car, +punto.dataset.ir); return; }
    const add = e.target.closest("[data-agregar]");
    const per = e.target.closest("[data-personalizar]");
    if (add) agregar({ id: add.dataset.agregar });
    if (per) {
      $("#personaliza").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("#tortaNombre").focus({ preventScroll: true }), 600);
    }
  });

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(() => {
      if (document.hidden) return;
      $$("[data-carrusel]", grid).forEach(car => { if (!car.matches(":hover")) irAFoto(car, fotoActual(car) + 1); });
    }, 4500);
  }

  // ---------- Collage del inicio: fotos que van rotando ----------
  const slots = $$("[data-hero]").map(fig => ({ fig, fotos: HERO_FOTOS[fig.dataset.hero] || [], i: 0 }));
  slots.forEach(s => { const img = $("img", s.fig); if (s.fotos[0]) img.style.objectPosition = s.fotos[0].pos; });
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let turno = 0;

  function cambiarFoto(s) {
    if (s.fotos.length < 2) return;
    s.i = (s.i + 1) % s.fotos.length;
    const f = s.fotos[s.i];
    const nueva = new Image();
    nueva.alt = f.alt;
    nueva.className = "entrando";
    nueva.style.objectPosition = f.pos || "";
    nueva.onload = () => {
      const viejas = $$("img", s.fig);
      s.fig.appendChild(nueva);
      requestAnimationFrame(() => requestAnimationFrame(() => nueva.classList.remove("entrando")));
      setTimeout(() => viejas.forEach(v => v.remove()), 1300);
    };
    nueva.src = f.img;
  }

  if (!sinMovimiento && slots.length) {
    // precarga liviana del resto de las fotos después de cargar la página
    addEventListener("load", () => slots.forEach(s => s.fotos.slice(1).forEach(f => { new Image().src = f.img; })));
    setInterval(() => {
      if (document.hidden) return;
      cambiarFoto(slots[turno % slots.length]);
      turno++;
    }, 3500);
  }

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
  const TORTA = () => PRODUCTOS.find(p => p.personalizable && p.activo !== false);
  const { tamanos, decoraciones } = OPCIONES_TORTA;

  $("#tamanos").innerHTML = tamanos.map((t, i) => `
    <label class="tarjeta-opcion">
      <input type="radio" name="tamano" value="${t.id}" ${i === 0 ? "checked" : ""}>
      <span><b>${esc(t.nombre)}</b><small>${esc(t.detalle)}</small><em>${clp(t.precio)}</em></span>
    </label>`).join("");

  $("#decoraciones").innerHTML = decoraciones.map((d, i) => `
    <label class="tarjeta-opcion tarjeta-opcion--foto">
      <input type="radio" name="decoracion" value="${d.id}" ${i === 0 ? "checked" : ""}>
      <span><img src="${d.img}" alt="" loading="lazy"><b>${esc(d.nombre)}</b><small>${esc(d.detalle)}</small><em>${d.extra ? "+" + clp(d.extra) : "Incluida"}</em></span>
    </label>`).join("");

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
    const valor = n => $(`input[name=${n}]:checked`).value;
    const tamano = tamanos.find(t => t.id === valor("tamano"));
    const deco = decoraciones.find(d => d.id === valor("decoracion"));
    return {
      tamano, deco,
      precio: tamano.precio + deco.extra,
      nombre: $("#tortaNombre").value.trim(),
      edad: $("#tortaEdad").value.trim(),
      especie: valor("especie"),
      color: COLORES_DECORACION.find(c => c.id === valor("color")),
      nota: $("#tortaNota").value.trim(),
    };
  }

  let ultimaDeco = null;
  function actualizarPreview() {
    const d = datosTorta();
    preview.style.setProperty("--color", d.color.hex);
    preview.classList.toggle("torta-preview--mini", d.tamano.id === "mini");
    $("#previewNombre").textContent = d.nombre || "Tu peludo";
    $("#previewEdad").textContent = d.edad || "";
    $("#previewIcono").textContent = d.deco.icono;
    $("#tortaPrecio").textContent = clp(d.precio);
    $("#tortaDesglose").textContent = `${d.tamano.nombre} ${clp(d.tamano.precio)}${d.deco.extra ? ` + ${d.deco.nombre.toLowerCase()} ${clp(d.deco.extra)}` : ""}`;
    if (ultimaDeco !== d.deco.id) {
      ultimaDeco = d.deco.id;
      const img = $("#ejemploImg");
      img.classList.add("cambiando");
      setTimeout(() => { img.src = d.deco.img; $("#ejemploTexto").textContent = d.deco.nombre; img.classList.remove("cambiando"); }, 180);
    }
    $("#tortaError").hidden = true;
  }
  $("#formTorta").addEventListener("input", actualizarPreview);
  $("#formTorta").addEventListener("change", actualizarPreview);
  actualizarPreview();

  $("#formTorta").addEventListener("submit", e => {
    e.preventDefault();
    const d = datosTorta();
    const torta = TORTA();
    if (!torta) { aviso("Las tortas no están disponibles por ahora"); return; }
    if (!d.nombre) { $("#tortaError").hidden = false; $("#tortaNombre").focus(); return; }
    const detalle = [
      `${d.tamano.nombre} · ${d.deco.nombre}`,
      `Para: ${d.nombre}${d.edad ? ` (${d.edad} ${d.edad === "1" ? "año" : "años"})` : ""}`,
      d.especie === "gato" ? "Gato" : "Perro",
      `Color ${d.color.nombre.toLowerCase()}`,
      d.nota && `Nota: ${d.nota}`,
    ].filter(Boolean).join(" · ");
    agregar({ id: torta.id, detalle, precio: d.precio });
    e.target.reset();
    actualizarPreview();
  });

  // ---------- Carrito ----------
  const CLAVE = "mesticha-carrito";
  let carrito = [];
  try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { carrito = []; }
  carrito = carrito.filter(it => porId(it.id));
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch {} };

  function agregar({ id, detalle = "", precio }) {
    const existente = carrito.find(it => it.id === id && it.detalle === detalle);
    if (existente) existente.cant++;
    else carrito.push({ id, detalle, cant: 1, ...(precio ? { precio } : {}) });
    guardar(); pintarCarrito();
    const n = $("#contadorCarrito");
    n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop");
    aviso(`${porId(id).nombre} agregado al carrito 🐾`);
  }

  const precioItem = it => it.precio ?? porId(it.id).precio;
  const subtotal = () => carrito.reduce((s, it) => s + precioItem(it) * it.cant, 0);
  const textoItems = () => carrito.map(it => {
    const p = porId(it.id);
    return `• ${it.cant} x ${p.nombre} — ${clp(precioItem(it) * it.cant)}${it.detalle ? `\n   ${it.detalle}` : ""}`;
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
          <div class="item__precio">${clp(precioItem(it) * it.cant)}</div>
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
    clearInterval(refresco);
    volverAlCheckout = false;
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
      return `<li><span>${it.cant} × ${esc(p.nombre)}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}</span><b>${clp(precioItem(it) * it.cant)}</b></li>`;
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
    $("#pgClaveBox").hidden = !$("#pgCrearCuenta").checked;
    pintarResumen();
    abrirModal("modalPago");
  }
  $("#irAPagar").addEventListener("click", abrirCheckout);
  $("#pgCrearCuenta").addEventListener("change", e => { $("#pgClaveBox").hidden = !e.target.checked; });
  $("#pgIrLogin").addEventListener("click", () => { volverAlCheckout = true; abrirCuenta("login"); });

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
    const creaCuenta = !Servicios.cuenta.actual() && $("#pgCrearCuenta").checked;
    const clave = $("#pgClave").value;
    const faltaClave = creaCuenta && clave.length < 6 ? "La contraseña debe tener al menos 6 caracteres." : "";
    const error = falta || faltaClave;
    $("#pgError").textContent = error; $("#pgError").hidden = !error;
    if (error) return;

    // Cuenta: crear si lo pidió, o actualizar el consentimiento si ya existe
    const ok = $("#pgOkContacto").checked;
    let cliente = Servicios.cuenta.actual();
    if (creaCuenta) {
      try {
        cliente = await Servicios.cuenta.crear({ ...d, clave, okWhatsapp: ok, okEmail: ok });
      } catch (err) {
        $("#pgError").textContent = err.message; $("#pgError").hidden = false;
        return;
      }
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
      items: carrito.map(it => ({ id: it.id, nombre: porId(it.id).nombre, detalle: it.detalle, cant: it.cant, precio: precioItem(it) })),
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
    $("#exitoSeguimiento").onclick = () => abrirPedido(pedido.id);
  }

  // ---------- Cuenta ----------
  const fechaLocal = iso => new Date(iso).toLocaleDateString("es-CL");
  const fechaHora = iso => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const fechaEntrega = f => { const [a, m, d] = f.split("-"); return `${d}-${m}-${a}`; };
  const primerNombre = n => n.split(" ")[0];
  let volverAlCheckout = false;
  let pedidoAbierto = null;
  let refresco;

  function vistaCuenta(vista) { // "acceso" | "perfil" | "pedido"
    $("#vistaAcceso").hidden = vista !== "acceso";
    $("#perfil").hidden = vista !== "perfil";
    $("#vistaPedido").hidden = vista !== "pedido";
    if (vista !== "pedido") { clearInterval(refresco); pedidoAbierto = null; }
    $("#modalCuenta .modal__caja").scrollTop = 0;
  }

  function mostrarTab(tab) {
    $$(".tab").forEach(t => t.classList.toggle("activo", t.dataset.tab === tab));
    $("#formLogin").hidden = tab !== "login";
    $("#formCuenta").hidden = tab !== "registro";
    $("#lgError").hidden = true;
    $("#ctError").hidden = true;
  }
  $("#vistaAcceso").addEventListener("click", e => {
    const t = e.target.closest("[data-tab]");
    if (t) mostrarTab(t.dataset.tab);
  });

  function abrirCuenta(tab = "login") {
    pintarCuenta();
    if (Servicios.cuenta.actual()) vistaCuenta("perfil");
    else { vistaCuenta("acceso"); mostrarTab(tab); }
    abrirModal("modalCuenta");
  }
  $("#abrirCuenta").addEventListener("click", () => abrirCuenta());

  function trasAcceso(c, bienvenida) {
    pintarCuenta();
    aviso(bienvenida ? `¡Bienvenid@ a MestiCha, ${primerNombre(c.nombre)}! 🐾` : `¡Hola de nuevo, ${primerNombre(c.nombre)}! 🐾`);
    if (volverAlCheckout) { volverAlCheckout = false; abrirCheckout(); }
    else vistaCuenta("perfil");
  }

  function etiquetaEtapa(p) {
    if (p.etapa === "recibido" && p.pago.metodo === "transferencia") return "⏳ Esperando pago";
    const e = Servicios.pedidos.etapas[p.etapa];
    return `${e.icono} ${e.titulo}`;
  }

  function pintarCuenta() {
    const c = Servicios.cuenta.actual();
    $("#abrirCuenta").classList.toggle("activa", !!c);
    $("#cuentaEtiqueta").textContent = c ? primerNombre(c.nombre) : "Mi cuenta";
    if (!c) return;
    $("#pfNombre").textContent = primerNombre(c.nombre);
    $("#pfEmail").textContent = c.email;
    $("#pfTelefono").textContent = c.telefono;
    $("#pfOkWhatsapp").checked = c.consentimiento.whatsapp;
    $("#pfOkEmail").checked = c.consentimiento.email;
    $("#pfMascotas").innerHTML = c.mascotas.length
      ? c.mascotas.map(m => `<li><span>${m.especie === "gato" ? "🐱" : "🐶"} <b>${esc(m.nombre)}</b></span><small>${m.cumpleanos ? `🎂 ${fechaEntrega(m.cumpleanos)}` : "sin fecha de cumpleaños"}</small></li>`).join("")
      : `<li><small>Aún no agregas a tu peludo.</small></li>`;
    const ps = Servicios.pedidos.delCliente(c);
    $("#pfPedidos").innerHTML = ps.length
      ? ps.map(p => `
        <li><button class="pedido-fila" data-pedido="${p.id}">
          <span><b>${p.id}</b> · ${clp(p.total)}<br><small>Comprado el ${fechaLocal(p.creado)} · para el ${fechaEntrega(p.entrega.fecha)}</small></span>
          <span class="estado estado--${p.etapa}${p.etapa === "recibido" && p.pago.metodo === "transferencia" ? " estado--espera" : ""}">${etiquetaEtapa(p)}</span>
          <span class="pedido-fila__flecha" aria-hidden="true">›</span>
        </button></li>`).join("")
      : `<li class="vacio"><small>Todavía no tienes pedidos.</small></li>`;
  }

  // Seguimiento
  $("#pfPedidos").addEventListener("click", e => {
    const b = e.target.closest("[data-pedido]");
    if (b) abrirPedido(b.dataset.pedido);
  });

  function abrirPedido(id) {
    vistaCuenta("pedido");
    pedidoAbierto = id;
    pintarPedido();
    $("#volverPerfil").hidden = !Servicios.cuenta.actual();
    abrirModal("modalCuenta");
    clearInterval(refresco);
    refresco = setInterval(pintarPedido, 5000);
  }

  function pintarPedido() {
    const p = Servicios.pedidos.obtener(pedidoAbierto);
    if (!p) return;
    const E = Servicios.pedidos.etapas;
    // Cancelado: sólo las etapas que alcanzó + la cancelación
    const lista = p.etapa === "cancelado" ? p.historial.map(h => h.etapa) : Servicios.pedidos.etapasDe(p);
    const actual = lista.indexOf(p.etapa);
    $("#pdId").textContent = p.id;
    $("#pdSub").textContent = `${p.entrega.tipo === "despacho" ? `🚚 Despacho a ${p.entrega.direccion}` : "🏠 Retiro"} · para el ${fechaEntrega(p.entrega.fecha)}`;
    $("#pdTimeline").innerHTML = lista.map((et, i) => {
      const h = p.historial.find(x => x.etapa === et);
      const estado = i < actual ? "hecho" : i === actual ? "actual" : "pendiente";
      const esperaPago = et === "confirmado" && i === actual + 1 && p.pago.metodo === "transferencia";
      return `
        <li class="tl tl--${estado}${esperaPago ? " tl--espera" : ""}">
          <span class="tl__punto">${i <= actual ? E[et].icono : esperaPago ? "⏳" : ""}</span>
          <div class="tl__texto">
            <b>${E[et].titulo}</b>${h ? `<small>${fechaHora(h.fecha)}</small>` : ""}
            ${i <= actual ? `<p>${E[et].texto}</p>` : esperaPago ? `<p>${E[et].pendiente}</p>` : ""}
          </div>
        </li>`;
    }).join("");
    $("#pdItems").innerHTML = p.items.map(it =>
      `<li><span>${it.cant} × ${esc(it.nombre)}${it.detalle ? `<small>${esc(it.detalle)}</small>` : ""}</span><b>${clp(it.precio * it.cant)}</b></li>`).join("")
      + (p.despacho ? `<li><span>Despacho</span><b>${clp(p.despacho)}</b></li>` : "");
    $("#pdTotal").textContent = clp(p.total);
    $("#pdWhatsapp").href = linkWA(`¡Hola MestiCha! 🐾 Quería consultar por mi pedido ${p.id}.`);
    const fin = p.etapa === "entregado" || p.etapa === "cancelado" || p.manual;
    $("#pdAvanzar").hidden = !Servicios.pedidos.modoDemo || fin;
    $("#pdNota").textContent = fin ? "" : Servicios.pedidos.modoDemo
      ? "🧪 Demo: el pedido avanza solo cada 90 segundos. En la versión real lo actualiza MestiCha y te avisamos por WhatsApp y correo en cada paso."
      : "Te avisaremos por WhatsApp y correo en cada paso.";
  }
  $("#pdAvanzar").addEventListener("click", () => { Servicios.pedidos.avanzar(pedidoAbierto); pintarPedido(); pintarCuenta(); });
  $("#volverPerfil").addEventListener("click", () => { pintarCuenta(); vistaCuenta("perfil"); });

  // Iniciar sesión
  $("#formLogin").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#lgEmail").value.trim(), clave = $("#lgClave").value;
    const falta = !emailOk(email) ? "Revisa tu correo." : !clave ? "Escribe tu contraseña." : "";
    $("#lgError").textContent = falta; $("#lgError").hidden = !falta;
    if (falta) return;
    try {
      const c = await Servicios.cuenta.iniciarSesion(email, clave);
      e.target.reset();
      trasAcceso(c, false);
    } catch (err) {
      $("#lgError").textContent = err.message; $("#lgError").hidden = false;
    }
  });
  $("#olvideClave").addEventListener("click", () =>
    aviso("En la versión final te llegará un correo para crear una nueva contraseña 📧"));

  // Crear cuenta
  $("#formCuenta").addEventListener("submit", async e => {
    e.preventDefault();
    const d = {
      nombre: $("#ctNombre").value.trim(),
      email: $("#ctEmail").value.trim(),
      telefono: $("#ctTelefono").value.trim(),
      clave: $("#ctClave").value,
      okWhatsapp: $("#ctOkWhatsapp").checked,
      okEmail: $("#ctOkEmail").checked,
      mascotas: $("#ctMascota").value.trim()
        ? [{ nombre: $("#ctMascota").value.trim(), especie: $("#ctEspecie").value, cumpleanos: $("#ctCumple").value || null }]
        : [],
    };
    const falta = !d.nombre ? "Escribe tu nombre." : !emailOk(d.email) ? "Revisa tu correo." :
      !telOk(d.telefono) ? "Revisa tu número de WhatsApp." :
      d.clave.length < 6 ? "La contraseña debe tener al menos 6 caracteres." : "";
    $("#ctError").textContent = falta; $("#ctError").hidden = !falta;
    if (falta) return;
    try {
      const c = await Servicios.cuenta.crear(d);
      e.target.reset();
      trasAcceso(c, true);
    } catch (err) {
      $("#ctError").textContent = err.message; $("#ctError").hidden = false;
    }
  });

  // Perfil
  $("#formMascota").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#mtNombre").value.trim();
    if (!nombre) { $("#mtNombre").focus(); return; }
    await Servicios.cuenta.agregarMascota({ nombre, especie: $("#mtEspecie").value, cumpleanos: $("#mtCumple").value || null });
    e.target.reset();
    e.target.closest("details").open = false;
    pintarCuenta();
    aviso(`${nombre} quedó guardad@ 🐾`);
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
