export interface ProductMockDetail {
  overview: { vi: string; en: string };
  specs: {
    dimensions: string;
    material: string;
    weight: string;
    origin: string;
    warranty: string;
  };
  originalPrice?: number;
  salePrice?: number;
}

export const PRODUCT_MOCKS: Record<number, ProductMockDetail> = {
  1: {
    overview: {
      vi: "Tai nghe chụp tai Bluetooth Pro với công nghệ chống ồn chủ động ANC tiên tiến, mang lại âm thanh trung thực và pin lên đến 40 giờ.",
      en: "Bluetooth Pro over-ear headphones featuring advanced ANC active noise cancellation, high-fidelity audio, and up to 40 hours of battery life."
    },
    specs: { dimensions: "18 x 16 x 8 cm", material: "Nhựa ABS & Đệm da PU", weight: "250g", origin: "Việt Nam", warranty: "12 tháng" },
    originalPrice: 1500000, salePrice: 990000
  },
  2: {
    overview: {
      vi: "Bàn phím cơ RGB sử dụng switch cơ học cao cấp, hành trình phím mượt mà và hệ thống đèn LED 16.8 triệu màu tùy biến cực đẹp.",
      en: "RGB Mechanical Keyboard featuring premium mechanical switches, smooth key travel, and highly customizable 16.8M color LED backlight."
    },
    specs: { dimensions: "44 x 13 x 4 cm", material: "Hợp kim nhôm & Nhựa ABS", weight: "950g", origin: "Trung Quốc", warranty: "24 tháng" },
    originalPrice: 1800000, salePrice: 1290000
  },
  3: {
    overview: {
      vi: "Chuột không dây Silent giảm thiểu 90% tiếng ồn click chuột, thiết kế công thái học vừa vặn lòng bàn tay, kết nối ổn định.",
      en: "Silent Wireless Mouse reducing 90% of click noise, designed with ergonomics to fit your palm comfortably, stable wireless connection."
    },
    specs: { dimensions: "11 x 6 x 3.8 cm", material: "Nhựa ABS cao cấp", weight: "85g", origin: "Việt Nam", warranty: "12 tháng" },
    originalPrice: 450000, salePrice: 299000
  },
  4: {
    overview: {
      vi: "Loa Bluetooth Mini nhỏ gọn nhưng mang lại âm lượng lớn, âm trầm mạnh mẽ và khả năng kháng nước chuẩn IPX7.",
      en: "Mini Bluetooth Speaker compact yet delivering loud volume, punchy bass, and IPX7 water resistance."
    },
    specs: { dimensions: "9 x 9 x 4.5 cm", material: "Nhựa ABS & Lưới kim loại", weight: "220g", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  5: {
    overview: {
      vi: "Đồng hồ thông minh S2 hỗ trợ theo dõi sức khỏe 24/7, đo nhịp tim, nồng độ oxy trong máu và hơn 100 chế độ thể thao tích hợp.",
      en: "Smart Watch S2 supporting 24/7 health tracking, heart rate, blood oxygen measurement, and over 100 built-in sports modes."
    },
    specs: { dimensions: "4.6 x 3.8 x 1.1 cm", material: "Khung hợp kim & Dây silicone", weight: "45g", origin: "Hàn Quốc", warranty: "12 tháng" },
    originalPrice: 2900000, salePrice: 1990000
  },
  6: {
    overview: {
      vi: "Đèn bàn LED bảo vệ thị lực, có thể điều chỉnh 5 mức độ sáng và 3 chế độ màu sắc ấm/lạnh linh hoạt.",
      en: "Anti-glare LED Desk Lamp to protect eyesight, featuring 5 adjustable brightness levels and 3 warm/cool color modes."
    },
    specs: { dimensions: "38 x 15 x 15 cm", material: "Nhựa ABS & Nhôm", weight: "600g", origin: "Việt Nam", warranty: "12 tháng" }
  },
  7: {
    overview: {
      vi: "Ghế văn phòng công thái học hỗ trợ nâng đỡ cột sống tối ưu, đệm lưới thoáng khí và chân xoay linh hoạt chịu lực cao.",
      en: "Ergonomic Office Chair providing optimal spine support, breathable mesh cushion, and a heavy-duty swivel base."
    },
    specs: { dimensions: "120 x 60 x 60 cm", material: "Khung nhựa sợi thủy tinh & Vải lưới", weight: "15kg", origin: "Nhật Bản", warranty: "36 tháng" }
  },
  8: {
    overview: {
      vi: "Máy xay sinh tố đa năng công suất 1000W kèm 3 cối xay chuyên dụng, lưỡi dao bằng thép không gỉ xay nhuyễn đá dễ dàng.",
      en: "Multi-function Blender with 1000W power and 3 specialized cups, stainless steel blades to crush ice easily."
    },
    specs: { dimensions: "40 x 18 x 18 cm", material: "Nhựa kháng vỡ & Thép không gỉ", weight: "3.2kg", origin: "Thái Lan", warranty: "24 tháng" },
    originalPrice: 1600000, salePrice: 1190000
  },
  9: {
    overview: {
      vi: "Ấm đun siêu tốc dung tích 1.8L, rơ-le tự ngắt khi sôi an toàn và thân ấm 2 lớp cách nhiệt chống bỏng hiệu quả.",
      en: "1.8L Electric Kettle, auto shut-off function for safety and double-wall thermal insulation to prevent burns."
    },
    specs: { dimensions: "24 x 16 x 22 cm", material: "Inox 304 & Nhựa PP", weight: "1.1kg", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  10: {
    overview: {
      vi: "Ổ cắm điện thông minh kết nối WiFi điều khiển từ xa qua smartphone, hẹn giờ bật tắt tự động và an toàn chống cháy nổ.",
      en: "Smart Power Outlet with WiFi connection for remote control via smartphone, auto scheduler, and fireproof safety."
    },
    specs: { dimensions: "10 x 5.5 x 4 cm", material: "Nhựa PC chống cháy", weight: "120g", origin: "Việt Nam", warranty: "12 tháng" }
  },
  11: {
    overview: {
      vi: "Laptop văn phòng Air 14 siêu mỏng nhẹ, trang bị vi xử lý thế hệ mới mạnh mẽ, màn hình IPS Full HD sắc nét và pin lâu dài.",
      en: "Office Laptop Air 14 ultrathin and light, powered by next-gen processor, sharp IPS Full HD display, and long battery life."
    },
    specs: { dimensions: "32.2 x 21.8 x 1.6 cm", material: "Hợp kim nhôm nguyên khối", weight: "1.38kg", origin: "Mỹ", warranty: "24 tháng" },
    originalPrice: 18500000, salePrice: 14990000
  },
  12: {
    overview: {
      vi: "Máy pha cà phê mini cá nhân, công suất 800W giúp chiết xuất trọn vẹn hương vị espresso chỉ trong vài phút.",
      en: "Mini Coffee Maker for personal use, 800W power extracting rich espresso flavor in just a few minutes."
    },
    specs: { dimensions: "28 x 20 x 15 cm", material: "Thép không gỉ & Nhựa ABS", weight: "2.1kg", origin: "Ý", warranty: "12 tháng" }
  },
  13: {
    overview: {
      vi: "Điện thoại thông minh Nova 5G với cụm camera 64MP sắc nét, màn hình tần số quét 120Hz mượt mà và sạc nhanh siêu tốc.",
      en: "Nova 5G Smartphone with sharp 64MP camera, smooth 120Hz refresh rate display, and super fast charging."
    },
    specs: { dimensions: "16.1 x 7.4 x 0.8 cm", material: "Kính Gorilla Glass & Khung nhôm", weight: "185g", origin: "Hàn Quốc", warranty: "12 tháng" },
    originalPrice: 9500000, salePrice: 7990000
  },
  14: {
    overview: {
      vi: "Máy tính bảng Tab M10 màn hình 10.4 inch sắc nét, hệ thống âm thanh Dolby Atmos sống động phù hợp giải trí gia đình.",
      en: "Tab M10 Tablet with sharp 10.4-inch screen, immersive Dolby Atmos sound system, ideal for family entertainment."
    },
    specs: { dimensions: "24.4 x 15.4 x 0.8 cm", material: "Hợp kim kim loại", weight: "460g", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  15: {
    overview: {
      vi: "Màn hình IPS 24 inch tràn viền Full HD, tần số quét 75Hz góc nhìn rộng 178 độ bảo vệ mắt hiệu quả.",
      en: "24-inch IPS Monitor borderless Full HD, 75Hz refresh rate, 178-degree wide viewing angle, eye protection mode."
    },
    specs: { dimensions: "54 x 41 x 18 cm", material: "Nhựa ABS & Chân đế kim loại", weight: "3.5kg", origin: "Đài Loan", warranty: "24 tháng" }
  },
  16: {
    overview: {
      vi: "Máy ảnh kỹ thuật số Compact siêu nhỏ gọn, cảm biến 20.1MP và zoom quang học 8x ghi lại mọi khoảnh khắc sắc nét.",
      en: "Compact Digital Camera ultracompact, 20.1MP sensor, and 8x optical zoom to capture every moment sharply."
    },
    specs: { dimensions: "9.5 x 5.5 x 2.2 cm", material: "Hợp kim kim loại & Nhựa", weight: "120g", origin: "Nhật Bản", warranty: "12 tháng" }
  },
  17: {
    overview: {
      vi: "Máy chiếu di động Mini hỗ trợ độ phân giải Full HD, kết nối không dây tiện lợi mang rạp chiếu phim về ngôi nhà bạn.",
      en: "Mini Full HD Projector supporting native Full HD, convenient wireless connection, bringing the cinema experience home."
    },
    specs: { dimensions: "15 x 11 x 6 cm", material: "Nhựa ABS chống cháy", weight: "800g", origin: "Hàn Quốc", warranty: "12 tháng" }
  },
  18: {
    overview: {
      vi: "Webcam Full HD 1080p tích hợp micrô chống ồn, tự động lấy nét hoàn hảo cho họp trực tuyến và học online.",
      en: "Full HD 1080p Webcam with integrated noise-cancelling microphone, autofocus, perfect for remote meetings and online classes."
    },
    specs: { dimensions: "8 x 3 x 3.5 cm", material: "Nhựa ABS", weight: "110g", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  19: {
    overview: {
      vi: "Bộ chuyển đổi USB-C đa năng 7 trong 1 xuất màn hình HDMI 4K, đọc thẻ nhớ SD/TF và sạc PD công suất cao.",
      en: "7-in-1 USB-C Hub supporting 4K HDMI screen output, SD/TF card readers, and high-wattage Power Delivery."
    },
    specs: { dimensions: "12 x 3.2 x 1.4 cm", material: "Vỏ nhôm tản nhiệt cao cấp", weight: "75g", origin: "Việt Nam", warranty: "12 tháng" }
  },
  20: {
    overview: {
      vi: "Ổ cứng di động SSD tốc độ đọc ghi lên tới 1050MB/s, kích thước siêu nhỏ gọn chống sốc vượt trội.",
      en: "1TB Portable SSD with read/write speed up to 1050MB/s, ultracompact size, and superior shockproof durability."
    },
    specs: { dimensions: "7.5 x 5.8 x 1.1 cm", material: "Vỏ cao su chống va đập & Nhôm", weight: "65g", origin: "Mỹ", warranty: "36 tháng" }
  },
  21: {
    overview: {
      vi: "Balo đựng laptop 15.6 inch làm bằng vải trượt nước cao cấp, đệm lưng êm ái thoáng khí bảo vệ tối đa thiết bị.",
      en: "15.6-inch Shockproof Laptop Backpack made of water-repellent fabric, thick breathable padding to protect devices."
    },
    specs: { dimensions: "45 x 30 x 14 cm", material: "Vải Polyester chống thấm", weight: "750g", origin: "Việt Nam", warranty: "12 tháng" }
  },
  22: {
    overview: {
      vi: "Giá đỡ laptop chất liệu nhôm nguyên khối, có thể tùy chỉnh độ cao 6 mức giúp cải thiện tư thế ngồi làm việc.",
      en: "Aluminum Laptop Stand CNC carved, featuring 6 adjustable height levels to improve sitting posture."
    },
    specs: { dimensions: "24 x 16.5 x 15 cm", material: "Hợp kim nhôm siêu nhẹ", weight: "260g", origin: "Việt Nam", warranty: "6 tháng" }
  },
  23: {
    overview: {
      vi: "Nồi chiên không dầu dung tích 5L, công nghệ Rapid Air giảm 80% dầu mỡ trong thực phẩm giúp ăn uống lành mạnh.",
      en: "5L Air Fryer with Rapid Air technology reducing 80% fat, helping you eat healthier meals."
    },
    specs: { dimensions: "32 x 32 x 35 cm", material: "Nhựa PP chịu nhiệt & Thép phủ chống dính", weight: "4.5kg", origin: "Thái Lan", warranty: "24 tháng" },
    originalPrice: 2200000, salePrice: 1590000
  },
  24: {
    overview: {
      vi: "Nồi cơm điện cao tần thông minh 1.8L, lòng nồi dày 5 lớp tỏa nhiệt đều hạt cơm chín dẻo thơm ngon.",
      en: "1.8L Smart Rice Cooker, IH induction heating, 5-layer thick inner pot for perfectly cooked rice."
    },
    specs: { dimensions: "28 x 26 x 24 cm", material: "Hợp kim phủ Ceramic chống dính & Nhựa", weight: "3.8kg", origin: "Nhật Bản", warranty: "12 tháng" }
  },
  25: {
    overview: {
      vi: "Máy hút bụi cầm tay lực hút mạnh mẽ 12000Pa, thiết kế không dây nhẹ nhàng dễ lau dọn ngóc ngách.",
      en: "Handheld Vacuum Cleaner with 12000Pa suction power, lightweight cordless design for easy cleaning."
    },
    specs: { dimensions: "115 x 22 x 15 cm", material: "Nhựa ABS", weight: "1.2kg", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  26: {
    overview: {
      vi: "Quạt điện tuần hoàn không khí tạo luồng gió đối lưu mát lạnh đều khắp phòng, tiết kiệm điện năng tối đa.",
      en: "Air Circulator Fan generating cool convective wind flow across the entire room, high energy efficiency."
    },
    specs: { dimensions: "35 x 30 x 25 cm", material: "Nhựa ABS cao cấp", weight: "2.3kg", origin: "Hàn Quốc", warranty: "12 tháng" }
  },
  27: {
    overview: {
      vi: "Bàn ủi hơi nước cầm tay làm nóng nhanh trong 30 giây, là phẳng quần áo nhanh chóng không gây cháy vải.",
      en: "Handheld Steam Iron heating in 30 seconds, quickly smoothing out fabric wrinkles without burning risk."
    },
    specs: { dimensions: "25 x 12 x 10 cm", material: "Nhựa chịu nhiệt & Mặt đế gốm Ceramic", weight: "850g", origin: "Trung Quốc", warranty: "12 tháng" }
  },
  28: {
    overview: {
      vi: "Bàn làm việc gỗ tự nhiên thiết kế tối giản sang trọng, khung chân sắt hộp chắc chắn chịu tải tốt.",
      en: "Minimalist Wooden Desk made of natural wood, strong steel frames supporting high load capacity."
    },
    specs: { dimensions: "120 x 60 x 75 cm", material: "Gỗ sồi tự nhiên & Khung thép sơn tĩnh điện", weight: "18kg", origin: "Việt Nam", warranty: "12 tháng" }
  },
  29: {
    overview: {
      vi: "Sổ tay công việc bìa da cao cấp sang trọng, chất liệu giấy chống lóa mắt giúp viết lách êm ái.",
      en: "Leather-bound Work Notebook, anti-glare high quality paper, providing a premium writing experience."
    },
    specs: { dimensions: "21 x 14.8 x 1.8 cm", material: "Da PU tự nhiên & Giấy chống lóa Nhật Bản", weight: "350g", origin: "Việt Nam", warranty: "Không bảo hành" }
  },
  30: {
    overview: {
      vi: "Máy in Laser WiFi in ấn không dây nhanh chóng từ điện thoại và máy tính, bản in rõ nét tiết kiệm mực.",
      en: "WiFi Laser Printer for fast wireless printing from phone and PC, sharp printing output, toner-saving."
    },
    specs: { dimensions: "35 x 28 x 20 cm", material: "Nhựa ABS chịu lực", weight: "5.2kg", origin: "Nhật Bản", warranty: "12 tháng" }
  },
  31: {
    overview: {
      vi: "Máy tính để bàn cấu hình mạnh mẽ phục vụ làm việc đồ họa chuyên nghiệp và giải trí đa tác vụ.",
      en: "12-core Desktop PC high performance computer for professional graphics work and multitasking."
    },
    specs: { dimensions: "42 x 38 x 18 cm", material: "Thép sơn tĩnh điện & Kính cường lực", weight: "8kg", origin: "Việt Nam", warranty: "36 tháng" }
  },
  32: {
    overview: {
      vi: "Tủ hồ sơ văn phòng bằng sắt 3 ngăn kéo có khóa liên hoàn bảo mật thông tin an toàn.",
      en: "3-drawer Office Filing Cabinet made of heavy-duty iron, central lock to protect documents securely."
    },
    specs: { dimensions: "105 x 46 x 62 cm", material: "Sắt sơn tĩnh điện chống gỉ", weight: "22kg", origin: "Việt Nam", warranty: "12 tháng" }
  },
  33: {
    overview: {
      vi: "Bộ PC văn phòng nhỏ gọn tối ưu không gian làm việc, hiệu năng văn phòng mượt mà tin cậy.",
      en: "Desktop PC compact setup optimizing work desk space, smooth and reliable office productivity."
    },
    specs: { dimensions: "38 x 35 x 15 cm", material: "Nhựa ABS & Thép", weight: "6.5kg", origin: "Trung Quốc", warranty: "24 tháng" }
  },
  34: {
    overview: {
      vi: "Máy chơi game cầm tay màn hình hiển thị sống động, tích hợp sẵn hàng ngàn trò chơi cổ điển.",
      en: "Gaming Console handheld device with vibrant display screen, pre-loaded with thousands of classic retro games."
    },
    specs: { dimensions: "15 x 8 x 2.2 cm", material: "Nhựa ABS chịu lực cao", weight: "280g", origin: "Trung Quốc", warranty: "12 tháng" },
    originalPrice: 1200000, salePrice: 790000
  },
  35: {
    overview: {
      vi: "Máy chơi game PlayStation 5 thế hệ mới hỗ trợ đồ họa 4K đỉnh cao, tốc độ phản hồi siêu tốc từ ổ SSD.",
      en: "PlayStation 5 next-gen console supporting stunning 4K gaming graphics, ultra-high speed SSD load times."
    },
    specs: { dimensions: "39 x 26 x 10.4 cm", material: "Nhựa cứng ABS & Kim loại", weight: "4.5kg", origin: "Nhật Bản", warranty: "12 tháng" },
    originalPrice: 15500000, salePrice: 12990000
  }
};
