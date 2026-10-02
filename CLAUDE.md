# MestiCha · Pet Bakery — web y tienda

Web de **MestiCha Pet Bakery** (@mesticha.cl), negocio de amigos del usuario: tortas personalizadas,
pupcakes y galletas para perros y gatos, en Chile. Todo en español (textos, código, commits).

- **En línea (preview):** https://yhorving.github.io/mesticha/ · panel: `/admin.html`
- **Repo:** `Yhorving/mesticha` (público, propio). Está anidado dentro del repo `CLAUDE` del usuario,
  pero es independiente: commitear siempre desde esta carpeta, nunca desde el repo padre.
- **Estado:** prototipo **en modo demo** (ver más abajo). `PLAN.md` tiene lo pendiente y la ruta a producción.

## Stack

HTML/CSS/JS plano, **sin build ni dependencias**. Se abre con doble clic en `index.html`.
Fuentes de Google Fonts (Fraunces + Nunito). Nada más se carga de afuera.

| Archivo | Qué es |
|---|---|
| `index.html` | Tienda: hero con collage rotativo, tienda, "Arma su torta", cómo pedir, galería, ruleta de mensajes, nosotros, FAQ, carrito, checkout, cuenta |
| `admin.html` | Panel: dashboard, pedidos, clientes, productos, configuración |
| `js/datos.js` | **Lo editable**: `CONFIG`, `PRODUCTOS`, `OPCIONES_TORTA`, `COLORES_DECORACION`, `HERO_FOTOS`, `GALERIA`, `TESTIMONIOS`, `MOMENTOS`. Lo marcado `CONFIRMAR` es de ejemplo |
| `js/servicios.js` | **Única capa de datos** (`Servicios.*`): cuentas, pedidos/etapas, pagos, productos, descuentos, config, admin, dirección, personalización de tortas. Hoy usa localStorage |
| `js/app.js` | Lógica de la tienda |
| `js/admin.js` | Lógica del panel |
| `css/estilos.css` → `tienda.css` → `admin.css` → `movil.css` | Se cargan en ese orden; `movil.css` va al final en ambas páginas |
| `img/` | Fotos optimizadas (≤1200 px, JPG q82). `Fotos/` (originales de WhatsApp) está en `.gitignore`: tiene una captura con datos personales de una clienta |

Orden de scripts en ambas páginas: `datos.js` → `servicios.js` → `app.js`/`admin.js`.
`servicios.js` modifica `CONFIG` y `PRODUCTOS` al cargar (aplica lo guardado desde el panel).

## Modo demo (lo más importante)

Todo vive en el **localStorage de cada navegador**: lo que se cambia en el panel (productos,
promos, agotado, configuración, pedidos) **sólo se ve en ese navegador**. Ya confundió al usuario
una vez (borró un producto en el PC y seguía en su teléfono). Para que un cambio lo vea todo el mundo
hay que editar `js/datos.js` y publicar. Pago simulado; acceso al panel `admin@mesticha.cl` /
`mesticha2026` (a la vista en el código, sólo demo). El backend previsto es Supabase + Mercado Pago/Flow:
reemplazar el interior de `servicios.js`, el resto ya llama a `Servicios.*`.

Claves de localStorage: `mesticha-cuentas`, `-sesion`, `-pedidos`, `-productos-v2`, `-config`,
`-carrito`, `-admin-cred`; sesión del panel en sessionStorage `mesticha-admin`.
Si se cambia la forma del catálogo, subir la versión de `mesticha-productos-vN`.

## Modelo de datos (resumen)

- **Producto**: `{ id, nombre, categoria, para[], precio, img, imgs[], descripcion, etiqueta?, personalizable?, activo, agotado?, descuento?, descuentoHasta? }`.
  Hay **una sola** torta personalizable (`torta-personalizada`); su precio sale de `OPCIONES_TORTA` (tamaño + decoración).
- **Pedido**: `{ id, clienteId, cliente{nombre,email,telefono}, items[], entrega{tipo,direccion,fecha}, subtotal, despacho, total, pago{metodo,estado}, etapa, historial[], origen?, manual?, nota?, descuentoBienvenida?, vinculado? }`.
  Ítem de torta: `pers{ tamano, decoracion, nombre, edad, especie, color, colorHex, nota }` + `detalle` en texto. `Servicios.torta.pers()` también lee el texto de pedidos antiguos.
- **Etapas**: recibido → confirmado → preparando → `listo` (retiro) | `en-camino` (despacho) → entregado; además `cancelado`. Al cambiar retiro↔despacho se traduce listo↔en-camino.
- **Cliente**: `{ id, nombre, email, telefono, direccion{calle,comuna,referencia}, mascotas[{nombre,especie,cumpleanos}], consentimiento{whatsapp,email,fecha} }`.
  "Invitados" no se guardan: se derivan de pedidos sin cuenta.
- **Descuentos**: % por producto (con fecha opcional, se redondea a la decena) + bienvenida `CONFIG.descuentoBienvenida` (10%) en la primera compra **con** cuenta; un pedido `vinculado` después no cuenta como primera.

## Reglas del proyecto

- **No inventar testimonios ni datos del negocio.** Sólo hay 3 mensajes reales (`TESTIMONIOS`);
  más mensajes = capturas reales que mande el usuario. No asociar la foto de un perro al mensaje de
  Katherine (no sabemos cuál es su perrito). Precios, despacho, datos bancarios, historia: `CONFIRMAR`.
- WhatsApp real: **+56 9 4083 2214** (`56940832214`). Dominio asumido `mesticha.cl` (canonical, sitemap, JSON-LD).
- Al tocar productos/precios, mantener coherente el JSON-LD de `index.html` (y validarlo con `JSON.parse`).
- Celular primero: probar en 320, 360, 375, 393, 412 y 430 px. Campos ≥16 px (iOS hace zoom),
  nada que ensanche la página, `touch-action: manipulation`, alturas con `dvh`.
- Gráficos del panel siguen la skill `dataviz` (una serie, color de marca `#E5507B`, tooltip, vista tabla).

## Probar y publicar

- **Pruebas**: con `puppeteer-core` + el Chrome del sistema (`C:/Program Files/Google/Chrome/Application/chrome.exe`),
  instalado en el scratchpad de la sesión (no en el repo). Usar clics vía `page.evaluate(el.click())`:
  los clics físicos se cuelgan con el scroll suave. Limpiar `localStorage` al empezar cada prueba.
  Para celular revisar `innerWidth === ancho` (si algo desborda, Chrome móvil agranda el viewport).
- **Publicar**: `git push` a `main` de `Yhorving/mesticha` → GitHub Pages se actualiza en 1–2 min
  (verificar con `gh api repos/Yhorving/mesticha/pages/builds/latest`). Commits con
  `-c user.name="yhorjm-cyber" -c user.email="yhor.jm@gmail.com"`.
- **Imágenes**: recortar/optimizar con PowerShell + `System.Drawing` (no hay ImageMagick).
- **Git Bash**: los heredocs con comillas anidadas dentro de `python -c` fallan; escribir el script
  a un archivo del scratchpad y ejecutarlo.
