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