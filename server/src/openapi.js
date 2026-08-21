export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SmartSale REST API Documentation',
    version: '1.0.0',
    description: 'Hệ thống API quản lý bán hàng đa kênh & kiểm soát kho thời gian thực SmartSale. Kết nối Neon Serverless PostgreSQL, PayOS và OpenAI Chatbot.',
    contact: {
      name: 'SmartSale Team',
      email: 'admin@smartsale.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập JWT token sau khi đăng nhập (ví dụ: Bearer <token>)',
      },
    },
  },
  paths: {
    '/': {
      get: {
        summary: 'Kiểm tra trạng thái máy chủ',
        tags: ['System'],
        responses: {
          200: { description: 'Máy chủ hoạt động bình thường' },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health Check kiểm tra kết nối Database & Secret',
        tags: ['System'],
        responses: {
          200: { description: 'Hệ thống kết nối DB thành công' },
        },
      },
    },
    '/api/User/login': {
      post: {
        summary: 'Đăng nhập người dùng (Admin, Sales, Warehouse, Customer)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@smartsale.com' },
                  password: { type: 'string', example: 'Admin@123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công, trả về access token & user profile' },
          401: { description: 'Sai email hoặc mật khẩu' },
        },
      },
    },
    '/api/User/register-customer': {
      post: {
        summary: 'Đăng ký tài khoản khách hàng mới',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userName', 'fullName', 'email', 'password'],
                properties: {
                  userName: { type: 'string', example: 'customer_demo' },
                  fullName: { type: 'string', example: 'Nguyễn Văn A' },
                  email: { type: 'string', example: 'customer_demo@smartsale.com' },
                  password: { type: 'string', example: 'Admin@123456' },
                  address: { type: 'string', example: 'Hà Nội' },
                  sex: { type: 'integer', example: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tạo tài khoản khách hàng thành công' },
        },
      },
    },
    '/api/User/me': {
      get: {
        summary: 'Lấy thông tin người dùng hiện tại từ Token',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Thông tin tài khoản và hạng thành viên' },
          401: { description: 'Chưa đăng nhập hoặc token hết hạn' },
        },
      },
    },
    '/api/User': {
      get: {
        summary: 'Lấy danh sách tất cả tài khoản người dùng (Chỉ Admin)',
        tags: ['User Management'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách người dùng hệ thống' },
        },
      },
    },
    '/api/products': {
      get: {
        summary: 'Lấy danh sách tất cả sản phẩm',
        tags: ['Products'],
        responses: {
          200: { description: 'Danh sách sản phẩm từ Neon Database' },
        },
      },
      post: {
        summary: 'Tạo sản phẩm mới (Admin, Warehouse)',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'importPrice', 'sellingPrice'],
                properties: {
                  name: { type: 'string', example: 'Chuột không dây Silent Pro' },
                  description: { type: 'string', example: 'Chuột silent 2.4GHz + Bluetooth, pin sạc Type-C' },
                  importPrice: { type: 'number', example: 150000 },
                  sellingPrice: { type: 'number', example: 290000 },
                  originalPrice: { type: 'number', example: 350000 },
                  salePrice: { type: 'number', example: 290000 },
                  imageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500' },
                  categoryId: { type: 'integer', example: 1 },
                  supplierId: { type: 'integer', example: 1 },
                  quantity: { type: 'integer', example: 50 },
                  reserveStock: { type: 'integer', example: 10 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Sản phẩm đã tạo thành công' },
        },
      },
    },
    '/api/products/{id}': {
      put: {
        summary: 'Cập nhật thông tin sản phẩm',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  sellingPrice: { type: 'number' },
                  quantity: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cập nhật sản phẩm thành công' },
        },
      },
      delete: {
        summary: 'Xóa sản phẩm',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Xóa sản phẩm thành công' },
        },
      },
    },
    '/api/categories': {
      get: {
        summary: 'Lấy danh mục sản phẩm',
        tags: ['Categories'],
        responses: {
          200: { description: 'Danh sách danh mục' },
        },
      },
      post: {
        summary: 'Tạo danh mục mới',
        tags: ['Categories'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Thiết bị thông minh' },
                  parentCategoryId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Danh mục đã tạo thành công' },
        },
      },
    },
    '/api/orders': {
      get: {
        summary: 'Lấy danh sách đơn hàng',
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách đơn hàng' },
        },
      },
      post: {
        summary: 'Tạo đơn hàng mới (Hỗ trợ PayOS QR hoặc Tiền mặt)',
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'paymentMethod'],
                properties: {
                  paymentMethod: { type: 'string', enum: ['PayOS', 'Cash'], example: 'Cash' },
                  discountAmount: { type: 'number', example: 0 },
                  customer: {
                    type: 'object',
                    properties: {
                      fullName: { type: 'string', example: 'Nguyễn Văn B' },
                      phone: { type: 'string', example: '0901234567' },
                      address: { type: 'string', example: '123 Cầu Giấy, Hà Nội' },
                    },
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['productId', 'quantity'],
                      properties: {
                        productId: { type: 'integer', example: 1 },
                        quantity: { type: 'integer', example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tạo đơn hàng thành công' },
        },
      },
    },
    '/api/stock-receipts': {
      get: {
        summary: 'Lấy danh sách phiếu nhập kho',
        tags: ['Inventory & Warehouse'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách phiếu nhập kho' },
        },
      },
    },
    '/api/suppliers': {
      get: {
        summary: 'Lấy danh sách nhà cung cấp',
        tags: ['Suppliers'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách nhà cung cấp' },
        },
      },
    },
    '/api/reports/dashboard': {
      get: {
        summary: 'Thống kê tổng quan doanh thu & đơn hàng cho Dashboard Admin',
        tags: ['Analytics & Reports'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Doanh thu hôm nay, tuần này, tháng này, top sản phẩm và top khách hàng' },
        },
      },
    },
    '/api/reports/revenue-chart': {
      get: {
        summary: 'Dữ liệu biểu đồ doanh thu theo ngày / tháng',
        tags: ['Analytics & Reports'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['day', 'month'], default: 'day' } },
        ],
        responses: {
          200: { description: 'Biểu đồ doanh thu' },
        },
      },
    },
    '/api/chatbot/session': {
      get: {
        summary: 'Lấy lịch sử hội thoại AI Chatbot',
        tags: ['AI Chatbot'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Lịch sử chat và ID phiên' },
        },
      },
    },
    '/api/chatbot/messages': {
      post: {
        summary: 'Gửi tin nhắn tư vấn tới AI Chatbot (OpenAI)',
        tags: ['AI Chatbot'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'Có sản phẩm tai nghe nào chống ồn tốt không?' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Câu trả lời từ trợ lý AI cùng gợi ý sản phẩm liên quan' },
        },
      },
    },
  },
}

export function swaggerHtml() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>SmartSale API Documentation (Swagger UI)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" />
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { background-color: #1e293b !important; padding: 12px 0; border-bottom: 2px solid #3b82f6; }
    .topbar .wrapper .topbar-wrapper img { display: none; }
    .topbar .wrapper .topbar-wrapper::before {
      content: '🛍️ SmartSale API Docs';
      color: #38bdf8;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .swagger-ui .info .title { color: #0f172a; }
    .swagger-ui .scheme-container { background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`
}
