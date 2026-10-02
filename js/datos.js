// ============================================================
//  MestiCha — datos editables
//  Todo lo que dice "CONFIRMAR" es de ejemplo: hay que validarlo
//  con MestiCha antes de publicar.
// ============================================================

const CONFIG = {
  // Número de WhatsApp en formato internacional, sin "+" ni espacios.
  // Ej: "56912345678". CONFIRMAR. Mientras esté vacío, el pedido se
  // copia al portapapeles y se abre el QR de WhatsApp del Instagram.
  whatsapp: "",
  whatsappQR: "https://wa.me/qr/NNGG34T3GQTCO1",
  instagram: "https://www.instagram.com/mesticha.cl/",
  diasAnticipacion: 3,          // CONFIRMAR
  costoDespacho: 3500,          // CONFIRMAR (0 = a convenir)
  zonaDespacho: "Santiago",     // CONFIRMAR
  // Clave del panel admin.html. SÓLO DEMO: está a la vista en el código.
  // En producción el acceso será con usuario y rol de administrador.
  adminClave: "mesticha2026",
  // Datos para pago por transferencia. CONFIRMAR todos.
  transferencia: {
    titular: "MestiCha Pet Bakery",
    rut: "XX.XXX.XXX-X",
    banco: "Banco por definir",
    tipoCuenta: "Cuenta Vista",
    numero: "000000000",
    email: "pagos@mesticha.cl",
  },
};

// Precios en CLP. CONFIRMAR todos.
const PRODUCTOS = [
  {
    id: "torta-mini",
    nombre: "Mini torta personalizada",
    categoria: "tortas",
    para: ["perro", "gato"],
    precio: 14990,
    img: "img/torta-kim.jpg",
    descripcion: "Torta individual con el nombre y la edad de tu peludo. Ideal para perros pequeños y gatos.",
    etiqueta: "Más pedida",
    personalizable: true,
  },
  {
    id: "torta-clasica",
    nombre: "Torta de cumpleaños",
    categoria: "tortas",
    para: ["perro"],
    precio: 19990,
    img: "img/torta-nicky.jpg",
    descripcion: "Más grande, decorada con rosetas y su nombre. Para compartir con sus amigos peludos.",
    personalizable: true,
  },
  {
    id: "torta-tematica",
    nombre: "Torta con topper de galleta",
    categoria: "tortas",
    para: ["perro"],
    precio: 17990,
    img: "img/torta-louie.jpg",
    descripcion: "Letras y hueso de galleta horneada sobre la torta. El nombre se come también.",
    personalizable: true,
  },
  {
    id: "torta-gato",
    nombre: "Torta para gatos",
    categoria: "tortas",
    para: ["gato"],
    precio: 14990,
    img: "img/torta-chuck.jpg",
    descripcion: "Con carita de gato en galleta, su nombre y su edad. Porque los michis también celebran.",
    etiqueta: "Michis",
    personalizable: true,
  },
  {
    id: "pupcake",
    nombre: "Pupcake",
    categoria: "pupcakes",
    para: ["perro", "gato"],
    precio: 5990,
    img: "img/pupcake.jpg",
    descripcion: "Cupcake para mascotas con frosting y galleta con su inicial.",
  },
  {
    id: "galletas-huesos",
    nombre: "Pack galletas huesitos",
    categoria: "galletas",
    para: ["perro", "gato"],
    precio: 4990,
    img: "img/galletas-packs.jpg",
    descripcion: "Bolsita de galletas horneadas con forma de hueso y la M de MestiCha. Premio perfecto para el día a día.",
    etiqueta: "Favorita",
  },
  {
    id: "galletas-surtidas",
    nombre: "Galletas surtidas",
    categoria: "galletas",
    para: ["perro", "gato"],
    precio: 6990,
    img: "img/galletas-surtidas.jpg",
    descripcion: "Bolsa más grande con flores, huellitas y letras en dos sabores. Para los que piden más.",
  },
];

// Fotos que van rotando en el collage del inicio (una posición cambia cada pocos segundos).
// pos = qué parte de la foto se ve (object-position).
const HERO_FOTOS = {
  grande: [
    { img: "img/nicky-comiendo.jpg",  alt: "Dálmata comiendo su torta de cumpleaños para perros con el nombre Nicky", pos: "50% 55%" },
    { img: "img/cumple-perritas.jpg", alt: "Las perritas de MestiCha frente a su set de cumpleaños con vela, donas y galleta huella", pos: "45% 60%" },
    { img: "img/cumple-beagle.jpg",   alt: "Beagle y spaniel oliendo pupcake con vela y donas para perros", pos: "50% 55%" },
    { img: "img/torta-kim-caja.jpg",  alt: "Torta rosada con el nombre Kim en su caja MestiCha", pos: "50% 60%" },
  ],
  a: [
    { img: "img/gato-torta.jpg",   alt: "Gata frente a su torta de cumpleaños para gatos", pos: "50% 70%" },
    { img: "img/gato-galleta.jpg", alt: "Gato comiendo una galleta MestiCha", pos: "50% 45%" },
    { img: "img/torta-louie.jpg",  alt: "Torta con hueso de galleta y el nombre Louie", pos: "50% 60%" },
    { img: "img/perro-galleta-1.jpg", alt: "Perro esperando su galleta", pos: "50% 45%" },
  ],
  b: [
    { img: "img/galletas-packs.jpg",  alt: "Packs de galletas para perros con forma de hueso", pos: "50% 40%" },
    { img: "img/cumple-set.jpg",      alt: "Set de cumpleaños: pupcake, donas y galleta huella", pos: "50% 60%" },
    { img: "img/galletas-surtidas.jpg", alt: "Bolsa de galletas surtidas MestiCha", pos: "50% 50%" },
    { img: "img/pupcake.jpg",         alt: "Pupcake rosado con galleta de inicial", pos: "50% 60%" },
  ],
};

const GALERIA = [
  { img: "img/cumple-perritas.jpg", texto: "Cumple con vela y todo 🎂" },
  { img: "img/nicky-comiendo.jpg",  texto: "Nicky, 12 años de puro amor" },
  { img: "img/cumple-set.jpg",      texto: "Set de cumpleaños" },
  { img: "img/gato-torta.jpg",      texto: "Los michis también celebran" },
  { img: "img/perro-galleta-1.jpg", texto: "¿Una más?" },
  { img: "img/gato-comiendo.jpg",   texto: "Ni una miga sobró" },
  { img: "img/yorkie-pack.jpg",     texto: "Su pack de galletas" },
  { img: "img/gato-galleta.jpg",    texto: "Galleta aprobada" },
  { img: "img/perro-pack.jpg",      texto: "Recién llegado el pedido" },
  { img: "img/perro-galleta-2.jpg", texto: "Sentado y esperando" },
  { img: "img/cumple-beagle.jpg",   texto: "¿Quién sopla la vela?" },
  { img: "img/torta-kim-caja.jpg",  texto: "Lista para entregar" },
];

// Mensajes reales que llegaron por Instagram.
// CONFIRMAR que las clientas están OK con aparecer (por ahora sólo nombre de pila).
const TESTIMONIOS = [
  {
    texto: "Mi perrito tiene 11 años y nunca me ha comido snack ni galletas, ¡ni churu come! Pero las galletas se las devoró 😂❤️ Le encantaron.",
    autor: "Katherine",
    detalle: "Galletas · por Instagram",
    img: null,
  },
  {
    texto: "Desde hoy fan número 1 de las galletas de @mesticha.cl 💖",
    autor: "Clienta de Instagram",
    detalle: "Galletas · historia de Instagram",
    img: "img/story-fan.jpg",
  },
  {
    texto: "¡Las tortas también increíbles! 🎉",
    autor: "Familia de Louie",
    detalle: "Torta personalizada · historia de Instagram",
    img: "img/story-louie.jpg",
  },
];

const COLORES_DECORACION = [
  { id: "rosado",  nombre: "Rosado",  hex: "#F27A9B" },
  { id: "celeste", nombre: "Celeste", hex: "#3FC1C0" },
  { id: "fucsia",  nombre: "Fucsia",  hex: "#D94FA8" },
  { id: "rojo",    nombre: "Rojo",    hex: "#B5283A" },
];
