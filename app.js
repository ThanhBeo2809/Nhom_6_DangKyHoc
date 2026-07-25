/* ==========================================================================
   ĐĂNG KÝ HỌC - SPA CONTROLLER & API GLUE (VANILLA JAVASCRIPT)
   ========================================================================== */

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

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAutoLogin();
});

// Thiết lập sự kiện lắng nghe
function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Kiểm tra tự động đăng nhập từ localStorage
async function checkAutoLogin() {
  const savedToken = localStorage.getItem('pka_token');
  const savedUserId = localStorage.getItem('pka_user_id');
  if (savedToken || savedUserId) {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        state.user = data.user;
        state.profile = data.profile;
        showDashboard();
        return;
      }
    } catch (e) {
      console.error('Lỗi tự động đăng nhập:', e);
    }
  }
  showLogin();
}

// Xử lý nộp form đăng nhập thủ công
async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Lỗi đăng nhập.');
      return;
    }

    state.user = data.user;
    state.profile = data.profile;
    if (data.token) localStorage.setItem('pka_token', data.token);
    localStorage.setItem('pka_user_id', data.user.id);
    
    // Reset form
    usernameInput.value = '';
    passwordInput.value = '';

    showDashboard();
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối đến máy chủ backend.');
  }
}



// Xử lý Đăng xuất
function handleLogout() {
  localStorage.removeItem('pka_token');
  localStorage.removeItem('pka_user_id');
  state.user = null;
  state.profile = null;
  showLogin();
}

// Hiển thị màn hình Login
function showLogin() {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
}

// Khởi tạo Socket.IO client - nhận thông báo thanh toán tự động
let socket = null;
function initSocketIO() {
  if (typeof io === 'undefined') return;
  if (socket) socket.disconnect();

  socket = io();

  socket.on('connect', () => {
    console.log('🔌 Socket.IO kết nối thành công:', socket.id);
    // Nếu là sinh viên, đăng ký phòng riêng để nhận thông báo thanh toán
    if (state.user?.role === 'student' && state.profile?.id) {
      socket.emit('join_student_room', state.profile.id);
    }
  });

  // Lắng nghe sự kiện thanh toán được xác nhận tự động
  socket.on('payment_confirmed', (data) => {
    console.log('💳 Thanh toán xác nhận:', data);
    // Đóng modal QR
    closePaymentModal();
    // Hiển thị thông báo thành công nổi bật
    showToast('🎉 Thanh toán học phí đã được xác nhận! Mã GD: ' + data.transactionId, 'success');
    // Refresh lại tab học phí
    setTimeout(() => switchTab('student-tuition'), 500);
  });
}

// Hiển thị màn hình Dashboard
function showDashboard() {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');

  // Gán thông tin Header
  const nameDisp = document.getElementById('user-display-name');
  const roleDisp = document.getElementById('user-display-role');

  if (state.profile) {
    nameDisp.textContent = state.profile.name;
    roleDisp.textContent = `${state.user.role} (${state.profile.id})`;
  } else {
    nameDisp.textContent = state.user.username;
    roleDisp.textContent = state.user.role;
  }

  // Khởi tạo Socket.IO real-time
  initSocketIO();

  // Khởi dựng Sidebar
  renderSidebar();

  // Chọn tab đầu tiên tương ứng vai trò
  const defaultTab = TABS_BY_ROLE[state.user.role][0].id;
  switchTab(defaultTab);
}

// Vẽ danh sách menu trên Sidebar
function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  const tabs = TABS_BY_ROLE[state.user.role];
  tabs.forEach(tab => {
    const item = document.createElement('a');
    item.className = 'nav-item';
    item.id = `nav-${tab.id}`;
    item.innerHTML = `<i class="fa-solid ${tab.icon}"></i> <span>${tab.label}</span>`;
    item.addEventListener('click', () => switchTab(tab.id));
    nav.appendChild(item);
  });
}

// Chuyển đổi giữa các Trang con (Tabs)
async function switchTab(tabId) {
  // Thay đổi trạng thái active class trên menu
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add('active');

  state.currentTab = tabId;

  // Lấy thẻ hiển thị tiêu đề trang
  const pageTitle = document.getElementById('page-title');
  const activeTabObj = TABS_BY_ROLE[state.user.role].find(t => t.id === tabId);
  if (pageTitle && activeTabObj) {
    pageTitle.textContent = activeTabObj.label;
  }

  // Render nội dung tương ứng tab
  const contentArea = document.getElementById('page-view-content');
  contentArea.innerHTML = '<div class="text-center" style="padding: 50px;"><i class="fa-solid fa-spinner fa-spin fa-2xl text-gradient"></i><p style="margin-top:15px; color:var(--text-secondary)">Đang tải dữ liệu...</p></div>';

  try {
    await renderTabContent(tabId, contentArea);
  } catch (err) {
    console.error('Lỗi render tab:', err);
    contentArea.innerHTML = `<div class="glass-card text-center"><i class="fa-solid fa-triangle-exclamation fa-2xl" style="color:var(--color-danger)"></i><h3 style="margin-top:15px;">Lỗi tải dữ liệu</h3><p style="color:var(--text-secondary)">Không thể kết nối đến máy chủ API hoặc xảy ra lỗi logic.</p></div>`;
  }
}

// Xử lý gọi API và vẽ dữ liệu cho từng tab cụ thể
async function renderTabContent(tabId, container) {
  const headers = getAuthHeaders();

  // ==========================================
  // I. PORTAL SINH VIÊN
  // ==========================================

  if (tabId === 'student-dashboard') {
    // A. Lấy bảng điểm & Tiến độ học tập
    const gradesRes = await fetch(`${API_BASE}/student/grades`, { headers });
    const gradesData = await gradesRes.json();
    
    // B. Lấy học phí
    const tuitionRes = await fetch(`${API_BASE}/student/tuition`, { headers });
    const tuitionData = await tuitionRes.json();

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">Bảng điểm kết quả học tập</h3>
        <button class="btn-primary" onclick="exportStudentGradesExcel()"><i class="fa-solid fa-file-excel"></i> Xuất Excel Bảng Điểm</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${gradesData.cpa || '0.00'}</span>
            <span class="stat-label">Điểm tích lũy CPA</span>
          </div>
          <i class="fa-solid fa-chart-line stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${gradesData.creditsCompleted || 0} / ${gradesData.totalRequiredCredits}</span>
            <span class="stat-label">Tín chỉ tích lũy</span>
          </div>
          <i class="fa-solid fa-check-double stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient" style="font-size:1.5rem; margin-top:10px;">
              ${tuitionData.status === 'paid' ? '<span class="badge badge-success">Đã hoàn thành</span>' : `<span class="badge badge-danger">${formatMoney(tuitionData.finalAmount)}</span>`}
            </span>
            <span class="stat-label" style="margin-top:10px;">Học phí kỳ học</span>
          </div>
          <i class="fa-solid fa-receipt stat-icon"></i>
        </div>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Tiến độ hoàn thành chương trình đào tạo <i class="fa-solid fa-circle-nodes"></i></h3>
        <p style="color:var(--text-secondary); margin-bottom: 5px;">Bạn đã hoàn thành <strong>${gradesData.creditsCompleted}</strong> trên tổng số <strong>${gradesData.totalRequiredCredits}</strong> tín chỉ yêu cầu tốt nghiệp.</p>
        <div class="progress-bar-container">
          <div class="progress-fill" style="width: ${gradesData.progressPercent}%"></div>
        </div>
        <p style="text-align:right; font-size:0.85rem; margin-top:5px; font-weight:600;">${gradesData.progressPercent}%</p>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Hồ sơ cá nhân sinh viên <i class="fa-solid fa-address-card"></i></h3>
        <div class="form-row" style="margin-top:15px;">
          <div>
            <p style="margin-bottom:10px;"><strong>Họ và tên:</strong> ${state.profile.name}</p>
            <p style="margin-bottom:10px;"><strong>Mã sinh viên (MSV):</strong> ${state.profile.id}</p>
            <p style="margin-bottom:10px;"><strong>Ngày sinh:</strong> ${formatDate(state.profile.dob)}</p>
            <p style="margin-bottom:10px;"><strong>Giới tính:</strong> ${state.profile.gender}</p>
            <p style="margin-bottom:10px;">
              <strong>Email liên hệ:</strong> ${state.profile.email || 'Chưa cập nhật'}
              <button class="btn-sm btn-secondary" style="margin-left:10px; padding:2px 8px;" onclick="openEditStudentEmailModal('${(state.profile.email || '').replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-pen-to-square"></i> Sửa
              </button>
            </p>
          </div>
          <div>
            <p style="margin-bottom:10px;"><strong>Lớp sinh hoạt:</strong> ${state.profile.class}</p>
            <p style="margin-bottom:10px;"><strong>Năm học:</strong> <span class="badge badge-info">${state.profile.academicProgress ? state.profile.academicProgress.yearText : 'Năm thứ 4'}</span></p>
            <p style="margin-bottom:10px;"><strong>Học kỳ hiện tại:</strong> <strong style="color:var(--primary);">${state.profile.academicProgress ? state.profile.academicProgress.semesterText : 'Học kỳ 7 (HK1-2025)'}</strong></p>
            <p style="margin-bottom:10px;"><strong>Khoa:</strong> ${state.profile.Major.Department.name}</p>
            <p style="margin-bottom:10px;"><strong>Ngành học:</strong> ${state.profile.Major.name}</p>
            <p style="margin-bottom:10px;"><strong>Trạng thái học vụ:</strong> 
              ${studentStatusBadge(state.profile.status)}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  else if (tabId === 'student-register') {
    // Đăng ký tín chỉ
    await renderStudentRegisterTab(container, window.currentCourseScope || 'my_major');
  }

  else if (tabId === 'student-schedule') {
    // Thời khóa biểu mẫu mới (Lịch cá nhân & Mini Calendar)
    await renderStudentScheduleTab(container);
  }

  else if (tabId === 'student-tuition') {
    // Học phí
    const res = await fetch(`${API_BASE}/student/tuition`, { headers });
    const payment = await res.json();

    let paymentAction = '';
    if (payment.finalAmount > 0 && payment.status === 'unpaid') {
      paymentAction = `<button class="btn-primary" onclick="openPaymentModal(${payment.id}, ${payment.finalAmount})"><i class="fa-solid fa-qrcode"></i> Thanh toán bằng mã QR động</button>`;
    } else if (payment.status === 'paid') {
      paymentAction = `<span class="badge badge-success" style="font-size:1rem; padding: 10px 20px;"><i class="fa-solid fa-circle-check"></i> Đã hoàn thành học phí</span>`;
    } else {
      paymentAction = `<span class="badge badge-success" style="font-size:1rem; padding: 10px 20px;"><i class="fa-solid fa-circle-check"></i> Miễn học phí kỳ học</span>`;
    }

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Hóa đơn học phí kỳ học HK1-2025 <i class="fa-solid fa-receipt"></i></h3>
        <div class="payment-info-box" style="margin-top:20px;">
          <p><strong>Mã hóa đơn:</strong> PKA-BILL-${payment.id || 'N/A'}</p>
          <p><strong>Tổng số tiền gốc:</strong> ${formatMoney(payment.amount || 0)}</p>
          <p><strong>Miễn giảm chính sách / học bổng:</strong> ${payment.discountRate * 100}%</p>
          <p><strong>Số tiền thực trả:</strong> <span class="text-gradient" style="font-size:1.25rem;">${formatMoney(payment.finalAmount || 0)}</span></p>
          <p><strong>Hạn thanh toán:</strong> <span style="color:var(--color-danger); font-weight:600;">${formatDate(payment.deadline)}</span></p>
          <p><strong>Trạng thái đóng:</strong> 
            ${payment.status === 'paid' ? '<span class="badge badge-success">Đã nộp</span>' : '<span class="badge badge-danger">Chưa nộp</span>'}
          </p>
          ${payment.transactionId ? `<p><strong>Mã giao dịch đối soát:</strong> <code>${payment.transactionId}</code></p>` : ''}
          ${payment.paidAt ? `<p><strong>Ngày nộp:</strong> ${formatDate(payment.paidAt)}</p>` : ''}
        </div>
        <div class="text-center" style="margin-top:20px; display:flex; justify-content:center; gap:10px;">
          ${paymentAction}
          <button class="btn-secondary" onclick="exportTuitionReceiptPDF()"><i class="fa-solid fa-print"></i> In / Xuất PDF Biên Lai</button>
        </div>
      </div>
    `;
  }

  else if (tabId === 'student-grades') {
    // Bảng điểm kết quả học tập
    const res = await fetch(`${API_BASE}/student/grades`, { headers });
    const data = await res.json();

    let gradeRows = '';
    if (data && Array.isArray(data.gradesDetail)) {
      data.gradesDetail.forEach(g => {
        let termStr = 'HK1-2025';
        if (g.classId) {
          if (g.classId.includes('HK1-N1')) termStr = 'HK1 (Năm 1)';
          else if (g.classId.includes('HK2-N1')) termStr = 'HK2 (Năm 1)';
          else if (g.classId.includes('_PAST')) termStr = 'Kỳ trước';
        } else {
          termStr = 'Năm 1';
        }
        
        let phucKhaoBtn = '';
        if (g.reEvalStatus === 'none' && g.isLocked) {
          phucKhaoBtn = `<button class="btn-sm btn-secondary" onclick="requestPhucKhao(${g.id})"><i class="fa-regular fa-paper-plane"></i> Phúc khảo</button>`;
        } else if (g.reEvalStatus === 'requested') {
          phucKhaoBtn = `<span class="badge badge-warning"><i class="fa-solid fa-spinner fa-spin"></i> Đang chờ phúc khảo</span>`;
        } else if (g.reEvalStatus === 'completed') {
          phucKhaoBtn = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã phúc khảo</span>`;
        }

        const courseName = g.Course ? g.Course.name : (g.courseId || '-');
        const credits = g.Course ? g.Course.credits : '-';

        gradeRows += `
          <tr>
            <td><strong>${g.courseId}</strong></td>
            <td>${courseName}</td>
            <td>${credits}</td>
            <td>${termStr}</td>
            <td>${g.attendanceGrade !== null ? g.attendanceGrade : '-'}</td>
            <td>${g.midtermGrade !== null ? g.midtermGrade : '-'}</td>
            <td>${g.finalGrade !== null ? g.finalGrade : '-'}</td>
            <td><strong>${g.total10 !== null ? g.total10 : '-'}</strong></td>
            <td><span class="badge ${g.letterGrade === 'F' ? 'badge-danger' : 'badge-success'}">${g.letterGrade || '-'}</span></td>
            <td>${g.grade4 !== null ? g.grade4 : '-'}</td>
            <td>${phucKhaoBtn}</td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${data.cpa || '0.00'}</span>
            <span class="stat-label">CPA Tích lũy</span>
          </div>
          <i class="fa-solid fa-trophy stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${data.creditsCompleted || 0}</span>
            <span class="stat-label">Tín chỉ đã hoàn thành</span>
          </div>
          <i class="fa-solid fa-book-open stat-icon"></i>
        </div>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Bảng điểm chi tiết các học kỳ <i class="fa-solid fa-file-invoice"></i></h3>
        <p style="color:var(--text-secondary); margin-bottom:15px;">Ghi chú: Thang điểm được cấu hình theo quy chế: Chuyên cần (10%) + Giữa kỳ (30%) + Cuối kỳ (60%). Quy đổi tự động sang hệ chữ và hệ 4.</p>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Môn</th>
                <th>Tên Môn Học</th>
                <th>Tín Chỉ</th>
                <th>Học Kỳ</th>
                <th>Chuyên Cần</th>
                <th>Giữa Kỳ</th>
                <th>Cuối Kỳ</th>
                <th>Tổng Hệ 10</th>
                <th>Điểm Chữ</th>
                <th>Hệ 4</th>
                <th>Phúc Khảo</th>
              </tr>
            </thead>
            <tbody>
              ${gradeRows || '<tr><td colspan="11" class="text-center" style="color:var(--text-secondary)">Chưa có dữ liệu điểm học phần.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // II. PORTAL GIẢNG VIÊN
  // ==========================================

  else if (tabId === 'lecturer-dashboard') {
    const profRes = await fetch(`${API_BASE}/lecturer/profile`, { headers });
    const profile = await profRes.json();

    const classesRes = await fetch(`${API_BASE}/lecturer/classes`, { headers });
    const classes = await classesRes.json();

    const pkRes = await fetch(`${API_BASE}/lecturer/phuc-khao`, { headers });
    const phucKhaos = await pkRes.json();

    const classCount = Array.isArray(classes) ? classes.length : 0;
    const pkCount = Array.isArray(phucKhaos) ? phucKhaos.length : 0;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${classCount}</span>
            <span class="stat-label">Lớp Phụ Trách Kỳ Này</span>
          </div>
          <i class="fa-solid fa-chalkboard-user stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${pkCount}</span>
            <span class="stat-label">Đơn Phúc Khảo Chờ Xử Lý</span>
          </div>
          <i class="fa-solid fa-file-shield stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient" style="font-size:1.2rem; margin-top:8px;">${profile.Department ? profile.Department.name : 'Khoa Công nghệ thông tin'}</span>
            <span class="stat-label" style="margin-top:8px;">Khoa Trực Thuộc</span>
          </div>
          <i class="fa-solid fa-building-columns stat-icon"></i>
        </div>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Hồ sơ cá nhân Giảng viên <i class="fa-solid fa-address-card"></i></h3>
        <div class="form-row" style="margin-top:15px;">
          <div>
            <p style="margin-bottom:10px;"><strong>Họ và tên:</strong> ${profile.name || state.user.username}</p>
            <p style="margin-bottom:10px;"><strong>Mã giảng viên (MGV):</strong> ${profile.id || state.user.id}</p>
            <p style="margin-bottom:10px;"><strong>Giới tính:</strong> ${profile.gender || 'Nam'}</p>
            <p style="margin-bottom:10px;"><strong>Ngày sinh:</strong> ${formatDate(profile.dob)}</p>
            <p style="margin-bottom:10px;"><strong>Ngày công tác:</strong> ${formatDate(profile.startDate)}</p>
          </div>
          <div>
            <p style="margin-bottom:10px;"><strong>Khoa công tác:</strong> ${profile.Department ? profile.Department.name : 'Chưa cập nhật'}</p>
            <p style="margin-bottom:10px;"><strong>Chức danh / Chức vụ:</strong> ${profile.position || 'Giảng viên cơ hữu'}</p>
            <p style="margin-bottom:10px;"><strong>Môn giảng dạy chính:</strong> ${profile.mainSubject || 'Công nghệ thông tin'}</p>
            <p style="margin-bottom:10px;"><strong>Tài khoản hệ thống:</strong> ${state.user.username}</p>
          </div>
        </div>
      </div>
    `;
  }

  else if (tabId === 'lecturer-schedule') {
    const res = await fetch(`${API_BASE}/lecturer/schedule`, { headers });
    const schedules = await res.json();

    const days = [2, 3, 4, 5, 6, 7];
    const shifts = ['morning', 'afternoon'];

    let gridHTML = `
      <div class="glass-card">
        <h3 class="card-title">Thời khóa biểu lịch giảng dạy trong tuần - HK1-2025 <i class="fa-solid fa-calendar-days"></i></h3>
        <div class="schedule-grid" style="margin-top:20px;">
          <div class="grid-header">Ca Học</div>
          <div class="grid-header">Thứ 2</div>
          <div class="grid-header">Thứ 3</div>
          <div class="grid-header">Thứ 4</div>
          <div class="grid-header">Thứ 5</div>
          <div class="grid-header">Thứ 6</div>
          <div class="grid-header">Thứ 7</div>
    `;

    shifts.forEach(shift => {
      const shiftName = shift === 'morning' ? 'Sáng<br><small>(6:45 - 12:10)</small>' : 'Chiều<br><small>(13:00 - 18:25)</small>';
      gridHTML += `<div class="grid-cell time-column">${shiftName}</div>`;

      days.forEach(day => {
        const matchedClasses = schedules.filter(c => c.dayOfWeek === day && c.shift === shift);
        
        gridHTML += `<div class="grid-cell">`;
        matchedClasses.forEach(c => {
          gridHTML += `
            <div class="schedule-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%); border-color: rgba(16, 185, 129, 0.4);">
              <div class="schedule-title">${c.courseName} (${c.classId})</div>
              <div class="schedule-details">
                <i class="fa-solid fa-location-dot"></i> Phòng: ${c.roomName} (${c.roomType === 'lab' ? 'Lab máy' : 'Lý thuyết'})<br>
                <i class="fa-solid fa-users"></i> Sĩ số: ${c.enrolledCount}/${c.capacity}<br>
                <i class="fa-solid fa-clock"></i> Tiết: ${c.startSlot}-${c.startSlot + c.numSlots - 1}
              </div>
            </div>
          `;
        });
        gridHTML += `</div>`;
      });
    });

    gridHTML += `
        </div>
      </div>

      <div class="glass-card" style="margin-top:25px;">
        <h3 class="card-title">Chi tiết lịch giảng dạy học kỳ <i class="fa-solid fa-list"></i></h3>
        <div class="table-responsive" style="margin-top:15px;">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Lớp HP</th>
                <th>Tên Môn Học</th>
                <th>Số TC</th>
                <th>Phòng Học</th>
                <th>Thứ & Ca Học</th>
                <th>Tiết Học</th>
                <th>Sĩ Số Lớp</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.map(c => `
                <tr>
                  <td><strong>${c.classId}</strong></td>
                  <td>${c.courseName}</td>
                  <td>${c.credits} TC</td>
                  <td>${c.roomName} (${c.roomType === 'lab' ? 'Thực hành' : 'Lý thuyết'})</td>
                  <td>Thứ ${c.dayOfWeek} (${c.shift === 'morning' ? 'Ca Sáng' : 'Ca Chiều'})</td>
                  <td>Tiết ${c.startSlot} - ${c.startSlot + c.numSlots - 1}</td>
                  <td>${c.enrolledCount} / ${c.capacity}</td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="text-center">Chưa có lịch dạy trong kỳ.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = gridHTML;
  }

  else if (tabId === 'lecturer-classes') {
    // Danh sách lớp giảng dạy
    const res = await fetch(`${API_BASE}/lecturer/classes`, { headers });
    const classes = await res.json();

    let classRows = '';
    classes.forEach(c => {
      classRows += `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.Course.name}</td>
          <td>${c.Course.credits} TC</td>
          <td>${c.roomName}</td>
          <td>Thứ ${c.dayOfWeek} (Ca ${c.shift === 'morning' ? 'Sáng' : 'Chiều'})</td>
          <td>
            <button class="btn-sm btn-primary" onclick="openClassGrading('${c.id}')"><i class="fa-solid fa-user-pen"></i> Vào điểm</button>
            <button class="btn-sm btn-secondary" onclick="lockClassGrades('${c.id}')"><i class="fa-solid fa-lock"></i> Khóa điểm</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Danh sách lớp được phân công giảng dạy - HK1-2025 <i class="fa-solid fa-chalkboard-user"></i></h3>
        <div class="table-responsive" style="margin-top:20px;">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Lớp HP</th>
                <th>Môn Giảng Dạy</th>
                <th>Số Tín Chỉ</th>
                <th>Phòng Học</th>
                <th>Lịch Giảng Dạy</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${classRows || '<tr><td colspan="6" class="text-center" style="color:var(--text-secondary)">Bạn chưa được xếp lớp giảng dạy kỳ này.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div id="class-grading-section" class="hidden"></div>
    `;
  }

  else if (tabId === 'lecturer-phuckhao') {
    // Đơn phúc khảo
    const res = await fetch(`${API_BASE}/lecturer/phuc-khao`, { headers });
    const requests = await res.json();

    let requestRows = '';
    requests.forEach(r => {
      requestRows += `
        <tr>
          <td><strong>${r.studentId}</strong></td>
          <td>${r.Student.name}</td>
          <td>${r.Course.name}</td>
          <td>${r.attendanceGrade} - ${r.midtermGrade} - ${r.finalGrade} (Tổng: ${r.total10})</td>
          <td><span style="font-style:italic; color:var(--text-secondary)">"${r.reEvalNote || 'Không ghi lý do'}"</span></td>
          <td>
            <button class="btn-sm btn-primary" onclick="resolvePhucKhaoPrompt(${r.id}, ${r.attendanceGrade}, ${r.midtermGrade}, ${r.finalGrade})">
              <i class="fa-solid fa-marker"></i> Chấm lại điểm
            </button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Danh sách đơn phúc khảo điểm số của Sinh viên <i class="fa-solid fa-file-shield"></i></h3>
        <div class="table-responsive" style="margin-top:20px;">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Sinh Viên</th>
                <th>Họ Tên</th>
                <th>Môn Học</th>
                <th>Điểm Cũ (CC-GK-CK)</th>
                <th>Lý do phúc khảo</th>
                <th>Quyết định</th>
              </tr>
            </thead>
            <tbody>
              ${requestRows || '<tr><td colspan="6" class="text-center" style="color:var(--text-secondary)">Chưa có yêu cầu phúc khảo nào gửi lên.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // III. PORTAL PHÒNG ĐÀO TẠO
  // ==========================================

  else if (tabId === 'pdt-stats') {
    const res = await fetch(`${API_BASE}/pdt/stats`, { headers });
    const stats = await res.json();

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${stats.studentCount}</span>
            <span class="stat-label">Tổng Sinh Viên</span>
          </div>
          <i class="fa-solid fa-user-graduate stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${stats.lecturerCount}</span>
            <span class="stat-label">Tổng Giảng Viên</span>
          </div>
          <i class="fa-solid fa-chalkboard-user stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${stats.classCount}</span>
            <span class="stat-label">Lớp HP Đang Mở</span>
          </div>
          <i class="fa-solid fa-chalkboard stat-icon"></i>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value text-gradient">${stats.courseCount}</span>
            <span class="stat-label">Học Phần Đào Tạo</span>
          </div>
          <i class="fa-solid fa-folder-open stat-icon"></i>
        </div>
      </div>

      <div class="glass-card text-center" style="padding: 40px 20px;">
        <i class="fa-solid fa-circle-check fa-3x" style="color:var(--color-success); margin-bottom: 20px;"></i>
        <h2>Hệ thống Vận hành Trơn tru</h2>
        <p style="color:var(--text-secondary); max-width: 600px; margin: 10px auto 0;">
          Phòng Đào Tạo có thể thêm học phần mới, phân lịch giảng dạy, kiểm tra sĩ số, hủy các lớp học phần không đủ điều kiện và theo dõi lịch sử chỉnh sửa hệ thống.
        </p>
      </div>
    `;
  }

  else if (tabId === 'pdt-courses') {
    const res = await fetch(`${API_BASE}/pdt/courses`, { headers });
    const courses = await res.json();

    let courseRows = '';
    courses.forEach(c => {
      courseRows += `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.name}</td>
          <td>${c.credits} TC</td>
          <td>${c.prerequisiteId ? `<code>${c.prerequisiteId}</code> (${c.Prerequisite ? c.Prerequisite.name : ''})` : '<span style="color:var(--text-secondary)">Không có</span>'}</td>
          <td>${c.majorId ? `<code>${c.majorId.toUpperCase()}</code>` : '<span class="badge badge-info">Đại cương / Chung</span>'}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Thêm môn học mới <i class="fa-solid fa-plus"></i></h3>
        <form id="create-course-form" onsubmit="createCourse(event)">
          <div class="form-row">
            <div class="input-group">
              <label for="course-id">Mã môn học</label>
              <input type="text" id="course-id" placeholder="ví dụ: INT204" required>
            </div>
            <div class="input-group">
              <label for="course-name">Tên môn học</label>
              <input type="text" id="course-name" placeholder="ví dụ: Kiến trúc phần mềm" required>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="course-credits">Số tín chỉ</label>
              <input type="number" id="course-credits" value="3" min="1" max="10" required>
            </div>
            <div class="input-group">
              <label for="course-prereq">Môn tiên quyết (Mã môn, để trống nếu không có)</label>
              <input type="text" id="course-prereq" placeholder="ví dụ: INT103">
            </div>
          </div>
          <button type="submit" class="btn-primary" style="max-width:200px;"><i class="fa-solid fa-floppy-disk"></i> Lưu môn học</button>
        </form>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Danh mục môn học trong chương trình đào tạo <i class="fa-solid fa-list"></i></h3>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Môn</th>
                <th>Tên Môn Học</th>
                <th>Số Tín Chỉ</th>
                <th>Môn Tiên Quyết</th>
                <th>Khối Kiến Thức</th>
              </tr>
            </thead>
            <tbody>
              ${courseRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (tabId === 'pdt-classes') {
    const res = await fetch(`${API_BASE}/pdt/classes`, { headers });
    const classes = await res.json();

    let classRows = '';
    classes.forEach(c => {
      let actionBtn = '';
      if (c.status === 'active') {
        actionBtn = `<button class="btn-sm btn-danger" onclick="cancelClassByPDT('${c.id}')"><i class="fa-solid fa-triangle-exclamation"></i> Hủy lớp (Sĩ số < 15)</button>`;
      } else {
        actionBtn = `<span class="badge badge-danger">Đã bị hủy</span>`;
      }

      classRows += `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.Course.name} (${c.courseId})</td>
          <td>${c.Lecturer.name}</td>
          <td>${c.roomName} (${c.roomType === 'lab' ? 'Lab máy tính' : 'Lý thuyết'})</td>
          <td>Thứ ${c.dayOfWeek} (Ca ${c.shift === 'morning' ? 'Sáng' : 'Chiều'})<br><small>Tiết ${c.startSlot}-${c.startSlot + c.numSlots - 1}</small></td>
          <td>${c.capacity} sinh viên</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Xếp lịch lớp học phần mới <i class="fa-solid fa-calendar-plus"></i></h3>
        <p style="color:var(--text-secondary); margin-bottom:15px;">Hệ thống tự động thực hiện **Conflict Checking** trùng phòng học và trùng thời gian của giảng viên.</p>
        <form id="create-class-form" onsubmit="createClass(event)">
          <div class="form-row">
            <div class="input-group">
              <label for="class-id">Mã lớp học phần</label>
              <input type="text" id="class-id" placeholder="ví dụ: INT105_L02" required>
            </div>
            <div class="input-group">
              <label for="class-course-id">Mã môn học</label>
              <input type="text" id="class-course-id" placeholder="ví dụ: INT105" required>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="class-lecturer-id">Mã giảng viên</label>
              <input type="text" id="class-lecturer-id" placeholder="ví dụ: GV001" required>
            </div>
            <div class="input-group">
              <label for="class-room">Phòng học</label>
              <input type="text" id="class-room" placeholder="ví dụ: Lab201" required>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="class-room-type">Loại phòng</label>
              <select id="class-room-type">
                <option value="theory">Phòng lý thuyết</option>
                <option value="lab">Phòng thực hành (máy tính)</option>
              </select>
            </div>
            <div class="input-group">
              <label for="class-capacity">Sức chứa tối đa</label>
              <input type="number" id="class-capacity" value="40" min="10" max="100" required>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="class-day">Ngày học trong tuần</label>
              <select id="class-day">
                <option value="2">Thứ 2</option>
                <option value="3">Thứ 3</option>
                <option value="4">Thứ 4</option>
                <option value="5">Thứ 5</option>
                <option value="6">Thứ 6</option>
                <option value="7">Thứ 7</option>
              </select>
            </div>
            <div class="input-group">
              <label for="class-shift">Ca học</label>
              <select id="class-shift">
                <option value="morning">Ca Sáng (6:45 - 12:10)</option>
                <option value="afternoon">Ca Chiều (13:00 - 18:25)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="class-start-slot">Tiết bắt đầu</label>
              <input type="number" id="class-start-slot" value="1" min="1" max="6" required>
            </div>
            <div class="input-group">
              <label for="class-num-slots">Số tiết học</label>
              <input type="number" id="class-num-slots" value="3" min="1" max="6" required>
            </div>
          </div>
          <button type="submit" class="btn-primary" style="max-width:200px;"><i class="fa-solid fa-floppy-disk"></i> Tạo lịch lớp học</button>
        </form>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Danh sách lớp học phần đang mở <i class="fa-solid fa-list-check"></i></h3>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Lớp HP</th>
                <th>Môn Học</th>
                <th>Giảng Viên</th>
                <th>Phòng Học</th>
                <th>Thời Gian</th>
                <th>Sức Chứa</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${classRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (tabId === 'pdt-warnings') {
    const res = await fetch(`${API_BASE}/pdt/academic-warnings`, { headers });
    const warnings = await res.json();

    let warningRows = '';
    warnings.forEach(w => {
      warningRows += `
        <tr>
          <td><strong>${w.student.id}</strong></td>
          <td>${w.student.name}</td>
          <td>${w.student.class}</td>
          <td><span style="color:var(--color-danger); font-weight:600;">${w.gpa}</span></td>
          <td><span style="color:var(--color-danger); font-weight:600;">${w.cpa}</span></td>
          <td>
            ${studentStatusBadge(w.student.status)}
          </td>
          <td>
            <button class="btn-sm btn-secondary" onclick="updateStudentWarning('${w.student.id}', 'warning_1')">Cảnh báo Mức 1</button>
            <button class="btn-sm btn-warning" onclick="updateStudentWarning('${w.student.id}', 'warning_2')">Cảnh báo Mức 2</button>
            <button class="btn-sm btn-danger" onclick="updateStudentWarning('${w.student.id}', 'dismissed')">Buộc thôi học</button>
            <button class="btn-sm btn-secondary" style="background:#10b981; border-color:#10b981; color:#fff" onclick="updateStudentWarning('${w.student.id}', 'active')">Bình thường</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Quét danh sách cảnh báo học vụ tự động <i class="fa-solid fa-triangle-exclamation"></i></h3>
        <p style="color:var(--text-secondary); margin-bottom: 20px;">
          Quy chế cảnh báo: Sinh viên tự động bị lọc vào danh sách nếu điểm trung bình học kỳ GPA < 1.0 HOẶC điểm trung bình tích lũy CPA < 1.5. Sinh viên bị cảnh báo sẽ bị giới hạn số tín chỉ đăng ký học kỳ sau tối đa là 12 tín chỉ.
        </p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h4 style="margin:0;">Danh sách chi tiết</h4>
          <button class="btn-primary" onclick="exportAcademicWarningsExcel()"><i class="fa-solid fa-file-excel"></i> Xuất Excel Danh Sách</button>
        </div>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Mã Sinh Viên</th>
                <th>Họ Tên</th>
                <th>Lớp sinh hoạt</th>
                <th>GPA kỳ này</th>
                <th>CPA tích lũy</th>
                <th>Trạng thái hiện tại</th>
                <th>Xử lý trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${warningRows || '<tr><td colspan="7" class="text-center" style="color:var(--text-success)"><i class="fa-solid fa-circle-check"></i> Không có sinh viên nào bị cảnh báo học vụ kỳ này.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (tabId === 'pdt-logs' || tabId === 'admin-logs') {
    const endpoint = tabId === 'admin-logs' ? `${API_BASE}/admin/audit-logs` : `${API_BASE}/pdt/audit-logs`;
    const res = await fetch(endpoint, { headers: getAuthHeaders() });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Lỗi lấy nhật ký hệ thống');
    }

    const logs = await res.json();

    let logRows = '';
    if (Array.isArray(logs)) {
      logs.forEach(log => {
        logRows += `
          <tr>
            <td><small>${formatDate(log.createdAt)}</small></td>
            <td><strong style="color:var(--color-primary);">${log.username || 'Hệ thống'}</strong></td>
            <td><span class="badge badge-info" style="font-family:monospace;">${log.action}</span></td>
            <td><small style="font-size:0.85rem;">${formatLogDetails(log.details)}</small></td>
            <td><code>${log.ipAddress || '-'}</code></td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Nhật ký hoạt động hệ thống (Audit Logs) <i class="fa-solid fa-shield-halved"></i></h3>
        <p style="color:var(--text-secondary); margin-bottom: 15px;">Hệ thống ghi nhận thời gian thực mọi thay đổi quan trọng phục vụ hậu kiểm.</p>
        <div class="table-responsive">
          <table class="glass-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th style="width:160px">Thời Gian</th>
                <th style="width:180px">Tài Khoản</th>
                <th style="width:180px">Hành Động</th>
                <th>Dữ Liệu Chi Tiết</th>
                <th style="width:140px">Địa Chỉ IP</th>
              </tr>
            </thead>
            <tbody>
              ${logRows || '<tr><td colspan="5" class="text-center">Chưa có nhật ký ghi lại.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // IV. PORTAL ADMIN
  // ==========================================

  // ==========================================
  // IV. PORTAL ADMIN (QUẢN TRỊ VIỆN)
  // ==========================================

  else if (tabId === 'admin-students') {
    const res = await fetch(`${API_BASE}/admin/users?role=student`, { headers });
    const userList = await res.json();

    let userRows = '';
    userList.forEach(item => {
      const u = item.user;
      const p = item.profile;
      
      let profileDetail = '<span style="color:var(--text-secondary)">Chưa tạo hồ sơ</span>';
      if (p) {
        profileDetail = `<strong>${p.name}</strong> (MSV: <code>${p.id}</code>)<br><small style="color:var(--text-secondary)">Lớp: ${p.class} | Ngành: ${p.Major ? p.Major.name : p.majorId} | Email: ${p.email}</small>`;
      }

      let lockActionBtn = u.status === 'active'
        ? `<button class="btn-sm btn-secondary" onclick="adminToggleUserLock(${u.id}, 'locked')"><i class="fa-solid fa-lock"></i> Khóa</button>`
        : `<button class="btn-sm btn-secondary" style="background:#10b981; border-color:#10b981; color:#fff" onclick="adminToggleUserLock(${u.id}, 'active')"><i class="fa-solid fa-lock-open"></i> Mở khóa</button>`;

      const editBtn = p ? `<button class="btn-sm btn-secondary" style="background:var(--color-primary); color:#fff; border-color:var(--color-primary);" onclick="adminOpenEditProfileModal('student', '${p.id}', '${(p.name || '').replace(/'/g, "\\'")}', '${p.gender}', '${p.dob}', '${p.email || ''}', '${p.class || ''}', '${p.majorId || ''}')"><i class="fa-solid fa-user-pen"></i> Sửa</button>` : '';
      const resetPassBtn = `<button class="btn-sm btn-secondary" onclick="adminResetPassword(${u.id}, '${u.username}')"><i class="fa-solid fa-key"></i> Đổi pass</button>`;
      const deleteBtn = `<button class="btn-sm btn-danger" onclick="adminDeleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Xóa</button>`;

      userRows += `
        <tr>
          <td><strong>${u.username}</strong></td>
          <td>${profileDetail}</td>
          <td>
            ${u.status === 'active' ? '<span class="badge badge-success">Hoạt động</span>' : '<span class="badge badge-danger">Đang khóa</span>'}
          </td>
          <td>
            ${editBtn} ${lockActionBtn} ${resetPassBtn} ${deleteBtn}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Cấp tài khoản Sinh viên mới <i class="fa-solid fa-user-plus"></i></h3>
        <form id="create-student-form" onsubmit="adminCreateStudent(event)">
          <div class="form-row">
            <div class="input-group">
              <label for="admin-std-id">Mã sinh viên (MSV)</label>
              <input type="text" id="admin-std-id" placeholder="Ví dụ: 24100004" required>
            </div>
            <div class="input-group">
              <label for="admin-std-name">Họ và tên sinh viên</label>
              <input type="text" id="admin-std-name" placeholder="Ví dụ: Trần Văn Cường" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-std-gender">Giới tính</label>
              <select id="admin-std-gender">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div class="input-group">
              <label for="admin-std-dob">Ngày sinh</label>
              <input type="date" id="admin-std-dob" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-std-email">Email sinh viên</label>
              <input type="email" id="admin-std-email" placeholder="Ví dụ: cuongtv@student.pka.edu.vn" required>
            </div>
            <div class="input-group">
              <label for="admin-std-class">Lớp sinh hoạt danh nghĩa</label>
              <input type="text" id="admin-std-class" placeholder="Ví dụ: D22CNTT2" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-std-major">Ngành học</label>
              <select id="admin-std-major">
                <option value="cntt">Công nghệ thông tin (CNTT)</option>
                <option value="attt">An toàn thông tin (ATTT)</option>
                <option value="hthong_tt">Hệ thống thông tin (HTTT)</option>
                <option value="kdqt">Kinh doanh quốc tế (KDQT)</option>
                <option value="logistics">Logistics và Quản lý chuỗi cung ứng</option>
                <option value="tmdt">Thương mại điện tử (TMĐT)</option>
              </select>
            </div>
            <div class="input-group">
              <label for="admin-std-password">Mật khẩu ban đầu (Để trống sẽ lấy mặc định là MSV - 8 ký tự)</label>
              <input type="password" id="admin-std-password" placeholder="Mật khẩu ban đầu (tùy chọn)">
            </div>
          </div>

          <button type="submit" class="btn-primary" style="max-width:240px;"><i class="fa-solid fa-user-plus"></i> Cấp tài khoản Sinh viên</button>
        </form>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Danh sách tài khoản Sinh viên (${userList.length}) <i class="fa-solid fa-user-graduate"></i></h3>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Tên Tài Khoản</th>
                <th>Hồ Sơ Sinh Viên</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${userRows || '<tr><td colspan="4" class="text-center" style="color:var(--text-secondary)">Chưa có tài khoản sinh viên nào.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (tabId === 'admin-lecturers') {
    const res = await fetch(`${API_BASE}/admin/users?role=lecturer`, { headers });
    const userList = await res.json();

    let userRows = '';
    userList.forEach(item => {
      const u = item.user;
      const p = item.profile;
      
      let profileDetail = '<span style="color:var(--text-secondary)">Chưa tạo hồ sơ</span>';
      if (p) {
        profileDetail = `<strong>${p.name}</strong> (MGV: <code>${p.id}</code>)<br><small style="color:var(--text-secondary)">Khoa: ${p.Department ? p.Department.name : p.departmentId} | Chức danh: ${p.position} ${p.mainSubject ? `| Môn: ${p.mainSubject}` : ''}</small>`;
      }

      let lockActionBtn = u.status === 'active'
        ? `<button class="btn-sm btn-secondary" onclick="adminToggleUserLock(${u.id}, 'locked')"><i class="fa-solid fa-lock"></i> Khóa</button>`
        : `<button class="btn-sm btn-secondary" style="background:#10b981; border-color:#10b981; color:#fff" onclick="adminToggleUserLock(${u.id}, 'active')"><i class="fa-solid fa-lock-open"></i> Mở khóa</button>`;

      const editBtn = p ? `<button class="btn-sm btn-secondary" style="background:var(--color-primary); color:#fff; border-color:var(--color-primary);" onclick="adminOpenEditProfileModal('lecturer', '${p.id}', '${(p.name || '').replace(/'/g, "\\'")}', '${p.gender}', '${p.dob}', '', '', '', '${p.departmentId || ''}', '${(p.position || '').replace(/'/g, "\\'")}', '${(p.mainSubject || '').replace(/'/g, "\\'")}')"><i class="fa-solid fa-user-pen"></i> Sửa</button>` : '';
      const resetPassBtn = `<button class="btn-sm btn-secondary" onclick="adminResetPassword(${u.id}, '${u.username}')"><i class="fa-solid fa-key"></i> Đổi pass</button>`;
      const deleteBtn = `<button class="btn-sm btn-danger" onclick="adminDeleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Xóa</button>`;

      userRows += `
        <tr>
          <td><strong>${u.username}</strong></td>
          <td>${profileDetail}</td>
          <td>
            ${u.status === 'active' ? '<span class="badge badge-success">Hoạt động</span>' : '<span class="badge badge-danger">Đang khóa</span>'}
          </td>
          <td>
            ${editBtn} ${lockActionBtn} ${resetPassBtn} ${deleteBtn}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Cấp tài khoản Giảng viên mới <i class="fa-solid fa-chalkboard-user"></i></h3>
        <form id="create-lecturer-form" onsubmit="adminCreateLecturer(event)">
          <div class="form-row">
            <div class="input-group">
              <label for="admin-lec-id">Mã giảng viên (MGV)</label>
              <input type="text" id="admin-lec-id" placeholder="Ví dụ: PE20220117" required>
            </div>
            <div class="input-group">
              <label for="admin-lec-name">Họ và tên giảng viên</label>
              <input type="text" id="admin-lec-name" placeholder="Ví dụ: Nguyễn Thị Huệ" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-lec-gender">Giới tính</label>
              <select id="admin-lec-gender">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div class="input-group">
              <label for="admin-lec-dob">Ngày sinh</label>
              <input type="date" id="admin-lec-dob" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-lec-dept">Khoa trực thuộc</label>
              <select id="admin-lec-dept">
                <option value="CNTT">Khoa Công nghệ thông tin</option>
                <option value="KT">Khoa Kinh tế và Kinh doanh quốc tế</option>
              </select>
            </div>
            <div class="input-group">
              <label for="admin-lec-pos">Chức vụ / Chức danh</label>
              <input type="text" id="admin-lec-pos" placeholder="Ví dụ: Giảng viên cơ hữu" required>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label for="admin-lec-subject">Môn giảng dạy chính</label>
              <input type="text" id="admin-lec-subject" placeholder="Ví dụ: Lập trình Web">
            </div>
            <div class="input-group">
              <label for="admin-lec-password">Mật khẩu ban đầu (Để trống là 12345678)</label>
              <input type="password" id="admin-lec-password" placeholder="Mật khẩu 8 ký tự (tùy chọn)">
            </div>
          </div>

          <button type="submit" class="btn-primary" style="max-width:240px;"><i class="fa-solid fa-user-plus"></i> Cấp tài khoản Giảng viên</button>
        </form>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Danh sách tài khoản Giảng viên (${userList.length}) <i class="fa-solid fa-chalkboard-user"></i></h3>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Tên Tài Khoản</th>
                <th>Hồ Sơ Giảng Viên</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${userRows || '<tr><td colspan="4" class="text-center" style="color:var(--text-secondary)">Chưa có tài khoản giảng viên nào.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  else if (tabId === 'admin-staff') {
    const res = await fetch(`${API_BASE}/admin/users`, { headers });
    const allUsers = await res.json();
    const staffList = allUsers.filter(item => item.user.role === 'pdt' || item.user.role === 'admin');

    let userRows = '';
    staffList.forEach(item => {
      const u = item.user;

      let lockActionBtn = u.status === 'active'
        ? `<button class="btn-sm btn-secondary" onclick="adminToggleUserLock(${u.id}, 'locked')"><i class="fa-solid fa-lock"></i> Khóa</button>`
        : `<button class="btn-sm btn-secondary" style="background:#10b981; border-color:#10b981; color:#fff" onclick="adminToggleUserLock(${u.id}, 'active')"><i class="fa-solid fa-lock-open"></i> Mở khóa</button>`;

      const resetPassBtn = `<button class="btn-sm btn-secondary" onclick="adminResetPassword(${u.id}, '${u.username}')"><i class="fa-solid fa-key"></i> Đổi pass</button>`;
      const deleteBtn = `<button class="btn-sm btn-danger" onclick="adminDeleteUser(${u.id})"><i class="fa-solid fa-trash"></i> Xóa</button>`;

      userRows += `
        <tr>
          <td><strong>${u.username}</strong></td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}">${u.role.toUpperCase()}</span></td>
          <td>
            ${u.status === 'active' ? '<span class="badge badge-success">Hoạt động</span>' : '<span class="badge badge-danger">Đang khóa</span>'}
          </td>
          <td>
            ${u.role !== 'admin' ? `${lockActionBtn} ${resetPassBtn} ${deleteBtn}` : '<small style="color:var(--text-secondary)">Tài khoản Root Admin</small>'}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="glass-card">
        <h3 class="card-title">Cấp tài khoản Quản trị / Phòng Đào Tạo <i class="fa-solid fa-user-gear"></i></h3>
        <form id="create-staff-form" onsubmit="adminCreateStaff(event)">
          <div class="form-row">
            <div class="input-group">
              <label for="admin-staff-role">Loại tài khoản</label>
              <select id="admin-staff-role">
                <option value="pdt">Phòng Đào Tạo (PDT)</option>
                <option value="admin">Admin Hệ thống</option>
              </select>
            </div>
            <div class="input-group">
              <label for="admin-staff-username">Tên đăng nhập (Username)</label>
              <input type="text" id="admin-staff-username" placeholder="Ví dụ: pdt_cntt@pka.edu.vn" required>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label for="admin-staff-password">Mật khẩu ban đầu (Chuẩn 8 ký tự)</label>
              <input type="password" id="admin-staff-password" placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)" required>
            </div>
          </div>
          <button type="submit" class="btn-primary" style="max-width:220px;"><i class="fa-solid fa-user-plus"></i> Cấp tài khoản Cán bộ</button>
        </form>
      </div>

      <div class="glass-card">
        <h3 class="card-title">Danh sách Cán bộ Quản trị & PDT (${staffList.length}) <i class="fa-solid fa-users-gear"></i></h3>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Tên Tài Khoản</th>
                <th>Vai Trò</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${userRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// ==========================================
// CẢI TIẾN ĐĂNG KÝ TÍN CHỈ THEO NGÀNH HỌC
// ==========================================

window.currentCourseScope = 'my_major';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.changeCourseScope = async function(scope) {
  window.currentCourseScope = scope;
  const container = document.getElementById('page-view-content');
  await renderStudentRegisterTab(container, scope, '');
};

// Helper: Loại bỏ dấu tiếng Việt để tìm kiếm không dấu
function removeAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

window.handleCourseSearchInput = function(query) {
  const tbody = document.getElementById('student-register-tbody');
  const classStats = state.data.availableClasses || [];
  if (tbody) {
    const listRows = generateStudentRegisterRowsHTML(classStats, query);
    tbody.innerHTML = listRows || '<tr><td colspan="11" class="text-center" style="color:var(--text-secondary); padding: 30px;">Không tìm thấy lớp học phần nào phù hợp.</td></tr>';
  }
};

async function renderStudentRegisterTab(container, scope = 'my_major', searchQuery = '') {
  window.currentCourseScope = scope;
  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/student/courses/available?scope=${scope}`, { headers });
    const classStats = await res.json();

    if (!Array.isArray(classStats)) {
      container.innerHTML = `<div class="glass-card text-center"><p style="color:var(--color-danger);">Không thể lấy danh sách lớp học phần.</p></div>`;
      return;
    }

    state.data.availableClasses = classStats;
    renderStudentRegisterHTML(container, classStats, scope, searchQuery);
  } catch (err) {
    console.error('Lỗi lấy danh sách môn học:', err);
    container.innerHTML = `<div class="glass-card text-center"><p style="color:var(--color-danger);">Có lỗi xảy ra khi kết nối máy chủ.</p></div>`;
  }
}

function generateStudentRegisterRowsHTML(classStats, searchQuery = '') {
  let filtered = classStats;

  if (searchQuery && searchQuery.trim()) {
    const q = removeAccents(searchQuery.trim());
    filtered = classStats.filter(item => {
      const cls = item.classInfo;
      const courseName = removeAccents(cls.Course?.name || '');
      const courseId = removeAccents(cls.Course?.id || '');
      const classId = removeAccents(cls.id || '');
      const lecturerName = removeAccents(cls.Lecturer?.name || '');
      const roomName = removeAccents(cls.roomName || '');
      return courseName.includes(q) || courseId.includes(q) || classId.includes(q) || lecturerName.includes(q) || roomName.includes(q);
    });
  }

  let listRows = '';
  filtered.forEach(item => {
    const cls = item.classInfo;
    const dayStr = `Thứ ${cls.dayOfWeek}`;
    const shiftStr = cls.shift === 'morning' ? 'Sáng' : 'Chiều';
    const slotStr = `Tiết ${cls.startSlot} - ${cls.startSlot + cls.numSlots - 1}`;
    
    // Loai mon badge
    let subjectBadge = '';
    if (item.isGeneral) {
      subjectBadge = `<span class="badge badge-info" style="font-weight:600;"><i class="fa-solid fa-book-open"></i> Đại cương</span>`;
    } else if (item.courseMajorName && item.courseMajorName.includes('Cơ sở ngành')) {
      subjectBadge = `<span class="badge badge-primary" style="font-weight:600;"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(item.courseMajorName)}</span>`;
    } else {
      subjectBadge = `<span class="badge badge-success" style="font-weight:600;"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(item.courseMajorName || 'Chuyên ngành')}</span>`;
    }

    // RegType badge
    let regTypeBadge = '';
    if (item.regType === 'retake') {
      regTypeBadge = `<span class="badge badge-danger" style="font-weight:600;"><i class="fa-solid fa-rotate"></i> Học lại (Thi trượt F)</span>`;
    } else if (item.regType === 'improve') {
      regTypeBadge = `<span class="badge badge-warning" style="font-weight:600;"><i class="fa-solid fa-arrow-trend-up"></i> Học cải thiện</span>`;
    } else {
      regTypeBadge = `<span class="badge badge-secondary" style="font-weight:500;">Học mới</span>`;
    }

    // Prereq badge
    let prereqDisplay = '<span style="color:var(--text-secondary)">Không có</span>';
    if (item.prereqInfo) {
      if (item.prereqInfo.isPassed) {
        prereqDisplay = `<span style="color:#10b981; font-weight:600; font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> Đã đạt (${item.prereqInfo.requiredId})</span>`;
      } else {
        prereqDisplay = `<span style="color:#f87171; font-weight:600; font-size:0.85rem;" title="Yêu cầu phải đạt môn tiên quyết: ${item.prereqInfo.requiredName}"><i class="fa-solid fa-lock"></i> Cần môn ${item.prereqInfo.requiredId}</span>`;
      }
    }

    const termDisplay = `<span class="badge badge-secondary" style="font-size:0.85rem; font-weight:600;"><i class="fa-solid fa-clock-rotate-left"></i> Kỳ ${item.term || 1}</span>`;

    let actionBtn = '';
    if (item.myStatus === 'enrolled') {
      actionBtn = `<button class="btn-sm btn-danger" onclick="unregisterClass('${cls.id}')"><i class="fa-solid fa-trash"></i> Hủy lớp</button>`;
    } else if (item.myStatus === 'waitlist') {
      actionBtn = `
        <span class="badge badge-warning" style="margin-right:8px;"><i class="fa-solid fa-spinner fa-spin"></i> Hàng chờ</span>
        <button class="btn-sm btn-danger" onclick="unregisterClass('${cls.id}')"><i class="fa-solid fa-xmark"></i> Hủy</button>
      `;
    } else {
      const isFull = item.enrolledCount >= cls.capacity;
      const btnClass = isFull ? 'btn-secondary' : 'btn-primary';
      const btnText = isFull ? '<i class="fa-solid fa-clock"></i> Vào hàng chờ' : '<i class="fa-solid fa-plus"></i> Đăng ký';
      actionBtn = `<button class="btn-sm ${btnClass}" onclick="registerClass('${cls.id}')">${btnText}</button>`;
    }

    listRows += `
      <tr>
        <td><strong>${cls.id}</strong></td>
        <td>
          <div style="font-weight:600;">${cls.Course ? cls.Course.name : ''}</div>
          <small style="color:var(--text-secondary)">Mã môn: ${cls.Course ? cls.Course.id : ''}</small>
        </td>
        <td>${subjectBadge}</td>
        <td>${termDisplay}</td>
        <td>${prereqDisplay}</td>
        <td>${regTypeBadge}</td>
        <td>${cls.Course ? cls.Course.credits : 0} TC</td>
        <td>${cls.Lecturer ? cls.Lecturer.name : ''}</td>
        <td>${dayStr} (${shiftStr})<br><small style="color:var(--text-secondary)">${slotStr}</small></td>
        <td>
          ${item.enrolledCount}/${cls.capacity}
          ${item.waitlistCount > 0 ? `<br><small style="color:var(--color-warning)">Chờ: ${item.waitlistCount}</small>` : ''}
        </td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });

  return listRows;
}

function renderStudentRegisterHTML(container, classStats, scope, searchQuery = '') {
  const listRows = generateStudentRegisterRowsHTML(classStats, searchQuery);

  const academicProgress = state.profile?.academicProgress;
  const progressText = academicProgress ? `${academicProgress.yearText} - ${academicProgress.semesterText}` : 'Học kỳ HK1-2025';

  container.innerHTML = `
    <div class="glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:15px;">
        <div>
          <h3 class="card-title" style="margin:0;">Đăng ký lớp học phần - ${escapeHtml(progressText)} <i class="fa-solid fa-pen-to-square"></i></h3>
          <p style="color:var(--text-secondary); margin: 5px 0 0 0; font-size:0.9rem;">
            Lưu ý: Hệ thống chỉ hiển thị các môn học thuộc đúng lộ trình <strong>${escapeHtml(progressText)}</strong> của Ngành bạn đang học và các môn cần Học lại. Môn học tiên quyết được kiểm tra tự động.
          </p>
        </div>
      </div>

      <!-- Thanh Tìm kiếm Môn học -->
      <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:20px;">
        <div style="position:relative; width: 320px;">
          <input type="text" id="course-search-input" placeholder="Tìm tên môn, giảng viên, mã lớp..." value="${escapeHtml(searchQuery)}" oninput="handleCourseSearchInput(this.value)" style="width:100%; padding: 8px 12px 8px 36px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.2); color:white; font-size:0.9rem;">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-secondary); font-size:0.9rem;"></i>
        </div>
      </div>

      <div class="table-responsive">
        <table class="glass-table">
          <thead>
            <tr>
              <th>Mã Lớp HP</th>
              <th>Môn Học</th>
              <th>Loại Môn</th>
              <th>Lộ Trình</th>
              <th>Môn Tiên Quyết</th>
              <th>Mục Đích ĐK</th>
              <th>Tín Chỉ</th>
              <th>Giảng Viên</th>
              <th>Lịch Học</th>
              <th>Sĩ Số</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody id="student-register-tbody">
            ${listRows || '<tr><td colspan="11" class="text-center" style="color:var(--text-secondary); padding: 30px;">Không tìm thấy lớp học phần nào phù hợp.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================
// V. CÁC HÀM XỬ LÝ SỰ KIỆN API CỦA SINH VIÊN
// ==========================================

async function registerClass(classId) {
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE}/student/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ classId })
    });
    
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Lỗi đăng ký môn học.');
      return;
    }
    
    alert(data.message);
    
    // Tải lại trang đăng ký
    switchTab(state.currentTab);
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối đến máy chủ backend.');
  }
}
window.registerClass = registerClass;

async function unregisterClass(classId) {
  if (!confirm('Bạn có chắc chắn muốn hủy đăng ký lớp học phần này?')) return;
  
  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE}/student/unregister`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ classId })
    });
    
    const data = await res.json();
    alert(data.message);
    
    switchTab(state.currentTab);
  } catch (err) {
    console.error(err);
  }
}
window.unregisterClass = unregisterClass;

// Mở Modal thanh toán - hiển thị QR động VietQR/SePay có nhúng số tiền và nội dung CK
function openPaymentModal(paymentId, finalAmount) {
  state.activePayment = { paymentId, finalAmount };

  const refCode = `PKABILL${paymentId}`;

  // Thông tin tài khoản ngân hàng thụ hưởng THỰC TẾ
  const BANK_ID = 'MB'; // Mã ngân hàng MBBank theo chuẩn VietQR NAPAS
  const ACCOUNT_NO = '0665993159999'; // Số tài khoản MBBank thực tế
  const ACCOUNT_NAME = 'PHAM TRUNG THANH'; // Tên chủ tài khoản
  
  // URL QR động SePay & VietQR chuẩn chứa sẵn số tiền và nội dung CK
  const sepayQrUrl = `https://qr.sepay.vn/img?bank=${BANK_ID}&acc=${ACCOUNT_NO}&template=compact&amount=${finalAmount}&des=${encodeURIComponent(refCode)}`;
  const vietqrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
    `?amount=${finalAmount}&addInfo=${encodeURIComponent(refCode)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const qrImg = document.getElementById('vietqr-img');
  if (qrImg) {
    qrImg.src = vietqrUrl; // Ưu tiên VietQR API chuẩn liên ngân hàng NAPAS
    qrImg.alt = 'Mã QR thanh toán học phí';
    qrImg.onerror = () => {
      // Fallback sang SePay QR API nếu VietQR API gặp sự cố mạng
      qrImg.src = sepayQrUrl;
    };
  }

  const amountEl = document.getElementById('pay-modal-amount');
  const refEl = document.getElementById('pay-modal-ref');
  if (amountEl) amountEl.textContent = formatMoney(finalAmount);
  if (refEl) refEl.textContent = refCode;

  document.getElementById('payment-modal').classList.remove('hidden');

  // Khởi chạy Fast Polling kiểm tra trạng thái thanh toán tự động mỗi 2 giây
  startPaymentPolling(paymentId);
}
window.openPaymentModal = openPaymentModal;

// Polling kiểm tra trạng thái thanh toán tự động mỗi 2 giây (Fast Real-time Polling)
let pollingInterval = null;
function startPaymentPolling(paymentId) {
  stopPaymentPolling();
  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/webhook/payment-status/${paymentId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'paid') {
        stopPaymentPolling();
        closePaymentModal();
        showToast('🎉 Thanh toán học phí đã được xác nhận thành công!', 'success');
        setTimeout(() => switchTab('student-tuition'), 300);
      }
    } catch (e) { /* bỏ qua lỗi polling */ }
  }, 2000);
}
function stopPaymentPolling() {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
  state.activePayment = null;
  stopPaymentPolling();
}
window.closePaymentModal = closePaymentModal;

// Hàm giả lập thanh toán ngân hàng phục vụ Chế độ Test / Demo
async function simulatePaymentForTest() {
  if (!state.activePayment) {
    showToast('Không tìm thấy thông tin hóa đơn cần mô phỏng.', 'error');
    return;
  }

  const { paymentId } = state.activePayment;
  try {
    const res = await fetch(`${API_BASE}/webhook/test-simulate-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('⚡ Mô phỏng thành công! Đang xử lý tự động...', 'info');
      // Socket.IO hoặc Polling sẽ tự động nhận diện và hoàn tất giao diện
    } else {
      showToast(data.message || 'Mô phỏng thất bại', 'error');
    }
  } catch (err) {
    console.error('Lỗi khi mô phỏng thanh toán:', err);
    showToast('Lỗi kết nối khi giả lập giao dịch.', 'error');
  }
}
window.simulatePaymentForTest = simulatePaymentForTest;

// Nộp đơn phúc khảo
async function requestPhucKhao(gradeId) {
  const reason = prompt('Nhập lý do phúc khảo điểm môn học này:');
  if (reason === null) return; // Nhấn Cancel
  if (!reason.trim()) {
    showToast('Bạn phải điền lý do phúc khảo.', 'warning');
    return;
  }

  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE}/student/phuc-khao`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gradeId, reason })
    });
    const data = await res.json();
    alert(data.message);
    switchTab(state.currentTab);
  } catch (e) {
    console.error(e);
  }
}
window.requestPhucKhao = requestPhucKhao;

// ==========================================
// VI. CÁC HÀM CHO GIẢNG VIÊN
// ==========================================

// Mở vùng nhập điểm cho sinh viên lớp học
async function openClassGrading(classId) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/lecturer/classes/${classId}/students`, { headers });
  const list = await res.json();

  const section = document.getElementById('class-grading-section');
  section.classList.remove('hidden');

  let rows = '';
  list.forEach(item => {
    const g = item.grade;
    const isLocked = g.isLocked;
    
    rows += `
      <tr>
        <td><strong>${item.student.id}</strong></td>
        <td>${item.student.name}</td>
        <td>
          <input type="number" min="0" max="10" step="0.5" id="grade-att-${item.student.id}" value="${g.attendanceGrade !== null ? g.attendanceGrade : ''}" ${isLocked ? 'disabled' : ''} style="width:70px; padding:6px; border-radius:5px; border:1px solid var(--panel-border); background:rgba(0,0,0,0.2); color:#fff">
        </td>
        <td>
          <input type="number" min="0" max="10" step="0.5" id="grade-mid-${item.student.id}" value="${g.midtermGrade !== null ? g.midtermGrade : ''}" ${isLocked ? 'disabled' : ''} style="width:70px; padding:6px; border-radius:5px; border:1px solid var(--panel-border); background:rgba(0,0,0,0.2); color:#fff">
        </td>
        <td>
          <input type="number" min="0" max="10" step="0.5" id="grade-fin-${item.student.id}" value="${g.finalGrade !== null ? g.finalGrade : ''}" ${isLocked ? 'disabled' : ''} style="width:70px; padding:6px; border-radius:5px; border:1px solid var(--panel-border); background:rgba(0,0,0,0.2); color:#fff">
        </td>
        <td><strong>${g.total10 !== null ? g.total10 : '-'}</strong></td>
        <td><span class="badge ${g.letterGrade === 'F' ? 'badge-danger' : 'badge-success'}">${g.letterGrade || '-'}</span></td>
        <td>
          ${isLocked ? '<span style="color:var(--text-secondary)"><i class="fa-solid fa-lock"></i> Đã khóa</span>' : `
            <button class="btn-sm btn-primary" onclick="submitStudentGrade('${classId}', '${item.student.id}')"><i class="fa-solid fa-check"></i> Lưu</button>
          `}
        </td>
      </tr>
    `;
  });

  section.innerHTML = `
    <div class="glass-card" style="margin-top:30px; animation: floatIn 0.4s ease;">
      <h3 class="card-title">
        Nhập điểm lớp học phần: ${classId} <button class="btn-sm btn-primary" onclick="exportClassGradesExcel('${classId}')" style="margin-left:10px;"><i class="fa-solid fa-file-excel"></i> Xuất Excel Bảng Điểm</button> 
        <button class="btn-sm btn-secondary" onclick="document.getElementById('class-grading-section').classList.add('hidden')"><i class="fa-solid fa-xmark"></i> Đóng</button>
      </h3>
      <div class="table-responsive">
        <table class="glass-table">
          <thead>
            <tr>
              <th>Mã Sinh Viên</th>
              <th>Họ Tên</th>
              <th>Chuyên Cần (10%)</th>
              <th>Giữa Kỳ (30%)</th>
              <th>Cuối Kỳ (60%)</th>
              <th>Tổng hệ 10</th>
              <th>Thang chữ</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8">Không có sinh viên đăng ký.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
window.openClassGrading = openClassGrading;

// Lưu điểm một sinh viên
async function submitStudentGrade(classId, studentId) {
  const attVal = document.getElementById(`grade-att-${studentId}`).value;
  const midVal = document.getElementById(`grade-mid-${studentId}`).value;
  const finVal = document.getElementById(`grade-fin-${studentId}`).value;

  if (attVal === '' || midVal === '' || finVal === '') {
    showToast('Vui lòng nhập đầy đủ cả 3 đầu điểm.', 'warning');
    return;
  }

  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE}/lecturer/classes/${classId}/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        studentId,
        attendanceGrade: attVal,
        midtermGrade: midVal,
        finalGrade: finVal
      })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Đã lưu điểm!');
      // Reload danh sách nhập điểm
      openClassGrading(classId);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
}
window.submitStudentGrade = submitStudentGrade;

// Khóa điểm lớp học phần
async function lockClassGrades(classId) {
  if (!confirm(`Bạn có chắc muốn KHÓA bảng điểm lớp ${classId}? Sau khi khóa sẽ không thể chỉnh sửa điểm và sinh viên có thể xem được điểm chính thức.`)) return;

  const headers = getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/lecturer/classes/${classId}/lock-grades`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    alert(data.message);
    switchTab(state.currentTab);
  } catch (e) {
    console.error(e);
  }
}
window.lockClassGrades = lockClassGrades;

// Giảng viên giải quyết phúc khảo
async function resolvePhucKhaoPrompt(gradeId, curAtt, curMid, curFin) {
  const attVal = prompt('Nhập điểm chuyên cần mới:', curAtt);
  if (attVal === null) return;
  const midVal = prompt('Nhập điểm giữa kỳ mới:', curMid);
  if (midVal === null) return;
  const finVal = prompt('Nhập điểm cuối kỳ mới:', curFin);
  if (finVal === null) return;

  const headers = getAuthHeaders();

  try {
    const res = await fetch(`${API_BASE}/lecturer/phuc-khao/${gradeId}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        attendanceGrade: attVal,
        midtermGrade: midVal,
        finalGrade: finVal
      })
    });
    const data = await res.json();
    alert(data.message);
    switchTab(state.currentTab);
  } catch (e) {
    console.error(e);
  }
}
window.resolvePhucKhaoPrompt = resolvePhucKhaoPrompt;

// ==========================================
// VII. CÁC HÀM CHO PHÒNG ĐÀO TẠO (PDT)
// ==========================================

// Tạo môn học mới
async function createCourse(e) {
  e.preventDefault();
  const id = document.getElementById('course-id').value.trim();
  const name = document.getElementById('course-name').value.trim();
  const credits = document.getElementById('course-credits').value;
  const prerequisiteId = document.getElementById('course-prereq').value.trim();

  try {
    const res = await fetch(`${API_BASE}/pdt/courses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, name, credits, prerequisiteId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Đã thêm môn học mới thành công!', 'success');
      switchTab(state.currentTab);
    } else {
      showToast(data.message || 'Lỗi thêm môn học', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Không thể kết nối đến máy chủ.', 'error');
  }
}
window.createCourse = createCourse;

// Xếp lịch lớp học phần mới
async function createClass(e) {
  e.preventDefault();
  const id = document.getElementById('class-id').value.trim();
  const courseId = document.getElementById('class-course-id').value.trim();
  const lecturerId = document.getElementById('class-lecturer-id').value.trim();
  const roomName = document.getElementById('class-room').value.trim();
  const roomType = document.getElementById('class-room-type').value;
  const capacity = document.getElementById('class-capacity').value;
  const dayOfWeek = document.getElementById('class-day').value;
  const shift = document.getElementById('class-shift').value;
  const startSlot = document.getElementById('class-start-slot').value;
  const numSlots = document.getElementById('class-num-slots').value;

  try {
    const res = await fetch(`${API_BASE}/pdt/classes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        id, courseId, lecturerId, roomName, roomType, capacity, semester: 'HK1-2025', dayOfWeek, shift, startSlot, numSlots
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Xếp lịch lớp học phần thành công!', 'success');
      switchTab(state.currentTab);
    } else {
      showToast(data.message || 'Lỗi xếp lớp học phần', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Không thể kết nối đến máy chủ.', 'error');
  }
}
window.createClass = createClass;

// Hủy lớp học phần sĩ số thấp (< 15)
async function cancelClassByPDT(classId) {
  if (!confirm(`Bạn có chắc muốn HỦY lớp học phần ${classId} do thiếu sĩ số? Hệ thống sẽ tự động hoàn học phí cho sinh viên đăng ký.`)) return;

  try {
    const res = await fetch(`${API_BASE}/pdt/classes/${classId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    switchTab(state.currentTab);
  } catch (e) {
    console.error(e);
    showToast('Không thể thực hiện thao tác hủy lớp.', 'error');
  }
}
window.cancelClassByPDT = cancelClassByPDT;

// Cập nhật trạng thái cảnh báo học vụ
async function updateStudentWarning(studentId, status) {
  try {
    const res = await fetch(`${API_BASE}/pdt/students/${studentId}/warning`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    switchTab(state.currentTab);
  } catch (e) {
    console.error(e);
    showToast('Không thể cập nhật trạng thái sinh viên.', 'error');
  }
}
window.updateStudentWarning = updateStudentWarning;

// ==========================================
// VIII. TIỆN ÍCH KHÁC (UTILITIES)
// ==========================================

function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function studentStatusBadge(status) {
  switch (status) {
    case 'active':
      return '<span class="badge badge-success">Bình thường</span>';
    case 'warning_1':
      return '<span class="badge badge-warning">Cảnh cáo Mức 1</span>';
    case 'warning_2':
      return '<span class="badge badge-warning" style="background:rgba(239, 68, 68, 0.2); color:#f87171;">Cảnh cáo Mức 2</span>';
    case 'dismissed':
      return '<span class="badge badge-danger">Buộc thôi học</span>';
    default:
      return `<span class="badge badge-secondary">${status}</span>`;
  }
}

// --- Các hàm hỗ trợ điều khiển của Admin ---

// 1. Chuyển đổi hiển thị các trường nhập thông tin form tài khoản
function toggleAdminFormFields(role) {
  const groupIdInput = document.getElementById('group-id-input');
  const labelUserId = document.getElementById('label-user-id');
  const groupUsernameInput = document.getElementById('group-username-input');
  const personalInfoFields = document.getElementById('personal-info-fields');
  const studentOnlyFields = document.getElementById('student-only-fields');
  const lecturerOnlyFields = document.getElementById('lecturer-only-fields');
  const groupPasswordInput = document.getElementById('group-password-input');

  // Input fields
  const idInput = document.getElementById('admin-user-id');
  const usernameInput = document.getElementById('admin-user-username');
  const nameInput = document.getElementById('admin-user-name');
  const dobInput = document.getElementById('admin-user-dob');
  const emailInput = document.getElementById('admin-user-email');
  const classInput = document.getElementById('admin-user-class');
  const passwordInput = document.getElementById('admin-user-password');

  if (role === 'student') {
    groupIdInput.classList.remove('hidden');
    labelUserId.textContent = 'Mã sinh viên (MSV)';
    idInput.placeholder = 'Ví dụ: 24100004';
    idInput.required = true;
    
    groupUsernameInput.classList.add('hidden');
    usernameInput.required = false;

    personalInfoFields.classList.remove('hidden');
    nameInput.required = true;
    dobInput.required = true;
    emailInput.required = true;

    studentOnlyFields.classList.remove('hidden');
    classInput.required = true;
    lecturerOnlyFields.classList.add('hidden');

    groupPasswordInput.classList.add('hidden');
    passwordInput.required = false;

  } else if (role === 'lecturer') {
    groupIdInput.classList.remove('hidden');
    labelUserId.textContent = 'Mã giảng viên (MGV)';
    idInput.placeholder = 'Ví dụ: GV004';
    idInput.required = true;

    groupUsernameInput.classList.add('hidden');
    usernameInput.required = false;

    personalInfoFields.classList.remove('hidden');
    nameInput.required = true;
    dobInput.required = true;
    emailInput.required = true;

    studentOnlyFields.classList.add('hidden');
    classInput.required = false;
    lecturerOnlyFields.classList.remove('hidden');

    groupPasswordInput.classList.add('hidden');
    passwordInput.required = false;

  } else {
    // pdt hoặc admin
    groupIdInput.classList.add('hidden');
    idInput.required = false;

    groupUsernameInput.classList.remove('hidden');
    usernameInput.required = true;

    personalInfoFields.classList.add('hidden');
    nameInput.required = false;
    dobInput.required = false;
    emailInput.required = false;
    classInput.required = false;

    groupPasswordInput.classList.remove('hidden');
    passwordInput.required = true;
  }
}
window.toggleAdminFormFields = toggleAdminFormFields;

// 2. Admin nộp form tạo tài khoản mới
async function adminCreateUser(e) {
  e.preventDefault();
  
  const role = document.getElementById('admin-user-role').value;
  const id = document.getElementById('admin-user-id').value.trim();
  const username = document.getElementById('admin-user-username').value.trim();
  const name = document.getElementById('admin-user-name').value.trim();
  const gender = document.getElementById('admin-user-gender').value;
  const dob = document.getElementById('admin-user-dob').value;
  const email = document.getElementById('admin-user-email').value.trim();
  const studentClass = document.getElementById('admin-user-class').value.trim();
  const majorId = document.getElementById('admin-user-major').value;
  const departmentId = document.getElementById('admin-user-dept').value;
  const position = document.getElementById('admin-user-pos').value.trim();
  const password = document.getElementById('admin-user-password').value;

  const payload = {
    role,
    id,
    username,
    name,
    gender,
    dob,
    email,
    class: studentClass,
    majorId,
    departmentId,
    position,
    password
  };

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi khi cấp tài khoản.');
  }
}
window.adminCreateUser = adminCreateUser;

// Cấp tài khoản Sinh viên
async function adminCreateStudent(e) {
  e.preventDefault();
  const id = document.getElementById('admin-std-id').value.trim();
  const name = document.getElementById('admin-std-name').value.trim();
  const gender = document.getElementById('admin-std-gender').value;
  const dob = document.getElementById('admin-std-dob').value;
  const email = document.getElementById('admin-std-email').value.trim();
  const studentClass = document.getElementById('admin-std-class').value.trim();
  const majorId = document.getElementById('admin-std-major').value;
  const password = document.getElementById('admin-std-password').value;

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        role: 'student',
        id,
        name,
        gender,
        dob,
        email,
        class: studentClass,
        majorId,
        password
      })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi cấp tài khoản Sinh viên.');
  }
}
window.adminCreateStudent = adminCreateStudent;

// Cấp tài khoản Giảng viên
async function adminCreateLecturer(e) {
  e.preventDefault();
  const id = document.getElementById('admin-lec-id').value.trim();
  const name = document.getElementById('admin-lec-name').value.trim();
  const gender = document.getElementById('admin-lec-gender').value;
  const dob = document.getElementById('admin-lec-dob').value;
  const departmentId = document.getElementById('admin-lec-dept').value;
  const position = document.getElementById('admin-lec-pos').value.trim();
  const mainSubject = document.getElementById('admin-lec-subject').value.trim();
  const password = document.getElementById('admin-lec-password').value;

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        role: 'lecturer',
        id,
        name,
        gender,
        dob,
        departmentId,
        position,
        mainSubject,
        password
      })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi cấp tài khoản Giảng viên.');
  }
}
window.adminCreateLecturer = adminCreateLecturer;

// Cấp tài khoản Cán bộ / PDT / Admin
async function adminCreateStaff(e) {
  e.preventDefault();
  const role = document.getElementById('admin-staff-role').value;
  const username = document.getElementById('admin-staff-username').value.trim();
  const password = document.getElementById('admin-staff-password').value;

  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        role,
        username,
        password
      })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi cấp tài khoản Cán bộ.');
  }
}
window.adminCreateStaff = adminCreateStaff;

// Đổi mật khẩu nhanh bởi Admin
async function adminResetPassword(userId, username) {
  const newPassword = prompt(`Nhập mật khẩu mới cho tài khoản ${username}:`);
  if (newPassword === null) return;
  if (!newPassword.trim()) {
    alert('Mật khẩu mới không được để trống.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password: newPassword.trim() })
    });
    const data = await res.json();
    alert(data.message || 'Cập nhật mật khẩu thành công!');
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi cập nhật mật khẩu.');
  }
}
window.adminResetPassword = adminResetPassword;

// 3. Khóa hoặc mở khóa tài khoản
async function adminToggleUserLock(userId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
  }
}
window.adminToggleUserLock = adminToggleUserLock;

// 4. Xóa tài khoản vĩnh viễn (Cascade delete)
async function adminDeleteUser(userId) {
  if (!confirm('CẢNH BÁO: Hành động này sẽ xóa tài khoản VÀ toàn bộ hồ sơ thông tin (Sinh viên / Giảng viên) liên quan vĩnh viễn khỏi hệ thống. Bạn có chắc chắn muốn xóa?')) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
  }
}
window.adminDeleteUser = adminDeleteUser;

// ==========================================
// IX. XỬ LÝ QUÊN MẬT KHẨU & KHÔI PHÚC OTP
// ==========================================

let forgotPasswordState = {
  username: '',
  maskedEmail: '',
  otpCode: ''
};

function openForgotPasswordModal(e) {
  if (e) e.preventDefault();
  
  // Tự động lấy username nếu người dùng đã điền ở ô đăng nhập
  const loginUsername = document.getElementById('username')?.value || '';
  const forgotUsernameInput = document.getElementById('forgot-username');
  if (forgotUsernameInput) {
    forgotUsernameInput.value = loginUsername;
  }

  backToStep1();
  document.getElementById('forgot-modal').classList.remove('hidden');
}
window.openForgotPasswordModal = openForgotPasswordModal;

function closeForgotPasswordModal() {
  document.getElementById('forgot-modal').classList.add('hidden');
  forgotPasswordState = { username: '', maskedEmail: '', otpCode: '' };
}
window.closeForgotPasswordModal = closeForgotPasswordModal;

function backToStep1() {
  document.getElementById('forgot-step-1').classList.remove('hidden');
  document.getElementById('forgot-step-2').classList.add('hidden');
  
  document.getElementById('step1-dot').classList.add('active');
  document.getElementById('step2-dot').classList.remove('active');
}
window.backToStep1 = backToStep1;

// Bước 1: Yêu cầu tự động cấp OTP
async function handleRequestOTP(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('forgot-username');
  const btnSend = document.getElementById('btn-send-otp');
  
  if (!usernameInput || !usernameInput.value.trim()) {
    alert('Vui lòng nhập Tên tài khoản hoặc Mã sinh viên/giảng viên.');
    return;
  }

  const username = usernameInput.value.trim();
  btnSend.disabled = true;
  btnSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tra cứu email & tạo OTP...';

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Lỗi khi gửi yêu cầu cấp mã OTP.');
      btnSend.disabled = false;
      btnSend.innerHTML = 'Gửi mã xác thực OTP <i class="fa-solid fa-paper-plane"></i>';
      return;
    }

    forgotPasswordState.username = data.username || username;
    forgotPasswordState.maskedEmail = data.email || '';
    forgotPasswordState.otpCode = data.mock_otp || '';

    // Cập nhật giao diện hiển thị thông tin sang Bước 2
    document.getElementById('forgot-target-email').textContent = data.email || 'email đã đăng ký';
    
    if (data.mock_otp) {
      document.getElementById('demo-otp-val').textContent = data.mock_otp;
      document.getElementById('demo-otp-badge').classList.remove('hidden');
      document.getElementById('forgot-otp').value = data.mock_otp;
    } else {
      document.getElementById('demo-otp-badge').classList.add('hidden');
      document.getElementById('forgot-otp').value = '';
    }

    document.getElementById('forgot-step-1').classList.add('hidden');
    document.getElementById('forgot-step-2').classList.remove('hidden');
    
    document.getElementById('step1-dot').classList.remove('active');
    document.getElementById('step2-dot').classList.add('active');

    alert(data.message);
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối tới máy chủ backend.');
  } finally {
    btnSend.disabled = false;
    btnSend.innerHTML = 'Gửi mã xác thực OTP <i class="fa-solid fa-paper-plane"></i>';
  }
}
window.handleRequestOTP = handleRequestOTP;

// Bước 2: Nhập OTP & Đặt lại mật khẩu mới
async function handleResetPassword(e) {
  e.preventDefault();
  const otpInput = document.getElementById('forgot-otp');
  const newPassInput = document.getElementById('forgot-new-pass');
  const confirmPassInput = document.getElementById('forgot-confirm-pass');
  const btnReset = document.getElementById('btn-reset-pass');

  const otpCode = otpInput ? otpInput.value.trim() : '';
  const newPassword = newPassInput ? newPassInput.value.trim() : '';
  const confirmPassword = confirmPassInput ? confirmPassInput.value.trim() : '';

  if (!otpCode) {
    alert('Vui lòng nhập mã OTP 6 chữ số.');
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    alert('Mật khẩu mới phải có tối thiểu 8 ký tự.');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('Xác nhận mật khẩu mới không trùng khớp. Vui lòng kiểm tra lại!');
    return;
  }

  btnReset.disabled = true;
  btnReset.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực & cập nhật...';

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: forgotPasswordState.username,
        otpCode,
        newPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Lỗi khi đặt lại mật khẩu.');
      btnReset.disabled = false;
      btnReset.innerHTML = 'Đặt lại mật khẩu <i class="fa-solid fa-check"></i>';
      return;
    }

    alert(data.message);
    
    // Tự động điền tài khoản và mật khẩu mới vào form đăng nhập chính
    const mainUsername = document.getElementById('username');
    const mainPassword = document.getElementById('password');
    if (mainUsername) mainUsername.value = forgotPasswordState.username;
    if (mainPassword) mainPassword.value = newPassword;

    // Đóng Modal và làm sạch các ô nhập
    closeForgotPasswordModal();
    if (newPassInput) newPassInput.value = '';
    if (confirmPassInput) confirmPassInput.value = '';
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối tới máy chủ backend.');
  } finally {
    btnReset.disabled = false;
    btnReset.innerHTML = 'Đặt lại mật khẩu <i class="fa-solid fa-check"></i>';
  }
}
window.handleResetPassword = handleResetPassword;




// Helper: Tải file từ Server có đính kèm JWT Bearer Token
async function downloadFile(endpointUrl, defaultFilename = 'download') {
  try {
    const res = await fetch(`${API_BASE}${endpointUrl}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      alert('Không thể xuất file. Vui lòng kiểm tra lại quyền truy cập.');
      return;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const htmlText = await res.text();
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlText);
        printWin.document.close();
      }
      return;
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    console.error('Lỗi tải file:', err);
    alert('Có lỗi xảy ra khi xuất file.');
  }
}
window.downloadFile = downloadFile;

window.exportClassGradesExcel = function(classId) {
  downloadFile(`/lecturer/classes/${classId}/export-excel`, `Bang_Diem_${classId}.xlsx`);
};

window.exportStudentGradesExcel = function() {
  downloadFile('/student/grades/export-excel', 'Bang_Diem_Ca_Nhan.xlsx');
};

window.exportTuitionReceiptPDF = function() {
  downloadFile('/student/tuition/export-receipt', 'Bien_Lai_Hoc_Phi.html');
};

window.exportAcademicWarningsExcel = function() {
  downloadFile('/pdt/academic-warnings/export-excel', 'Danh_Sach_Canh_Bao_Hoc_Vu.xlsx');
};

// ==========================================================================
// HÀM XỬ LÝ SỬA HỒ SƠ SINH VIÊN / GIẢNG VIÊN DÀNH CHO ADMIN
// ==========================================================================

function adminOpenEditProfileModal(role, id, name, gender, dob, email = '', studentClass = '', majorId = '', departmentId = '', position = '', mainSubject = '') {
  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;

  document.getElementById('edit-profile-role').value = role;
  document.getElementById('edit-profile-id').value = id;
  document.getElementById('edit-profile-title-role').textContent = role === 'student' ? `Sinh viên (MSV: ${id})` : `Giảng viên (MGV: ${id})`;

  document.getElementById('edit-profile-name').value = name || '';
  document.getElementById('edit-profile-gender').value = gender || 'Nam';
  document.getElementById('edit-profile-dob').value = dob ? dob.split('T')[0] : '';
  document.getElementById('edit-profile-email').value = email || '';

  const studentFields = document.getElementById('edit-student-fields');
  const lecturerFields = document.getElementById('edit-lecturer-fields');

  if (role === 'student') {
    studentFields.classList.remove('hidden');
    lecturerFields.classList.add('hidden');
    document.getElementById('edit-profile-class').value = studentClass || '';
    if (majorId) document.getElementById('edit-profile-major').value = majorId;
  } else {
    studentFields.classList.add('hidden');
    lecturerFields.classList.remove('hidden');
    if (departmentId) document.getElementById('edit-profile-dept').value = departmentId;
    document.getElementById('edit-profile-pos').value = position || '';
    document.getElementById('edit-profile-subject').value = mainSubject || '';
  }

  modal.classList.remove('hidden');
}
window.adminOpenEditProfileModal = adminOpenEditProfileModal;

function closeEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeEditProfileModal = closeEditProfileModal;

async function handleSaveProfileEdit(e) {
  e.preventDefault();
  const role = document.getElementById('edit-profile-role').value;
  const id = document.getElementById('edit-profile-id').value;

  const payload = {
    name: document.getElementById('edit-profile-name').value.trim(),
    gender: document.getElementById('edit-profile-gender').value,
    dob: document.getElementById('edit-profile-dob').value,
    email: document.getElementById('edit-profile-email').value.trim()
  };

  if (role === 'student') {
    payload.class = document.getElementById('edit-profile-class').value.trim();
    payload.majorId = document.getElementById('edit-profile-major').value;
  } else {
    payload.departmentId = document.getElementById('edit-profile-dept').value;
    payload.position = document.getElementById('edit-profile-pos').value.trim();
    payload.mainSubject = document.getElementById('edit-profile-subject').value.trim();
  }

  try {
    const res = await fetch(`${API_BASE}/admin/profiles/${role}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message || 'Cập nhật hồ sơ thành công!');
    if (res.ok) {
      closeEditProfileModal();
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi cập nhật hồ sơ.');
  }
}
window.handleSaveProfileEdit = handleSaveProfileEdit;

// ==========================================================================
// CẬP NHẬT EMAIL CÁ NHÂN SINH VIÊN
// ==========================================================================

function openEditStudentEmailModal(currentEmail) {
  const modal = document.getElementById('edit-student-email-modal');
  const input = document.getElementById('edit-student-email-input');
  if (!modal || !input) return;
  input.value = currentEmail || '';
  modal.classList.remove('hidden');
}
window.openEditStudentEmailModal = openEditStudentEmailModal;

function closeEditStudentEmailModal() {
  const modal = document.getElementById('edit-student-email-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeEditStudentEmailModal = closeEditStudentEmailModal;

async function handleSaveStudentEmail(e) {
  e.preventDefault();
  const input = document.getElementById('edit-student-email-input');
  if (!input || !input.value.trim()) {
    alert('Vui lòng nhập địa chỉ Email mới.');
    return;
  }

  const email = input.value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    alert(data.message || 'Cập nhật email thành công!');
    if (res.ok) {
      if (state.profile) state.profile.email = email;
      closeEditStudentEmailModal();
      switchTab(state.currentTab);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi khi cập nhật email.');
  }
}
window.handleSaveStudentEmail = handleSaveStudentEmail;

// ==========================================================================
// THỜI KHÓA BIỂU MẪU MỚI: LỊCH CÁ NHÂN & MINI CALENDAR WIDGET (HOÀN THIỆN TƯƠNG TÁC)
// ==========================================================================
if (!window.selectedScheduleDate) {
  window.selectedScheduleDate = new Date('2026-07-24');
}
if (!window.miniCalDisplayedDate) {
  window.miniCalDisplayedDate = new Date('2026-07-24');
}

async function renderStudentScheduleTab(container) {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/student/schedule`, { headers });
    const schedules = await res.json();

    const selectedDate = window.selectedScheduleDate || new Date('2026-07-24');
    const displayedCalDate = window.miniCalDisplayedDate || new Date(selectedDate);

    // 1. Tính ngày Thứ 2 của tuần chứa selectedDate
    const monday = new Date(selectedDate);
    const day = monday.getDay();
    const diffToMonday = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diffToMonday);

    // 2. Tạo mảng 7 ngày từ Thứ 2 đến Chủ nhật của tuần này
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayName = i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`;
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      weekDays.push({
        dateObj: d,
        dayOfWeek: i === 6 ? 1 : (i + 2), // 2 -> 7 cho T2 -> T7, 1 cho Chủ nhật
        dayName,
        dateFormatted
      });
    }

    // 3. Danh sách Khung giờ VN từ 6:00 đến 18:00
    const hours = [
      { label: '6:00' },
      { label: '7:00' },
      { label: '8:00' },
      { label: '9:00' },
      { label: '10:00' },
      { label: '11:00' },
      { label: '12:00' },
      { label: '13:00' },
      { label: '14:00' },
      { label: '15:00' },
      { label: '16:00' },
      { label: '17:00' },
      { label: '18:00' }
    ];

    // Header các ngày trong tuần
    let dayHeadersHTML = `<div class="grid-time-header">🕒<br>Giờ VN</div>`;
    weekDays.forEach(wd => {
      const isSelectedDay = wd.dateObj.getDate() === selectedDate.getDate() && 
                            wd.dateObj.getMonth() === selectedDate.getMonth() && 
                            wd.dateObj.getFullYear() === selectedDate.getFullYear();
      const highlightBg = isSelectedDay ? 'background: rgba(234, 88, 12, 0.2); border-bottom: 2px solid #ea580c;' : '';
      
      dayHeadersHTML += `
        <div class="grid-time-header" style="${highlightBg}">
          <div style="font-size:0.95rem; font-weight:700;">${wd.dateFormatted}</div>
          <div style="color:${isSelectedDay ? '#ea580c' : 'var(--text-secondary)'}; font-weight:600; font-size:0.85rem;">${wd.dayName}</div>
        </div>
      `;
    });

    // Lưới theo khung giờ
    let gridRowsHTML = '';
    hours.forEach(hr => {
      gridRowsHTML += `<div class="grid-time-slot-label">${hr.label}</div>`;

      weekDays.forEach(wd => {
        // Tìm môn học bắt đầu khớp khung giờ này
        const matched = schedules.filter(c => {
          if (c.dayOfWeek !== wd.dayOfWeek) return false;
          if (hr.label === '7:00' && c.startSlot === 1 && c.shift === 'morning') return true;
          if (hr.label === '8:00' && c.startSlot === 2 && c.shift === 'morning') return true;
          if (hr.label === '13:00' && c.startSlot === 7 && c.shift === 'afternoon') return true;
          if (hr.label === '14:00' && c.startSlot === 8 && c.shift === 'afternoon') return true;
          return false;
        });

        let cardContent = '';
        matched.forEach(c => {
          const timeRangeStr = c.shift === 'morning' ? '06:45 - 09:25' : '13:00 - 15:40';
          const slotsStr = `Tiết ${c.startSlot}-${c.startSlot + c.numSlots - 1}`;
          
          cardContent += `
            <div class="schedule-card-item">
              <div class="schedule-card-header-amber">
                <div class="schedule-card-title">${escapeHtml(c.courseName)}</div>
                <div class="schedule-card-time">${timeRangeStr} (${slotsStr})</div>
              </div>
              <div class="schedule-card-body">
                <p style="font-weight:600; color:#1e293b;">${escapeHtml(c.courseName)}-${c.dayOfWeek}-${c.startSlot}-25(${c.classId})</p>
                <p><i class="fa-solid fa-location-dot" style="color:#d97706;"></i> Có mặt ${escapeHtml(c.roomName)} (${c.roomType === 'lab' ? 'PC' : 'LT'})</p>
                <p><i class="fa-solid fa-user-tie" style="color:#4f46e5;"></i> ${escapeHtml(c.lecturerName)}</p>
              </div>
            </div>
          `;
        });

        gridRowsHTML += `<div class="grid-hourly-cell">${cardContent}</div>`;
      });
    });

    // 4. Render Bộ Lịch Tháng Mini Widget
    const calYear = displayedCalDate.getFullYear();
    const calMonth = displayedCalDate.getMonth(); // 0-indexed
    const calMonthName = `Tháng ${calMonth + 1}-${calYear}`;

    const firstDayOfMonth = new Date(calYear, calMonth, 1);
    const lastDayOfMonth = new Date(calYear, calMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    let startWeekday = firstDayOfMonth.getDay() - 1;
    if (startWeekday === -1) startWeekday = 6;

    let daysGridHTML = '';
    
    // Các ngày thuộc tháng trước
    const prevMonthDateObj = new Date(calYear, calMonth, 0);
    const prevMonthLastDay = prevMonthDateObj.getDate();
    const prevYear = prevMonthDateObj.getFullYear();
    const prevMonth = prevMonthDateObj.getMonth();

    for (let p = startWeekday - 1; p >= 0; p--) {
      const dNum = prevMonthLastDay - p;
      daysGridHTML += `
        <div class="mini-cal-day-cell other-month" onclick="selectScheduleCalendarDate(${prevYear}, ${prevMonth}, ${dNum})">
          ${dNum}
        </div>
      `;
    }

    // Các ngày thuộc tháng hiện tại
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const isSelected = dayNum === selectedDate.getDate() && calMonth === selectedDate.getMonth() && calYear === selectedDate.getFullYear();
      const activeClass = isSelected ? 'active' : '';
      daysGridHTML += `
        <div class="mini-cal-day-cell ${activeClass}" onclick="selectScheduleCalendarDate(${calYear}, ${calMonth}, ${dayNum})">
          ${dayNum}
        </div>
      `;
    }

    // Các ngày thuộc tháng tiếp theo để lấp đầy bảng (35 hoặc 42 ô)
    const totalFilledCells = startWeekday + daysInMonth;
    const totalGridCells = totalFilledCells > 35 ? 42 : 35;
    const nextMonthDaysCount = totalGridCells - totalFilledCells;
    
    const nextMonthDateObj = new Date(calYear, calMonth + 1, 1);
    const nextYear = nextMonthDateObj.getFullYear();
    const nextMonth = nextMonthDateObj.getMonth();

    for (let n = 1; n <= nextMonthDaysCount; n++) {
      daysGridHTML += `
        <div class="mini-cal-day-cell other-month" onclick="selectScheduleCalendarDate(${nextYear}, ${nextMonth}, ${n})">
          ${n}
        </div>
      `;
    }

    const currentWeekRangeStr = `Tuần từ ${weekDays[0].dateFormatted} đến ${weekDays[6].dateFormatted}`;

    container.innerHTML = `
      <div class="schedule-breadcrumb" style="display:flex; justify-content:space-between; align-items:center;">
        <div>Thời khóa biểu &gt; <span>Lịch học</span></div>
        <div style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-calendar-day"></i> ${currentWeekRangeStr}</div>
      </div>

      <div class="schedule-page-wrapper">
        <!-- CỘT TRÁI: LỊCH CÁ NHÂN KHUNG GIỜ VN -->
        <div class="schedule-main-card glass-card">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fa-solid fa-calendar-week"></i> Lịch cá nhân</span>
            <button class="btn-sm btn-secondary" onclick="resetScheduleToToday()"><i class="fa-solid fa-rotate-left"></i> Hôm nay</button>
          </div>

          <div class="timetable-hourly-wrapper">
            <div class="timetable-hourly-grid">
              ${dayHeadersHTML}
              ${gridRowsHTML}
            </div>
          </div>
        </div>

        <!-- CỘT PHẢI: MINI CALENDAR WIDGET -->
        <div class="mini-calendar-widget">
          <div class="mini-calendar-card">
            <div class="mini-calendar-header">
              <span class="mini-calendar-month-title">${calMonthName}</span>
              <div>
                <button class="cal-nav-btn" onclick="navScheduleMonth(-1)" title="Tháng trước"><i class="fa-solid fa-chevron-left"></i></button>
                <button class="cal-nav-btn" onclick="navScheduleMonth(1)" title="Tháng sau"><i class="fa-solid fa-chevron-right"></i></button>
              </div>
            </div>

            <div class="mini-cal-weekdays">
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
              <div>Cn</div>
            </div>

            <div class="mini-cal-days-grid">
              ${daysGridHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Lỗi render Thời khóa biểu:', err);
    container.innerHTML = `<div class="glass-card"><p style="color:red;">Lỗi tải thời khóa biểu.</p></div>`;
  }
}

window.selectScheduleCalendarDate = function(y, m, d) {
  window.selectedScheduleDate = new Date(y, m, d);
  window.miniCalDisplayedDate = new Date(y, m, d);
  const container = document.getElementById('page-view-content');
  if (container) {
    renderStudentScheduleTab(container);
  }
};

window.navScheduleMonth = function(delta) {
  const current = window.miniCalDisplayedDate || new Date('2026-07-24');
  const newDate = new Date(current.getFullYear(), current.getMonth() + delta, 1);
  window.miniCalDisplayedDate = newDate;
  const container = document.getElementById('page-view-content');
  if (container) {
    renderStudentScheduleTab(container);
  }
};

window.resetScheduleToToday = function() {
  const today = new Date('2026-07-24');
  window.selectedScheduleDate = today;
  window.miniCalDisplayedDate = today;
  const container = document.getElementById('page-view-content');
  if (container) {
    renderStudentScheduleTab(container);
  }
};

window.renderStudentScheduleTab = renderStudentScheduleTab;
