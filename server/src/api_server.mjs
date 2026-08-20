import http from 'node:http';

const PORT = process.env.PORT || 3001;
const databaseUrl = 'postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const urlObj = new URL(databaseUrl);
const sqlEndpoint = `https://${urlObj.host}/sql`;

async function executeSql(sqlQuery, params = []) {
  const response = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({ query: sqlQuery, params }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
  return await response.json();
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = reqUrl.pathname.toLowerCase();

  try {
    // -------------------------------------------------------------
    // 1. AUTH & USER ROUTES: /api/User/login, /api/users/login
    // -------------------------------------------------------------
    if (req.method === 'POST' && (path === '/api/user/login' || path === '/api/users/login' || path === '/api/auth/login')) {
      const payload = await readBody(req);
      const emailOrUser = (payload.email || payload.userName || payload.username || '').trim().toLowerCase();
      
      const dbRes = await executeSql(
        `SELECT id, user_name as "userName", full_name as "fullName", email, role, phone, address, 
                date_of_birth as "dateOfBirth", sex, created_at as "createdAt"
         FROM users 
         WHERE LOWER(email) = $1 OR LOWER(user_name) = $1 LIMIT 1;`,
        [emailOrUser]
      );

      if (dbRes.rows.length === 0) {
        return sendJson(res, 401, { message: 'Tài khoản không tồn tại trong cơ sở dữ liệu.' });
      }

      const user = dbRes.rows[0];
      const authUser = {
        id: Number(user.id),
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        role: user.role, // 'Admin' | 'SalesStaff' | 'WarehouseKeeper' | 'Customer'
        dateOfBirth: user.dateOfBirth || '1995-01-01',
        sex: user.sex != null ? Number(user.sex) : 1,
        address: user.address || 'Việt Nam',
        createdAt: user.createdAt || new Date().toISOString(),
      };

      const session = {
        accessToken: 'neon_jwt_token_' + Buffer.from(JSON.stringify(authUser)).toString('base64'),
        refreshToken: 'neon_refresh_token_' + Date.now(),
        user: authUser,
      };

      return sendJson(res, 200, session);
    }

    // GET /api/User/me
    if (req.method === 'GET' && (path === '/api/user/me' || path === '/api/users/me')) {
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer neon_jwt_token_')) {
        try {
          const raw = Buffer.from(authHeader.replace('Bearer neon_jwt_token_', ''), 'base64').toString('utf8');
          const u = JSON.parse(raw);
          return sendJson(res, 200, u);
        } catch (e) {}
      }
      // Return first Admin by default
      const dbRes = await executeSql(`SELECT id, user_name as "userName", full_name as "fullName", email, role, phone, address FROM users LIMIT 1;`);
      return sendJson(res, 200, dbRes.rows[0]);
    }

    // GET /api/User/get-all or /api/users
    if (req.method === 'GET' && (path === '/api/user/get-all' || path === '/api/user' || path === '/api/users')) {
      const dbRes = await executeSql(`SELECT id, user_name as "userName", full_name as "fullName", email, role, phone, address, date_of_birth as "dateOfBirth", sex, created_at as "createdAt" FROM users ORDER BY id ASC;`);
      return sendJson(res, 200, dbRes.rows);
    }

    // -------------------------------------------------------------
    // 2. PRODUCTS: /api/products, /api/Product, /api/Product/get-all
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/products' || path === '/api/product' || path === '/api/product/get-all')) {
      const dbRes = await executeSql(`
        SELECT 
          p.id,
          p.name,
          p.description,
          p.import_price as "importPrice",
          p.selling_price as "sellingPrice",
          p.original_price as "originalPrice",
          p.sale_price as "salePrice",
          p.image_url as "imageUrl",
          p.image_urls as "imageUrls",
          p.category_id as "categoryId",
          c.name as "categoryName",
          p.supplier_id as "supplierId",
          s.name as "supplierName",
          p.quantity,
          p.reserve_stock as "reserveStock"
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.id ASC;
      `);

      const formatted = dbRes.rows.map(r => ({
        ...r,
        id: Number(r.id),
        importPrice: Number(r.importPrice),
        sellingPrice: Number(r.sellingPrice),
        originalPrice: Number(r.originalPrice),
        salePrice: r.salePrice != null ? Number(r.salePrice) : null,
        quantity: Number(r.quantity),
        reserveStock: Number(r.reserveStock),
        variants: [],
      }));

      return sendJson(res, 200, formatted);
    }

    // -------------------------------------------------------------
    // 3. CATEGORIES: /api/categories, /api/Category/get-all
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/categories' || path === '/api/category' || path === '/api/category/get-all')) {
      const dbRes = await executeSql(`SELECT id, name, parent_category_id as "parentCategoryId" FROM categories ORDER BY id ASC;`);
      return sendJson(res, 200, dbRes.rows.map(r => ({ ...r, id: Number(r.id) })));
    }

    // -------------------------------------------------------------
    // 4. SUPPLIERS: /api/suppliers, /api/Supplier/get-all
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/suppliers' || path === '/api/supplier' || path === '/api/supplier/get-all')) {
      const dbRes = await executeSql(`SELECT id, name, contact_name as "contactName", phone, email, address, notes FROM suppliers ORDER BY id ASC;`);
      return sendJson(res, 200, dbRes.rows.map(r => ({ ...r, id: Number(r.id) })));
    }

    // -------------------------------------------------------------
    // 5. CUSTOMERS: /api/customers, /api/Customer/get-all
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/customers' || path === '/api/customer' || path === '/api/customer/get-all')) {
      const dbRes = await executeSql(`SELECT id, user_id as "userId", full_name as "fullName", phone, email, address, gender, cccd, age, tier FROM customers ORDER BY id ASC;`);
      return sendJson(res, 200, dbRes.rows.map(r => ({ ...r, id: Number(r.id) })));
    }

    // -------------------------------------------------------------
    // 6. ORDERS: /api/Order, /api/Order/get-all, /api/orders, /api/Order/my-purchases
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/order' || path === '/api/order/get-all' || path === '/api/orders' || path === '/api/order/my-purchases')) {
      const ordersRes = await executeSql(`
        SELECT 
          o.id,
          o.user_id as "userId",
          o.customer_id as "customerId",
          c.full_name as "customerName",
          c.phone as "customerPhone",
          o.sales_staff_id as "salesStaffId",
          u.full_name as "salesStaffName",
          o.status,
          o.payment_method as "paymentMethod",
          o.subtotal,
          o.discount_amount as "discountAmount",
          o.total,
          o.amount_paid as "amountPaid",
          o.debt_amount as "debtAmount",
          o.payment_order_code as "paymentOrderCode",
          o.created_at as "createdAt"
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.sales_staff_id = u.id
        ORDER BY o.id DESC;
      `);

      const itemsRes = await executeSql(`
        SELECT id, order_id as "orderId", product_id as "productId", product_name as "productName", quantity, price, sub_total as "subTotal"
        FROM order_items;
      `);

      const itemsByOrderId = {};
      for (const item of itemsRes.rows) {
        itemsByOrderId[item.orderId] = itemsByOrderId[item.orderId] || [];
        itemsByOrderId[item.orderId].push({
          id: Number(item.id),
          productId: Number(item.productId),
          productName: item.productName,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subTotal: Number(item.subTotal),
        });
      }

      const formattedOrders = ordersRes.rows.map(o => ({
        id: Number(o.id),
        userId: o.userId ? Number(o.userId) : null,
        customerId: o.customerId ? Number(o.customerId) : null,
        customerName: o.customerName || 'Khách vãng lai',
        salesStaffId: o.salesStaffId ? Number(o.salesStaffId) : null,
        salesStaffName: o.salesStaffName || 'Nhân viên bán hàng',
        status: o.status,
        paymentMethod: o.paymentMethod,
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discountAmount),
        total: Number(o.total),
        amountPaid: Number(o.amountPaid),
        debtAmount: Number(o.debtAmount),
        paymentOrderCode: o.paymentOrderCode ? Number(o.paymentOrderCode) : null,
        createdAt: o.createdAt,
        orderItems: itemsByOrderId[o.id] || [],
      }));

      return sendJson(res, 200, formattedOrders);
    }

    // -------------------------------------------------------------
    // 7. STOCK RECEIPTS: /api/StockReceipt, /api/StockReceipt/get-all
    // -------------------------------------------------------------
    if (req.method === 'GET' && (path === '/api/stockreceipt' || path === '/api/stockreceipt/get-all' || path === '/api/stock-receipts')) {
      const receiptsRes = await executeSql(`
        SELECT 
          r.id,
          r.supplier_id as "supplierId",
          s.name as "supplierName",
          r.invoice_number as "invoiceNumber",
          r.import_date as "importDate",
          r.note,
          r.status,
          r.created_by_user_id as "createdByUserId",
          r.approved_by_user_id as "approvedByUserId",
          r.submitted_at as "submittedAt",
          r.confirmed_at as "confirmedAt",
          r.created_at as "createdAt"
        FROM stock_receipts r
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        ORDER BY r.id DESC;
      `);

      const itemsRes = await executeSql(`
        SELECT i.id, i.receipt_id as "receiptId", i.product_id as "productId", p.name as "productName", i.quantity, i.import_price as "importPrice"
        FROM stock_receipt_items i
        LEFT JOIN products p ON i.product_id = p.id;
      `);

      const itemsByReceipt = {};
      for (const item of itemsRes.rows) {
        itemsByReceipt[item.receiptId] = itemsByReceipt[item.receiptId] || [];
        itemsByReceipt[item.receiptId].push({
          id: Number(item.id),
          productId: Number(item.productId),
          productName: item.productName || `Sản phẩm #${item.productId}`,
          quantity: Number(item.quantity),
          importPrice: Number(item.importPrice),
        });
      }

      const formatted = receiptsRes.rows.map(r => {
        const items = itemsByReceipt[r.id] || [];
        const totalAmount = items.reduce((acc, curr) => acc + curr.quantity * curr.importPrice, 0);
        return {
          id: Number(r.id),
          supplierId: Number(r.supplierId),
          supplierName: r.supplierName || 'Nhà cung cấp',
          invoiceNumber: r.invoiceNumber,
          importDate: r.importDate,
          note: r.note,
          status: r.status,
          createdByUserId: Number(r.createdByUserId),
          approvedByUserId: r.approvedByUserId ? Number(r.approvedByUserId) : null,
          submittedAt: r.submittedAt,
          confirmedAt: r.confirmedAt,
          createdAt: r.createdAt,
          totalAmount,
          items,
        };
      });

      return sendJson(res, 200, formatted);
    }

    // Default 404
    sendJson(res, 404, { message: `Route ${pathname} not found.` });
  } catch (err) {
    console.error('API Error:', err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 SmartSale Neon Backend API is live on http://localhost:${PORT}`);
});
