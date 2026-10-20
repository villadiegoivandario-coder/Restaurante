# Llama's Wings

POS táctil para restaurante, con una aplicación web estática y una API NestJS/Prisma independiente.

## Estructura

```text
.
├── backend/                 API NestJS, Prisma y PostgreSQL
│   ├── prisma/              Esquema y seed
│   └── src/                 Módulos y servicios HTTP
├── frontend/                POS web estático
│   ├── assets/              Imágenes y recursos visuales
│   ├── css/                 Estilos de portada y POS
│   ├── js/                  Acceso, estado, vistas y lógica POS
│   ├── index.html           Portada y acceso por PIN
│   └── pos.html              Aplicación de punto de venta
└── .vscode/                 Preferencias del workspace
```

## Ejecutar el frontend en Docker

Con Docker y Docker Compose instalados, desde la raíz del repositorio ejecuta:

```sh
docker-compose up -d --build
```

La aplicación quedará disponible en `http://localhost:8000` y en la IP local de la máquina
anfitriona para pruebas desde móviles y tablets conectados a la misma red.

## Ejecutar el frontend

Abre `frontend/index.html` en un navegador, o sirve la carpeta `frontend/` mediante un servidor estático. PIN locales de demostración:

| Perfil | PIN |
|---|---:|
| Mesero 1 | `1001` |
| Mesero 2 | `1002` |
| Cajero | `2001` |
| Administrador | `9999` |

Los permisos y PIN del frontend son solo una demostración local; no sustituyen autenticación y autorización en el servidor.

El administrador entra al panel ERP y no puede abrir las rutas operativas de pedidos o facturación. El panel incluye inventario, menú y precios, reportes y auditoría local de decisiones de acceso. La auditoría se guarda en el navegador y no es un registro centralizado ni a prueba de manipulación.

## Ejecutar el backend

Consulta [backend/README.md](./backend/README.md) para requisitos, configuración de PostgreSQL, migraciones, seed y endpoints.

## Datos del POS

El POS estático guarda pedidos, menú e inventario en el almacenamiento local del navegador. No necesita dependencias npm. La API NestJS se administra e instala por separado desde `backend/`.
