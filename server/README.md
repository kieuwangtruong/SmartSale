# SmartSale API (Render + Neon + OpenAI + PayOS)

API này hợp nhất dữ liệu bán hàng/kho vào Neon, đồng thời giữ toàn bộ bí mật ở server Render. Frontend **không** được nhận `OPENAI_API_KEY`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` hay `DATABASE_URL`.

## Khởi tạo local

1. Sao chép `.env.example` thành `.env` và điền các giá trị của chính bạn.
2. Trong Neon Console, copy **Pooled connection string** và đặt vào `DATABASE_URL`.
3. Chạy `npm ci`, sau đó `npm run migrate` để tạo schema và tài khoản admin đầu tiên.
4. Chạy `npm run dev`.

## Endpoint tích hợp

- `POST /api/chatbot/messages`: gọi OpenAI Responses API với `store: false`, lịch sử chat và danh mục sản phẩm lấy từ Neon.
- `POST /api/payments/links`: lấy giá sản phẩm từ Neon, tạo Payment Link bằng thông tin PayOS ở environment server.
- `POST /api/webhooks/payos`: chỉ cập nhật đơn hàng sau khi SDK PayOS xác minh webhook.

Trong PayOS Merchant Portal, cấu hình Webhook URL là `https://<api-domain>/api/webhooks/payos`. Sau khi Render Static Site có URL, cập nhật `PUBLIC_WEB_URL` và `CORS_ORIGINS` ở API, sau đó redeploy API.
