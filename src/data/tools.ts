// src/data/tools.ts
// Danh sách category + tool theo yêu cầu của đại ca

export type CategoryId =
  | "image_pdf"
  | "text_data"
  | "qr_cccd"
  | "media"
  | "other";

export type Tool = {
  id: number;
  slug: string; // dùng cho router: /tool/:slug
  name: string;
  shortDesc: string;
  icon?: string; // emoji hoặc ký tự, dùng tạm cho thẻ nhỏ
  featured?: boolean;
  categoryId: CategoryId; // nhóm
  // componentPath: string; // đường dẫn component tool, dùng để lazy load
};

export const TOOLS: Tool[] = [
  // --- Công cụ xử lý hình ảnh & PDF ---
  {
    id: 101,
    slug: "PDFEditorTool",
    name: "PDF Editor",
    shortDesc: "Chỉnh sửa PDF và ảnh trực quan.",
    icon: "📝",
    featured: true,
    categoryId: "image_pdf",    
  },
  {
    id: 102,
    slug: "IMGtoPDF",
    name: "Chuyển đổi ảnh thành PDF",
    shortDesc: "Tạo PDF scan từ ảnh, batch upload.",
    icon: "📄",
    categoryId: "image_pdf",
    
  },
  {
    id: 103,
    slug: "ImgToBase64Tool",
    name: "Image to Base64",
    shortDesc: "Chuyển ảnh sang Base64, kéo thả hỗ trợ.",
    icon: "🔁",
    categoryId: "image_pdf",
    
  },
  {
    id: 104,
    slug: "ColorPaletteTool",
    name: "Tạo Bảng Màu Từ Ảnh",
    shortDesc: "Tạo bảng màu đẹp từ ảnh của bạn.",
    icon: "🎨",
    categoryId: "image_pdf",
    
  },
  {
    id: 105,
    slug: "CCCDPhotoResizer",
    name: "Resize ảnh CCCD/Hộ chiếu",
    shortDesc: "Tạo ảnh chuẩn từ ảnh chân dung.",
    icon: "🪪",
    categoryId: "image_pdf",
    
  },

  // --- Công cụ xử lý văn bản & dữ liệu ---
  {
    id: 201,
    slug: "OCRExtractTool",
    name: "Trích xuất văn bản từ ảnh",
    shortDesc: "OCR từ ảnh hoặc PDF, xuất ra TXT.",
    icon: "🔤",
    featured: true,
    categoryId: "text_data",
    
  },
  {
    id: 202,
    slug: "ExcelCleanerTool",
    name: "Dọn rác file Excel",
    shortDesc: "Làm sạch file Excel, tối ưu dung lượng.",
    icon: "🧹",
    categoryId: "text_data",
    
  },
  {
    id: 101, // số bất kỳ, chỉ cần unique
    slug: "UrlShortener",
    name: "URL Shortener",
    shortDesc: "Rút gọn link nhanh chóng, copy 1 chạm",
    icon: "🔗",
    categoryId: "other",
    featured: true,
    
  },
  {
    id: 204,
    slug: "MailTemplate",
    name: "Mail Template Builder",
    shortDesc: "Tạo email HTML chuyên nghiệp.",
    icon: "✉️",
    categoryId: "text_data",
    
  },

  // --- Công cụ QR Code & CCCD ---
  {
    id: 301,
    slug: "QRTool",
    name: "Tạo QR Đa Dụng",
    shortDesc: "QR cho link, Vcard, Wi‑Fi với tuỳ chỉnh.",
    icon: "🔲",
    featured: true,
    categoryId: "qr_cccd",
    
  },
  {
    id: 302,
    slug: "ReceiveQRTool",
    name: "Tạo QR nhận tiền",
    shortDesc: "QR chuyển khoản nhanh cho ngân hàng VN.",
    icon: "💳",
    categoryId: "qr_cccd",
    
  },

  // --- Công cụ đa phương tiện ---
  {
    id: 401,
    slug: "VideoExtractTool",
    name: "Tách Hình / Tiếng Từ Video",
    shortDesc: "Tách audio/video, xuất MP3 hoặc không âm thanh.",
    icon: "🎬",
    categoryId: "media",
    
  },

  // --- Tiện ích khác ---
  {
    id: 501,
    slug: "RandomSpiner",
    name: "Vòng Quay May Mắn",
    shortDesc: "Tạo vòng quay ngẫu nhiên từ danh sách.",
    icon: "🌀",
    featured: true,
    categoryId: "other",
    
  },
];
