# ShopLedger

ShopLedger is a point-of-sale app for a wholesale and retail shop. It tracks stock, customer credit (khata), orders, and GST invoices. The server uses Node.js, CommonJS, Express 4, and body-parser. The browser runs plain HTML, CSS, and JavaScript. The app persists its state in a single tracked JSON file.

## Rules for ticket work

1. Write and run characterization tests before changing behavior. Capture what the code does today, including known bugs. Name tests that capture incorrect results with `CURRENT BEHAVIOUR`.
2. Limit production changes to the module or modules the chosen ticket covers.
3. Use in-memory fixtures. Tests must never read or write `data/db.json`, directly or through the store or running app.
4. Add no dependencies. Use Node’s built-in `node:test` runner and `node:assert/strict` for assertions.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install the dependencies declared in `package.json`. |
| `npm start` | Run `server.js`. The default address is `http://localhost:3000`. Set `PORT` to override the port. |
| `node --test` | Run the tests in `test/`. The current `npm test` script is a placeholder that exits with status 1. |

## Module map

| Location | Responsibility |
| --- | --- |
| `public/` | Browser UI for the sales desk, order history, customer accounts, and GST audit. |
| `server.js` | Serves the UI, mounts the four routers under `/api`, and serves printable invoices at `/orders/:id/invoice`. |
| `routes/` | `products.js` serves products and coupons. `orders.js` handles checkout, history, and cancellation. `customers.js` handles accounts and settlements. `reports.js` serves the dashboard, GST audit, cart preview, and admin export. |
| `lib/pricing.js`, `lib/coupons.js`, `lib/tax.js` | Calculate checkout totals, validate and apply discounts, and resolve GST rates by HSN code. |
| `lib/orders.js`, `lib/inventory.js`, `lib/ledger.js`, `lib/dates.js` | Manage order records, stock, khata balances and settlements, and date handling. |
| `lib/invoice.js`, `lib/reports.js` | The invoice module uses checkout pricing to calculate printable figures from saved order lines. The reports module compares those figures with stored order totals and builds dashboard summaries. |
| `config.js`, `lib/store.js`, `data/db.json` | Configuration holds shop settings and business rules. The store reads and writes the JSON database and appends audit entries. |
