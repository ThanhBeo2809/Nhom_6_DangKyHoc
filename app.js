const API_BASE = '/api';

// Helper: Lấy Header xác thực bao gồm JWT Bearer Token
function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('pka_token');
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

// Helper: Hiển thị thông báo Toast UI hiện đại
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Helper: Định dạng hiển thị chi tiết Audit Log
function formatLogDetails(detailsStr) {
    if (!detailsStr) return '<span style="color:var(--text-secondary)">-</span>';
    try {
        const obj = JSON.parse(detailsStr);
        if (typeof obj === 'object' && obj !== null) {
            const parts = [];
            for (const [k, v] of Object.entries(obj)) {
                let valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                parts.push(`<span style="color:var(--text-secondary);">${k}:</span> <strong>${valStr}</strong>`);
            }
            return parts.join(' | ');
        }
    } catch (e) {
        // Không phải JSON, giữ nguyên
    }
    return detailsStr;
}


// State của Ứng dụng
let state = {
    user: null,       // { id, username, role }
    profile: null,    // Chi tiết học viên hoặc giảng viên
    currentTab: '',   // Tab hiện tại đang hiển thị
    data: {},         // Dữ liệu tạm thời fetch từ API
    activePayment: null // Hóa đơn đang chờ thanh toán
};

// Cấu hình thanh điều hướng theo phân vai (Sidebar Tabs)
const TABS_BY_ROLE = {
    student: [
        { id: 'student-dashboard', label: 'Tổng quan', icon: 'fa-chart-pie' },
        { id: 'student-register', label: 'Đăng ký tín chỉ', icon: 'fa-pen-to-square' },
        { id: 'student-schedule', label: 'Thời khóa biểu', icon: 'fa-calendar-days' },
        { id: 'student-tuition', label: 'Học phí & Lệ phí', icon: 'fa-credit-card' },
        { id: 'student-grades', label: 'Kết quả học tập', icon: 'fa-graduation-cap' }
    ],
    lecturer: [
        { id: 'lecturer-dashboard', label: 'Tổng quan & Hồ sơ', icon: 'fa-user-tie' },
        { id: 'lecturer-schedule', label: 'Thời khóa biểu dạy', icon: 'fa-calendar-days' },
        { id: 'lecturer-classes', label: 'Lớp giảng dạy', icon: 'fa-chalkboard-user' },
        { id: 'lecturer-phuckhao', label: 'Yêu cầu phúc khảo', icon: 'fa-file-shield' }
    ],
    pdt: [
        { id: 'pdt-stats', label: 'Thống kê chung', icon: 'fa-chart-simple' },
        { id: 'pdt-courses', label: 'Quản lý môn học', icon: 'fa-book' },
        { id: 'pdt-classes', label: 'Quản lý lớp học phần', icon: 'fa-clock-rotate-left' },
        { id: 'pdt-warnings', label: 'Cảnh báo học vụ', icon: 'fa-triangle-exclamation' },
        { id: 'pdt-logs', label: 'Nhật ký hệ thống', icon: 'fa-shield-halved' }
    ],
    admin: [
        { id: 'admin-students', label: 'Quản lý Sinh viên', icon: 'fa-user-graduate' },
        { id: 'admin-lecturers', label: 'Quản lý Giảng viên', icon: 'fa-chalkboard-user' },
        { id: 'admin-staff', label: 'Quản lý Cán bộ', icon: 'fa-users-gear' },
        { id: 'admin-logs', label: 'Nhật ký hệ thống', icon: 'fa-shield-halved' }
    ]
};