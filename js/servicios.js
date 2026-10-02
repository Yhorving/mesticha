// ============================================================
//  MestiCha — servicios (cuentas, pedidos, pagos)
//
//  MODO DEMO: todo se guarda en el navegador (localStorage) y el
//  pago se simula. Para producción, sólo se reemplaza el interior
//  de estas funciones por llamadas a un backend (ver PLAN.md):
//    · Cuentas y pedidos → Supabase (Auth + Postgres)
//    · Pagos            → Mercado Pago / Flow (Webpay) vía función serverless
//  El resto de la página no cambia: siempre usa Servicios.*
// ============================================================

const Servicios = (() => {
  const MODO_DEMO = true;
  const K_CLIENTE = "mesticha-cliente";
  const K_PEDIDOS = "mesticha-pedidos";

  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const nuevoId = pre => `${pre}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;

  // ---------------- Cuenta ----------------
  // Modelo de cliente pensado para el bot de recordatorios:
  //   { id, nombre, email, telefono,
  //     consentimiento: { whatsapp, email, fecha },   // Ley 19.628 / 21.719: opt-in explícito
  //     mascotas: [{ nombre, especie, cumpleanos }],    // cumpleaños → recordatorio de torta
  //     creado }
  const cuenta = {
    actual() { return leer(K_CLIENTE, null); },

    async crear(datos) {
      await esperar(300);
      const cliente = {
        id: nuevoId("CL"),
        nombre: datos.nombre,
        email: datos.email.toLowerCase(),
        telefono: datos.telefono,
        consentimiento: {
          whatsapp: !!datos.okWhatsapp,
          email: !!datos.okEmail,
          fecha: new Date().toISOString(),
        },
        mascotas: datos.mascotas || [],
        creado: new Date().toISOString(),
      };
      escribir(K_CLIENTE, cliente);
      return cliente;
    },

    async actualizar(cambios) {
      const c = { ...cuenta.actual(), ...cambios };
      escribir(K_CLIENTE, c);
      return c;
    },

    cerrarSesion() { localStorage.removeItem(K_CLIENTE); },
  };

  // ---------------- Pedidos ----------------
  // { id, clienteId, cliente:{nombre,email,telefono}, items:[{id,nombre,detalle,cant,precio}],
  //   entrega:{tipo,direccion,fecha}, subtotal, despacho, total,
  //   pago:{metodo,estado}, creado }
  const pedidos = {
    delCliente() { return leer(K_PEDIDOS, []); },

    async crear(pedido) {
      const p = { ...pedido, id: nuevoId("MC"), creado: new Date().toISOString() };
      escribir(K_PEDIDOS, [p, ...pedidos.delCliente()]);
      return p;
    },

    marcar(id, estadoPago) {
      const lista = pedidos.delCliente().map(p => p.id === id ? { ...p, pago: { ...p.pago, estado: estadoPago } } : p);
      escribir(K_PEDIDOS, lista);
    },
  };

  // ---------------- Pagos ----------------
  const METODOS = [
    { id: "webpay",       nombre: "Webpay",        detalle: "Débito, crédito o prepago", icono: "💳" },
    { id: "mercadopago",  nombre: "Mercado Pago",  detalle: "Tarjetas o saldo en cuenta", icono: "🟦" },
    { id: "transferencia",nombre: "Transferencia", detalle: "Te damos los datos al confirmar", icono: "🏦" },
  ];

  const pagos = {
    metodos: METODOS,
    modoDemo: MODO_DEMO,

    // En producción: POST a /api/pagos → devuelve URL de la pasarela
    // y se redirige (window.location = url). La pasarela vuelve a
    // /pago-resultado y un webhook confirma el pago en el backend.
    async iniciar(pedido) {
      if (pedido.pago.metodo === "transferencia") {
        pedidos.marcar(pedido.id, "pendiente-transferencia");
        return { estado: "pendiente-transferencia" };
      }
      await esperar(1600); // simula ir y volver de la pasarela
      pedidos.marcar(pedido.id, "pagado");
      return { estado: "pagado" };
    },
  };

  return { cuenta, pedidos, pagos };
})();
