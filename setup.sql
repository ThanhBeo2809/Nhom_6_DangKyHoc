-- ==========================================================================
-- SCRIPT HƯỚNG DẪN THIẾT LẬP CƠ SỞ DỮ LIỆU MYSQL CHO DỰ ÁN ĐĂNG KÝ HỌC
-- ==========================================================================

-- Bước 1: Tạo cơ sở dữ liệu mới với bảng mã UTF-8 hỗ trợ tiếng Việt
CREATE DATABASE IF NOT EXISTS `pka_portal` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `pka_portal`;

-- LƯU Ý QUAN TRỌNG:
-- Dự án sử dụng thư viện Sequelize ORM trong Node.js để tự động đồng bộ hóa
-- cấu trúc bảng (Table schema) vào cơ sở dữ liệu khi bắt đầu khởi chạy server.
-- Vì vậy, bạn KHÔNG cần chạy các câu lệnh CREATE TABLE thủ công.
-- 
-- Khi muốn kết nối MySQL:
-- 1. Mở file `.env` ở thư mục gốc của dự án.
-- 2. Đổi giá trị `FORCE_SQLITE=true` thành `FORCE_SQLITE=false`.
-- 3. Điền thông tin kết nối MySQL của bạn (DB_HOST, DB_USER, DB_PASS, DB_NAME).
-- 4. Chạy lệnh `npm install` và `npm start`.
-- Hệ thống sẽ tự động tạo đầy đủ các bảng sau trên MySQL:
--   - Users (Tài khoản)
--   - Departments (Khoa)
--   - Majors (Ngành)
--   - Students (Sinh viên)
--   - Lecturers (Giảng viên)
--   - Courses (Môn học)
--   - Classes (Lớp học phần)
--   - Registrations (Đăng ký học phần)
--   - Grades (Điểm học phần)
--   - Payments (Hóa đơn học phí)
--   - AuditLogs (Nhật ký hệ thống)
-- Đồng thời tự động nạp dữ liệu mẫu ban đầu.
