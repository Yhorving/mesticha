# MestiCha · Pet Bakery — plan de la web

Prototipo v0.1 (02-10-2026). Página estática: `index.html` + `css/` + `js/` + `img/`.
Se abre con doble clic en `index.html`; no necesita instalar nada.

## Qué hay hoy

| Parte | Estado |
|---|---|
| Landing (hero, tienda, arma su torta, cómo pedir, galería, testimonios, nosotros, FAQ) | ✅ con fotos reales |
| Carrito | ✅ se guarda en el navegador |
| Checkout + pago (Webpay / Mercado Pago / transferencia) | 🧪 **demo**: el pago se simula |
| Cuentas de clientes: crear cuenta, iniciar/cerrar sesión, mascotas con cumpleaños, consentimiento | 🧪 **demo**: se guardan sólo en el navegador |
| Historial de pedidos y seguimiento (recibido → pago → preparando → en camino/listo → entregado) | 🧪 **demo**: avanza solo cada 90 s |
| Panel `admin.html`: dashboard, pedidos (ingresar a mano, cambiar etapa, cancelar, avisar por WhatsApp), clientes (exportar CSV), productos (crear, editar, varias fotos, promociones con % y fecha, marcar agotado, ocultar, eliminar) | 🧪 **demo**: clave `mesticha2026`, datos del navegador |
| Collage del inicio con fotos que van rotando | ✅ (fotos en `HERO_FOTOS` de `js/datos.js`) |
| Una sola "Torta personalizada" con carrusel de fotos; tamaño y decoración se eligen en "Arma su torta" | ✅ (opciones y precios en `OPCIONES_TORTA` de `js/datos.js`) |
| Botón flotante de WhatsApp | ✅ (falta el número, ver abajo) |
| SEO: título/descripción, Open Graph, JSON-LD `Bakery`, sitemap, robots | ✅ (falta dominio definitivo) |

## Datos que hay que confirmar con MestiCha

Los valores por defecto están en `js/datos.js` (marcados con `CONFIRMAR`). WhatsApp, correos,
Instagram, despacho y datos de transferencia también se editan desde el panel → **Configuración**:

- [x] **Número de WhatsApp**: +56 9 4083 2214 (se cambia en el panel → Configuración).
- [ ] Correo de contacto y correo para avisos de pedidos (panel → Configuración).
- [ ] **Precios** de cada producto. Los actuales son de ejemplo. Repetirlos en el JSON-LD de `index.html`.
- [ ] Días de anticipación, costo y zona de despacho.
- [ ] Datos bancarios para transferencia.
- [ ] Texto de "Nosotros" (historia) y nombres de las perritas del logo.
- [ ] Respuestas de la FAQ (ingredientes, conservación, pago).
- [ ] Permiso de las clientas para mostrar sus mensajes como testimonios.
- [ ] Dominio (se asumió `mesticha.cl` en canonical, og:url, sitemap y JSON-LD).

## Para pasar de demo a tienda real

`js/servicios.js` es la única pieza que cambia; el resto de la página ya llama a `Servicios.*`.

1. **Hosting**: Vercel o Netlify (gratis), con el dominio `mesticha.cl` (NIC Chile, ~$10.000/año).
2. **Base de datos + cuentas**: Supabase (gratis al inicio). Tablas `clientes`, `mascotas`, `pedidos`.
   Login por enlace al correo (sin contraseñas que recordar).
3. **Pago**: MestiCha debe abrir cuenta de comercio. Opciones:
   - **Mercado Pago Checkout Pro**: alta rápida con RUT de persona natural, ~3,2% + IVA por venta.
   - **Flow** (incluye Webpay): ~2,9% + IVA, requiere inicio de actividades.
   (Comisiones aproximadas: verificar las vigentes antes de elegir.)
   Se integra con una función serverless (`/api/pagos`) + webhook que marca el pedido como pagado.
   Las llaves secretas van en el servidor, nunca en el navegador.
4. **Avisos al negocio**: correo/WhatsApp a MestiCha por cada pedido nuevo.
5. **Panel admin real**: login con usuario y rol "admin" en Supabase Auth (hoy el acceso de demo
   es `admin@mesticha.cl` / `mesticha2026` y se cambia en Configuración → Seguridad). Ahí mismo
   queda reservada la **verificación en dos pasos**: código por correo al iniciar sesión, opción de
   app de autenticación (TOTP, que Supabase trae) y cierre de sesión por inactividad. Las fotos de productos van a Supabase Storage. Cada cambio de etapa
   dispara el aviso automático al cliente.
6. **Importante en la demo**: como todo vive en el navegador, el panel sólo ve los pedidos
   hechos en ese mismo navegador. Con el backend, todos los pedidos llegan al panel.

## Bot de recordatorios (v2)

Con los datos que ya captura la cuenta (`consentimiento`, `mascotas[].cumpleanos`, `pedidos`):

- 🎂 **Cumpleaños**: 10 días antes del cumpleaños de la mascota → "¿Le preparamos su torta?"
- 🍪 **Recompra de galletas**: 3–4 semanas después de comprar galletas.
- 📦 **Estado del pedido**: confirmado → listo → entregado.

Canales: **WhatsApp Business Cloud API** (Meta; plantillas aprobadas, se paga por conversación)
y **correo** con Resend o Brevo (plan gratis). Un cron diario (Supabase o Vercel) revisa a quién avisar.

Sólo a quien marcó el consentimiento (Ley 19.628 y Ley 21.719 de datos personales),
con opción de darse de baja en cada mensaje.

## SEO: lo que falta fuera del código

- [ ] Crear **Google Business Profile** ("pastelería para mascotas"). Es lo que más pesa para búsquedas locales.
- [ ] Registrar el sitio en **Google Search Console** y enviar `sitemap.xml`.
- [ ] Poner el link de la web en la bio de Instagram.
- [ ] Pedir reseñas en Google a clientes contentos.
- [ ] Más adelante: una página por producto y un blog corto ("¿qué ingredientes son seguros para perros?").
