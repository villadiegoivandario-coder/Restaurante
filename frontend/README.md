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
- **Selección de combos**: cada combo exige Papas o Yuquitas; permite un sabor para todas las piezas o dos sabores distintos en división exacta 50/50. El inventario descuenta alas, salsas y acompañamiento.
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

## Pendiente para producción real
- Conectar la interfaz POS con la API backend; hoy la interfaz continúa usando localStorage.
- Configurar PostgreSQL, credenciales, usuarios y permisos antes de desplegar el backend.
- Gestión de usuarios y PIN personalizables con autenticación/autorización en servidor; el acceso PIN actual es solo una demostración local.
- Factura electrónica DIAN a través de un proveedor autorizado: el comprobante actual es interno.
