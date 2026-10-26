# Llamas Wings API

NestJS API for PostgreSQL orders, recipe-based inventory, and portion flavor/dip selections.

## Setup

1. Install Node.js 20 or later and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install packages and create the Prisma client:

   ```sh
   npm install
   npm run prisma:validate
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Start the API with `npm run start:dev`. The default HTTP port is `3000`.

To add the initial users and menu without deleting existing operational data, set
`WAITER_PASSWORD` and `CASHIER_PASSWORD` in `.env`, then run `npm run seed`. The
seed hashes passwords with bcrypt and is safe to run again.

## HTTP endpoints

- `POST /orders`: creates an order, validates per-portion wing flavors and required dips,
  and deducts product, sauce, and dip recipe ingredients in one serializable transaction.
- `PATCH /orders/:id/status`: allows `PENDING -> IN_PREPARATION -> READY`.
- `POST /orders/:orderId/splits` with `{"partsCount": 4}`: replaces unpaid equal splits
  for a delivered order and distributes any rounding cents exactly.
- `POST /orders/:orderId/splits/:splitId/payment` with `{"method":"CASH"}`: records
  payment against the latest open cash register and marks the order paid when all parts
  are paid. A split schedule with an existing payment cannot be rebuilt.

Example item payload for two 10-piece portions:

```json
{
  "type": "DINE_IN",
  "tableName": "Mesa 4",
  "items": [{
    "productId": "PRODUCT_UUID",
    "quantity": 2,
    "portions": [
      {
        "flavors": [
          { "flavorId": "BBQ_UUID", "pieces": 5 },
          { "flavorId": "BUFFALO_UUID", "pieces": 5 }
        ],
        "dips": [{ "productId": "BLUE_CHEESE_DIP_UUID", "quantity": 1 }]
      },
      {
        "flavors": [{ "flavorId": "BBQ_UUID", "pieces": 10 }],
        "dips": [{ "productId": "RANCH_DIP_UUID", "quantity": 1 }]
      }
    ]
  }]
}
```

Configure wing products with `piecesPerPortion`, `allowsFlavors`, `maxFlavors`,
and `requiresDip`; mark dip products with `isDip`. `Recipe.quantityPerPortion` stores the
ingredient usage per product unit, and `FlavorRecipe.quantityPerPiece` stores sauce usage
per wing piece.

The schema also includes `CashRegister` and `Payment` models using decimal monetary amounts.
The register/cashier endpoints are not implemented yet.
