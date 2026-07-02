import {
  ArrowLeftRight,
  Wallet,
  Tags,
  PiggyBank,
  Repeat,
  Goal,
  HandCoins,
  BarChart3,
  FileSpreadsheet,
  Bell,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

// Single source of truth for the in-app guide. Both the `/help` page and the
// first-run welcome dialog read from here so the teaser can never drift from the
// full reference. Pure data + icon refs — no "use client"/"server-only", so it
// imports cleanly into a Server Component page and a client dialog alike.

export type HelpTip = {
  /** Optional bold lead-in label rendered inline before `text`. */
  term?: string;
  text: string;
};

export type HelpSection = {
  /** Stable anchor / test id, e.g. "transactions". */
  id: string;
  icon: LucideIcon;
  title: string;
  /** One line shown under the title. */
  summary: string;
  tips: HelpTip[];
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "transactions",
    icon: ArrowLeftRight,
    title: "Giao dịch & Nhập nhanh",
    summary: "Ghi lại thu, chi và chuyển khoản trong vài giây.",
    tips: [
      {
        term: "Nhập nhanh",
        text: "Chạm nút + để mở bảng nhập nhanh, chọn thu / chi / chuyển khoản.",
      },
      {
        term: "Gõ tắt số tiền",
        text: '"50k" → 50.000 ₫, "1.5tr" → 1.500.000 ₫, "2 tỷ" → 2.000.000.000 ₫.',
      },
      {
        term: "Bàn phím số",
        text: "Màn hình /add cho nhập số tiền lớn bằng bàn phím riêng.",
      },
      {
        term: "Xem & sửa",
        text: "Chạm một giao dịch để mở chi tiết, sửa hoặc xóa.",
      },
    ],
  },
  {
    id: "accounts",
    icon: Wallet,
    title: "Tài khoản",
    summary: "Quản lý tiền mặt, ngân hàng, thẻ tín dụng và ví điện tử.",
    tips: [
      { text: "Mỗi tài khoản có loại riêng: Tiền mặt, Ngân hàng, Thẻ tín dụng, Ví điện tử." },
      { term: "Sửa số dư", text: "Mở tài khoản để cập nhật số dư hiện tại khi cần." },
      { text: 'Tài khoản "Tiền mặt" được tạo sẵn cho bạn.' },
    ],
  },
  {
    id: "categories",
    icon: Tags,
    title: "Danh mục",
    summary: "Phân loại thu chi theo nhóm phù hợp thói quen Việt Nam.",
    tips: [
      { text: "Danh mục có cấp cha – con, được tạo sẵn theo nhóm thường dùng." },
      { term: "Quản lý", text: "Vào Cài đặt → Danh mục để thêm, sửa hoặc sắp xếp." },
    ],
  },
  {
    id: "budgets",
    icon: PiggyBank,
    title: "Ngân sách",
    summary: "Đặt hạn mức chi theo từng danh mục mỗi tháng.",
    tips: [
      { text: "Theo dõi tiến độ và cảnh báo khi vượt hạn mức." },
      { term: "Chuyển tiếp", text: "Bật rollover để dồn phần chưa dùng sang tháng sau." },
    ],
  },
  {
    id: "recurring",
    icon: Repeat,
    title: "Giao dịch định kỳ",
    summary: "Tự động lặp lại các khoản cố định.",
    tips: [
      { text: "Tạo quy tắc lặp theo ngày, tuần, tháng hoặc năm." },
      { term: "Sửa linh hoạt", text: "Chọn sửa một lần hoặc cả chuỗi giao dịch." },
    ],
  },
  {
    id: "goals",
    icon: Goal,
    title: "Mục tiêu tiết kiệm",
    summary: "Đặt mục tiêu và theo dõi tiến độ.",
    tips: [
      { text: "Mỗi mục tiêu có số tiền và ngày hoàn thành mong muốn." },
      { text: "Xem phần trăm tiến độ để biết còn cần bao nhiêu." },
    ],
  },
  {
    id: "debts",
    icon: HandCoins,
    title: "Nợ & Cho vay",
    summary: "Theo dõi khoản vay và cho vay.",
    tips: [
      { term: "Vòng đời", text: "Trạng thái đi từ Đang mở → Trả một phần → Đã tất toán." },
      { text: "Ghi lại từng lần trả để biết còn lại bao nhiêu." },
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    title: "Báo cáo",
    summary: "Nhìn lại dòng tiền, chi tiêu và tài sản ròng.",
    tips: [
      { term: "Dòng tiền", text: "Thu – chi theo thời gian tại /reports/cash-flow." },
      { term: "Chi tiêu", text: "Phân tích chi theo danh mục tại /reports/spending." },
      { term: "Tài sản ròng", text: "Tổng tài sản trừ nợ tại /reports/net-worth." },
    ],
  },
  {
    id: "export",
    icon: FileSpreadsheet,
    title: "Xuất dữ liệu",
    summary: "Tải dữ liệu của bạn ra file.",
    tips: [
      { text: "Vào Cài đặt → Dữ liệu để xuất giao dịch dạng CSV." },
      { text: "Mở file bằng Excel hoặc Google Sheets." },
    ],
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Nhắc nhở qua email",
    summary: "Nhận email nhắc các khoản định kỳ sắp đến hạn.",
    tips: [
      { text: "Email nhắc gia hạn được gửi hằng ngày khi có khoản đến hạn." },
      { text: "Thư gửi tới địa chỉ email của tài khoản bạn." },
    ],
  },
  {
    id: "pwa",
    icon: Smartphone,
    title: "Cài như ứng dụng",
    summary: "Thêm ứng dụng vào màn hình chính để mở nhanh.",
    tips: [
      { term: "Android", text: "Mở bằng Chrome và chọn lời nhắc cài đặt." },
      { term: "iOS", text: "Nhấn Chia sẻ → Thêm vào MH chính." },
    ],
  },
];

// The subset the first-run welcome dialog highlights. Kept beside HELP_SECTIONS
// so the teaser stays in sync with the page from one source; a unit test guards
// that every id here resolves to a real section.
export const WELCOME_TIP_IDS = ["transactions", "accounts", "reports"] as const;
