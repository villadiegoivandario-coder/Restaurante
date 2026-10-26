# Alitas POS

Aplicación de pedidos, inventario y caja para un restaurante de alitas.
Funciona sin instalar nada: abre `index.html` en el navegador.

## Qué hace
- **Inicio**: ventas del día, mesas con su estado, pedidos recientes, más vendidos y alerta de inventario bajo.
- **Panel ERP (administrador)**: inventario por lote, edición de menú/precios, reportes y auditoría de accesos y permisos. El administrador no puede entrar a pedidos, toma de pedidos ni caja.
- **Nuevo pedido**: mesa, para llevar o domicilio. Las alitas piden el reparto de piezas por sabor (con límite de sabores y nivel de picante).
- **Interfaz táctil**: tarjetas para elegir mesa, teclado numérico integrado para mesa, cobro y arqueo, y objetivos táctiles amplios en el flujo de pedidos.
- **Pedidos**: filtros por estado, búsqueda, edición y cancelación (devuelve inventario).
- **Caja**: cobro con efectivo/tarjeta/transferencia, propina sugerida, división de cuenta, comprobante imprimible, historial y cierre de caja con arqueo.
- **Menú e inventario**: productos, sabores y stock. Cada venta descuenta ingredientes según la receta.
- **Carta oficial**: combos X6/X8/X12/X24/X36, los cinco sabores definidos, adicionales y bebidas con sus precios configurados.
- **Selección de combos**: cada combo exige Papas o Yuquitas. X6/X8 permiten hasta dos sabores; X12/X24, hasta tres; X36, hasta cuatro. Las piezas se reparten equitativamente entre los sabores elegidos (dos sabores, 50/50); cada pedido valida el total y descuenta alas, salsas y acompañamiento del inventario.
- **Comprobantes**: exige nombre e identificación del cliente y los datos legales del establecimiento configurados por el administrador. Incluye logo, consecutivo, fecha, terminal, usuarios, entrega a domicilio y detalle del pedido. El documento generado es comprobante interno y no sustituye la factura electrónica DIAN.
- **Ajustes**: datos del negocio, mesas, impuesto al consumo, propina, respaldo/restauración.
- **Acceso por PIN**: PIN de prueba `1001` (Mesero 1), `1002` (Mesero 2), `2001` (Cajero) y `9999` (Administrador). El perfil se conserva durante la sesión de la pestaña; abrir `pos.html` sin sesión vuelve a la portada.
- **Permisos de interfaz**: meseros toman pedidos de mesa, cobran y consultan inventario; cajeros también registran domicilios/para llevar y cierran caja; administrador accede exclusivamente al panel ERP para administrar catálogo, inventario, reportes, auditoría de accesos y ajustes. Anular una comanda solicita PIN de administrador.
- **Auditoría**: las comandas nuevas guardan tipo de pedido, identificador, fecha de creación, usuario y rol; los tickets muestran esos datos. El inventario permite asociar un código de lote a cada insumo.

## Estructura
```
index.html          página de bienvenida
pos.html            sistema POS (la navegación es por #/ruta)
assets/             imágenes y recursos visuales
css/landing.css     estilos de la página de bienvenida
css/styles.css      todos los estilos
js/utils.js         utilidades (formato de dinero, escape de HTML…)
js/store.js         datos y reglas de negocio (aquí está la "lógica")
js/ui.js            iconos, avisos, modales
js/vistas.js        pantallas
js/modales.js       ventanas emergentes y formularios
js/app.js           rutas, eventos y acciones
js/auth.js          perfiles PIN y permisos de interfaz
js/login.js         teclado PIN táctil de la portada
manifest.webmanifest, sw.js, icon.svg   instalable como app si se publica en https
assets/logo.avif                       icono y logo de Llama's Wings
```

## Datos
La interfaz actual sigue guardando datos en el navegador (localStorage). Los PIN, roles y permisos se comprueban únicamente en el cliente; no constituyen autenticación ni autorización seguras, y los PIN de muestra están incluidos en el código. Antes de producción se debe implementar autenticación con PIN hasheado, sesiones y autorización en el backend, además de auditoría persistida en servidor. Los datos de inventario tampoco se sincronizan con un servidor en tiempo real. Descarga respaldos desde
**Ajustes**. El backend NestJS/PostgreSQL ya está definido por separado; conectar la interfaz a esa
API reemplazará gradualmente la persistencia local. **Cerrar sesión** elimina solo las claves de
sesión y conserva los pedidos, el menú, el inventario y la configuración local.

## Backend PostgreSQL
El backend NestJS/Prisma se encuentra en `../backend`. Incluye productos, sabores,
inventario, recetas y pedidos. Consulta `../backend/README.md`
para configurar PostgreSQL, migraciones y endpoints.

## Aplicación Android con Capacitor

El frontend actual es una aplicación estática JavaScript, no React/TypeScript. Su
build mantiene `index.html`, `pos.html` y las carpetas `assets/`, `css/` y `js/`
en las mismas rutas relativas; minifica CSS y JavaScript sin cambiar los nombres
globales usados entre scripts.

### Vista previa mientras editas

Desde esta carpeta, instala dependencias e inicia el servidor:

```sh
npm install
npm run dev
```

Abre `http://localhost:4173` en el navegador del PC. Al guardar archivos HTML,
CSS o JavaScript, Vite recarga la página. En un workspace remoto de VS Code,
abre **Ports**, reenvía el puerto `4173` como privado y abre el enlace que VS
Code proporciona; así puedes verla en el PC sin publicar el servidor a Internet.

### Emulador Android con recarga

Con el servidor de desarrollo todavía ejecutándose, abre otra terminal:

```sh
npm run cap:sync:dev
npx cap open android
```

Por defecto, la sincronización de desarrollo usa `http://10.0.2.2:4173`, la
dirección que el emulador Android usa para acceder al servidor del mismo PC.
Ejecuta la app desde Android Studio; los cambios guardados se reflejarán en el
emulador. Si Android Studio o el emulador están en el PC y el servidor en un
workspace remoto, pasa la URL reenviada por VS Code:

```sh
npm run cap:sync:dev -- https://<url-privada-del-puerto>
```

La configuración de recarga es solo para desarrollo. Para generar una APK con
los archivos incluidos y sin depender del servidor, usa la configuración normal:

```sh
npm run cap:sync
npx cap open android
```

`npm run build` genera la versión web optimizada en `dist/`. `npm run cap:sync`
la vuelve a generar y ejecuta `cap sync` con la configuración normal.
Compila, instala y firma el APK/AAB desde Android Studio. La compilación nativa
requiere Android Studio y el SDK de Android.

## Pendiente para producción real
- Conectar la interfaz POS con la API backend; hoy la interfaz continúa usando localStorage.
- Configurar PostgreSQL, credenciales, usuarios y permisos antes de desplegar el backend.
- Gestión de usuarios y PIN personalizables con autenticación/autorización en servidor; el acceso PIN actual es solo una demostración local.
- Factura electrónica DIAN a través de un proveedor autorizado: el comprobante actual es interno.
