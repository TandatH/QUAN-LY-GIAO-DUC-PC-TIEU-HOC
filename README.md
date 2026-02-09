# 🎓 Smart School Pro

Hệ thống quản lý giáo dục toàn diện dành cho trường học, phòng học, và phụ huynh.

## ✨ Tính năng chính

### 👨‍💼 Dành cho Admin
- 📊 Dashboard thống kê tổng quan
- 👥 Quản lý học sinh (thêm, sửa, xóa, import/export Excel)
- 👨‍🏫 Quản lý giáo viên
- 🏫 Quản lý lớp học
- 📝 Quản lý điểm số theo môn học
- 💰 Quản lý thu chi tài chính
- 📅 Quản lý thời khóa biểu
- 👤 Quản lý người dùng (User Management)

### 👨‍🏫 Dành cho Giáo viên
- 📋 Xem danh sách học sinh lớp mình
- 📝 Nhập điểm cho học sinh
- 💬 Gửi phản hồi cho phụ huynh
- 💵 Xem thông tin đóng học phí

### 👪 Dành cho Phụ huynh
- 👦 Xem thông tin con em
- 📊 Xem điểm số chi tiết
- 💰 Xem lịch sử thu chi
- 💬 Nhận phản hồi từ giáo viên

## 🛠️ Công nghệ sử dụng

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Firebase Realtime Database
- **Authentication:** Firebase Authentication
- **UI Components:** 
  - Font Awesome 6.4.0
  - SweetAlert2
  - Chart.js
- **Data Processing:** SheetJS (import/export Excel)

## 🚀 Demo

🔗 **Live Demo:** [https://YOUR_USERNAME.github.io/smart-school-pro/](https://YOUR_USERNAME.github.io/smart-school-pro/)

## 📦 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-school-pro.git
cd smart-school-pro
```

### 2. Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com/)
2. Bật **Authentication** (Email/Password)
3. Tạo **Realtime Database**
4. Copy config vào file `app.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Deploy lên GitHub Pages

1. Push code lên GitHub
2. Vào **Settings** → **Pages**
3. Chọn **Source:** `main` branch, `/ (root)` folder
4. Lưu và đợi vài phút
5. Website sẽ có tại: `https://YOUR_USERNAME.github.io/REPO_NAME/`

Chi tiết xem file [HUONG_DAN_DEPLOY.md](HUONG_DAN_DEPLOY.md)

## 📱 Responsive Design

Website hỗ trợ đầy đủ các thiết bị:
- 💻 Desktop (1920px+)
- 💼 Laptop (1024px - 1919px)
- 📱 Tablet (768px - 1023px)
- 📱 Mobile (< 768px)

## 🔒 Bảo mật

- ✅ Firebase Authentication
- ✅ Role-based access control (Admin, Teacher, Parent)
- ✅ Database rules theo role
- ⚠️ **Lưu ý:** Cần cấu hình Firebase Rules đúng cách

**Ví dụ Firebase Rules:**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "students": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "teachers": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "scores": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "finance": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}
```

## 📸 Screenshots

### Dashboard
*(Thêm ảnh screenshot nếu có)*

### Quản lý học sinh
*(Thêm ảnh screenshot nếu có)*

### Thời khóa biểu
*(Thêm ảnh screenshot nếu có)*

## 📄 Cấu trúc file

```
smart-school-pro/
├── index.html          # File HTML chính
├── styles.css          # Tất cả CSS
├── app.js              # Tất cả JavaScript + Firebase config
├── .gitignore          # Git ignore file
├── README.md           # File này
├── HUONG_DAN_DEPLOY.md # Hướng dẫn deploy
└── BAO_CAO_SUA_LOI.md  # Báo cáo bug fix
```

## 🐛 Báo lỗi

Nếu phát hiện lỗi, vui lòng tạo [Issue](https://github.com/YOUR_USERNAME/smart-school-pro/issues)

## 📝 License

MIT License - Tự do sử dụng cho mục đích học tập và thương mại.

## 👨‍💻 Tác giả

**Smart School Pro Team**

---

⭐ Nếu thấy project hữu ích, hãy cho một ngôi sao nhé!
