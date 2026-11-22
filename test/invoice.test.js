const test = require('node:test');
const assert = require('node:assert/strict');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const reports = require('../lib/reports');

// Synthetic order with the subtotal and ledger figures from the ticket's #1002 example.
const discountedRice = {
  id: 1002,
  items: [{ name: 'Rice', hsn: '1006', price: 510, qty: 2 }],
  coupon: 'SAVE10',
  subtotal: 1020,
  discount: 102,
  tax: 45.90,
  total: 963.90
};

test('Checkout applies SAVE10 before calculating 5% GST', () => {
  const bill = pricing.computeTotals(discountedRice.items, discountedRice.coupon);
  assert.equal(bill.discount, 102);
  assert.equal(bill.taxable, 918);
  assert.equal(bill.tax, 45.90);
  assert.equal(bill.total, 963.90);
});

test('A mixed-slab invoice taxes each discounted line and splits an odd paisa once', () => {
  const items = [
    { name: 'Rice', hsn: '1006', price: 299.90, qty: 1 },
    { name: 'Ghee', hsn: '0405', price: 200.10, qty: 1 }
  ];
  const figures = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });
  assert.equal(figures.total, 485.11);
  assert.equal(figures.discount, 50);
  assert.deepEqual(figures.rows.map(row => row.lineTax), [13.50, 21.61]);
  assert.equal(figures.tax, 35.11);
  assert.equal(figures.cgst, 17.56);
  assert.equal(figures.sgst, 17.55);
});

test('CURRENT BEHAVIOUR: the invoice calculates SAVE10 on the tax-inclusive amount', () => {
  const figures = invoice.computeInvoiceFigures(discountedRice);
  assert.equal(figures.subtotal, 1020);
  assert.equal(figures.tax, 183.60);
  assert.equal(figures.discount, 120.36);
  assert.equal(figures.total, 1083.24);
});

test('CURRENT BEHAVIOUR: both 5% rice and 12% ghee show 18% on invoice lines without a coupon', () => {
  const items = [
    { name: 'Rice', hsn: '1006', price: 100, qty: 2 },
    { name: 'Ghee', hsn: '0405', price: 100, qty: 1 }
  ];
  const bill = pricing.computeTotals(items, '');
  const figures = invoice.computeInvoiceFigures({ items });
  assert.deepEqual(bill.lines.map(line => line.tax), [10, 12]);
  assert.deepEqual(figures.rows.map(row => row.gstPercent), [18, 18]);
  assert.deepEqual(figures.rows.map(row => row.lineTax), [36, 18]);
  assert.equal(figures.total, 354);
});

test('CURRENT BEHAVIOUR: a ₹2,240 sale gets an invoice discount above the ₹150 SAVE10 cap', () => {
  const items = [{ name: 'Rice', hsn: '1006', price: 560, qty: 4 }];
  const bill = pricing.computeTotals(items, 'SAVE10');
  const figures = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });
  assert.equal(bill.discount, 150);
  assert.equal(bill.total, 2194.50);
  assert.equal(figures.discount, 264.32);
  assert.equal(figures.total, 2378.88);
});

test('CURRENT BEHAVIOUR: FLAT50 leaves invoice GST at its pre-discount value', () => {
  const items = [{ name: 'Tea', hsn: '0902', price: 500, qty: 1 }];
  const figures = invoice.computeInvoiceFigures({ items, coupon: 'FLAT50' });
  assert.equal(pricing.computeTotals(items, 'FLAT50').tax, 81);
  assert.equal(figures.discount, 50);
  assert.equal(figures.tax, 90);
  assert.equal(figures.total, 540);
});

test('CURRENT BEHAVIOUR: the printed notice and GST audit report the same ₹119.34 discrepancy', () => {
  const html = invoice.render(discountedRice);
  assert.match(html, /Accountant Reconciliation Notice/);
  assert.match(html, /Invoice computed total \(₹1083\.24\)/);
  assert.match(html, /Order Ledger recorded total \(₹963\.90\) by \+₹119\.34/);

  const audit = reports.getGstReconciliation({ orders: [discountedRice] });
  assert.equal(audit.mismatchCount, 1);
  assert.equal(audit.rows[0].matched, false);
  assert.equal(audit.rows[0].delta, 119.34);
});

test('An 18% sale without a coupon matches the ledger and prints without a reconciliation notice', () => {
  const order = {
    id: 1008,
    items: [{ name: 'Tea', hsn: '0902', price: 250, qty: 2 }],
    subtotal: 500, discount: 0, tax: 90, total: 590
  };
  const figures = invoice.computeInvoiceFigures(order);
  assert.equal(figures.discount, 0);
  assert.equal(figures.cgst, 45);
  assert.equal(figures.sgst, 45);
  assert.equal(figures.total, 590);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
  assert.equal(reports.getGstReconciliation({ orders: [order] }).rows[0].matched, true);
});
