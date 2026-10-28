import { Workflow } from './workflowTypes';

export const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-incident-response',
    title: 'Xử lý Sự cố Hệ thống Sản xuất (Production Outage)',
    category: 'Vận hành & Kỹ thuật',
    description:
      'Quy trình từng bước tiếp nhận, khoanh vùng nguyên nhân và điều phối hướng khắc phục tùy theo mức độ ảnh hưởng thực tế của sự cố.',
    updatedAt: '10 phút trước',
    rootStepId: 'step-triage',
    currentStepId: 'step-triage',
    steps: {
      'step-triage': {
        id: 'step-triage',
        code: 'BƯỚC 01',
        title: 'Tiếp nhận & Đánh giá Mức độ Sự cố',
        description:
          'Xác minh cảnh báo từ hệ thống giám sát, kiểm tra phạm vi ảnh hưởng và phân loại tình huống trước khi kích hoạt hướng xử lý.',
        ownerRole: 'Kỹ sư Trực ca (On-call SRE)',
        subtasks: [
          {
            id: 'st-triage-1',
            title: 'Kiểm tra bảng điều khiển giám sát APM và tỷ lệ lỗi HTTP 5xx',
            required: true,
            completed: true,
            note: 'Xác nhận ngưỡng lỗi vượt quá 5% trong 5 phút liên tiếp.',
          },
          {
            id: 'st-triage-2',
            title: 'Tạo kênh liên lạc khẩn cấp và ghi nhận thời điểm bắt đầu sự cố',
            required: true,
            completed: true,
            note: 'Lập phòng xử lý sự cố trên hệ thống nội bộ.',
          },
          {
            id: 'st-triage-3',
            title: 'Xác định nguyên nhân sơ bộ (Do bản cập nhật mới hay lỗi hạ tầng/Cơ sở dữ liệu)',
            required: true,
            completed: false,
            note: 'Bắt buộc hoàn thành để chọn đúng hướng giải quyết bên dưới.',
          },
          {
            id: 'st-triage-4',
            title: 'Gửi thông báo trạng thái ban đầu cho bộ phận Chăm sóc Khách hàng',
            required: false,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-rollback',
            label: 'Tình huống A: Lỗi phát sinh ngay sau khi vừa cập nhật phiên bản mới',
            conditionDescription:
              'Hệ thống bắt đầu báo lỗi trong vòng 30 phút sau khi triển khai bản phát hành mới.',
            targetStepId: 'step-rollback',
            actionGuidance:
              'Ưu tiên khôi phục phiên bản ổn định liền trước (Rollback) để dừng ảnh hưởng tới người dùng.',
          },
          {
            id: 'br-db-infra',
            label: 'Tình huống B: Quá tải Cơ sở dữ liệu hoặc Đứt gãy Kết nối Hạ tầng',
            conditionDescription:
              'Không có bản cập nhật mới; CPU Database chạm 100% hoặc kết nối mạng nội bộ chập chờn.',
            targetStepId: 'step-infra-mitigation',
            actionGuidance:
              'Kích hoạt kịch bản mở rộng tài nguyên khẩn cấp, ngắt các truy vấn treo và chuyển hướng lưu lượng.',
          },
          {
            id: 'br-false-alarm',
            label: 'Tình huống C: Cảnh báo giả hoặc Tự phục hồi thoáng qua',
            conditionDescription:
              'Lưu lượng và tỷ lệ phản hồi đã tự về mức bình thường, không có khách hàng bị ảnh hưởng.',
            targetStepId: 'step-postmortem',
            actionGuidance:
              'Bỏ qua bước can thiệp hạ tầng, chuyển thẳng sang bước tinh chỉnh ngưỡng cảnh báo và đóng hồ sơ.',
          },
        ],
        selectedBranchId: 'br-rollback',
      },
      'step-rollback': {
        id: 'step-rollback',
        code: 'BƯỚC 02A',
        title: 'Khôi phục Phiên bản Ổn định (Fast Rollback)',
        description:
          'Đưa toàn bộ cụm máy chủ ứng dụng về bản dựng ổn định trước đó và kiểm tra tính toàn vẹn của dữ liệu.',
        ownerRole: 'Trưởng nhóm Phát triển & DevOps',
        subtasks: [
          {
            id: 'st-rb-1',
            title: 'Kiểm tra tính tương thích ngược của Schema Database trước khi lùi bản dựng',
            required: true,
            completed: false,
            note: 'Tránh lỗi mất cột dữ liệu khi hạ cấp code.',
          },
          {
            id: 'st-rb-2',
            title: 'Thực thi lệnh Rollback trên cụm Production và theo dõi tiến trình hệ thống',
            required: true,
            completed: false,
          },
          {
            id: 'st-rb-3',
            title: 'Chạy bộ kiểm thử tự động Smoke Test xác nhận giao dịch thanh toán hoạt động lại',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-rb-success',
            label: 'Khôi phục thành công — Hệ thống ổn định trở lại',
            conditionDescription: 'Tỷ lệ lỗi 5xx giảm về dưới 0.05%, tốc độ phản hồi dưới 200ms.',
            targetStepId: 'step-postmortem',
            actionGuidance: 'Chuyển sang bước nghiệm thu và lập báo cáo phân tích nguyên nhân gốc rễ.',
          },
          {
            id: 'br-rb-fail',
            label: 'Khôi phục không hết lỗi — Nghi ngờ nghẽn tầng Cơ sở dữ liệu',
            conditionDescription: 'Đã lùi phiên bản phần mềm nhưng hệ thống vẫn treo hoặc quá tải.',
            targetStepId: 'step-infra-mitigation',
            actionGuidance: 'Chuyển hướng khẩn cấp sang quy trình xử lý nghẽn Cơ sở dữ liệu & Hạ tầng.',
          },
        ],
        selectedBranchId: 'br-rb-success',
      },
      'step-infra-mitigation': {
        id: 'step-infra-mitigation',
        code: 'BƯỚC 02B',
        title: 'Xử lý Nghẽn Hạ tầng & Cơ sở Dữ liệu',
        description:
          'Cô lập các tác vụ gây nghẽn, chuyển đổi dự phòng (Failover) sang cụm máy chủ phụ và giới hạn lưu lượng truy cập bất thường.',
        ownerRole: 'Kỹ sư Quản trị CSDL (DBA) & Hạ tầng',
        subtasks: [
          {
            id: 'st-inf-1',
            title: 'Liệt kê và ngắt các truy vấn SQL bị khóa (Deadlock / Long-running queries)',
            required: true,
            completed: false,
          },
          {
            id: 'st-inf-2',
            title: 'Kích hoạt Read-Replica hoặc chuyển đổi dự phòng sang node Database dự phòng',
            required: true,
            completed: false,
          },
          {
            id: 'st-inf-3',
            title: 'Bật giới hạn tần suất (Rate Limiting) tại cổng tải cân bằng (Load Balancer)',
            required: true,
            completed: false,
          },
          {
            id: 'st-inf-4',
            title: 'Xóa bộ nhớ đệm (Cache) bị hỏng trên cụm Redis nếu phát hiện xung đột khóa',
            required: false,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-inf-done',
            label: 'Hạ tầng đã giảm tải và phục hồi ổn định',
            conditionDescription: 'CPU Database giảm xuống dưới 50%, hàng đợi kết nối được giải phóng hoàn toàn.',
            targetStepId: 'step-postmortem',
            actionGuidance: 'Tiến hành nghiệm thu sau sự cố và lưu nhật ký kỹ thuật.',
          },
        ],
        selectedBranchId: 'br-inf-done',
      },
      'step-postmortem': {
        id: 'step-postmortem',
        code: 'BƯỚC 03',
        title: 'Nghiệm thu Phục hồi & Đóng Hồ sơ Sự cố',
        description:
          'Xác nhận toàn diện với các bên liên quan, cập nhật trang trạng thái dịch vụ và lên danh sách hành động phòng ngừa tái diễn.',
        ownerRole: 'Quản lý Vận hành Kỹ thuật',
        subtasks: [
          {
            id: 'st-pm-1',
            title: 'Đối soát dữ liệu giao dịch bị gián đoạn trong thời gian xảy ra sự cố',
            required: true,
            completed: false,
          },
          {
            id: 'st-pm-2',
            title: 'Gửi thông báo khôi phục hoàn tất cho Khách hàng và Ban Giám đốc',
            required: true,
            completed: false,
          },
          {
            id: 'st-pm-3',
            title: 'Lập biên bản Post-mortem và gán đầu việc khắc phục triệt để',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-pm-complete',
            label: 'Hoàn tất toàn bộ quy trình xử lý sự cố',
            conditionDescription: 'Tất cả bước kiểm tra an toàn và báo cáo đã hoàn thành.',
            targetStepId: null,
            actionGuidance: 'Đóng quy trình và lưu trữ vào kho tri thức vận hành.',
          },
        ],
        selectedBranchId: 'br-pm-complete',
      },
    },
  },
  {
    id: 'wf-customer-dispute',
    title: 'Giải quyết Khiếu nại & Yêu cầu Hoàn tiền Đơn hàng B2B',
    category: 'Chăm sóc Khách hàng & Pháp chế',
    description:
      'Quy trình kiểm tra hồ sơ đơn hàng, xác minh lỗi dịch vụ/sản phẩm và rẽ nhánh phương án đền bù hoặc thương lượng theo từng tình huống khách hàng.',
    updatedAt: '1 giờ trước',
    rootStepId: 'step-verify-claim',
    currentStepId: 'step-verify-claim',
    steps: {
      'step-verify-claim': {
        id: 'step-verify-claim',
        code: 'BƯỚC 01',
        title: 'Kiểm tra Hồ sơ & Xác thực Nguyên nhân Khiếu nại',
        description:
          'Thu thập chứng từ giao nhận, biên bản nghiệm thu và đối chiếu với cam kết chất lượng dịch vụ (SLA) trong hợp đồng.',
        ownerRole: 'Chuyên viên Xử lý Khiếu nại',
        subtasks: [
          {
            id: 'st-vc-1',
            title: 'Kiểm tra mã đơn hàng, hóa đơn VAT và lịch sử trao đổi với khách hàng',
            required: true,
            completed: true,
          },
          {
            id: 'st-vc-2',
            title: 'Xác minh bằng chứng lỗi (hình ảnh hàng hóa hư hỏng hoặc nhật ký gián đoạn dịch vụ)',
            required: true,
            completed: false,
          },
          {
            id: 'st-vc-3',
            title: 'Phân loại trách nhiệm: Lỗi do đơn vị cung cấp, do vận chuyển hay do khách hàng vận hành sai',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-company-fault',
            label: 'Tình huống 1: Lỗi thuộc về Sản phẩm / Dịch vụ của Công ty',
            conditionDescription:
              'Hàng giao sai quy cách hoặc dịch vụ vi phạm cam kết SLA đã ký kết.',
            targetStepId: 'step-refund-comp',
            actionGuidance:
              'Chuyển sang bước phê duyệt hoàn tiền nhanh hoặc đổi mới 1-1 kèm gói bù đắp.',
          },
          {
            id: 'br-user-misuse',
            label: 'Tình huống 2: Khách hàng cấu hình hoặc sử dụng chưa đúng hướng dẫn',
            conditionDescription:
              'Hệ thống và sản phẩm hoạt động đúng thiết kế nhưng khách hàng thao tác sai quy trình.',
            targetStepId: 'step-tech-onboarding',
            actionGuidance:
              'Không hoàn tiền; chuyển sang cử chuyên gia hướng dẫn trực tiếp 1-1 và hỗ trợ cấu hình lại.',
          },
        ],
        selectedBranchId: 'br-company-fault',
      },
      'step-refund-comp': {
        id: 'step-refund-comp',
        code: 'BƯỚC 02A',
        title: 'Phê duyệt Hoàn tiền & Đền bù SLA',
        description:
          'Trình hạn mức hoàn tiền cho Kế toán trưởng và phát hành phiếu tín dụng hoặc lệnh chuyển khoản hoàn trả.',
        ownerRole: 'Bộ phận Kế toán & Quản lý CSKH',
        subtasks: [
          {
            id: 'st-rf-1',
            title: 'Tính toán giá trị hoàn trả theo tỷ lệ SLA bị vi phạm trong hợp đồng',
            required: true,
            completed: false,
          },
          {
            id: 'st-rf-2',
            title: 'Lập biên bản thỏa thuận giải quyết khiếu nại có xác nhận của khách hàng',
            required: true,
            completed: false,
          },
          {
            id: 'st-rf-3',
            title: 'Thực hiện lệnh hoàn tiền hoặc xuất kho lô hàng thay thế',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-rf-close',
            label: 'Hoàn tất đền bù và đóng hồ sơ khiếu nại',
            conditionDescription: 'Khách hàng xác nhận đã nhận tiền hoàn/hàng thay thế.',
            targetStepId: null,
            actionGuidance: 'Cập nhật trạng thái hài lòng của khách hàng trên CRM.',
          },
        ],
        selectedBranchId: 'br-rf-close',
      },
      'step-tech-onboarding': {
        id: 'step-tech-onboarding',
        code: 'BƯỚC 02B',
        title: 'Hỗ trợ Kỹ thuật & Hướng dẫn Vận hành Lại',
        description:
          'Tổ chức buổi làm việc trực tuyến để hiệu chỉnh cấu hình giúp khách hàng khai thác đúng tính năng mà không cần hủy đơn.',
        ownerRole: 'Kỹ sư Giải pháp (Solutions Architect)',
        subtasks: [
          {
            id: 'st-to-1',
            title: 'Đặt lịch gọi video trực tiếp và kiểm tra cấu hình hiện tại của khách hàng',
            required: true,
            completed: false,
          },
          {
            id: 'st-to-2',
            title: 'Hiệu chỉnh thông số chuẩn và bàn giao tài liệu hướng dẫn ngắn gọn theo ca sử dụng',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-to-close',
            label: 'Khách hàng vận hành thành công và rút yêu cầu hoàn tiền',
            conditionDescription: 'Khách hàng xác nhận hệ thống chạy tốt sau buổi hướng dẫn.',
            targetStepId: null,
            actionGuidance: 'Ghi nhận biên bản nghiệm thu hỗ trợ kỹ thuật.',
          },
        ],
        selectedBranchId: 'br-to-close',
      },
    },
  },
  {
    id: 'wf-product-launch',
    title: 'Kiểm duyệt & Ra mắt Tính năng Phần mềm Mới',
    category: 'Quản lý Sản phẩm & QA',
    description:
      'Danh sách các bước kiểm thử bảo mật, hiệu năng và pháp lý trước khi phát hành, kèm phương án xử lý khi phát hiện lỗi chặn (Blocker) hoặc thay đổi phạm vi.',
    updatedAt: 'Hôm qua',
    rootStepId: 'step-qa-gate',
    currentStepId: 'step-qa-gate',
    steps: {
      'step-qa-gate': {
        id: 'step-qa-gate',
        code: 'BƯỚC 01',
        title: 'Kiểm thử Chất lượng & Bảo mật Trước Phát hành',
        description:
          'Đảm bảo toàn bộ các bài kiểm thử hồi quy, quét lỗ hổng bảo mật và kiểm tra tải đều vượt qua ngưỡng tiêu chuẩn.',
        ownerRole: 'Trưởng nhóm QA & Bảo mật',
        subtasks: [
          {
            id: 'st-qa-1',
            title: 'Hoàn tất 100% kịch bản kiểm thử tự động E2E trên môi trường Staging',
            required: true,
            completed: true,
          },
          {
            id: 'st-qa-2',
            title: 'Rà soát lỗ hổng bảo mật phân quyền API và rò rỉ dữ liệu nhạy cảm',
            required: true,
            completed: false,
          },
          {
            id: 'st-qa-3',
            title: 'Kiểm tra tốc độ tải trang trên thiết bị di động và màn hình Desktop',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-qa-pass',
            label: 'Tình huống Đạt chuẩn: Không có lỗi nghiêm trọng (Zero Blocker)',
            conditionDescription: 'Tất cả tiêu chí chất lượng và bảo mật đều đạt 100%.',
            targetStepId: 'step-full-rollout',
            actionGuidance: 'Tiến hành mở tính năng theo lộ trình phát hành tiêu chuẩn.',
          },
          {
            id: 'br-qa-partial',
            label: 'Tình huống Phát sinh Lỗi phụ: Chỉ bật thử nghiệm giới hạn (Feature Flag Beta)',
            conditionDescription:
              'Luồng chính hoạt động tốt nhưng còn một số trường hợp biên cần theo dõi thêm.',
            targetStepId: 'step-beta-rollout',
            actionGuidance:
              'Chuyển sang phát hành giới hạn cho 5% người dùng nội bộ/thân thiết và tắt với nhóm còn lại.',
          },
        ],
        selectedBranchId: 'br-qa-pass',
      },
      'step-full-rollout': {
        id: 'step-full-rollout',
        code: 'BƯỚC 02A',
        title: 'Phát hành Chính thức Toàn bộ Người dùng (100% Rollout)',
        description:
          'Kích hoạt tính năng cho toàn bộ khách hàng, công bố tài liệu hướng dẫn và theo dõi chỉ số chuyển đổi.',
        ownerRole: 'Quản lý Sản phẩm (Product Manager)',
        subtasks: [
          {
            id: 'st-fr-1',
            title: 'Bật công tắc Feature Flag lên 100% trên hệ thống cấu hình',
            required: true,
            completed: false,
          },
          {
            id: 'st-fr-2',
            title: 'Xuất bản thông báo cập nhật sản phẩm và hướng dẫn sử dụng',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-fr-end',
            label: 'Hoàn tất chiến dịch ra mắt sản phẩm',
            conditionDescription: 'Tính năng vận hành ổn định sau 24 giờ đầu tiên.',
            targetStepId: null,
            actionGuidance: 'Chuyển sang giai đoạn đo lường hiệu quả định kỳ.',
          },
        ],
        selectedBranchId: 'br-fr-end',
      },
      'step-beta-rollout': {
        id: 'step-beta-rollout',
        code: 'BƯỚC 02B',
        title: 'Phát hành Thử nghiệm Có Kiểm soát (Canary / 5% Beta)',
        description:
          'Giới hạn phạm vi mở tính năng cho nhóm khách hàng đăng ký thử nghiệm để thu thập nhật ký lỗi thực tế và vá lỗi trước khi mở rộng.',
        ownerRole: 'Kỹ sư Phát hành & Product Manager',
        subtasks: [
          {
            id: 'st-br-1',
            title: 'Cấu hình danh sách tài khoản Whitelist được phép truy cập tính năng mới',
            required: true,
            completed: false,
          },
          {
            id: 'st-br-2',
            title: 'Thiết lập cảnh báo tự động tắt tính năng (Kill-switch) nếu tỷ lệ lỗi vượt 1%',
            required: true,
            completed: false,
          },
          {
            id: 'st-br-3',
            title: 'Khắc phục dứt điểm các lỗi biên và chuyển lại qua bước Phát hành Chính thức',
            required: true,
            completed: false,
          },
        ],
        branches: [
          {
            id: 'br-beta-to-full',
            label: 'Đã vá xong lỗi biên — Chuyển sang Phát hành Chính thức 100%',
            conditionDescription: 'Nhóm Beta phản hồi tốt, lỗi biên đã được khắc phục.',
            targetStepId: 'step-full-rollout',
            actionGuidance: 'Nâng tỷ lệ phát hành từ 5% lên 100% người dùng.',
          },
        ],
        selectedBranchId: 'br-beta-to-full',
      },
    },
  },
];
