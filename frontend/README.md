# Alitas POS

Aplicación de pedidos, cocina, inventario y caja para un restaurante de alitas.
Funciona sin instalar nada: abre `index.html` en el navegador.

## Qué hace
- **Inicio**: ventas del día, mesas con su estado, pedidos recientes, más vendidos y alerta de inventario bajo.
- **Nuevo pedido**: mesa, para llevar o domicilio. Las alitas piden el reparto de piezas por sabor (con límite de sabores y nivel de picante).
- **Interfaz táctil**: tarjetas para elegir mesa, teclado numérico integrado para mesa, cobro y arqueo, y objetivos táctiles amplios en el flujo de pedidos.
- **Pedidos**: filtros por estado, búsqueda, edición y cancelación (devuelve inventario).
- **Cocina (KDS)**: comandas en 3 columnas, filtro por estación (freidoras / armado / bebidas) y cronómetro con alertas.
- **Caja**: cobro con efectivo/tarjeta/transferencia, propina sugerida, división de cuenta, comprobante imprimible, historial y cierre de caja con arqueo.
- **Menú e inventario**: productos, sabores y stock. Cada venta descuenta ingredientes según la receta.
- **Ajustes**: datos del negocio, mesas, impuesto al consumo, propina, respaldo/restauración.

## Estructura
```
index.html          página de bienvenida
pos.html            sistema POS (la navegación es por #/ruta)
css/landing.css     estilos de la página de bienvenida
css/styles.css      todos los estilos
js/utils.js         utilidades (formato de dinero, escape de HTML…)
js/store.js         datos y reglas de negocio (aquí está la "lógica")
js/ui.js            iconos, avisos, modales
js/vistas.js        pantallas
js/modales.js       ventanas emergentes y formularios
js/app.js           rutas, eventos y acciones
manifest.webmanifest, sw.js, icon.svg   instalable como app si se publica en https
logo.avif                               icono y logo de Llama's Wings
```

## Datos
La interfaz actual sigue guardando datos en el navegador (localStorage). Descarga respaldos desde
**Ajustes**. El backend NestJS/PostgreSQL ya está definido por separado; conectar la interfaz a esa
API reemplazará gradualmente la persistencia local. **Cerrar sesión** elimina solo las claves de
sesión y conserva los pedidos, el menú, el inventario y la configuración local.

## Backend PostgreSQL
El backend NestJS/Prisma se encuentra en `../../backend`. Incluye productos, sabores,
inventario, recetas, pedidos y eventos de cocina en tiempo real. Consulta `../../backend/README.md`
para configurar PostgreSQL, migraciones, endpoints y Socket.io.

## Pendiente para producción real
- Conectar la interfaz POS con la API backend; hoy la interfaz continúa usando localStorage.
- Configurar PostgreSQL, credenciales, usuarios y permisos antes de desplegar el backend.
- Factura electrónica DIAN a través de un proveedor autorizado: el comprobante actual es interno.
- Usuarios y roles (mesero, cocina, caja, administrador).
