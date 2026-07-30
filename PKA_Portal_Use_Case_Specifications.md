# 1.6 ĐẶC TẢ CÁC USE-CASE

Tài liệu đặc tả **30 Use-case mức 2** của PKA Portal, được sắp xếp theo thứ tự hình thành và phụ thuộc dữ liệu. Mỗi Use-case sử dụng đúng cấu trúc bảng thống nhất và tham chiếu tới giao diện minh họa ở Phụ lục A.

## 1.6.1 UC1.1. Quản lý khoa

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC1.1. Quản lý khoa** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Quản lý danh mục khoa làm dữ liệu nền cho ngành đào tạo và hồ sơ giảng viên. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Cán bộ mở mục Cấu hình đào tạo – Khoa. |
| **Tiền điều kiện** | Đã đăng nhập với vai trò pdt. |
| **Hậu điều kiện** | Khoa được tạo/cập nhật/xóa hợp lệ; dữ liệu giữ nguyên nếu thất bại. |
| **Luồng thông thường** | <ol><li>Hệ thống tải danh sách khoa theo tên.</li><li>Cán bộ nhập mã và tên khoa.</li><li>Hệ thống kiểm tra dữ liệu bắt buộc và mã duy nhất.</li><li>Hệ thống lưu khoa và tải lại danh sách.</li></ol> |
| **Luồng thay thế** | <ol><li>Cán bộ đổi tên khoa.</li><li>Cán bộ xóa khoa chưa có ngành hoặc giảng viên.</li><li>Cán bộ hủy thao tác.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Thiếu mã/tên hoặc trùng mã: từ chối lưu.</li><li>Khoa đang có ngành/giảng viên: từ chối xóa.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mã khoa là duy nhất.</li><li>Không xóa khoa còn dữ liệu phụ thuộc.</li><li>Chỉ vai trò pdt được quản lý.</li></ol> |
| **Các giả thuyết** | <ol><li>Mã khoa do nhà trường quy định.</li><li>Danh sách khoa đủ nhỏ để chưa cần phân trang.</li></ol> |
| **Giao diện minh họa** | **UI-01** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.2 UC1.2. Quản lý ngành đào tạo

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC1.2. Quản lý ngành đào tạo** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Quản lý ngành trực thuộc khoa; ngành được dùng cho hồ sơ sinh viên và phân loại môn học. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Cán bộ mở mục Cấu hình đào tạo – Ngành. |
| **Tiền điều kiện** | Đã đăng nhập vai trò pdt và có ít nhất một khoa. |
| **Hậu điều kiện** | Ngành và liên kết khoa được lưu hợp lệ. |
| **Luồng thông thường** | <ol><li>Hệ thống tải khoa và ngành.</li><li>Cán bộ nhập mã, tên ngành và chọn khoa.</li><li>Hệ thống kiểm tra khoa tồn tại và mã ngành duy nhất.</li><li>Hệ thống lưu ngành và hiển thị tên khoa.</li></ol> |
| **Luồng thay thế** | <ol><li>Đổi tên ngành.</li><li>Chuyển ngành sang khoa khác.</li><li>Xóa ngành chưa có sinh viên/môn học.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Khoa không tồn tại hoặc thiếu dữ liệu: từ chối lưu.</li><li>Ngành có sinh viên/môn học: từ chối xóa.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mỗi ngành thuộc một khoa.</li><li>Mã ngành là duy nhất.</li><li>Không xóa ngành còn dữ liệu phụ thuộc.</li></ol> |
| **Các giả thuyết** | <ol><li>Khoa được tạo trước ngành.</li><li>Chưa quản lý lịch sử chuyển ngành.</li></ol> |
| **Giao diện minh họa** | **UI-01** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.3 UC2.1. Quản lý tài khoản và hồ sơ sinh viên

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC2.1. Quản lý tài khoản và hồ sơ sinh viên** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tạo và quản lý đồng thời tài khoản đăng nhập cùng hồ sơ học vụ của sinh viên. |
| **Tác nhân chính** | Quản trị viên |
| **Tác nhân phụ (nếu có)** | Phòng Đào tạo cung cấp ngành |
| **Sự kiện kích hoạt** | Quản trị viên chọn quản lý người dùng – Sinh viên. |
| **Tiền điều kiện** | Đã đăng nhập vai trò admin; ngành đã tồn tại. |
| **Hậu điều kiện** | User và Student được tạo/cập nhật đồng bộ trong transaction. |
| **Luồng thông thường** | <ol><li>Admin nhập username, mật khẩu, MSV, họ tên, email, lớp, ngành và ngày nhập học.</li><li>Hệ thống kiểm tra dữ liệu trùng và ngành tồn tại.</li><li>Hệ thống băm mật khẩu.</li><li>Hệ thống tạo User và Student trong một transaction.</li><li>Hệ thống ghi Audit Log và hiển thị hồ sơ.</li></ol> |
| **Luồng thay thế** | <ol><li>Admin sửa họ tên, giới tính, ngày sinh, email, lớp hoặc ngành.</li><li>Admin lọc danh sách theo vai trò student.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Username/MSV/email trùng hoặc ngành không tồn tại: rollback.</li><li>Thiếu trường bắt buộc: từ chối tạo.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Một User gắn tối đa một Student.</li><li>Mật khẩu tối thiểu 8 ký tự và phải băm.</li><li>Tạo tài khoản/hồ sơ là thao tác nguyên tử.</li></ol> |
| **Các giả thuyết** | <ol><li>Mỗi sinh viên thuộc một ngành và một lớp sinh hoạt tại một thời điểm.</li></ol> |
| **Giao diện minh họa** | **UI-02** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.4 UC2.2. Quản lý tài khoản và hồ sơ giảng viên

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC2.2. Quản lý tài khoản và hồ sơ giảng viên** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tạo và quản lý tài khoản cùng hồ sơ chuyên môn của giảng viên. |
| **Tác nhân chính** | Quản trị viên |
| **Tác nhân phụ (nếu có)** | Phòng Đào tạo cung cấp khoa |
| **Sự kiện kích hoạt** | Admin chọn quản lý người dùng – Giảng viên. |
| **Tiền điều kiện** | Đã đăng nhập vai trò admin; khoa đã tồn tại. |
| **Hậu điều kiện** | User và Lecturer được lưu đồng bộ. |
| **Luồng thông thường** | <ol><li>Admin nhập username, mật khẩu, MGV, họ tên, email, khoa, chức vụ và môn chính.</li><li>Hệ thống kiểm tra trùng và khoa tồn tại.</li><li>Hệ thống băm mật khẩu.</li><li>Hệ thống tạo User và Lecturer trong transaction.</li><li>Hệ thống ghi nhật ký.</li></ol> |
| **Luồng thay thế** | <ol><li>Sửa hồ sơ giảng viên.</li><li>Lọc danh sách theo lecturer.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Username/MGV/email trùng hoặc khoa không tồn tại: rollback.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Một User gắn tối đa một Lecturer.</li><li>Giảng viên phải thuộc một khoa.</li><li>Mật khẩu không lưu dạng rõ.</li></ol> |
| **Các giả thuyết** | <ol><li>Phân công lớp được thực hiện sau khi hồ sơ giảng viên tồn tại.</li></ol> |
| **Giao diện minh họa** | **UI-02** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.5 UC2.3. Quản lý tài khoản cán bộ

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC2.3. Quản lý tài khoản cán bộ** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tạo và quản lý tài khoản cho Phòng Đào tạo và quản trị viên. |
| **Tác nhân chính** | Quản trị viên |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Admin chọn thêm tài khoản cán bộ. |
| **Tiền điều kiện** | Đã đăng nhập vai trò admin. |
| **Hậu điều kiện** | Tài khoản pdt/admin được tạo với quyền tương ứng. |
| **Luồng thông thường** | <ol><li>Admin nhập username, mật khẩu và vai trò pdt hoặc admin.</li><li>Hệ thống kiểm tra username duy nhất và độ dài mật khẩu.</li><li>Hệ thống băm mật khẩu và tạo User.</li><li>Hệ thống ghi Audit Log.</li></ol> |
| **Luồng thay thế** | <ol><li>Admin thay đổi trạng thái hoặc đặt lại mật khẩu.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Username trùng hoặc vai trò không hợp lệ: từ chối tạo.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Vai trò chỉ thuộc tập admin, pdt, lecturer, student.</li><li>Tài khoản mới mặc định active và isFirstLogin.</li></ol> |
| **Các giả thuyết** | <ol><li>Tài khoản cán bộ không cần hồ sơ Student/Lecturer.</li></ol> |
| **Giao diện minh họa** | **UI-02** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.6 UC2.4. Quản lý vòng đời tài khoản

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC2.4. Quản lý vòng đời tài khoản** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Khóa, mở khóa, đặt lại mật khẩu hoặc xóa tài khoản và dữ liệu liên quan. |
| **Tác nhân chính** | Quản trị viên |
| **Tác nhân phụ (nếu có)** | Người dùng bị tác động |
| **Sự kiện kích hoạt** | Admin chọn thao tác trên một tài khoản. |
| **Tiền điều kiện** | Tài khoản đích tồn tại; admin đã xác thực. |
| **Hậu điều kiện** | Trạng thái/mật khẩu được cập nhật hoặc tài khoản được xóa an toàn. |
| **Luồng thông thường** | <ol><li>Admin chọn tài khoản.</li><li>Hệ thống hiển thị hồ sơ và trạng thái.</li><li>Admin chọn khóa, mở khóa, đặt lại mật khẩu hoặc xóa.</li><li>Hệ thống kiểm tra yêu cầu.</li><li>Hệ thống cập nhật/xóa trong transaction và ghi Audit Log.</li></ol> |
| **Luồng thay thế** | <ol><li>Admin hủy xác nhận.</li><li>Admin chỉ sửa hồ sơ mà không đổi trạng thái.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Tài khoản không tồn tại.</li><li>Xóa thất bại ở một bảng: rollback toàn bộ.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Tài khoản locked không được đăng nhập.</li><li>Xóa User xử lý profile, token và thông báo theo quan hệ.</li></ol> |
| **Các giả thuyết** | <ol><li>Admin chịu trách nhiệm xác nhận đúng đối tượng trước khi xóa.</li></ol> |
| **Giao diện minh họa** | **UI-02** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.7 UC3.1. Quản lý học kỳ

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC3.1. Quản lý học kỳ** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Quản lý mã, tên, thời gian, trạng thái và học kỳ hiện hành. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Cán bộ mở cấu hình học kỳ. |
| **Tiền điều kiện** | Đã đăng nhập vai trò pdt. |
| **Hậu điều kiện** | Học kỳ được lưu; chỉ một kỳ được đánh dấu hiện hành. |
| **Luồng thông thường** | <ol><li>Cán bộ nhập mã, tên, ngày bắt đầu/kết thúc và trạng thái.</li><li>Hệ thống kiểm tra thời gian.</li><li>Nếu chọn hiện hành, hệ thống bỏ cờ hiện hành ở kỳ khác.</li><li>Hệ thống lưu trong transaction.</li></ol> |
| **Luồng thay thế** | <ol><li>Sửa học kỳ.</li><li>Đặt một học kỳ khác làm hiện hành.</li><li>Xóa học kỳ chưa sử dụng.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Ngày kết thúc không sau ngày bắt đầu.</li><li>Không xóa học kỳ hiện hành hoặc đã có lớp.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Chỉ một AcademicTerm có isCurrent=true.</li><li>Trạng thái thuộc planned/active/closed.</li></ol> |
| **Các giả thuyết** | <ol><li>Mã học kỳ theo dạng HK1-YYYY hoặc quy ước tương đương.</li></ol> |
| **Giao diện minh họa** | **UI-03** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.8 UC3.2. Quản lý đợt đăng ký

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC3.2. Quản lý đợt đăng ký** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Thiết lập các khoảng mở/đóng cổng đăng ký gắn với học kỳ. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên sử dụng thời gian cấu hình |
| **Sự kiện kích hoạt** | Cán bộ chọn quản lý đợt đăng ký. |
| **Tiền điều kiện** | Học kỳ đã tồn tại; người dùng là pdt. |
| **Hậu điều kiện** | RegistrationPeriod được lưu và trạng thái cổng được xác định đúng. |
| **Luồng thông thường** | <ol><li>Cán bộ chọn học kỳ, nhập tên, thời gian mở/đóng và trạng thái bật.</li><li>Hệ thống kiểm tra kỳ tồn tại và thời gian hợp lệ.</li><li>Hệ thống lưu đợt.</li><li>Frontend nhận trạng thái cổng hiện tại/đợt tiếp theo.</li></ol> |
| **Luồng thay thế** | <ol><li>Sửa thời gian.</li><li>Bật/tắt đợt.</li><li>Xóa đợt.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Học kỳ không tồn tại.</li><li>Thời gian đóng không sau thời gian mở.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Cổng mở khi isEnabled=true và thời gian máy chủ nằm trong khoảng.</li><li>Đợt phải thuộc một học kỳ.</li></ol> |
| **Các giả thuyết** | <ol><li>Đồng hồ máy chủ là nguồn thời gian chuẩn.</li></ol> |
| **Giao diện minh họa** | **UI-03** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.9 UC4.1. Quản lý môn học

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC4.1. Quản lý môn học** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tạo và tra cứu môn học với mã, tên, tín chỉ, ngành và học kỳ lộ trình. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Cán bộ mở danh mục môn học. |
| **Tiền điều kiện** | Ngành cần gán đã tồn tại; người dùng là pdt. |
| **Hậu điều kiện** | Course mới được lưu và xuất hiện trong danh sách. |
| **Luồng thông thường** | <ol><li>Hệ thống tải danh sách môn có phân trang.</li><li>Cán bộ nhập mã, tên, tín chỉ, ngành và term.</li><li>Hệ thống kiểm tra dữ liệu và mã duy nhất.</li><li>Hệ thống tạo môn.</li></ol> |
| **Luồng thay thế** | <ol><li>Tạo môn dùng chung với majorId rỗng.</li><li>Tra cứu các trang danh sách.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Trùng mã hoặc dữ liệu không hợp lệ: từ chối tạo.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mã môn là duy nhất.</li><li>Tín chỉ là số nguyên dương.</li><li>majorId rỗng biểu thị môn dùng chung.</li></ol> |
| **Các giả thuyết** | <ol><li>API hiện tập trung xem/tạo môn, chưa có cập nhật/xóa môn.</li></ol> |
| **Giao diện minh họa** | **UI-04** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.10 UC4.2. Thiết lập môn tiên quyết và lộ trình

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC4.2. Thiết lập môn tiên quyết và lộ trình** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Gắn môn học với học kỳ đề xuất và môn tiên quyết để kiểm soát đăng ký. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên chịu điều kiện |
| **Sự kiện kích hoạt** | Cán bộ nhập thông tin chương trình khi tạo môn. |
| **Tiền điều kiện** | Môn tiên quyết (nếu có) đã tồn tại. |
| **Hậu điều kiện** | Quan hệ prerequisite và term được lưu. |
| **Luồng thông thường** | <ol><li>Cán bộ chọn ngành và học kỳ đề xuất.</li><li>Cán bộ chọn môn tiên quyết.</li><li>Hệ thống kiểm tra môn tiên quyết tồn tại và khác môn hiện tại.</li><li>Hệ thống lưu cấu hình.</li></ol> |
| **Luồng thay thế** | <ol><li>Không chọn tiên quyết đối với môn cơ sở.</li><li>Để majorId rỗng cho môn dùng chung.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Môn tự tham chiếu hoặc môn tiên quyết không tồn tại.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Môn không được tiên quyết chính nó.</li><li>Sinh viên phải có điểm khóa khác F ở môn tiên quyết.</li></ol> |
| **Các giả thuyết** | <ol><li>Chỉ mô hình một môn tiên quyết trực tiếp cho mỗi Course.</li></ol> |
| **Giao diện minh họa** | **UI-04** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.11 UC5.1. Mở lớp học phần

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC5.1. Mở lớp học phần** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Mở lớp từ môn học, gán giảng viên, phòng, lịch và sức chứa trong một học kỳ. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Giảng viên |
| **Sự kiện kích hoạt** | Cán bộ chọn tạo lớp học phần. |
| **Tiền điều kiện** | Course, Lecturer và AcademicTerm đã tồn tại. |
| **Hậu điều kiện** | Class trạng thái active được tạo nếu không xung đột. |
| **Luồng thông thường** | <ol><li>Cán bộ nhập mã lớp, môn, giảng viên, phòng, loại phòng, sức chứa và lịch.</li><li>Hệ thống xác định học kỳ.</li><li>Hệ thống kiểm tra giao nhau của phòng.</li><li>Hệ thống kiểm tra giao nhau lịch giảng viên.</li><li>Hệ thống tạo lớp active.</li></ol> |
| **Luồng thay thế** | <ol><li>Xem danh sách lớp có phân trang.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Trùng phòng hoặc trùng giảng viên trong khoảng tiết.</li><li>Mã lớp hoặc dữ liệu tham chiếu không hợp lệ.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Khoảng giao nhau khi start1<end2 và start2<end1.</li><li>Một phòng/giảng viên không phục vụ hai lớp giao giờ.</li></ol> |
| **Các giả thuyết** | <ol><li>Lịch học dùng thứ, ca, tiết bắt đầu và số tiết.</li></ol> |
| **Giao diện minh họa** | **UI-05** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.12 UC5.2. Hủy lớp thiếu sĩ số

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC5.2. Hủy lớp thiếu sĩ số** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Hủy lớp có dưới 15 sinh viên và đồng bộ đăng ký, học phí. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên bị ảnh hưởng |
| **Sự kiện kích hoạt** | Cán bộ chọn hủy một lớp. |
| **Tiền điều kiện** | Lớp tồn tại, active; người dùng là pdt. |
| **Hậu điều kiện** | Lớp canceled; đăng ký bị xóa; học phí được tính lại. |
| **Luồng thông thường** | <ol><li>Hệ thống khóa transaction và tải lớp.</li><li>Đếm sinh viên enrolled.</li><li>Nếu dưới 15, đổi lớp thành canceled.</li><li>Xóa đăng ký liên quan.</li><li>Tính lại học phí từng sinh viên.</li><li>Ghi Audit Log và commit.</li></ol> |
| **Luồng thay thế** | <ol><li>Cán bộ hủy xác nhận trước khi gửi.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Lớp không tồn tại/đã hủy.</li><li>Sĩ số từ 15 trở lên: từ chối.</li><li>Lỗi giữa quy trình: rollback.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Chỉ hủy theo luồng này khi enrolled<15.</li><li>Mọi thay đổi phải nguyên tử.</li></ol> |
| **Các giả thuyết** | <ol><li>Quyết định hủy do Phòng Đào tạo thực hiện.</li></ol> |
| **Giao diện minh họa** | **UI-05** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.13 UC6.1. Đăng nhập và quản lý phiên

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC6.1. Đăng nhập và quản lý phiên** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Xác thực bằng username/email/MSV/MGV, cấp token, làm mới phiên và đăng xuất. |
| **Tác nhân chính** | Người dùng |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Người dùng gửi biểu mẫu đăng nhập. |
| **Tiền điều kiện** | Tài khoản tồn tại và chưa bị khóa. |
| **Hậu điều kiện** | Phiên hợp lệ được cấp hoặc toàn bộ token được thu hồi khi đăng xuất. |
| **Luồng thông thường** | <ol><li>Người dùng nhập định danh và mật khẩu.</li><li>Hệ thống tìm User, kiểm tra status và bcrypt.</li><li>Hệ thống cấp access/refresh token.</li><li>Frontend tải vai trò và hồ sơ.</li><li>Khi token hết hạn, hệ thống xoay refresh token.</li></ol> |
| **Luồng thay thế** | <ol><li>Đăng xuất một phiên.</li><li>Đăng xuất tất cả thiết bị.</li><li>Tự nâng cấp mật khẩu cũ sau đăng nhập đúng.</li></ol> |
| **Các ngoại lệ** | <ol><li>Sai thông tin hoặc locked: từ chối.</li><li>Refresh token hết hạn/bị thu hồi.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Refresh token chỉ dùng một lần rồi xoay.</li><li>tokenVersion phải khớp User.</li></ol> |
| **Các giả thuyết** | <ol><li>Thiết bị lưu token theo cơ chế frontend hiện tại.</li></ol> |
| **Giao diện minh họa** | **UI-06** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.14 UC6.2. Đổi và khôi phục mật khẩu

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC6.2. Đổi và khôi phục mật khẩu** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Đổi mật khẩu khi biết mật khẩu cũ hoặc đặt lại bằng OTP sáu chữ số. |
| **Tác nhân chính** | Người dùng |
| **Tác nhân phụ (nếu có)** | Dịch vụ Email/SMTP |
| **Sự kiện kích hoạt** | Người dùng chọn đổi/quên mật khẩu. |
| **Tiền điều kiện** | Tài khoản active; có email khi dùng OTP. |
| **Hậu điều kiện** | Mật khẩu mới được băm; OTP xóa; phiên cũ bị thu hồi khi reset. |
| **Luồng thông thường** | <ol><li>Người dùng yêu cầu OTP bằng định danh.</li><li>Hệ thống tạo và băm OTP, hạn 5 phút.</li><li>SMTP gửi OTP tới email che mờ.</li><li>Người dùng nhập OTP và mật khẩu mới.</li><li>Hệ thống xác thực, lưu mật khẩu và thu hồi phiên.</li></ol> |
| **Luồng thay thế** | <ol><li>Đổi mật khẩu bằng mật khẩu hiện tại.</li><li>OTP demo chỉ khi môi trường phát triển cho phép.</li></ol> |
| **Các ngoại lệ** | <ol><li>OTP sai/hết hạn; tài khoản locked; mật khẩu mới dưới 8 ký tự.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>OTP dùng một lần và có hạn 5 phút.</li><li>Mật khẩu tối thiểu 8 ký tự, băm bcrypt.</li></ol> |
| **Các giả thuyết** | <ol><li>SMTP được cấu hình trong production.</li></ol> |
| **Giao diện minh họa** | **UI-06** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.15 UC6.3. Xem và cập nhật hồ sơ cá nhân

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC6.3. Xem và cập nhật hồ sơ cá nhân** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Hiển thị tài khoản, hồ sơ vai trò, học kỳ hiện hành; sinh viên được cập nhật email. |
| **Tác nhân chính** | Người dùng |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Người dùng mở hồ sơ. |
| **Tiền điều kiện** | Đã xác thực. |
| **Hậu điều kiện** | Hồ sơ/ngữ cảnh được hiển thị; email mới được lưu nếu hợp lệ. |
| **Luồng thông thường** | <ol><li>Hệ thống đọc User.</li><li>Theo vai trò, tải Student kèm Major/Department hoặc Lecturer kèm Department.</li><li>Tính tiến độ học kỳ sinh viên.</li><li>Hiển thị hồ sơ.</li><li>Nếu sinh viên sửa email, hệ thống lưu và ghi log.</li></ol> |
| **Luồng thay thế** | <ol><li>Chỉ xem hồ sơ.</li><li>Tải riêng ngữ cảnh kỳ và đợt đăng ký.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không tìm thấy profile tương ứng.</li></ol> |
| **Độ ưu tiên** | Trung bình |
| **Các quy tắc nghiệp vụ** | <ol><li>Người dùng không tự sửa các trường học vụ khác.</li><li>Học kỳ lấy từ AcademicTerm hiện hành.</li></ol> |
| **Các giả thuyết** | <ol><li>Quản trị viên xử lý các sửa đổi hồ sơ nâng cao.</li></ol> |
| **Giao diện minh họa** | **UI-06** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.16 UC7.1. Tra cứu và đăng ký học phần

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC7.1. Tra cứu và đăng ký học phần** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tra cứu lớp phù hợp và đăng ký sau khi kiểm tra toàn bộ điều kiện học vụ. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Phòng Đào tạo cấu hình dữ liệu |
| **Sự kiện kích hoạt** | Sinh viên chọn Đăng ký tại một lớp. |
| **Tiền điều kiện** | Đã đăng nhập student; cổng mở; lớp active. |
| **Hậu điều kiện** | Registration enrolled hoặc waitlist được tạo; học phí/log được cập nhật. |
| **Luồng thông thường** | <ol><li>Hệ thống lọc lớp theo ngành/lộ trình.</li><li>Sinh viên chọn lớp.</li><li>Hệ thống khóa lớp trong transaction.</li><li>Kiểm tra trùng đăng ký, ngành, lộ trình, tiên quyết, lịch và tín chỉ.</li><li>Kiểm tra capacity.</li><li>Tạo enrolled hoặc waitlist, tính học phí, ghi log và commit.</li></ol> |
| **Luồng thay thế** | <ol><li>Nếu lớp đầy, gán queueOrder.</li><li>Xác định retake/improve từ điểm cũ.</li></ol> |
| **Các ngoại lệ** | <ol><li>Cổng đóng; lớp hủy; thiếu tiên quyết; trùng lịch; vượt 24/12 tín chỉ; sinh viên đã bị buộc thôi học.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Student thường tối đa 24 TC, cảnh báo tối đa 12 TC, buộc thôi học không được đăng ký.</li><li>Danh sách ưu tiên theo thứ tự: học lại, nâng điểm, học mới theo chương trình.</li><li>Chỉ điểm khóa khác F thỏa tiên quyết.</li><li>Hàng chờ FIFO.</li></ol> |
| **Các giả thuyết** | <ol><li>Dữ liệu lịch lớp chính xác.</li></ol> |
| **Giao diện minh họa** | **UI-07** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.17 UC7.2. Hủy đăng ký và xử lý hàng chờ

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC7.2. Hủy đăng ký và xử lý hàng chờ** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Hủy lớp trong thời gian cho phép và tự động đôn người đầu hàng chờ. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Sinh viên đầu hàng chờ |
| **Sự kiện kích hoạt** | Sinh viên chọn Hủy tại đăng ký. |
| **Tiền điều kiện** | Cổng mở; đăng ký thuộc sinh viên. |
| **Hậu điều kiện** | Đăng ký bị xóa; hàng chờ/học phí được đồng bộ. |
| **Luồng thông thường** | <ol><li>Hệ thống mở transaction và tìm đăng ký.</li><li>Kiểm tra cổng.</li><li>Xóa đăng ký.</li><li>Nếu bản ghi enrolled, tìm queueOrder nhỏ nhất.</li><li>Đôn người chờ, tính học phí và gửi thông báo.</li><li>Đánh lại queueOrder, tính học phí người hủy, ghi log, commit.</li></ol> |
| **Luồng thay thế** | <ol><li>Hủy bản ghi waitlist chỉ cần đánh lại thứ tự.</li><li>Không có người chờ thì chỉ cập nhật học phí người hủy.</li></ol> |
| **Các ngoại lệ** | <ol><li>Không tìm thấy đăng ký; cổng đóng; lỗi transaction.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>FIFO theo queueOrder tăng dần.</li><li>Tất cả bước phải commit/rollback cùng nhau.</li></ol> |
| **Các giả thuyết** | <ol><li>Sinh viên được phép rút môn trong toàn bộ đợt đăng ký.</li></ol> |
| **Giao diện minh họa** | **UI-07** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.18 UC7.3. Xem đăng ký và thời khóa biểu

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC7.3. Xem đăng ký và thời khóa biểu** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Hiển thị danh sách đăng ký và lưới lịch học chính thức. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Sinh viên mở Môn đã đăng ký hoặc Thời khóa biểu. |
| **Tiền điều kiện** | Đã xác thực student. |
| **Hậu điều kiện** | Danh sách/lịch của học kỳ hiện hành được hiển thị. |
| **Luồng thông thường** | <ol><li>Hệ thống tìm Student từ token.</li><li>Tải Registration kèm Class, Course, Lecturer.</li><li>Lọc enrolled và lớp active cho thời khóa biểu.</li><li>Trả môn, phòng, thứ, ca và tiết.</li></ol> |
| **Luồng thay thế** | <ol><li>Danh sách đăng ký có thể hiển thị cả waitlist.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không tìm thấy hồ sơ sinh viên.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Lịch chính thức chỉ gồm enrolled.</li><li>Lớp canceled không hiển thị.</li></ol> |
| **Các giả thuyết** | <ol><li>Mỗi lớp có một lịch cố định trong mô hình hiện tại.</li></ol> |
| **Giao diện minh họa** | **UI-07** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.19 UC8.1. Nhập và import điểm

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC8.1. Nhập và import điểm** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Nhập từng sinh viên hoặc import Excel; tự tính tổng hệ 10, chữ và hệ 4. |
| **Tác nhân chính** | Giảng viên |
| **Tác nhân phụ (nếu có)** | Sinh viên trong lớp |
| **Sự kiện kích hoạt** | Giảng viên mở bảng điểm lớp. |
| **Tiền điều kiện** | Giảng viên phụ trách lớp; Grade tồn tại; điểm chưa khóa. |
| **Hậu điều kiện** | Điểm hợp lệ được lưu và Audit Log được tạo. |
| **Luồng thông thường** | <ol><li>Hệ thống kiểm tra quyền lớp.</li><li>Giảng viên nhập 3 đầu điểm hoặc tải xlsx.</li><li>Hệ thống kiểm tra sinh viên và miền 0–10.</li><li>Tính tổng 10%-30%-60% và quy đổi.</li><li>Lưu điểm và log.</li></ol> |
| **Luồng thay thế** | <ol><li>Import nhiều dòng trong một transaction.</li><li>Sửa điểm chưa khóa.</li></ol> |
| **Các ngoại lệ** | <ol><li>Không thuộc lớp; thiếu Grade; điểm ngoài miền; file sai cấu trúc; điểm đã khóa.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mỗi đầu điểm 0–10.</li><li>Import có một dòng lỗi phải rollback toàn bộ.</li></ol> |
| **Các giả thuyết** | <ol><li>File import theo mẫu hệ thống xuất.</li></ol> |
| **Giao diện minh họa** | **UI-08** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.20 UC8.2. Khóa, công bố và xuất bảng điểm lớp

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC8.2. Khóa, công bố và xuất bảng điểm lớp** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Chốt bảng điểm khi đủ dữ liệu, thông báo cho sinh viên và cho phép xuất Excel. |
| **Tác nhân chính** | Giảng viên |
| **Tác nhân phụ (nếu có)** | Sinh viên |
| **Sự kiện kích hoạt** | Giảng viên chọn Khóa bảng điểm. |
| **Tiền điều kiện** | Phụ trách lớp; mọi sinh viên có đủ 3 đầu điểm. |
| **Hậu điều kiện** | Tất cả Grade của lớp isLocked=true; sinh viên nhận thông báo. |
| **Luồng thông thường** | <ol><li>Hệ thống kiểm tra quyền.</li><li>Đếm Grade thiếu thành phần.</li><li>Nếu bằng 0, khóa toàn lớp.</li><li>Ghi Audit Log.</li><li>Tạo thông báo cho từng sinh viên.</li><li>Cho phép xuất workbook Excel.</li></ol> |
| **Luồng thay thế** | <ol><li>Giảng viên chỉ xuất bảng điểm mà chưa khóa.</li></ol> |
| **Các ngoại lệ** | <ol><li>Còn điểm thiếu: từ chối khóa và nêu số lượng.</li><li>Không thuộc lớp: từ chối.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Điểm khóa không sửa qua API thường.</li><li>Sinh viên chỉ xem điểm khóa.</li></ol> |
| **Các giả thuyết** | <ol><li>Phúc khảo là luồng duy nhất cập nhật điểm khóa.</li></ol> |
| **Giao diện minh họa** | **UI-08** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.21 UC9.1. Xem kết quả, GPA, CPA và tiến độ

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC9.1. Xem kết quả, GPA, CPA và tiến độ** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tổng hợp điểm chính thức, GPA theo kỳ, CPA và tín chỉ hoàn thành. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Không có |
| **Sự kiện kích hoạt** | Sinh viên mở Kết quả học tập. |
| **Tiền điều kiện** | Có hồ sơ student và điểm đã khóa. |
| **Hậu điều kiện** | Bảng điểm và chỉ số học tập được hiển thị. |
| **Luồng thông thường** | <ol><li>Hệ thống tải Grade isLocked kèm Course.</li><li>Nhóm điểm theo học kỳ.</li><li>Tính GPA theo tín chỉ.</li><li>Chọn điểm hệ 4 cao nhất mỗi môn để tính CPA.</li><li>Đếm tín chỉ khác F và tính phần trăm trên 120 TC.</li></ol> |
| **Luồng thay thế** | <ol><li>Nếu chưa có điểm, hiển thị trạng thái trống và chỉ số 0.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Dữ liệu Course thiếu làm một dòng không thể tính tín chỉ.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>GPA/CPA có trọng số tín chỉ.</li><li>CPA lấy kết quả cao nhất mỗi môn.</li></ol> |
| **Các giả thuyết** | <ol><li>Tổng tín chỉ tốt nghiệp demo là 120.</li></ol> |
| **Giao diện minh họa** | **UI-09** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.22 UC9.2. Yêu cầu và xử lý phúc khảo

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC9.2. Yêu cầu và xử lý phúc khảo** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Sinh viên yêu cầu xem xét điểm khóa; giảng viên phụ trách chấm lại và cập nhật kết quả. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Giảng viên |
| **Sự kiện kích hoạt** | Sinh viên chọn Phúc khảo tại một điểm. |
| **Tiền điều kiện** | Điểm thuộc sinh viên, đã khóa và chưa có yêu cầu. |
| **Hậu điều kiện** | reEvalStatus chuyển requested rồi completed; kết quả/log/thông báo được cập nhật. |
| **Luồng thông thường** | <ol><li>Sinh viên nhập lý do.</li><li>Hệ thống lưu requested và log.</li><li>Giảng viên xem yêu cầu của lớp mình.</li><li>Giảng viên nhập lại 3 đầu điểm.</li><li>Hệ thống tính lại, lưu trước/sau và completed.</li><li>Gửi thông báo sinh viên.</li></ol> |
| **Luồng thay thế** | <ol><li>Giảng viên giữ nguyên điểm sau khi xem xét nhưng vẫn hoàn thành yêu cầu.</li></ol> |
| **Các ngoại lệ** | <ol><li>Điểm chưa khóa; yêu cầu trùng; giảng viên không phụ trách; điểm mới không hợp lệ.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mỗi Grade chỉ có một yêu cầu đang xử lý.</li><li>Chỉ giảng viên lớp được giải quyết.</li></ol> |
| **Các giả thuyết** | <ol><li>Quy trình chưa có bước duyệt bổ sung của Phòng Đào tạo.</li></ol> |
| **Giao diện minh họa** | **UI-09** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.23 UC9.3. Quản lý cảnh báo học vụ

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC9.3. Quản lý cảnh báo học vụ** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Quét GPA/CPA và cập nhật trạng thái cảnh báo của sinh viên. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên |
| **Sự kiện kích hoạt** | Cán bộ mở Cảnh báo học vụ. |
| **Tiền điều kiện** | Có điểm khóa; người dùng là pdt. |
| **Hậu điều kiện** | Danh sách cảnh báo hiển thị; status sinh viên được cập nhật khi duyệt. |
| **Luồng thông thường** | <ol><li>Hệ thống tải Student và Grade khóa theo đúng học kỳ của lớp.</li><li>Tính GPA kỳ và CPA.</li><li>Lọc GPA&lt;1.0 hoặc CPA&lt;1.5, đồng thời giữ sinh viên đang có trạng thái học vụ để xét khôi phục.</li><li>Lần cảnh báo đầu đề xuất warning_1; nếu tiếp diễn đề xuất warning_2.</li><li>Cán bộ duyệt chuyển trạng thái theo thứ tự và hệ thống ghi log.</li></ol> |
| **Luồng thay thế** | <ol><li>Xuất danh sách cảnh báo Excel.</li><li>Phân trang danh sách.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không tìm thấy sinh viên khi cập nhật.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Ngưỡng GPA&lt;1.0 hoặc CPA&lt;1.5.</li><li>warning_1/2 làm giới hạn đăng ký còn 12 TC.</li><li>dismissed không được đăng ký học phần.</li><li>Không được bỏ qua trình tự active → warning_1 → warning_2 → dismissed.</li></ol> |
| **Các giả thuyết** | <ol><li>Cán bộ quyết định mức cảnh báo sau khi xem gợi ý.</li></ol> |
| **Giao diện minh họa** | **UI-09** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.24 UC10.1. Quản lý hóa đơn và miễn giảm

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC10.1. Quản lý hóa đơn và miễn giảm** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tính hóa đơn theo tín chỉ enrolled, thống kê và điều chỉnh miễn giảm. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên |
| **Sự kiện kích hoạt** | Đăng ký thay đổi hoặc cán bộ mở Quản lý học phí. |
| **Tiền điều kiện** | Có Student, Registration và Course. |
| **Hậu điều kiện** | Payment được tạo/cập nhật với amount, discountRate, finalAmount và deadline. |
| **Luồng thông thường** | <ol><li>Hệ thống tổng hợp tín chỉ enrolled của lớp active.</li><li>Tính amount=tín chỉ×đơn giá.</li><li>Tạo/cập nhật Payment.</li><li>Cán bộ có thể nhập tỷ lệ và lý do giảm.</li><li>Hệ thống tính finalAmount và ghi log.</li></ol> |
| **Luồng thay thế** | <ol><li>Miễn 100% tự chuyển paid.</li><li>Lọc paid/unpaid, tìm MSV/tên/lớp và xem thống kê.</li></ol> |
| **Các ngoại lệ** | <ol><li>Tỷ lệ ngoài 0–1; không tìm thấy hóa đơn.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Waitlist không tính học phí.</li><li>FinalAmount=round(amount×(1-rate)).</li></ol> |
| **Các giả thuyết** | <ol><li>Đơn giá demo COST_PER_CREDIT=1000; deadline mặc định sau 2 tháng.</li></ol> |
| **Giao diện minh họa** | **UI-10** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.25 UC10.2. Thanh toán và đối soát trực tuyến

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC10.2. Thanh toán và đối soát trực tuyến** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Thanh toán qua QR và xác nhận bằng webhook hoặc kiểm tra API SePay. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | SePay/Ngân hàng |
| **Sự kiện kích hoạt** | Sinh viên mở QR hoặc SePay gửi giao dịch. |
| **Tiền điều kiện** | Hóa đơn unpaid thuộc sinh viên; tích hợp được cấu hình. |
| **Hậu điều kiện** | Payment paid, lưu transactionId/paidAt; giao diện nhận sự kiện. |
| **Luồng thông thường** | <ol><li>Hệ thống hiển thị QR với PKABILL<id>.</li><li>Ngân hàng ghi nhận giao dịch.</li><li>Webhook/API cung cấp giao dịch.</li><li>Hệ thống xác thực nguồn, chiều tiền, mã hóa đơn và số tiền.</li><li>Cập nhật paid và phát payment_confirmed.</li></ol> |
| **Luồng thay thế** | <ol><li>Kiểm tra chủ động 20 giao dịch gần nhất.</li><li>Mô phỏng thanh toán trong development.</li></ol> |
| **Các ngoại lệ** | <ol><li>Sai secret; giao dịch out; thiếu mã; số tiền thiếu; hóa đơn đã paid.</li></ol> |
| **Độ ưu tiên** | Rất cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Mã hóa đơn phải khớp chính xác.</li><li>Không xử lý trùng giao dịch.</li></ol> |
| **Các giả thuyết** | <ol><li>SePay cung cấp API/webhook đúng định dạng.</li></ol> |
| **Giao diện minh họa** | **UI-10** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.26 UC10.3. Xác nhận thanh toán thủ công

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC10.3. Xác nhận thanh toán thủ công** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Gạch nợ tiền mặt/chuyển khoản trực tiếp khi không dùng đối soát tự động. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Sinh viên |
| **Sự kiện kích hoạt** | Cán bộ chọn Xác nhận thủ công tại hóa đơn. |
| **Tiền điều kiện** | Hóa đơn tồn tại và unpaid. |
| **Hậu điều kiện** | Hóa đơn paid, có mã PDT-MANUAL, phương thức, ghi chú và thời gian. |
| **Luồng thông thường** | <ol><li>Cán bộ chọn hóa đơn.</li><li>Nhập phương thức và ghi chú.</li><li>Hệ thống kiểm tra unpaid.</li><li>Tạo mã giao dịch và cập nhật paid.</li><li>Ghi Audit Log.</li><li>Phát payment_confirmed tới sinh viên.</li></ol> |
| **Luồng thay thế** | <ol><li>Dùng phương thức mặc định nếu để trống.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Hóa đơn không tồn tại hoặc đã paid.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Chỉ pdt được gạch nợ.</li><li>Mỗi hóa đơn chỉ xác nhận một lần.</li></ol> |
| **Các giả thuyết** | <ol><li>Cán bộ đã kiểm tra chứng từ ngoài hệ thống.</li></ol> |
| **Giao diện minh họa** | **UI-10** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.27 UC10.4. Xuất báo cáo học phí và biên lai

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC10.4. Xuất báo cáo học phí và biên lai** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Xuất danh sách học phí Excel và biên lai HTML có thể in. |
| **Tác nhân chính** | Sinh viên |
| **Tác nhân phụ (nếu có)** | Phòng Đào tạo |
| **Sự kiện kích hoạt** | Người dùng chọn chức năng xuất. |
| **Tiền điều kiện** | Đã xác thực đúng vai trò; có dữ liệu hóa đơn. |
| **Hậu điều kiện** | Tệp Excel hoặc HTML được tải về. |
| **Luồng thông thường** | <ol><li>Hệ thống kiểm tra quyền.</li><li>Lấy Payment, Student và chi tiết lớp.</li><li>Tạo workbook hoặc HTML.</li><li>Đặt tiêu đề, cột, tổng tiền và thông tin giao dịch.</li><li>Trả tệp tải xuống.</li></ol> |
| **Luồng thay thế** | <ol><li>Sinh viên xuất biên lai cá nhân.</li><li>PDT xuất toàn bộ báo cáo kỳ.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không có hóa đơn hoặc lỗi tạo tệp.</li></ol> |
| **Độ ưu tiên** | Trung bình |
| **Các quy tắc nghiệp vụ** | <ol><li>Sinh viên chỉ xuất dữ liệu của mình.</li><li>Báo cáo PDT dùng học kỳ hiện hành.</li></ol> |
| **Các giả thuyết** | <ol><li>Người dùng có ứng dụng mở xlsx hoặc trình duyệt để in HTML.</li></ol> |
| **Giao diện minh họa** | **UI-10** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.28 UC11.1. Quản lý thông báo cá nhân

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC11.1. Quản lý thông báo cá nhân** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Lưu, đẩy và quản lý trạng thái đọc của thông báo nghiệp vụ. |
| **Tác nhân chính** | Người dùng |
| **Tác nhân phụ (nếu có)** | Hệ thống thời gian thực |
| **Sự kiện kích hoạt** | Phát sinh sự kiện đăng ký, điểm, phúc khảo hoặc thanh toán. |
| **Tiền điều kiện** | Người nhận có User; socket đã xác thực nếu trực tuyến. |
| **Hậu điều kiện** | Notification được lưu; người dùng nhận và có thể đánh dấu đã đọc. |
| **Luồng thông thường** | <ol><li>Nghiệp vụ gọi createNotification.</li><li>Hệ thống lưu type, title, message, data.</li><li>Socket.IO phát tới user_<id>.</li><li>Người dùng tải danh sách phân trang.</li><li>Người dùng đánh dấu một hoặc tất cả đã đọc.</li></ol> |
| **Luồng thay thế** | <ol><li>Lọc unread=true.</li><li>Đếm số chưa đọc.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không tìm thấy thông báo thuộc người dùng.</li><li>Socket offline: dữ liệu vẫn lưu để đọc sau.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Người dùng chỉ đọc/cập nhật thông báo của mình.</li><li>readAt được lưu khi đánh dấu đọc.</li></ol> |
| **Các giả thuyết** | <ol><li>Kết nối thời gian thực là bổ sung, không thay thế lưu CSDL.</li></ol> |
| **Giao diện minh họa** | **UI-11** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.29 UC12.1. Tra cứu nhật ký hệ thống

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC12.1. Tra cứu nhật ký hệ thống** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tra cứu các thao tác nhạy cảm phục vụ kiểm tra và truy vết. |
| **Tác nhân chính** | Quản trị viên |
| **Tác nhân phụ (nếu có)** | Phòng Đào tạo |
| **Sự kiện kích hoạt** | Admin/PDT mở Nhật ký hệ thống. |
| **Tiền điều kiện** | Đã xác thực vai trò admin hoặc pdt. |
| **Hậu điều kiện** | Danh sách AuditLog mới nhất được hiển thị theo trang. |
| **Luồng thông thường** | <ol><li>Hệ thống nhận bộ phân trang.</li><li>Kiểm tra quyền.</li><li>Truy vấn AuditLog theo createdAt giảm dần.</li><li>Hiển thị username, action, details, IP và thời gian.</li></ol> |
| **Luồng thay thế** | <ol><li>Chuyển trang danh sách.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Lỗi truy vấn nhật ký.</li></ol> |
| **Độ ưu tiên** | Cao |
| **Các quy tắc nghiệp vụ** | <ol><li>Nghiệp vụ nhạy cảm phải ghi action và thời gian.</li><li>User bị xóa có thể để userId null nhưng giữ thông tin log.</li></ol> |
| **Các giả thuyết** | <ol><li>Nhật ký hiện chưa có bộ lọc nâng cao theo ngày/action.</li></ol> |
| **Giao diện minh họa** | **UI-12** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

## 1.6.30 UC12.2. Xem thống kê và xuất báo cáo đào tạo

| Trường đặc tả | Nội dung |
|---|---|
| **Số và tên UC** | **UC12.2. Xem thống kê và xuất báo cáo đào tạo** |
| **Người tạo UC** | Nhóm dự án PKA Portal |
| **Ngày tạo UC** | 26/07/2026 |
| **Mô tả** | Tổng hợp số lượng, cảnh báo, điểm và học phí; xuất các báo cáo Excel. |
| **Tác nhân chính** | Phòng Đào tạo |
| **Tác nhân phụ (nếu có)** | Giảng viên và sinh viên cung cấp dữ liệu |
| **Sự kiện kích hoạt** | Cán bộ mở Dashboard hoặc chọn Xuất báo cáo. |
| **Tiền điều kiện** | Dữ liệu nghiệp vụ đã tồn tại; người dùng là pdt. |
| **Hậu điều kiện** | Chỉ số hoặc tệp báo cáo được hiển thị/tải xuống. |
| **Luồng thông thường** | <ol><li>Hệ thống đếm sinh viên, giảng viên, môn và lớp.</li><li>Tổng hợp paid/unpaid, phải thu/đã thu.</li><li>Tính danh sách cảnh báo khi yêu cầu.</li><li>Tạo workbook tương ứng.</li><li>Trả số liệu hoặc tệp.</li></ol> |
| **Luồng thay thế** | <ol><li>Giảng viên xuất bảng điểm lớp.</li><li>Sinh viên xuất bảng điểm cá nhân.</li></ol> |
| **Các ngoại lệ** | <ol><li>Phiên đăng nhập thiếu, hết hạn hoặc người dùng không đúng vai trò: hệ thống từ chối yêu cầu và yêu cầu đăng nhập lại.</li><li>Không có dữ liệu hoặc lỗi tạo workbook.</li></ol> |
| **Độ ưu tiên** | Trung bình |
| **Các quy tắc nghiệp vụ** | <ol><li>Báo cáo theo phạm vi vai trò.</li><li>Số liệu học phí theo học kỳ hiện hành.</li></ol> |
| **Các giả thuyết** | <ol><li>Excel là định dạng trao đổi chính của phiên bản hiện tại.</li></ol> |
| **Giao diện minh họa** | **UI-12** – xem Phụ lục A. Giao diện chứa dữ liệu minh họa và các thao tác tương ứng với luồng UC. |

# PHỤ LỤC A. DANH MỤC GIAO DIỆN MINH HỌA

| Mã giao diện | Màn hình | Use-case áp dụng | Dữ liệu minh họa chính |
|---|---|---|---|
| UI-01 | Cấu hình khoa và ngành | UC1.1, UC1.2 | Khoa CNTT, Kinh tế, Ngoại ngữ; ngành CNTT, QTKD, NNA |
| UI-02 | Quản lý tài khoản và hồ sơ | UC2.1–UC2.4 | SV 24100001 Nguyễn Minh Anh; GV GV001 Trần Văn Nam; trạng thái active/locked |
| UI-03 | Học kỳ và đợt đăng ký | UC3.1, UC3.2 | HK1-2026; đợt chính 01/08–15/08/2026 |
| UI-04 | Môn học và chương trình | UC4.1, UC4.2 | INT101, Cơ sở lập trình, 3 tín chỉ; tiên quyết MAT101 |
| UI-05 | Lớp học phần | UC5.1, UC5.2 | INT101_L01; GV001; A101; Thứ 2; ca sáng; 12/40 sinh viên |
| UI-06 | Đăng nhập, mật khẩu và hồ sơ | UC6.1–UC6.3 | Tài khoản 24100001; email n***@st.phenikaa-uni.edu.vn |
| UI-07 | Đăng ký và thời khóa biểu | UC7.1–UC7.3 | INT101_L01 enrolled; WEB201_L02 waitlist số 2; tổng 18 tín chỉ |
| UI-08 | Bảng điểm giảng viên | UC8.1, UC8.2 | Chuyên cần 9; giữa kỳ 8; cuối kỳ 8.5; tổng 8.4; điểm chữ B |
| UI-09 | Kết quả, phúc khảo và cảnh báo | UC9.1–UC9.3 | GPA 3.12; CPA 3.05; 72/120 tín chỉ; phúc khảo requested |
| UI-10 | Học phí và thanh toán | UC10.1–UC10.4 | Hóa đơn #24; PKABILL24; miễn giảm 10%; trạng thái unpaid |
| UI-11 | Thông báo | UC11.1 | Công bố điểm, được vào lớp từ hàng chờ, thanh toán thành công |
| UI-12 | Dashboard, báo cáo và Audit Log | UC12.1, UC12.2 | NHAP_DIEM, HUY_LOP, GACH_NO; thống kê 500 SV, 42 GV |

Bộ mock-up tương tác đi kèm tài liệu sử dụng cùng các mã UI-01 đến UI-12. Các màn hình được thiết kế theo dữ liệu và luồng xử lý hiện có trong frontend PKA Portal.
