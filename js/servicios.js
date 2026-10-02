// ============================================================
//  MestiCha — servicios (cuentas, pedidos, seguimiento, pagos)
//
//  MODO DEMO: todo se guarda en el navegador (localStorage), el
//  pago se simula y los pedidos avanzan solos de etapa. Para
//  producción sólo se reemplaza el interior de estas funciones por
//  llamadas a un backend (ver PLAN.md):
//    · Cuentas y pedidos → Supabase (Auth + Postgres)
//    · Pagos            → Mercado Pago / Flow (Webpay) vía función serverless
//    · Etapas           → las cambia MestiCha desde un panel de administración
//  El resto de la página no cambia: siempre usa Servicios.*
// ============================================================

const Servicios = (() => {
  const MODO_DEMO = true;
  const AVANCE_DEMO_MS = 90 * 1000; // en la demo, cada pedido avanza de etapa cada 90 s
  const K_CUENTAS = "mesticha-cuentas";
  const K_SESION = "mesticha-sesion";
  const K_PEDIDOS = "mesticha-pedidos";

  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const nuevoId = pre => `${pre}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const ahora = () => new Date().toISOString();

  // Sólo para la demo. En producción la contraseña la maneja Supabase Auth.
  async function hashClave(email, clave) {
    const texto = `mesticha:${email}:${clave}`;
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0;
    for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0;
    return "x" + h;
  }

  // ---------------- Cuenta ----------------
  // Cliente (pensado para el bot de recordatorios):
  //   { id, nombre, email, telefono,
  //     consentimiento: { whatsapp, email, fecha },   // Ley 19.628 / 21.719: opt-in explícito
  //     mascotas: [{ nombre, especie, cumpleanos }],    // cumpleaños → recordatorio de torta
  //     creado }
  const sinClave = c => { if (!c) return null; const { claveHash, ...resto } = c; return resto; };

  // Dirección de envío del cliente: { comuna, calle, referencia }.
  // Acepta también texto suelto (lo que se escribe en el checkout).
  const normalizarDireccion = d => {
    if (!d) return null;
    if (typeof d === "string") return d.trim() ? { comuna: "", calle: d.trim(), referencia: "" } : null;
    const r = { comuna: (d.comuna || "").trim(), calle: (d.calle || "").trim(), referencia: (d.referencia || "").trim() };
    return r.comuna || r.calle ? r : null;
  };
  const textoDireccion = d => {
    d = normalizarDireccion(d);
    if (!d) return "";
    return [d.calle, d.comuna].filter(Boolean).join(", ") + (d.referencia ? ` (${d.referencia})` : "");
  };
  const cuentas = () => leer(K_CUENTAS, []);

  const cuenta = {
    actual() {
      const id = leer(K_SESION, null);
      return sinClave(cuentas().find(c => c.id === id));
    },

    async crear(datos) {
      await esperar(300);
      const email = datos.email.trim().toLowerCase();
      if (cuentas().some(c => c.email === email)) {
        throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
      }
      const cliente = {
        id: nuevoId("CL"),
        nombre: datos.nombre,
        email,
        telefono: datos.telefono,
        consentimiento: { whatsapp: !!datos.okWhatsapp, email: !!datos.okEmail, fecha: ahora() },
        mascotas: datos.mascotas || [],
        direccion: normalizarDireccion(datos.direccion),
        creado: ahora(),
        claveHash: await hashClave(email, datos.clave),
      };
      escribir(K_CUENTAS, [...cuentas(), cliente]);
      escribir(K_SESION, cliente.id);
      return sinClave(cliente);
    },

    async iniciarSesion(email, clave) {
      await esperar(300);
      email = email.trim().toLowerCase();
      const c = cuentas().find(x => x.email === email);
      if (!c || c.claveHash !== await hashClave(email, clave)) {
        throw new Error("Correo o contraseña incorrectos.");
      }
      escribir(K_SESION, c.id);
      return sinClave(c);
    },

    async actualizar(cambios) {
      const id = leer(K_SESION, null);
      const lista = cuentas().map(c => c.id === id ? { ...c, ...cambios } : c);
      escribir(K_CUENTAS, lista);
      return cuenta.actual();
    },

    async agregarMascota(mascota) {
      const c = cuenta.actual();
      return cuenta.actualizar({ mascotas: [...c.mascotas, mascota] });
    },

    cerrarSesion() { localStorage.removeItem(K_SESION); },
  };

  // ---------------- Pedidos y seguimiento ----------------
  // { id, clienteId, cliente:{nombre,email,telefono}, items:[{id,nombre,detalle,cant,precio}],
  //   entrega:{tipo,direccion,fecha}, subtotal, despacho, total,
  //   pago:{metodo,estado}, etapa, historial:[{etapa,fecha}], creado }
  const ETAPAS = {
    recibido:    { icono: "📝", titulo: "Pedido recibido",     texto: "Recibimos tu pedido." },
    confirmado:  { icono: "💳", titulo: "Pago confirmado",     texto: "Tu pago está listo.", pendiente: "Esperando tu transferencia." },
    preparando:  { icono: "🧁", titulo: "Preparando tu pedido", texto: "Estamos horneando y decorando con mucho cariño." },
    listo:       { icono: "🏠", titulo: "Listo para retirar",  texto: "Ya puedes pasar a buscarlo." },
    "en-camino": { icono: "🚚", titulo: "En camino",           texto: "Tu pedido va con el repartidor." },
    entregado:   { icono: "🎉", titulo: "Entregado",           texto: "¡A celebrar! Mándanos la foto 📸" },
    cancelado:   { icono: "✖️", titulo: "Cancelado",           texto: "Este pedido fue cancelado. Escríbenos si tienes dudas." },
  };
  const etapasDe = pedido => ["recibido", "confirmado", "preparando",
    pedido.entrega.tipo === "despacho" ? "en-camino" : "listo", "entregado"];

  function siguiente(p) {
    const lista = etapasDe(p);
    const i = lista.indexOf(p.etapa);
    if (i < 0 || i === lista.length - 1) return p;
    const etapa = lista[i + 1];
    const pago = etapa === "confirmado" ? { ...p.pago, estado: "pagado" } : p.pago;
    return { ...p, etapa, pago, historial: [...p.historial, { etapa, fecha: ahora() }] };
  }

  // Demo: avanza los pedidos según el tiempo transcurrido
  function avanzarPorTiempo(lista) {
    if (!MODO_DEMO) return lista;
    let cambio = false;
    const nueva = lista.map(p => {
      let q = p;
      while (!q.demo && !q.manual && q.etapa !== "entregado" && q.etapa !== "cancelado" && Date.now() - new Date(q.historial.at(-1).fecha) >= AVANCE_DEMO_MS) {
        const ultimo = new Date(q.historial.at(-1).fecha).getTime();
        q = siguiente(q);
        q.historial.at(-1).fecha = new Date(ultimo + AVANCE_DEMO_MS).toISOString();
        cambio = true;
      }
      return q;
    });
    if (cambio) escribir(K_PEDIDOS, nueva);
    return nueva;
  }

  // Pedidos guardados con el formato anterior (sin etapas)
  const normalizar = p => p.historial ? p : {
    ...p,
    etapa: p.pago?.estado === "pagado" ? "confirmado" : "recibido",
    historial: [{ etapa: "recibido", fecha: p.creado }],
  };

  const todos = () => avanzarPorTiempo(leer(K_PEDIDOS, []).map(normalizar));

  const pedidos = {
    etapas: ETAPAS,
    etapasDe,
    modoDemo: MODO_DEMO,

    delCliente(cliente) {
      if (!cliente) return [];
      return todos().filter(p => p.clienteId === cliente.id || p.cliente.email.toLowerCase() === cliente.email);
    },

    obtener(id) { return todos().find(p => p.id === id) || null; },

    async crear(pedido) {
      const fecha = ahora();
      const p = { ...pedido, id: nuevoId("MC"), creado: fecha, etapa: "recibido", historial: [{ etapa: "recibido", fecha }] };
      escribir(K_PEDIDOS, [p, ...todos()]);
      return p;
    },

    // En producción esto lo hace MestiCha desde su panel (y dispara el aviso por WhatsApp/correo)
    avanzar(id) {
      const lista = todos().map(p => p.id === id ? siguiente(p) : p);
      escribir(K_PEDIDOS, lista);
      return lista.find(p => p.id === id);
    },

    // ---- Panel de administración ----
    todos,

    // Editar datos de envío desde el panel: tipo, dirección, fecha y costo de despacho.
    // Recalcula el total; si cambia retiro ↔ despacho, "Listo para retirar" ↔ "En camino".
    editarEntrega(id, { tipo, direccion, fecha, despacho }) {
      const cambio = { listo: "en-camino", "en-camino": "listo" };
      const lista = todos().map(p => {
        if (p.id !== id) return p;
        const costo = tipo === "despacho" ? Math.max(0, Math.round(+despacho || 0)) : 0;
        const cambiaTipo = tipo !== p.entrega.tipo;
        const traducir = et => cambiaTipo && cambio[et] ? cambio[et] : et;
        return {
          ...p,
          entrega: { tipo, direccion: tipo === "despacho" ? direccion : "", fecha },
          despacho: costo,
          total: p.subtotal + costo,
          etapa: traducir(p.etapa),
          historial: p.historial.map(h => ({ ...h, etapa: traducir(h.etapa) })),
          editado: ahora(),
        };
      });
      escribir(K_PEDIDOS, lista);
      return lista.find(p => p.id === id);
    },

    // Pedido ingresado a mano desde el panel (WhatsApp, Instagram, en persona…).
    // No avanza solo: MestiCha mueve las etapas.
    async crearManual(pedido, etapa = "recibido") {
      const p = await pedidos.crear({ ...pedido, manual: true });
      // si ya está pagado, como mínimo queda "Pago confirmado"
      let destino = etapa === "recibido" && pedido.pago.estado === "pagado" ? "confirmado" : etapa;
      if (destino === "listo" && pedido.entrega.tipo === "despacho") destino = "en-camino";
      return destino === "recibido" ? p : pedidos.cambiarEtapa(p.id, destino);
    },

    // Lleva el pedido a una etapa concreta (hacia adelante o atrás) o lo cancela
    cambiarEtapa(id, etapa) {
      const lista = todos().map(p => {
        if (p.id !== id || p.etapa === etapa) return p;
        const orden = etapasDe(p);
        if (etapa !== "cancelado" && !orden.includes(etapa)) return p; // ej. "en camino" en un pedido con retiro
        let historial;
        if (etapa === "cancelado") {
          historial = [...p.historial, { etapa, fecha: ahora() }];
        } else {
          // conserva las fechas de las etapas ya cumplidas y agrega las que faltan
          const hasta = orden.indexOf(etapa);
          historial = orden.slice(0, hasta + 1).map(et =>
            p.historial.find(h => h.etapa === et) || { etapa: et, fecha: ahora() });
        }
        const pagado = etapa !== "cancelado" && orden.indexOf(etapa) >= 1;
        return { ...p, etapa, historial, pago: { ...p.pago, estado: pagado ? "pagado" : p.pago.estado }, manual: true };
      });
      escribir(K_PEDIDOS, lista);
      return lista.find(p => p.id === id);
    },
  };

  // ---------------- Productos (editables desde el panel) ----------------
  const K_PRODUCTOS = "mesticha-productos-v2"; // v2: una sola torta personalizada
  const ORIGINALES = PRODUCTOS.map(p => ({ ...p, activo: true }));
  const guardados = leer(K_PRODUCTOS, null);
  // La tienda usa el arreglo PRODUCTOS de datos.js: si hay cambios guardados, lo reemplazamos
  if (guardados) PRODUCTOS.splice(0, PRODUCTOS.length, ...guardados);
  else PRODUCTOS.forEach(p => { if (p.activo === undefined) p.activo = true; });

  const productos = {
    lista: () => PRODUCTOS,
    // Lanza error si no hay espacio (fotos pesadas en la demo) y deja todo como estaba
    guardar(prod) {
      const antes = PRODUCTOS.slice();
      const i = PRODUCTOS.findIndex(p => p.id === prod.id);
      if (i >= 0) PRODUCTOS[i] = prod; else PRODUCTOS.push(prod);
      try { localStorage.setItem(K_PRODUCTOS, JSON.stringify(PRODUCTOS)); }
      catch (e) { PRODUCTOS.splice(0, PRODUCTOS.length, ...antes); throw e; }
    },
    eliminar(id) {
      const i = PRODUCTOS.findIndex(p => p.id === id);
      if (i >= 0) PRODUCTOS.splice(i, 1);
      escribir(K_PRODUCTOS, PRODUCTOS);
    },
    restaurar() {
      PRODUCTOS.splice(0, PRODUCTOS.length, ...ORIGINALES.map(p => ({ ...p })));
      localStorage.removeItem(K_PRODUCTOS);
    },
  };

  // ---------------- Configuración de la tienda (editable desde el panel) ----------------
  // Se guarda aparte y se aplica sobre CONFIG de datos.js al cargar cualquier página.
  const K_CONFIG = "mesticha-config";
  const EDITABLES = ["whatsapp", "instagram", "correoContacto", "correoAvisos", "diasAnticipacion", "costoDespacho", "zonaDespacho", "transferencia"];
  function aplicarConfig(c) {
    if (!c) return;
    EDITABLES.forEach(k => {
      if (c[k] === undefined) return;
      if (k === "transferencia") Object.assign(CONFIG.transferencia, c.transferencia);
      else CONFIG[k] = c[k];
    });
  }
  aplicarConfig(leer(K_CONFIG, null));

  const config = {
    valores: () => CONFIG,
    guardar(cambios) {
      const actual = leer(K_CONFIG, {});
      const nuevo = { ...actual, ...cambios, transferencia: { ...(actual.transferencia || {}), ...(cambios.transferencia || {}) } };
      escribir(K_CONFIG, nuevo);
      aplicarConfig(nuevo);
    },
    restaurar() { localStorage.removeItem(K_CONFIG); },
  };

  // ---------------- Administración ----------------
  // DEMO: correo y clave guardados en este navegador (la inicial viene de datos.js).
  // En producción: Supabase Auth con rol "admin" + verificación en dos pasos (ver PLAN.md).
  const K_ADMIN = "mesticha-admin";
  const K_ADMIN_CRED = "mesticha-admin-cred";
  const credencial = async () => leer(K_ADMIN_CRED, null)
    || { email: CONFIG.adminEmail, hash: await hashClave(CONFIG.adminEmail, CONFIG.adminClave) };

  const admin = {
    sesionActiva: () => sessionStorage.getItem(K_ADMIN) === "1",
    async entrar(email, clave) {
      email = String(email).trim().toLowerCase();
      const c = await credencial();
      if (email !== c.email || await hashClave(email, clave) !== c.hash) return false;
      sessionStorage.setItem(K_ADMIN, "1");
      return true;
    },
    salir: () => sessionStorage.removeItem(K_ADMIN),
    correoActual: async () => (await credencial()).email,
    async cambiarAcceso({ claveActual, email, claveNueva }) {
      const c = await credencial();
      if (await hashClave(c.email, claveActual) !== c.hash) throw new Error("La contraseña actual no es correcta.");
      email = String(email || c.email).trim().toLowerCase();
      const clave = claveNueva || claveActual;
      escribir(K_ADMIN_CRED, { email, hash: await hashClave(email, clave), cambiado: ahora() });
    },

    clientes: () => cuentas().map(sinClave),

    // Genera clientes y pedidos ficticios para mostrar el panel con datos
    cargarEjemplo() {
      const nombres = [["Camila Rojas", "Luna", "perro"], ["Diego Soto", "Michi", "gato"], ["Fernanda Muñoz", "Toby", "perro"],
        ["Javiera Díaz", "Nala", "gato"], ["Matías Reyes", "Rocky", "perro"], ["Valentina Silva", "Coco", "perro"],
        ["Tomás Fuentes", "Simba", "gato"], ["Isidora Vera", "Max", "perro"]];
      const hoy = new Date();
      const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d; };
      const iso = d => d.toISOString().slice(0, 10);
      const azar = a => a[Math.floor(Math.random() * a.length)];
      const clientes = nombres.map(([nombre, mascota, especie], i) => {
        const cumple = dia(Math.floor(Math.random() * 60) - 5); cumple.setFullYear(2020 + (i % 5));
        return {
          id: `CL-DEMO${i}`, demo: true, nombre,
          email: nombre.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(" ", ".") + "@ejemplo.cl",
          telefono: `+56 9 ${String(50000000 + i * 1234567).slice(0, 4)} ${String(1000 + i * 731).slice(0, 4)}`,
          consentimiento: { whatsapp: i % 3 !== 2, email: i % 4 !== 3, fecha: dia(-40 + i * 3).toISOString() },
          mascotas: [{ nombre: mascota, especie, cumpleanos: iso(cumple) }],
          creado: dia(-40 + i * 3).toISOString(),
        };
      });
      const ped = [];
      for (let i = 0; i < 26; i++) {
        const c = azar(clientes);
        const creado = dia(-Math.floor(Math.random() * 30));
        creado.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));
        const items = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
          const p = azar(PRODUCTOS);
          return { id: p.id, nombre: p.nombre, detalle: p.personalizable ? `Para: ${c.mascotas[0].nombre}` : "", cant: 1 + Math.floor(Math.random() * 2), precio: p.precio };
        });
        const despacho = Math.random() < .5 ? CONFIG.costoDespacho : 0;
        const subtotal = items.reduce((s, it) => s + it.precio * it.cant, 0);
        const entrega = dia(-Math.floor((hoy - creado) / 864e5) + CONFIG.diasAnticipacion + Math.floor(Math.random() * 8));
        const tipo = despacho ? "despacho" : "retiro";
        const orden = ["recibido", "confirmado", "preparando", tipo === "despacho" ? "en-camino" : "listo", "entregado"];
        const vieja = entrega < hoy;
        const hasta = vieja ? 4 : Math.floor(Math.random() * 4);
        const metodo = azar(["webpay", "webpay", "mercadopago", "transferencia"]);
        const historial = orden.slice(0, hasta + 1).map((etapa, k) => ({ etapa, fecha: new Date(creado.getTime() + k * 36e5 * 8).toISOString() }));
        const cancel = !vieja && Math.random() < .08;
        if (cancel) historial.push({ etapa: "cancelado", fecha: new Date(creado.getTime() + 36e5).toISOString() });
        ped.push({
          id: `MC-D${String(100 + i)}`, demo: true, clienteId: c.id,
          cliente: { nombre: c.nombre, email: c.email, telefono: c.telefono },
          items, entrega: { tipo, direccion: tipo === "despacho" ? azar(["Ñuñoa", "Providencia", "Maipú", "La Florida", "Las Condes"]) + ", dirección de ejemplo" : "", fecha: iso(entrega) },
          subtotal, despacho, total: subtotal + despacho,
          pago: { metodo, estado: hasta >= 1 ? "pagado" : "iniciado" },
          etapa: cancel ? "cancelado" : orden[hasta], historial, creado: creado.toISOString(),
        });
      }
      escribir(K_CUENTAS, [...cuentas().filter(c => !c.demo), ...clientes]);
      escribir(K_PEDIDOS, [...ped, ...leer(K_PEDIDOS, []).filter(p => !p.demo)].sort((a, b) => b.creado.localeCompare(a.creado)));
    },

    borrarEjemplo() {
      escribir(K_CUENTAS, cuentas().filter(c => !c.demo));
      escribir(K_PEDIDOS, leer(K_PEDIDOS, []).filter(p => !p.demo));
    },
    hayEjemplo: () => cuentas().some(c => c.demo),
  };

  // ---------------- Pagos ----------------
  const METODOS = [
    { id: "webpay",        nombre: "Webpay",        detalle: "Débito, crédito o prepago", icono: "💳" },
    { id: "mercadopago",   nombre: "Mercado Pago",  detalle: "Tarjetas o saldo en cuenta", icono: "🟦" },
    { id: "transferencia", nombre: "Transferencia", detalle: "Te damos los datos al confirmar", icono: "🏦" },
  ];

  const pagos = {
    metodos: METODOS,
    modoDemo: MODO_DEMO,

    // En producción: POST a /api/pagos → devuelve URL de la pasarela
    // y se redirige (window.location = url). La pasarela vuelve a
    // /pago-resultado y un webhook confirma el pago en el backend.
    async iniciar(pedido) {
      if (pedido.pago.metodo === "transferencia") return { estado: "pendiente-transferencia" };
      await esperar(1600); // simula ir y volver de la pasarela
      pedidos.avanzar(pedido.id); // recibido → confirmado
      return { estado: "pagado" };
    },
  };

  return { cuenta, pedidos, pagos, productos, admin, config, direccion: { normalizar: normalizarDireccion, texto: textoDireccion } };
})();
