# Sales and Inventory Frontend

Vue 3 frontend tích hợp ba microservice:

- User & Report: `https://nhom3-sales-and-inventory-management.onrender.com`
- Order & Sales: `https://nhom2-sales-and-inventory-management.onrender.com`
- Product & Inventory: `https://nhom1-sales-and-inventory-management.onrender.com`

## Vai trò

- `Admin`: báo cáo, tài khoản, đơn hàng, khách hàng, nhà cung cấp, sản phẩm và kho.
- `SalesStaff`: đơn hàng, khách hàng và nhà cung cấp.
- `WarehouseKeeper`: sản phẩm, tồn kho và phiếu nhập.

Khách hàng là dữ liệu bán hàng trong Order service, không phải tài khoản đăng nhập.

## Chạy local

```bash
npm install
npm run dev
```

Mặc định frontend gọi các URL Render. Có thể ghi đè bằng:

```bash
VITE_USER_API_URL=http://localhost:5056
VITE_ORDER_API_URL=http://localhost:5000
VITE_PRODUCT_API_URL=http://localhost:8080
```

Xem mẫu tại `.env.example`.

## Kiểm tra

```bash
npm run lint
npm run build
```

Frontend dùng history routing để trang bán hàng ở `/` và trang đăng nhập nhân viên ở `/admin`.

Trên Render Static Site, cần thêm rewrite rule từ `/*` đến `/index.html` để truy cập trực tiếp hoặc refresh các route Vue không bị lỗi 404.
