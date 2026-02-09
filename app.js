import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
            from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getDatabase, ref, set, get, child, update, onValue, push, remove } 
            from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
        import { getFunctions, httpsCallable } 
            from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

        // Firebase config
        const firebaseConfig = {
            apiKey: "AIzaSyBXeGmjCH_v6jnxEmBoQMpY7NP2fqrnLAQ",
            authDomain: "quan-ly-tieu-hoc.firebaseapp.com",
            databaseURL: "https://quan-ly-tieu-hoc-default-rtdb.firebaseio.com",
            projectId: "quan-ly-tieu-hoc",
            storageBucket: "quan-ly-tieu-hoc.firebasestorage.app",
            messagingSenderId: "525298263647",
            appId: "1:525298263647:web:767a5df6ac373323671dea"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);
        const functions = getFunctions(app);

        // Global vars
        window.auth = auth;
        window.db = db;
        window.currentUser = null;
        window.userRole = null;
        window.teacherClass = null;
        window.localData = { students: {}, scores: {}, finance: {}, timetables: {}, scheduleSettings: null };
        window.editingStudentId = null;
                window.currentScoreStudent = null;
        window.currentTimetableSlot = null;
        
        // Timetable schedule structure - loaded from database
        window.TIMETABLE_PERIODS = {
            morning: [],
            afternoon: []
        };
        window.WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        
        // Default periods if not set
        window.DEFAULT_PERIODS = {
            morning: [
                { id: 1, time: '7:30-8:10', name: 'Tiết 1' },
                { id: 2, time: '8:15-8:55', name: 'Tiết 2' },
                { id: 3, time: '9:00-9:40', name: 'Tiết 3' },
                { id: 4, time: '9:45-10:25', name: 'Tiết 4' },
                { id: 5, time: '10:30-11:10', name: 'Tiết 5' }
            ],
            afternoon: [
                { id: 6, time: '13:30-14:10', name: 'Tiết 6' },
                { id: 7, time: '14:15-14:55', name: 'Tiết 7' },
                { id: 8, time: '15:00-15:40', name: 'Tiết 8' },
                { id: 9, time: '15:45-16:25', name: 'Tiết 9' }
            ]
        };

        // Subjects for Primary School (CT 2018)
        window.PRIMARY_SUBJECTS = {
            '1': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Hoạt động trải nghiệm'],
            '2': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Hoạt động trải nghiệm'],
            '3': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Hoạt động trải nghiệm', 'Tiếng Anh'],
            '4': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Khoa học', 'Lịch sử và Địa lý', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Hoạt động trải nghiệm', 'Tiếng Anh', 'Tin học'],
            '5': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Khoa học', 'Lịch sử và Địa lý', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Hoạt động trải nghiệm', 'Tiếng Anh', 'Tin học']
        };

        // Auth state
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const snap = await get(child(ref(db), `users/${user.uid}`));
                if (snap.exists()) {
                    window.currentUser = user;
                    const userData = snap.val();
                    window.userRole = userData.role;
                    window.teacherClass = userData.assignedClass;
                    window.parentStudentId = userData.studentId; // Lưu mã học sinh cho phụ huynh
                    
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('app-container').classList.remove('hidden');
                    document.getElementById('user-info').textContent = `${userData.email} (${userData.role})`;
                    
                    loadMenu();
                    loadData();
                    changeView('dashboard');
                }
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-container').classList.add('hidden');
            }
        });

        // Load menu based on role
        function loadMenu() {
            const menuItems = {
                                'admin': [
                    { id: 'dashboard', icon: 'chart-line', text: 'Dashboard' },
                    { id: 'students', icon: 'user-graduate', text: 'Quản lý Học sinh' },
                    { id: 'timetable', icon: 'calendar-alt', text: 'Thời khóa biểu' },
                    { id: 'attendance', icon: 'clipboard-check', text: 'Điểm danh' },
                    { id: 'scores', icon: 'star', text: 'Quản lý Điểm' },
                    { id: 'finance', icon: 'dollar-sign', text: 'Quản lý Tài chính' },
                    { id: 'users', icon: 'users-cog', text: 'Quản lý Users' }
                ],
                                'teacher': [
                    { id: 'dashboard', icon: 'chart-line', text: 'Dashboard' },
                    { id: 'students', icon: 'user-graduate', text: 'Học sinh lớp mình' },
                    { id: 'timetable', icon: 'calendar-alt', text: 'Thời khóa biểu' },
                    { id: 'attendance', icon: 'clipboard-check', text: 'Điểm danh' },
                    { id: 'scores', icon: 'star', text: 'Quản lý Điểm' },
                    { id: 'finance', icon: 'dollar-sign', text: 'Danh sách đóng tiền' }
                ],
                                'parent': [
                    { id: 'dashboard', icon: 'chart-line', text: 'Dashboard' },
                    { id: 'child-info', icon: 'user', text: 'Thông tin con' },
                    { id: 'timetable', icon: 'calendar-alt', text: 'Thời khóa biểu' }
                ]
            };

            const items = menuItems[window.userRole] || menuItems['parent'];
            let html = '';
            items.forEach(item => {
                html += `<div class="menu-item" onclick="changeView('${item.id}')">
                    <i class="fas fa-${item.icon}"></i> ${item.text}
                </div>`;
            });
            document.getElementById('main-menu').innerHTML = html;
        }

        // Load data
        function loadData() {
            onValue(ref(db, 'students'), snap => {
                window.localData.students = snap.val() || {};
                const view = document.getElementById('content').dataset.view;
                if (view === 'students') renderStudents();
                else if (view === 'scores') renderScores();
            });
            onValue(ref(db, 'scores'), snap => {
                window.localData.scores = snap.val() || {};
            });
                        onValue(ref(db, 'finance'), snap => {
                window.localData.finance = snap.val() || {};
                if (document.getElementById('content').dataset.view === 'finance') {
                    renderFinance();
                }
            });
            onValue(ref(db, 'timetables'), snap => {
                window.localData.timetables = snap.val() || {};
                if (document.getElementById('content').dataset.view === 'timetable') {
                    renderTimetable();
                }
            });
            onValue(ref(db, 'scheduleSettings'), snap => {
                window.localData.scheduleSettings = snap.val();
                if (window.localData.scheduleSettings) {
                    window.TIMETABLE_PERIODS = window.localData.scheduleSettings;
                } else {
                    window.TIMETABLE_PERIODS = window.DEFAULT_PERIODS;
                }
                if (document.getElementById('content').dataset.view === 'timetable') {
                    renderTimetable();
                }
            });
        }

        // AUTH FUNCTIONS
        window.toggleAuthMode = (mode) => {
            if (mode === 'register') {
                document.getElementById('form-login').classList.add('hidden');
                document.getElementById('form-register').classList.remove('hidden');
            } else {
                document.getElementById('form-login').classList.remove('hidden');
                document.getElementById('form-register').classList.add('hidden');
            }
        }

        window.toggleRegFields = () => {
            const role = document.getElementById('reg-role').value;
            document.getElementById('reg-class').classList.toggle('hidden', role !== 'teacher');
            document.getElementById('reg-student-id').classList.toggle('hidden', role !== 'parent');
        }

        window.handleLogin = async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            
            if (!email || !pass) {
                Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin', 'error');
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, pass);
                Swal.fire('Thành công', 'Đăng nhập thành công!', 'success');
            } catch (error) {
                Swal.fire('Lỗi', 'Email hoặc mật khẩu không đúng', 'error');
            }
        }

        window.handleRegister = async () => {
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const role = document.getElementById('reg-role').value;
            
            if (!email || !pass || !role) {
                Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin', 'error');
                return;
            }
            
            if (pass.length < 6) {
                Swal.fire('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự', 'error');
                return;
            }

            // Validate role-specific fields
            if (role === 'teacher') {
                const teacherClass = document.getElementById('reg-class').value;
                if (!teacherClass) {
                    Swal.fire('Lỗi', 'Vui lòng nhập lớp phụ trách (VD: 1A, 2B)', 'error');
                    return;
                }
            } else if (role === 'parent') {
                const studentId = document.getElementById('reg-student-id').value;
                if (!studentId) {
                    Swal.fire('Lỗi', 'Vui lòng nhập mã học sinh của con (VD: HS001, HS002)', 'error');
                    return;
                }
            }

            try {
                const userCred = await createUserWithEmailAndPassword(auth, email, pass);
                const userData = {
                    email: email,
                    role: role,
                    createdAt: Date.now()
                };
                
                if (role === 'teacher') {
                    userData.assignedClass = document.getElementById('reg-class').value;
                } else if (role === 'parent') {
                    userData.studentId = document.getElementById('reg-student-id').value;
                }
                
                await set(ref(db, `users/${userCred.user.uid}`), userData);
                
                // Sign out immediately after registration
                await signOut(auth);
                
                // Reset form and switch to login
                document.getElementById('form-register').classList.add('hidden');
                document.getElementById('form-login').classList.remove('hidden');
                document.getElementById('reg-email').value = '';
                document.getElementById('reg-pass').value = '';
                document.getElementById('reg-role').value = '';
                document.getElementById('reg-class').value = '';
                document.getElementById('reg-student-id').value = '';
                
                // Hide extra fields
                document.getElementById('reg-class').classList.add('hidden');
                document.getElementById('reg-student-id').classList.add('hidden');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Tạo tài khoản thành công!',
                    text: 'Vui lòng đăng nhập để sử dụng hệ thống.',
                    confirmButtonText: 'OK'
                });
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    Swal.fire('Lỗi', 'Email đã được sử dụng', 'error');
                } else {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        window.handleLogout = async () => {
            try {
                await signOut(auth);
                Swal.fire('Đã đăng xuất', 'Hẹn gặp lại!', 'success');
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        // VIEW MANAGEMENT
        window.changeView = (view) => {
            document.querySelectorAll('.menu-item').forEach(x => x.classList.remove('active'));
            if (event && event.target) {
                event.target.closest('.menu-item').classList.add('active');
            }
            
            document.getElementById('content').dataset.view = view;
            
            const titles = {
                'dashboard': 'Dashboard',
                'students': window.userRole === 'teacher' ? 'Học sinh lớp mình' : 'Quản lý Học sinh',
                'attendance': 'Điểm danh',
                'scores': 'Quản lý Điểm',
                'finance': window.userRole === 'teacher' ? 'Danh sách đóng tiền' : 'Quản lý Tài chính',
                'timetable': 'Thời khóa biểu',
                'users': 'Quản lý Users',
                'child-info': 'Thông tin con'
            };
            
            document.getElementById('page-title').textContent = titles[view] || 'Dashboard';
            
            if (view === 'dashboard') renderDashboard();
            else if (view === 'students') renderStudents();
            else if (view === 'attendance') renderAttendance();
            else if (view === 'scores') renderScores();
            else if (view === 'finance') renderFinance();
            else if (view === 'users') renderUsers();
            else if (view === 'child-info') renderChildInfo();
            else if (view === 'timetable') renderTimetable();
        }

        // DASHBOARD
        function renderDashboard() {
            let students = Object.values(window.localData.students);
            
            // Filter for teacher - only their class
            if (window.userRole === 'teacher' && window.teacherClass) {
                students = students.filter(s => s.classRoom === window.teacherClass || s.class === window.teacherClass);
            }
            
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.status === 'active').length;
            const classes = [...new Set(students.map(s => s.classRoom || s.class))].length;
            
            document.getElementById('content').innerHTML = `
                <div class="grid-4">
                    <div class="stat-card" style="border-left-color: var(--primary)">
                        <div style="color:#64748b">${window.userRole === 'teacher' ? 'Học sinh lớp mình' : 'Tổng Học sinh'}</div>
                        <div class="value">${totalStudents}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--success)">
                        <div style="color:#64748b">Đang học</div>
                        <div class="value">${activeStudents}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--warning)">
                        <div style="color:#64748b">Số lớp</div>
                        <div class="value">${classes}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--danger)">
                        <div style="color:#64748b">Vai trò</div>
                        <div class="value" style="font-size:1.2rem">${window.userRole.toUpperCase()}</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>Chào mừng đến với Smart School Pro! 🎓</h3>
                    <p style="margin-top:10px; color:#64748b">
                        Hệ thống quản lý giáo dục theo Chương trình 2018 với đầy đủ tính năng cho Admin, Giáo viên và Phụ huynh.
                    </p>
                </div>
            `;
        }

        // STUDENTS
        function renderStudents() {
            let students = Object.values(window.localData.students);
            
            // Filter for teacher - only their class
            if (window.userRole === 'teacher' && window.teacherClass) {
                students = students.filter(s => s.classRoom === window.teacherClass || s.class === window.teacherClass);
            }
            
            let html = `
                <div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap">
                    ${window.userRole === 'admin' ? `
                        <button class="btn btn-primary" onclick="openStudentModal()">
                            <i class="fas fa-plus"></i> Thêm Học sinh
                        </button>
                        <button class="btn btn-success" onclick="exportExcel()">
                            <i class="fas fa-file-excel"></i> Xuất Excel
                        </button>
                        <label class="btn btn-warning" style="margin:0">
                            <i class="fas fa-upload"></i> Nhập Excel
                            <input type="file" accept=".xlsx,.xls" onchange="importExcel(this)" style="display:none">
                        </label>
                    ` : ''}
                </div>
                
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>STT</th><th>Mã HS</th><th>Họ tên</th><th>Lớp</th>
                                <th>Giới tính</th><th>Ngày sinh</th><th>Trạng thái</th>
                                ${window.userRole === 'admin' ? '<th>Thao tác</th>' : ''}
                                ${window.userRole === 'teacher' ? '<th>Phản hồi</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="student-tbody">
            `;
            
            students.forEach((s, i) => {
                // Xác định badge cho trạng thái
                let statusBadge, statusText;
                if (s.status === 'active') {
                    statusBadge = 'badge-success';
                    statusText = 'Đang học';
                } else if (s.status === 'leave') {
                    statusBadge = 'badge-danger';
                    statusText = 'Nghỉ học';
                } else if (s.status === 'reserved') {
                    statusBadge = 'badge-warning';
                    statusText = 'Bảo lưu';
                } else {
                    // Default nếu chưa có trạng thái
                    statusBadge = 'badge-success';
                    statusText = 'Đang học';
                }
                
                const studentCode = s.code || s.id;
                html += `<tr>
                    <td>${i+1}</td>
                    <td>${studentCode}</td>
                    <td>${s.name}</td>
                    <td>${s.classRoom || s.class || '-'}</td>
                    <td>${s.gender || '-'}</td>
                    <td>${s.dob || '-'}</td>
                    <td><span class="badge ${statusBadge}">${statusText}</span></td>
                    ${window.userRole === 'admin' ? `
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editStudent('${s.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    ` : ''}
                    ${window.userRole === 'teacher' ? `
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="sendFeedback('${studentCode}', '${s.name}')">
                                <i class="fas fa-comment"></i> Gửi phản hồi
                            </button>
                        </td>
                    ` : ''}
                </tr>`;
            });
            
            html += `</tbody></table></div>`;
            document.getElementById('content').innerHTML = html;
        }

        window.openStudentModal = () => {
            window.editingStudentId = null;
            document.getElementById('modal-student-title').textContent = 'Thêm Học sinh';
            document.getElementById('student-form').reset();
            document.getElementById('modal-student').style.display = 'flex';
        }

        window.editStudent = (id) => {
            const student = window.localData.students[id];
            if (!student) return;
            
            window.editingStudentId = id;
            document.getElementById('modal-student-title').textContent = 'Sửa Học sinh';
            
            const form = document.getElementById('student-form');
            form.code.value = student.code || '';
            form.name.value = student.name || '';
            form.classRoom.value = student.classRoom || student.class || '';
            form.gender.value = student.gender || 'Nam';
            form.dob.value = student.dob || '';
            form.status.value = student.status || 'active'; // Hiển thị trạng thái
            form.sosPhone.value = student.sosPhone || '';
            form.dadName.value = student.dadName || '';
            form.dadPhone.value = student.dadPhone || '';
            form.momName.value = student.momName || '';
            form.momPhone.value = student.momPhone || '';
            
            document.getElementById('modal-student').style.display = 'flex';
        }

        window.saveStudent = async (e) => {
            e.preventDefault();
            const form = e.target;
            const data = {
                code: form.code.value,
                name: form.name.value,
                classRoom: form.classRoom.value,
                class: form.classRoom.value,
                gender: form.gender.value,
                dob: form.dob.value,
                status: form.status.value, // Lưu trạng thái từ form
                sosPhone: form.sosPhone.value,
                dadName: form.dadName.value,
                dadPhone: form.dadPhone.value,
                momName: form.momName.value,
                momPhone: form.momPhone.value,
                createdAt: Date.now()
            };
            
            try {
                if (window.editingStudentId) {
                    await update(ref(db, `students/${window.editingStudentId}`), data);
                    Swal.fire('Thành công', 'Đã cập nhật học sinh', 'success');
                } else {
                    const newRef = push(ref(db, 'students'));
                    data.id = newRef.key;
                    await set(newRef, data);
                    Swal.fire('Thành công', 'Đã thêm học sinh mới', 'success');
                }
                closeModal('modal-student');
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        window.deleteStudent = async (id) => {
            const result = await Swal.fire({
                title: 'Xác nhận xóa?',
                text: 'Bạn có chắc muốn xóa học sinh này?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            });
            
            if (result.isConfirmed) {
                try {
                    await remove(ref(db, `students/${id}`));
                    Swal.fire('Đã xóa', 'Học sinh đã được xóa', 'success');
                } catch (error) {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        // EXCEL
        window.exportExcel = () => {
            const students = Object.values(window.localData.students);
            const data = students.map(s => ({
                "Mã HS": s.code || s.id,
                "Họ và Tên": s.name,
                "Lớp": s.classRoom || s.class,
                "Giới tính": s.gender,
                "Ngày sinh": s.dob,
                "Trạng thái": s.status,
                "SĐT Khẩn cấp": s.sosPhone,
                "Cha": s.dadName,
                "SĐT Cha": s.dadPhone,
                "Mẹ": s.momName,
                "SĐT Mẹ": s.momPhone
            }));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "DanhSach");
            XLSX.writeFile(wb, "Danh_Sach_HS.xlsx");
        }

        window.importExcel = (inp) => {
            const f = inp.files[0];
            if (!f) return;
            inp.value = '';
            
            const r = new FileReader();
            r.onload = async (e) => {
                try {
                    const workbook = XLSX.read(e.target.result, {type: 'array'});
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
                    
                    if (json.length === 0) {
                        Swal.fire('Lỗi', 'File trống', 'error');
                        return;
                    }
                    
                    let count = 0;
                    for (const row of json) {
                        if (!row['Họ Tên'] && !row['Họ và Tên']) continue;
                        
                        const sData = {
                            code: row['Mã HS'] || 'HS' + Math.floor(Math.random() * 99999),
                            name: row['Họ Tên'] || row['Họ và Tên'],
                            classRoom: row['Lớp'] ? row['Lớp'].toString().toUpperCase() : '?',
                            class: row['Lớp'] ? row['Lớp'].toString().toUpperCase() : '?',
                            gender: row['Giới tính'] || 'Nam',
                            dob: row['Ngày sinh'] || '',
                            status: 'active',
                            sosPhone: row['SĐT Khẩn cấp'] || '',
                            dadName: row['Họ tên Cha'] || '',
                            dadPhone: row['SĐT Cha'] || '',
                            momName: row['Họ tên Mẹ'] || '',
                            momPhone: row['SĐT Mẹ'] || '',
                            createdAt: Date.now()
                        };
                        
                        const newRef = push(ref(db, 'students'));
                        sData.id = newRef.key;
                        await set(newRef, sData);
                        count++;
                    }
                    
                    Swal.fire('Thành công', `Đã nhập ${count} học sinh`, 'success');
                } catch (error) {
                    Swal.fire('Lỗi file', 'Kiểm tra lại file Excel', 'error');
                }
            };
            r.readAsArrayBuffer(f);
        }

        // ATTENDANCE
        function renderAttendance() {
            if (!window.teacherClass && window.userRole === 'teacher') {
                document.getElementById('content').innerHTML = `
                    <div class="card">
                        <p>Bạn cần được phân công lớp để sử dụng chức năng điểm danh.</p>
                    </div>
                `;
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('content').innerHTML = `
                <div class="card">
                    <div style="display:flex; gap:15px; align-items:center; margin-bottom:20px">
                        <div>
                            <label>Chọn ngày:</label>
                            <input type="date" id="attendance-date" class="form-control" value="${today}" 
                                   onchange="loadAttendance()" style="display:inline-block; width:auto; margin-left:10px">
                        </div>
                        <button class="btn btn-success" onclick="saveAttendance()">
                            <i class="fas fa-save"></i> Lưu điểm danh
                        </button>
                    </div>
                    
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>STT</th><th>Mã HS</th><th>Họ tên</th>
                                    <th style="text-align:center">Trạng thái</th><th>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody id="attendance-tbody"></tbody>
                        </table>
                    </div>
                </div>
            `;
            loadAttendance();
        }

        window.loadAttendance = async () => {
            if (!window.teacherClass && window.userRole === 'teacher') return;
            
            const date = document.getElementById('attendance-date').value;
            let students = Object.values(window.localData.students);
            
            if (window.userRole === 'teacher') {
                students = students.filter(x => (x.classRoom === window.teacherClass || x.class === window.teacherClass));
            }
            
            const snap = await get(child(ref(db), `attendance/${window.teacherClass || 'all'}/${date}`));
            const attData = snap.exists() ? snap.val() : {};
            
            let html = '';
            students.forEach((st, i) => {
                const s = attData[st.code || st.id] || {};
                html += `<tr>
                    <td>${i+1}</td>
                    <td>${st.code || st.id}</td>
                    <td>${st.name}</td>
                    <td style="text-align:center">
                        <select id="att-s-${st.code || st.id}" class="form-control">
                            <option value="present" ${s.status==='present'?'selected':''}>Có mặt</option>
                            <option value="p" ${s.status==='p'?'selected':''}>Vắng P</option>
                            <option value="kp" ${s.status==='kp'?'selected':''}>Vắng KP</option>
                        </select>
                    </td>
                    <td><input type="text" id="att-n-${st.code || st.id}" class="form-control" value="${s.note||''}"></td>
                </tr>`;
            });
            document.getElementById('attendance-tbody').innerHTML = html;
        }

        window.saveAttendance = async () => {
            const date = document.getElementById('attendance-date').value;
            if (!date) {
                Swal.fire('Lỗi', 'Chọn ngày', 'warning');
                return;
            }
            
            let students = Object.values(window.localData.students);
            if (window.userRole === 'teacher') {
                students = students.filter(x => (x.classRoom === window.teacherClass || x.class === window.teacherClass));
            }
            
            const updates = {};
            students.forEach(st => {
                const id = st.code || st.id;
                updates[`attendance/${window.teacherClass || 'all'}/${date}/${id}`] = {
                    status: document.getElementById(`att-s-${id}`).value,
                    note: document.getElementById(`att-n-${id}`).value
                };
            });
            
            try {
                await update(ref(db), updates);
                Swal.fire('Thành công', 'Đã lưu điểm danh', 'success');
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        // SCORES - CHƯƠNG TRÌNH 2018
        function renderScores() {
            let students = Object.values(window.localData.students);
            
            if (window.userRole === 'teacher' && window.teacherClass) {
                students = students.filter(s => s.classRoom === window.teacherClass || s.class === window.teacherClass);
            }
            
            document.getElementById('content').innerHTML = `
                <div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap">
                    <button class="btn btn-success" onclick="exportScoreExcel()">
                        <i class="fas fa-file-excel"></i> Xuất báo cáo điểm Excel
                    </button>
                </div>
                
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>STT</th><th>Mã HS</th><th>Họ tên</th><th>Lớp</th>
                                <th>Điểm HK1</th><th>Điểm HK2</th><th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="score-tbody">
                        ${students.map((s, i) => {
                            const scores1 = window.localData.scores[s.id]?.semester1 || {};
                            const scores2 = window.localData.scores[s.id]?.semester2 || {};
                            const avg1 = calculateAverage(scores1);
                            const avg2 = calculateAverage(scores2);
                            
                            return `<tr>
                                <td>${i+1}</td>
                                <td>${s.code || s.id}</td>
                                <td>${s.name}</td>
                                <td>${s.classRoom || s.class}</td>
                                <td>${avg1 ? avg1.toFixed(1) : '-'}</td>
                                <td>${avg2 ? avg2.toFixed(1) : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="openScoreModal('${s.id}')">
                                        <i class="fas fa-edit"></i> Nhập điểm
                                    </button>
                                </td>
                            </tr>`;
                        }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function calculateAverage(semesterScores) {
            const subjects = Object.keys(semesterScores);
            if (subjects.length === 0) return 0;
            
            const sum = subjects.reduce((total, subject) => {
                const avg = semesterScores[subject]?.average || 0;
                return total + avg;
            }, 0);
            
            return sum / subjects.length;
        }

        window.openScoreModal = (studentId) => {
            window.currentScoreStudent = studentId;
            const student = window.localData.students[studentId];
            document.getElementById('score-student-name').textContent = student.name;
            document.getElementById('modal-score').style.display = 'flex';
            loadScoreForm();
        }

        window.loadScoreForm = () => {
            const student = window.localData.students[window.currentScoreStudent];
            const semester = document.getElementById('score-semester').value;
            const classNum = (student.classRoom || student.class || '1').charAt(0);
            const subjects = window.PRIMARY_SUBJECTS[classNum] || window.PRIMARY_SUBJECTS['1'];
            
            const existingScores = window.localData.scores[window.currentScoreStudent]?.[`semester${semester}`] || {};
            
            let html = `
                <table style="width:100%">
                    <thead>
                        <tr>
                            <th>Môn học</th>
                            <th>TX1</th><th>TX2</th><th>TX3</th>
                            <th>GK</th><th>CK</th><th>TB</th><th>Nhận xét</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            subjects.forEach(subject => {
                const scores = existingScores[subject] || {};
                const avg = scores.average || '';
                
                html += `<tr>
                    <td style="font-weight:600">${subject}</td>
                    <td><input type="number" class="score-input" id="tx1-${subject}" value="${scores.tx1 || ''}" min="0" max="10" step="0.1"></td>
                    <td><input type="number" class="score-input" id="tx2-${subject}" value="${scores.tx2 || ''}" min="0" max="10" step="0.1"></td>
                    <td><input type="number" class="score-input" id="tx3-${subject}" value="${scores.tx3 || ''}" min="0" max="10" step="0.1"></td>
                    <td><input type="number" class="score-input" id="gk-${subject}" value="${scores.gk || ''}" min="0" max="10" step="0.1"></td>
                    <td><input type="number" class="score-input" id="ck-${subject}" value="${scores.ck || ''}" min="0" max="10" step="0.1"></td>
                    <td><input type="number" class="score-input" id="avg-${subject}" value="${avg}" readonly style="background:#f1f5f9; font-weight:600"></td>
                    <td><input type="text" class="form-control" id="comment-${subject}" value="${scores.comment || ''}" placeholder="Nhận xét"></td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            document.getElementById('score-form-container').innerHTML = html;
            
            // Auto calculate average
            subjects.forEach(subject => {
                ['tx1', 'tx2', 'tx3', 'gk', 'ck'].forEach(type => {
                    const input = document.getElementById(`${type}-${subject}`);
                    if (input) {
                        input.addEventListener('input', () => calculateSubjectAverage(subject));
                    }
                });
            });
        }

        function calculateSubjectAverage(subject) {
            const tx1 = parseFloat(document.getElementById(`tx1-${subject}`).value) || 0;
            const tx2 = parseFloat(document.getElementById(`tx2-${subject}`).value) || 0;
            const tx3 = parseFloat(document.getElementById(`tx3-${subject}`).value) || 0;
            const gk = parseFloat(document.getElementById(`gk-${subject}`).value) || 0;
            const ck = parseFloat(document.getElementById(`ck-${subject}`).value) || 0;
            
            // Formula: (TX1 + TX2 + TX3 + GK*2 + CK*3) / 8
            const average = (tx1 + tx2 + tx3 + gk*2 + ck*3) / 8;
            document.getElementById(`avg-${subject}`).value = average.toFixed(1);
        }

        window.saveScores = async () => {
            const student = window.localData.students[window.currentScoreStudent];
            const semester = document.getElementById('score-semester').value;
            const classNum = (student.classRoom || student.class || '1').charAt(0);
            const subjects = window.PRIMARY_SUBJECTS[classNum] || window.PRIMARY_SUBJECTS['1'];
            
            const semesterData = {};
            
            subjects.forEach(subject => {
                semesterData[subject] = {
                    tx1: parseFloat(document.getElementById(`tx1-${subject}`).value) || 0,
                    tx2: parseFloat(document.getElementById(`tx2-${subject}`).value) || 0,
                    tx3: parseFloat(document.getElementById(`tx3-${subject}`).value) || 0,
                    gk: parseFloat(document.getElementById(`gk-${subject}`).value) || 0,
                    ck: parseFloat(document.getElementById(`ck-${subject}`).value) || 0,
                    average: parseFloat(document.getElementById(`avg-${subject}`).value) || 0,
                    comment: document.getElementById(`comment-${subject}`).value || ''
                };
            });
            
            try {
                await update(ref(db, `scores/${window.currentScoreStudent}/semester${semester}`), semesterData);
                Swal.fire('Thành công', 'Đã lưu điểm', 'success');
                closeModal('modal-score');
                renderScores();
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        window.exportScoreExcel = () => {
            let students = Object.values(window.localData.students);
            
            if (window.userRole === 'teacher' && window.teacherClass) {
                students = students.filter(s => s.classRoom === window.teacherClass || s.class === window.teacherClass);
            }
            
            const wb = XLSX.utils.book_new();
            
            // Sheet 1: Học kỳ 1
            const data1 = [];
            students.forEach(s => {
                const classNum = (s.classRoom || s.class || '1').charAt(0);
                const subjects = window.PRIMARY_SUBJECTS[classNum] || window.PRIMARY_SUBJECTS['1'];
                const scores1 = window.localData.scores[s.id]?.semester1 || {};
                
                const row = {
                    'Mã HS': s.code || s.id,
                    'Họ tên': s.name,
                    'Lớp': s.classRoom || s.class
                };
                
                subjects.forEach(subject => {
                    const sc = scores1[subject] || {};
                    row[`${subject} - TB`] = sc.average || '';
                    row[`${subject} - NX`] = sc.comment || '';
                });
                
                data1.push(row);
            });
            
            // Sheet 2: Học kỳ 2
            const data2 = [];
            students.forEach(s => {
                const classNum = (s.classRoom || s.class || '1').charAt(0);
                const subjects = window.PRIMARY_SUBJECTS[classNum] || window.PRIMARY_SUBJECTS['1'];
                const scores2 = window.localData.scores[s.id]?.semester2 || {};
                
                const row = {
                    'Mã HS': s.code || s.id,
                    'Họ tên': s.name,
                    'Lớp': s.classRoom || s.class
                };
                
                subjects.forEach(subject => {
                    const sc = scores2[subject] || {};
                    row[`${subject} - TB`] = sc.average || '';
                    row[`${subject} - NX`] = sc.comment || '';
                });
                
                data2.push(row);
            });
            
            // Sheet 3: Tổng kết
            const dataSummary = [];
            students.forEach(s => {
                const scores1 = window.localData.scores[s.id]?.semester1 || {};
                const scores2 = window.localData.scores[s.id]?.semester2 || {};
                const avg1 = calculateAverage(scores1);
                const avg2 = calculateAverage(scores2);
                const avgYear = ((avg1 + avg2) / 2).toFixed(1);
                
                dataSummary.push({
                    'Mã HS': s.code || s.id,
                    'Họ tên': s.name,
                    'Lớp': s.classRoom || s.class,
                    'TB HK1': avg1 ? avg1.toFixed(1) : '',
                    'TB HK2': avg2 ? avg2.toFixed(1) : '',
                    'TB Cả năm': avgYear !== 'NaN' ? avgYear : '',
                    'Xếp loại': avgYear >= 8 ? 'Giỏi' : avgYear >= 6.5 ? 'Khá' : avgYear >= 5 ? 'TB' : 'Yếu'
                });
            });
            
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data1), "HK1");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data2), "HK2");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataSummary), "TongKet");
            
            XLSX.writeFile(wb, "Bao_Cao_Diem.xlsx");
        }

        // FINANCE
        function renderFinance() {
            if (window.userRole === 'teacher') {
                // Teacher view - only payment status
                renderFinanceTeacher();
                return;
            }
            
            // Admin view - full management
            const transactions = Object.values(window.localData.finance);
            
            const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
            const balance = totalIncome - totalExpense;
            
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            const thisMonthTrans = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            
            const monthIncome = thisMonthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
            const monthExpense = thisMonthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
            
            document.getElementById('content').innerHTML = `
                <div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap; align-items:center">
                    <button class="btn btn-primary" onclick="openFinanceModal()">
                        <i class="fas fa-plus"></i> Thêm Thu/Chi
                    </button>
                    <button class="btn btn-success" onclick="exportFinanceExcel()">
                        <i class="fas fa-file-excel"></i> Xuất Excel
                    </button>
                    <div style="display:flex; gap:5px; margin-left:auto">
                        <button class="btn ${window.financeTab === 'list' ? 'btn-primary' : 'btn-outline'}" onclick="switchFinanceTab('list')">
                            <i class="fas fa-list"></i> Danh sách giao dịch
                        </button>
                        <button class="btn ${window.financeTab === 'status' ? 'btn-primary' : 'btn-outline'}" onclick="switchFinanceTab('status')">
                            <i class="fas fa-check-circle"></i> Trạng thái đóng tiền
                        </button>
                    </div>
                </div>
                
                <div class="grid-4" style="margin-bottom:20px">
                    <div class="stat-card" style="border-left-color: var(--success)">
                        <div style="color:#64748b">Tổng Thu</div>
                        <div class="value" style="color:var(--success)">${totalIncome.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--danger)">
                        <div style="color:#64748b">Tổng Chi</div>
                        <div class="value" style="color:var(--danger)">${totalExpense.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--primary)">
                        <div style="color:#64748b">Số dư</div>
                        <div class="value" style="color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${balance.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div class="stat-card" style="border-left-color: var(--warning)">
                        <div style="color:#64748b">Thu/Chi tháng này</div>
                        <div class="value" style="font-size:1rem">
                            <span style="color:var(--success)">${monthIncome.toLocaleString('vi-VN')}</span> / 
                            <span style="color:var(--danger)">${monthExpense.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
                
                <div id="finance-content-area"></div>
            `;
            
            window.financeTab = window.financeTab || 'list';
            switchFinanceTab(window.financeTab);
        }

        window.switchFinanceTab = (tab) => {
            window.financeTab = tab;
            
            if (tab === 'list') {
                renderFinanceList();
            } else {
                renderPaymentStatus();
            }
            
            // Update button states
            renderFinance();
        }

        function renderFinanceList() {
            const transactions = Object.values(window.localData.finance);
            
            document.getElementById('finance-content-area').innerHTML = `
                <div style="margin-bottom:15px">
                    <select id="finance-filter" class="custom-select" onchange="filterFinance()">
                        <option value="all">Tất cả giao dịch</option>
                        <option value="income">Chỉ Thu</option>
                        <option value="expense">Chỉ Chi</option>
                        <option value="month">Tháng này</option>
                    </select>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>STT</th><th>Ngày</th><th>Loại</th><th>Danh mục</th>
                                <th>Số tiền</th><th>Mã HS</th><th>PT thanh toán</th>
                                <th>Ghi chú</th><th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="finance-tbody"></tbody>
                    </table>
                </div>
            `;
            
            renderFinanceTable(transactions);
        }

        function renderPaymentStatus() {
            const students = Object.values(window.localData.students);
            const transactions = Object.values(window.localData.finance);
            
            get(child(ref(db), 'paymentStatus')).then(snap => {
                const paymentStatus = snap.val() || {};
                
                let html = `
                <div style="margin-bottom:15px; display:flex; gap:10px; align-items:center">
                    <input type="text" id="search-student" class="form-control" 
                           placeholder="Tìm theo mã HS hoặc tên..." 
                           onkeyup="filterPaymentStatus()" 
                           style="max-width:300px">
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>STT</th><th>Mã HS</th><th>Họ tên</th><th>Lớp</th>
                                <th>Các khoản đã đóng</th>
                                <th>Tổng tiền</th><th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody id="payment-status-tbody">`;
                
                students.forEach((student, index) => {
                    const studentCode = student.code || student.id;
                    const studentTrans = transactions.filter(t => 
                        t.studentCode === studentCode || 
                        t.studentCode === student.id
                    );
                    
                    const totalIncome = studentTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                    const totalExpense = studentTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                    const netTotal = totalIncome - totalExpense;
                    const isPaid = paymentStatus[studentCode]?.isPaid || false;
                    
                    const categoryNames = {
                        'tuition': 'Học phí',
                        'exam_fee': 'Phí thi',
                        'uniform': 'Đồng phục',
                        'meal': 'Tiền ăn',
                        'other_income': 'Thu khác',
                        'salary': 'Lương',
                        'utility': 'Điện nước',
                        'maintenance': 'Bảo trì',
                        'supplies': 'Văn phòng phẩm',
                        'other_expense': 'Chi khác'
                    };
                    
                    const transDetails = studentTrans.map(t => {
                        const catName = (t.category === 'other_income' && t.customIncome) 
                            ? t.customIncome 
                            : (categoryNames[t.category] || t.category);
                        const type = t.type === 'income' ? 'Thu' : 'Chi';
                        const color = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
                        return `<div style="margin:3px 0">• ${catName} (${type}): <strong style="color:${color}">${t.amount.toLocaleString('vi-VN')}đ</strong></div>`;
                    }).join('');
                    
                    html += `
                    <tr data-student-code="${studentCode.toLowerCase()}" data-student-name="${student.name.toLowerCase()}">
                        <td>${index + 1}</td>
                        <td><strong>${studentCode}</strong></td>
                        <td>${student.name}</td>
                        <td>${student.classRoom || student.class || '-'}</td>
                        <td style="max-width:300px; font-size:0.9rem">
                            ${transDetails || '<span style="color:#94a3b8">Chưa có giao dịch</span>'}
                        </td>
                        <td style="font-weight:600; color:${netTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">
                            ${netTotal.toLocaleString('vi-VN')}đ
                        </td>
                        <td>
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
                                <input type="checkbox" ${isPaid ? 'checked' : ''} 
                                       onchange="togglePaymentStatus('${studentCode}', this.checked)"
                                       style="width:18px; height:18px; cursor:pointer">
                                <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
                                    ${isPaid ? 'Đã đóng đủ' : 'Chưa đủ'}
                                </span>
                            </label>
                        </td>
                    </tr>`;
                });
                
                html += '</tbody></table></div>';
                document.getElementById('finance-content-area').innerHTML = html;
            });
        }

        window.filterPaymentStatus = () => {
            const search = document.getElementById('search-student').value.toLowerCase();
            const rows = document.querySelectorAll('#payment-status-tbody tr');
            
            rows.forEach(row => {
                const code = row.dataset.studentCode.toLowerCase();
                const name = row.dataset.studentName;
                
                if (code.includes(search) || name.includes(search)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        window.togglePaymentStatus = async (studentCode, isPaid) => {
            try {
                await set(ref(db, `paymentStatus/${studentCode}`), {
                    isPaid: isPaid,
                    updatedAt: Date.now(),
                    updatedBy: window.currentUser.email
                });
                
                Swal.fire({
                    icon: 'success',
                    title: isPaid ? 'Đã đánh dấu đóng đủ' : 'Đã bỏ đánh dấu',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                renderPaymentStatus();
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        function renderFinanceTeacher() {
            // Teacher can view ALL payment transactions of their students
            let students = Object.values(window.localData.students)
                .filter(s => s.classRoom === window.teacherClass || s.class === window.teacherClass);
            
            const transactions = Object.values(window.localData.finance);
            
            // Get payment status from Firebase
            get(child(ref(db), 'paymentStatus')).then(snap => {
                const paymentStatus = snap.val() || {};
                
                document.getElementById('content').innerHTML = `
                    <div class="card">
                        <h3>Danh sách đóng tiền lớp ${window.teacherClass}</h3>
                        <p style="color:#64748b; margin-top:5px">
                            Xem tất cả các khoản thu/chi của học sinh (bao gồm Thu khác, Chi khác)
                        </p>
                    </div>
                    
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>STT</th><th>Mã HS</th><th>Họ tên</th>
                                    <th>Các khoản đã đóng</th>
                                    <th>Tổng đã đóng</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${students.map((s, i) => {
                                const studentCode = s.code || s.id;
                                const studentTrans = transactions.filter(t => 
                                    t.studentCode === studentCode || 
                                    t.studentCode === s.id ||
                                    (t.studentName && t.studentName.toLowerCase().includes(s.name.toLowerCase()))
                                );
                                
                                const totalIncome = studentTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                                const totalExpense = studentTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                                const netTotal = totalIncome - totalExpense;
                                const isPaid = paymentStatus[studentCode]?.isPaid || false;
                                
                                // Get all transaction details with custom income/expense names
                                const categoryNames = {
                                    'tuition': 'Học phí',
                                    'exam_fee': 'Phí thi',
                                    'uniform': 'Đồng phục',
                                    'meal': 'Tiền ăn',
                                    'other_income': 'Thu khác',
                                    'salary': 'Lương',
                                    'utility': 'Điện nước',
                                    'maintenance': 'Bảo trì',
                                    'supplies': 'Văn phòng phẩm',
                                    'other_expense': 'Chi khác'
                                };
                                
                                const transDetails = studentTrans.map(t => {
                                    const catName = (t.category === 'other_income' && t.customIncome) 
                                        ? t.customIncome 
                                        : (categoryNames[t.category] || t.category);
                                    const type = t.type === 'income' ? 'Thu' : 'Chi';
                                    const color = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
                                    return `<div style="margin:3px 0; font-size:0.9rem">
                                        • ${catName} (${type}): <strong style="color:${color}">${t.amount.toLocaleString('vi-VN')}đ</strong>
                                    </div>`;
                                }).join('');
                                
                                return `<tr>
                                    <td>${i+1}</td>
                                    <td><strong>${studentCode}</strong></td>
                                    <td>${s.name}</td>
                                    <td style="max-width:300px">
                                        ${transDetails || '<span style="color:#94a3b8">Chưa có giao dịch</span>'}
                                    </td>
                                    <td style="font-weight:600; color:${netTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">
                                        ${netTotal.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td>
                                        ${isPaid 
                                            ? '<span class="badge badge-success"><i class="fas fa-check"></i> Đã đóng đủ</span>' 
                                            : '<span class="badge badge-warning"><i class="fas fa-clock"></i> Chưa đủ</span>'
                                        }
                                    </td>
                                </tr>`;
                            }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
        }

        function renderFinanceTable(transactions) {
            const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            let html = '';
            sorted.forEach((t, i) => {
                const typeBadge = t.type === 'income' ? 'badge-success' : 'badge-danger';
                const typeText = t.type === 'income' ? 'Thu' : 'Chi';
                const amountColor = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
                
                const categoryNames = {
                    'tuition': 'Học phí', 'exam_fee': 'Phí thi', 'uniform': 'Đồng phục',
                    'meal': 'Tiền ăn', 'other_income': t.customIncome || 'Thu khác',
                    'salary': 'Lương', 'utility': 'Điện nước', 'maintenance': 'Bảo trì',
                    'supplies': 'Văn phòng phẩm', 'other_expense': 'Chi khác'
                };
                
                const paymentNames = {
                    'cash': 'Tiền mặt', 'bank': 'Chuyển khoản', 'card': 'Thẻ'
                };
                
                html += `<tr>
                    <td>${i+1}</td>
                    <td>${new Date(t.date).toLocaleDateString('vi-VN')}</td>
                    <td><span class="badge ${typeBadge}">${typeText}</span></td>
                    <td>${categoryNames[t.category] || t.category}</td>
                    <td style="font-weight:600; color:${amountColor}">${(t.amount || 0).toLocaleString('vi-VN')}đ</td>
                    <td>${t.studentCode || '-'}</td>
                    <td>${paymentNames[t.paymentMethod] || '-'}</td>
                    <td>${t.note || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editFinance('${t.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteFinance('${t.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
            
            document.getElementById('finance-tbody').innerHTML = html;
        }

        window.toggleFinanceCategory = () => {
            const type = document.querySelector('[name="type"]').value;
            const category = document.getElementById('finance-category');
            const customField = document.getElementById('custom-income-field');
            
            category.addEventListener('change', function() {
                if (this.value === 'other_income') {
                    customField.style.display = 'block';
                    customField.querySelector('input').required = true;
                } else {
                    customField.style.display = 'none';
                    customField.querySelector('input').required = false;
                }
            });
        }

        window.openFinanceModal = () => {
            window.editingFinanceId = null;
            document.getElementById('modal-finance-title').textContent = 'Thêm Khoản Thu/Chi';
            const form = document.getElementById('finance-form');
            form.reset();
            form.date.value = new Date().toISOString().split('T')[0];
            document.getElementById('custom-income-field').style.display = 'none';
            document.getElementById('modal-finance').style.display = 'flex';
        }

        window.editFinance = (id) => {
            const transaction = window.localData.finance[id];
            if (!transaction) return;
            
            window.editingFinanceId = id;
            document.getElementById('modal-finance-title').textContent = 'Sửa Giao dịch';
            
            const form = document.getElementById('finance-form');
            form.type.value = transaction.type;
            form.category.value = transaction.category;
            form.amount.value = transaction.amount;
            form.date.value = transaction.date;
            form.studentCode.value = transaction.studentCode || '';
            form.paymentMethod.value = transaction.paymentMethod;
            form.note.value = transaction.note || '';
            
            if (transaction.category === 'other_income' && transaction.customIncome) {
                document.getElementById('custom-income-field').style.display = 'block';
                form.customIncome.value = transaction.customIncome;
            }
            
            document.getElementById('modal-finance').style.display = 'flex';
        }

        window.saveFinance = async (e) => {
            e.preventDefault();
            const form = e.target;
            
            const data = {
                type: form.type.value,
                category: form.category.value,
                amount: parseFloat(form.amount.value),
                date: form.date.value,
                studentCode: form.studentCode.value,
                paymentMethod: form.paymentMethod.value,
                note: form.note.value,
                createdBy: window.currentUser.email,
                createdAt: Date.now()
            };
            
            if (form.category.value === 'other_income') {
                data.customIncome = form.customIncome.value;
            }
            
            try {
                if (window.editingFinanceId) {
                    await update(ref(db, `finance/${window.editingFinanceId}`), data);
                    Swal.fire('Thành công', 'Đã cập nhật giao dịch', 'success');
                } else {
                    const newRef = push(ref(db, 'finance'));
                    data.id = newRef.key;
                    await set(newRef, data);
                    Swal.fire('Thành công', 'Đã thêm giao dịch mới', 'success');
                }
                closeModal('modal-finance');
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        window.deleteFinance = async (id) => {
            const result = await Swal.fire({
                title: 'Xác nhận xóa?',
                text: 'Bạn có chắc muốn xóa giao dịch này?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            });
            
            if (result.isConfirmed) {
                try {
                    await remove(ref(db, `finance/${id}`));
                    Swal.fire('Đã xóa', 'Giao dịch đã được xóa', 'success');
                } catch (error) {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        window.filterFinance = () => {
            const filter = document.getElementById('finance-filter').value;
            let transactions = Object.values(window.localData.finance);
            
            if (filter === 'income') {
                transactions = transactions.filter(t => t.type === 'income');
            } else if (filter === 'expense') {
                transactions = transactions.filter(t => t.type === 'expense');
            } else if (filter === 'month') {
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                transactions = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
            }
            
            renderFinanceTable(transactions);
        }

        window.exportFinanceExcel = () => {
            const transactions = Object.values(window.localData.finance);
            
            const categoryNames = {
                'tuition': 'Học phí', 'exam_fee': 'Phí thi', 'uniform': 'Đồng phục',
                'meal': 'Tiền ăn', 'other_income': 'Thu khác',
                'salary': 'Lương', 'utility': 'Điện nước', 'maintenance': 'Bảo trì',
                'supplies': 'Văn phòng phẩm', 'other_expense': 'Chi khác'
            };
            
            const paymentNames = {
                'cash': 'Tiền mặt', 'bank': 'Chuyển khoản', 'card': 'Thẻ'
            };
            
            const data = transactions.map(t => ({
                "Ngày": t.date,
                "Loại": t.type === 'income' ? 'Thu' : 'Chi',
                "Danh mục": t.customIncome || categoryNames[t.category] || t.category,
                "Số tiền": t.amount,
                "Mã HS": t.studentCode || '',
                "PT thanh toán": paymentNames[t.paymentMethod] || '',
                "Ghi chú": t.note || '',
                "Người tạo": t.createdBy || ''
            }));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "ThuChi");
            XLSX.writeFile(wb, "Bao_Cao_Thu_Chi.xlsx");
        }

        // USERS
        function renderUsers() {
            document.getElementById('content').innerHTML = `
                <div class="card">
                    <h3>Quản lý Users</h3>
                    <p style="color:#dc2626; margin-top:10px">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <strong>Lưu ý:</strong> Xóa user sẽ xóa vĩnh viễn tài khoản trên Firebase Auth. Người dùng sẽ không thể đăng nhập lại.
                    </p>
                </div>
                
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th><th>Vai trò</th><th>Thông tin</th>
                                <th>Ngày tạo</th>
                                ${window.userRole === 'admin' ? '<th style="text-align:center">Thao tác</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="user-list-body"></tbody>
                    </table>
                </div>
            `;
            loadUsers();
        }

        window.loadUsers = () => {
            onValue(ref(db, 'users'), snap => {
                const users = snap.val() || {};
                let html = '';
                for (let uid in users) {
                    const u = users[uid];
                    
                    // Don't allow deleting current user
                    const isCurrentUser = window.currentUser && window.currentUser.uid === uid;
                    
                    html += `<tr>
                        <td>${u.email}${isCurrentUser ? ' <span class="badge badge-info">Bạn</span>' : ''}</td>
                        <td><span class="badge badge-warning">${u.role}</span></td>
                        <td>${u.assignedClass || u.studentId || '-'}</td>
                        <td>${new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                        ${window.userRole === 'admin' ? `
                            <td style="text-align:center">
                                ${!isCurrentUser ? `
                                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${uid}', '${u.email}')">
                                        <i class="fas fa-trash"></i> Xóa
                                    </button>
                                ` : `
                                    <span style="color:#94a3b8; font-size:0.85rem">Không thể xóa</span>
                                `}
                            </td>
                        ` : ''}
                    </tr>`;
                }
                document.getElementById('user-list-body').innerHTML = html;
            });
        }

        window.deleteUser = async (uid, email) => {
            // Double check admin permission
            if (window.userRole !== 'admin') {
                Swal.fire('Từ chối', 'Chỉ Admin mới có quyền xóa user', 'error');
                return;
            }

            const result = await Swal.fire({
                title: 'Xác nhận xóa User?',
                html: `
                    <p>Bạn có chắc muốn xóa user <strong>${email}</strong>?</p>
                    <p style="color:#dc2626; margin-top:10px">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Hành động này sẽ:
                    </p>
                    <ul style="text-align:left; color:#64748b; margin-top:10px; margin-left:20px">
                        <li>Xóa tài khoản trên Firebase Authentication</li>
                        <li>Xóa thông tin user trong Database</li>
                        <li>Người dùng sẽ <strong>không thể đăng nhập</strong> lại</li>
                        <li><strong>KHÔNG THỂ HOÀN TÁC</strong></li>
                    </ul>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa vĩnh viễn',
                cancelButtonText: 'Hủy',
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#64748b'
            });
            
            if (!result.isConfirmed) return;

            try {
                // Show loading
                Swal.fire({
                    title: 'Đang xóa...',
                    html: 'Vui lòng đợi trong giây lát',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Method 1: Try Cloud Function (if deployed)
                try {
                    const deleteUserFunc = httpsCallable(functions, 'deleteUserCallable');
                    const response = await deleteUserFunc({ uid: uid });
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã xóa!',
                        text: `User ${email} đã được xóa vĩnh viễn khỏi hệ thống.`,
                        confirmButtonText: 'OK'
                    });
                    
                } catch (cloudFunctionError) {
                    console.error('Cloud Function error:', cloudFunctionError);
                    
                    // Method 2: Fallback - Delete from Database only
                    // Show warning that Auth deletion needs manual action
                    await remove(ref(db, `users/${uid}`));
                    
                    Swal.fire({
                        icon: 'warning',
                        title: 'Đã xóa khỏi Database',
                        html: `
                            <p>User đã được xóa khỏi Database.</p>
                            <div style="background:#fef3c7; padding:15px; border-radius:8px; margin-top:15px; text-align:left">
                                <p style="color:#92400e; margin-bottom:10px">
                                    <i class="fas fa-info-circle"></i> 
                                    <strong>Cần thêm 1 bước:</strong>
                                </p>
                                <p style="color:#64748b; font-size:0.9rem">
                                    Do chưa cài đặt Cloud Function, bạn cần xóa tài khoản Auth thủ công:
                                </p>
                                <ol style="color:#64748b; font-size:0.9rem; margin-top:10px; margin-left:20px">
                                    <li>Vào <a href="https://console.firebase.google.com" target="_blank" style="color:#2563eb">Firebase Console</a></li>
                                    <li>Chọn <strong>Authentication</strong> → <strong>Users</strong></li>
                                    <li>Tìm user: <strong>${email}</strong></li>
                                    <li>Nhấn <strong>⋮</strong> → <strong>Delete account</strong></li>
                                </ol>
                            </div>
                            <p style="margin-top:15px; font-size:0.85rem; color:#64748b">
                                <strong>Lưu ý:</strong> User vẫn có thể đăng nhập nếu không xóa trên Auth.
                            </p>
                        `,
                        confirmButtonText: 'Đã hiểu',
                        width: 600
                    });
                }

            } catch (error) {
                console.error('Error deleting user:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: error.message || 'Không thể xóa user',
                    confirmButtonText: 'OK'
                });
            }
        }

        // PARENT - CHILD INFO
        function renderChildInfo() {
            const studentId = window.parentStudentId;
            
            if (!studentId) {
                document.getElementById('content').innerHTML = `
                    <div class="card">
                        <h3 style="color:var(--danger)">Không tìm thấy thông tin học sinh</h3>
                        <p style="color:#64748b; margin-top:10px">
                            Vui lòng liên hệ Admin để được cấp mã học sinh.
                        </p>
                    </div>
                `;
                return;
            }
            
            // Tìm học sinh theo code hoặc id
            let student = null;
            let foundKey = null;
            
            // Thử tìm theo key trước
            if (window.localData.students[studentId]) {
                student = window.localData.students[studentId];
                foundKey = studentId;
            } else {
                // Nếu không có, tìm theo code hoặc id trong values
                for (let key in window.localData.students) {
                    const s = window.localData.students[key];
                    if (s.code === studentId || s.id === studentId) {
                        student = s;
                        foundKey = key;
                        break;
                    }
                }
            }
            
            if (!student) {
                const allStudents = Object.values(window.localData.students);
                document.getElementById('content').innerHTML = `
                    <div class="card">
                        <h3 style="color:var(--danger)">Không tìm thấy học sinh với mã: ${studentId}</h3>
                        <p style="color:#64748b; margin-top:10px">
                            Mã học sinh bạn nhập: <strong>${studentId}</strong>
                        </p>
                        <p style="color:#64748b; margin-top:5px">
                            Số học sinh trong hệ thống: <strong>${allStudents.length}</strong>
                        </p>
                        ${allStudents.length > 0 ? `
                            <div style="margin-top:15px">
                                <p style="color:#64748b; margin-bottom:10px">Danh sách mã học sinh có sẵn:</p>
                                <div style="background:#f8fafc; padding:15px; border-radius:8px">
                                    ${allStudents.map(s => `<div style="margin:5px 0">• ${s.code || s.id} - ${s.name}</div>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        <p style="color:#dc2626; margin-top:15px">
                            <i class="fas fa-exclamation-triangle"></i> 
                            Vui lòng liên hệ Admin để kiểm tra lại mã học sinh hoặc thêm học sinh vào hệ thống.
                        </p>
                    </div>
                `;
                return;
            }
            
            const scores = window.localData.scores[foundKey] || {};
            const transactions = Object.values(window.localData.finance).filter(t => 
                t.studentCode === studentId || 
                t.studentCode === student.code ||
                t.studentCode === foundKey
            );
            
            // Get feedback
            get(child(ref(db), `feedback/${foundKey}`)).then(fbSnap => {
                const feedbackData = fbSnap.val() || {};
                const feedbacks = Object.values(feedbackData).sort((a, b) => b.createdAt - a.createdAt);
                
                // Get payment status
                get(child(ref(db), `paymentStatus/${student.code || foundKey}`)).then(statusSnap => {
                    const paymentStatus = statusSnap.val() || {};
                    const isPaid = paymentStatus.isPaid || false;
                    
                    document.getElementById('content').innerHTML = `
                        <!-- Thông tin cơ bản -->
                        <div class="card">
                            <h3><i class="fas fa-user-graduate"></i> Thông tin học sinh</h3>
                            <div class="grid-3" style="margin-top:15px">
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Họ và tên</div>
                                    <div style="font-weight:600; margin-top:5px">${student.name}</div>
                                </div>
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Mã học sinh</div>
                                    <div style="font-weight:600; margin-top:5px">${student.code || studentId}</div>
                                </div>
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Lớp</div>
                                    <div style="font-weight:600; margin-top:5px">${student.classRoom || student.class || '-'}</div>
                                </div>
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Ngày sinh</div>
                                    <div style="font-weight:600; margin-top:5px">${student.dob || '-'}</div>
                                </div>
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Địa chỉ</div>
                                    <div style="font-weight:600; margin-top:5px">${student.address || '-'}</div>
                                </div>
                                <div>
                                    <div style="color:#64748b; font-size:0.9rem">Số điện thoại</div>
                                    <div style="font-weight:600; margin-top:5px">${student.phone || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Điểm số -->
                        <div class="card">
                            <h3><i class="fas fa-star"></i> Kết quả học tập</h3>
                            <div style="margin-top:15px">
                                ${['1', '2'].map(sem => {
                                    const semScores = scores[`semester${sem}`] || {};
                                    const classNum = (student.classRoom || student.class || '1').charAt(0);
                                    const subjects = window.PRIMARY_SUBJECTS[classNum] || window.PRIMARY_SUBJECTS['1'];
                                    
                                    return `
                                        <h4 style="color:var(--primary); margin-top:20px">Học kỳ ${sem}</h4>
                                        <div class="table-wrapper" style="margin-top:10px">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Môn học</th><th>TX1</th><th>TX2</th><th>TX3</th>
                                                        <th>GK</th><th>CK</th><th>TB</th><th>Nhận xét</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${subjects.map(subject => {
                                                        const sc = semScores[subject] || {};
                                                        return `<tr>
                                                            <td style="font-weight:600">${subject}</td>
                                                            <td>${sc.tx1 || '-'}</td>
                                                            <td>${sc.tx2 || '-'}</td>
                                                            <td>${sc.tx3 || '-'}</td>
                                                            <td>${sc.gk || '-'}</td>
                                                            <td>${sc.ck || '-'}</td>
                                                            <td style="font-weight:600; color:var(--primary)">${sc.average || '-'}</td>
                                                            <td style="color:#64748b; font-size:0.9rem">${sc.comment || '-'}</td>
                                                        </tr>`;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Thông tin tài chính -->
                        <div class="card">
                            <h3><i class="fas fa-dollar-sign"></i> Thông tin tài chính</h3>
                            
                            ${transactions.length > 0 ? `
                                <div class="table-wrapper" style="margin-top:15px">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Ngày</th><th>Loại</th><th>Danh mục</th><th>Số tiền</th><th>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${transactions.map(t => {
                                                const categoryNames = {
                                                    'tuition': 'Học phí',
                                                    'exam_fee': 'Phí thi',
                                                    'uniform': 'Đồng phục',
                                                    'meal': 'Tiền ăn',
                                                    'other_income': t.customIncome || 'Thu khác',
                                                    'salary': 'Lương',
                                                    'utility': 'Điện nước',
                                                    'maintenance': 'Bảo trì',
                                                    'supplies': 'Văn phòng phẩm',
                                                    'other_expense': 'Chi khác'
                                                };
                                                
                                                const typeText = t.type === 'income' ? 'Thu' : 'Chi';
                                                const typeBadge = t.type === 'income' ? 'badge-success' : 'badge-danger';
                                                const amountColor = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
                                                
                                                return `<tr>
                                                    <td>${new Date(t.date).toLocaleDateString('vi-VN')}</td>
                                                    <td><span class="badge ${typeBadge}">${typeText}</span></td>
                                                    <td>${categoryNames[t.category] || t.category}</td>
                                                    <td style="font-weight:600; color:${amountColor}">${t.amount.toLocaleString('vi-VN')}đ</td>
                                                    <td style="color:#64748b">${t.note || '-'}</td>
                                                </tr>`;
                                            }).join('')}
                                            <tr style="background:#f8fafc; font-weight:600">
                                                <td colspan="3" style="text-align:right">Tổng cộng:</td>
                                                <td colspan="2" style="color:var(--primary)">
                                                    ${transactions.reduce((sum, t) => {
                                                        return sum + (t.type === 'income' ? t.amount : -t.amount);
                                                    }, 0).toLocaleString('vi-VN')}đ
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div style="margin-top:15px">
                                    <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}" style="font-size:1rem; padding:8px 16px">
                                        ${isPaid ? '<i class="fas fa-check-circle"></i> Đã đóng đủ học phí' : '<i class="fas fa-clock"></i> Chưa đóng đủ học phí'}
                                    </span>
                                </div>
                            ` : '<p style="color:#94a3b8; margin-top:15px">Chưa có giao dịch tài chính nào</p>'}
                        </div>


                        <!-- Thời khóa biểu -->
                        <div class="card">
                            <h3><i class="fas fa-calendar-alt"></i> Thời khóa biểu lớp ${student.classRoom || student.class}</h3>
                            <div id="parent-timetable-container" style="margin-top:15px"></div>
                        </div>

                                                <!-- Phản hồi từ giáo viên -->
                        <div class="card">
                            <h3><i class="fas fa-comments"></i> Phản hồi từ giáo viên</h3>
                            ${feedbacks.length > 0 ? `
                                <div style="margin-top:15px">
                                    ${feedbacks.map(fb => `
                                        <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px; border-left:4px solid var(--primary)">
                                            <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                                                <div>
                                                    <strong style="color:var(--primary)">${fb.teacherName || 'Giáo viên'}</strong>
                                                    <span style="color:#94a3b8; margin-left:10px; font-size:0.9rem">
                                                        ${fb.teacherClass ? `Lớp ${fb.teacherClass}` : ''}
                                                    </span>
                                                </div>
                                                <span style="color:#94a3b8; font-size:0.85rem">
                                                    ${new Date(fb.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            </div>
                                            <div style="color:#334155">${fb.message}</div>
                                            ${fb.category ? `<div style="margin-top:8px"><span class="badge badge-info">${fb.category}</span></div>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p style="color:#94a3b8; margin-top:15px">Chưa có phản hồi nào từ giáo viên</p>'}
                        </div>
                    `;
                    
                    // Render timetable for parent
                    const studentClass = student.classRoom || student.class;
                    if (studentClass) {
                        // Use setTimeout to ensure DOM is ready
                        setTimeout(() => {
                            const timetableContainer = document.getElementById('parent-timetable-container');
                            if (timetableContainer) {
                                const timetableData = window.localData.timetables[studentClass] || {};
                                const grade = studentClass.charAt(0);
                                const subjects = window.PRIMARY_SUBJECTS[grade] || [];
                                
                                // Get periods
                                const morningPeriods = window.TIMETABLE_PERIODS.morning || window.DEFAULT_PERIODS.morning;
                                const afternoonPeriods = window.TIMETABLE_PERIODS.afternoon || window.DEFAULT_PERIODS.afternoon;
                                const allPeriods = [...morningPeriods, ...afternoonPeriods];
                                
                                const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                                
                                let html = '<div class="timetable-container"><div class="timetable-grid">';
                                
                                // Header row
                                html += '<div class="timetable-header"></div>';
                                days.forEach(day => {
                                    html += `<div class="timetable-header">${day}</div>`;
                                });
                                
                                // Time slots
                                allPeriods.forEach((period, pIndex) => {
                                    html += `<div class="timetable-time">${period.name}<br><small>${period.time}</small></div>`;
                                    
                                    days.forEach((day, dIndex) => {
                                        const slotKey = `d${dIndex}_p${pIndex}`;
                                        const slot = timetableData[slotKey] || {};
                                        
                                        if (slot.subject) {
                                            html += `
                                                <div class="timetable-cell">
                                                    <div class="timetable-subject">${slot.subject}</div>
                                                    ${slot.teacher ? `<div class="timetable-teacher">${slot.teacher}</div>` : ''}
                                                    ${slot.room ? `<div class="timetable-teacher">Phòng: ${slot.room}</div>` : ''}
                                                </div>
                                            `;
                                        } else {
                                            html += '<div class="timetable-cell"><span class="empty-slot">---</span></div>';
                                        }
                                    });
                                });
                                
                                html += '</div></div>';
                                timetableContainer.innerHTML = html;
                            }
                        }, 100);
                    }
                });
            });
        }

        // TEACHER - SEND FEEDBACK
        window.sendFeedback = async (studentCode, studentName) => {
            const result = await Swal.fire({
                title: `Gửi phản hồi cho: ${studentName}`,
                html: `
                    <div style="text-align:left; margin-top:15px">
                        <label style="font-weight:600; margin-bottom:5px; display:block">Loại phản hồi:</label>
                        <select id="feedback-category" class="form-control" style="margin-bottom:15px">
                            <option value="học tập">Học tập</option>
                            <option value="kỷ luật">Kỷ luật</option>
                            <option value="sức khỏe">Sức khỏe</option>
                            <option value="hoạt động">Hoạt động</option>
                            <option value="khen ngợi">Khen ngợi</option>
                            <option value="khác">Khác</option>
                        </select>
                        
                        <label style="font-weight:600; margin-bottom:5px; display:block">Nội dung:</label>
                        <textarea id="feedback-message" class="form-control" rows="5" 
                                  placeholder="Nhập nội dung phản hồi..."></textarea>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Gửi',
                cancelButtonText: 'Hủy',
                width: 600,
                preConfirm: () => {
                    const category = document.getElementById('feedback-category').value;
                    const message = document.getElementById('feedback-message').value;
                    
                    if (!message.trim()) {
                        Swal.showValidationMessage('Vui lòng nhập nội dung phản hồi');
                        return false;
                    }
                    
                    return { category, message };
                }
            });

            if (result.isConfirmed) {
                try {
                    // Tìm học sinh để lấy đúng key
                    let studentKey = null;
                    for (let key in window.localData.students) {
                        const s = window.localData.students[key];
                        if (s.code === studentCode || s.id === studentCode || key === studentCode) {
                            studentKey = key;
                            break;
                        }
                    }
                    
                    if (!studentKey) {
                        studentKey = studentCode; // fallback
                    }
                    
                    const feedbackData = {
                        studentCode: studentCode,
                        studentName: studentName,
                        category: result.value.category,
                        message: result.value.message,
                        teacherName: window.currentUser.email,
                        teacherClass: window.teacherClass,
                        createdAt: Date.now()
                    };

                    await push(ref(db, `feedback/${studentKey}`), feedbackData);

                    Swal.fire({
                        icon: 'success',
                        title: 'Đã gửi phản hồi!',
                        text: 'Phụ huynh sẽ nhìn thấy phản hồi của bạn.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (error) {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        // ==================== TIMETABLE FUNCTIONS ====================
        window.renderTimetable = () => {
            const content = document.getElementById('content');
            
            if (window.userRole === 'admin') {
                // Admin can edit all grades
                content.innerHTML = `
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px">
                            <h3><i class="fas fa-calendar-alt"></i> Quản lý Thời khóa biểu</h3>
                            <button class="btn btn-primary" onclick="openScheduleSettings()">
                                <i class="fas fa-cog"></i> Cài đặt thời gian
                            </button>
                        </div>
                        
                        <div class="grade-tabs" id="grade-tabs">
                            ${[1,2,3,4,5].map(grade => `
                                <div class="grade-tab ${grade === 1 ? 'active' : ''}" onclick="selectGrade(${grade})">
                                    Khối ${grade}
                                </div>
                            `).join('')}
                        </div>
                        
                        <div id="timetable-content"></div>
                    </div>
                `;
                
                window.currentGrade = 1;
                renderGradeTimetable(1);
                
            } else if (window.userRole === 'teacher') {
                // Teacher can only view their class
                if (!window.teacherClass) {
                    content.innerHTML = '<div class="card"><p>Bạn chưa được phân công lớp nào.</p></div>';
                    return;
                }
                
                content.innerHTML = `
                    <div class="card">
                        <h3><i class="fas fa-calendar-alt"></i> Thời khóa biểu lớp ${window.teacherClass}</h3>
                        <div id="timetable-content"></div>
                    </div>
                `;
                
                renderClassTimetable(window.teacherClass, false);
                
            } else if (window.userRole === 'parent') {
                // Parent can only view their child's class
                if (!window.studentId) {
                    content.innerHTML = '<div class="card"><p>Không tìm thấy thông tin học sinh.</p></div>';
                    return;
                }
                
                let studentClass = null;
                for (let key in window.localData.students) {
                    const s = window.localData.students[key];
                    if (s.code === window.studentId || key === window.studentId) {
                        studentClass = s.classRoom || s.class;
                        break;
                    }
                }
                
                if (!studentClass) {
                    content.innerHTML = '<div class="card"><p>Không tìm thấy thông tin lớp học của con bạn.</p></div>';
                    return;
                }
                
                content.innerHTML = `
                    <div class="card">
                        <h3><i class="fas fa-calendar-alt"></i> Thời khóa biểu lớp ${studentClass}</h3>
                        <div id="timetable-content"></div>
                    </div>
                `;
                
                renderClassTimetable(studentClass, false);
            }
        }

        window.selectGrade = (grade) => {
            window.currentGrade = grade;
            document.querySelectorAll('.grade-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            renderGradeTimetable(grade);
        }

        window.renderGradeTimetable = (grade) => {
            const classes = ['A', 'B', 'C', 'D'];
            const container = document.getElementById('timetable-content');
            
            container.innerHTML = `
                <div class="class-selector">
                    ${classes.map(cls => `
                        <div class="class-btn ${cls === 'A' ? 'active' : ''}" onclick="selectClass('${grade}${cls}')">
                            Lớp ${grade}${cls}
                        </div>
                    `).join('')}
                </div>
                <div id="class-timetable-view"></div>
            `;
            
            window.currentClass = `${grade}A`;
            renderClassTimetable(`${grade}A`, true);
        }

        window.selectClass = (className) => {
            window.currentClass = className;
            document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            renderClassTimetable(className, true);
        }

        window.renderClassTimetable = (className, editable = false) => {
            const container = editable ? document.getElementById('class-timetable-view') : document.getElementById('timetable-content');
            const timetableData = window.localData.timetables[className] || {};
            const grade = className.charAt(0);
            const subjects = window.PRIMARY_SUBJECTS[grade] || [];
            
            // Ensure periods are loaded
            const morningPeriods = window.TIMETABLE_PERIODS.morning || window.DEFAULT_PERIODS.morning;
            const afternoonPeriods = window.TIMETABLE_PERIODS.afternoon || window.DEFAULT_PERIODS.afternoon;
            const allPeriods = [...morningPeriods, ...afternoonPeriods];
            
            if (allPeriods.length === 0) {
                container.innerHTML = '<p style="color:#64748b; padding:20px">Chưa có cấu hình thời gian tiết học. Admin vui lòng cài đặt.</p>';
                return;
            }
            
            let html = '';
            
            // Morning session
            if (morningPeriods.length > 0) {
                html += '<h4 style="margin-bottom:15px; color:var(--primary); border-left:4px solid var(--primary); padding-left:10px">⛅ Buổi Sáng</h4>';
                html += '<div class="timetable-container"><div class="timetable-grid">';
                
                // Header row
                html += '<div class="timetable-header">Tiết</div>';
                window.WEEKDAYS.forEach(day => {
                    html += `<div class="timetable-header">${day}</div>`;
                });
                
                // Morning rows
                morningPeriods.forEach(period => {
                    html += `<div class="timetable-time">${period.name}<br><small>${period.time}</small></div>`;
                    
                    window.WEEKDAYS.forEach((day, dayIndex) => {
                        const slotKey = `${dayIndex}_${period.id}`;
                        const slot = timetableData[slotKey] || {};
                        
                        html += `<div class="timetable-cell">`;
                        
                        if (slot.subject) {
                            html += `
                                <div class="timetable-subject">${slot.subject}</div>
                                ${slot.teacher ? `<div class="timetable-teacher">${slot.teacher}</div>` : ''}
                                ${slot.room ? `<div class="timetable-teacher">P: ${slot.room}</div>` : ''}
                            `;
                        } else {
                            html += `<div class="empty-slot">-</div>`;
                        }
                        
                        if (editable) {
                            html += `<button class="btn btn-sm btn-primary timetable-edit-btn" 
                                        onclick="editTimetableSlot('${className}', ${dayIndex}, ${period.id}, '${period.name}')">
                                        <i class="fas fa-edit"></i>
                                    </button>`;
                        }
                        
                        html += '</div>';
                    });
                });
                
                html += '</div></div>';
            }
            
            // Afternoon session
            if (afternoonPeriods.length > 0) {
                html += '<h4 style="margin:25px 0 15px 0; color:var(--warning); border-left:4px solid var(--warning); padding-left:10px">🌙 Buổi Chiều</h4>';
                html += '<div class="timetable-container"><div class="timetable-grid">';
                
                // Header row
                html += '<div class="timetable-header">Tiết</div>';
                window.WEEKDAYS.forEach(day => {
                    html += `<div class="timetable-header">${day}</div>`;
                });
                
                // Afternoon rows
                afternoonPeriods.forEach(period => {
                    html += `<div class="timetable-time">${period.name}<br><small>${period.time}</small></div>`;
                    
                    window.WEEKDAYS.forEach((day, dayIndex) => {
                        const slotKey = `${dayIndex}_${period.id}`;
                        const slot = timetableData[slotKey] || {};
                        
                        html += `<div class="timetable-cell">`;
                        
                        if (slot.subject) {
                            html += `
                                <div class="timetable-subject">${slot.subject}</div>
                                ${slot.teacher ? `<div class="timetable-teacher">${slot.teacher}</div>` : ''}
                                ${slot.room ? `<div class="timetable-teacher">P: ${slot.room}</div>` : ''}
                            `;
                        } else {
                            html += `<div class="empty-slot">-</div>`;
                        }
                        
                        if (editable) {
                            html += `<button class="btn btn-sm btn-primary timetable-edit-btn" 
                                        onclick="editTimetableSlot('${className}', ${dayIndex}, ${period.id}, '${period.name}')">
                                        <i class="fas fa-edit"></i>
                                    </button>`;
                        }
                        
                        html += '</div>';
                    });
                });
                
                html += '</div></div>';
            }
            
            container.innerHTML = html;
        }

        window.editTimetableSlot = (className, dayIndex, periodId) => {
            window.currentTimetableSlot = { className, dayIndex, periodId };
            
            const grade = className.charAt(0);
            const subjects = window.PRIMARY_SUBJECTS[grade] || [];
            const timetableData = window.localData.timetables[className] || {};
            const slotKey = `${dayIndex}_${periodId}`;
            const slot = timetableData[slotKey] || {};
            
            // Populate subject dropdown
            const subjectSelect = document.getElementById('timetable-subject');
            subjectSelect.innerHTML = '<option value="">-- Chọn môn --</option>';
            subjects.forEach(subject => {
                subjectSelect.innerHTML += `<option value="${subject}" ${slot.subject === subject ? 'selected' : ''}>${subject}</option>`;
            });
            
            // Fill form
            const form = document.getElementById('timetable-form');
            form.teacher.value = slot.teacher || '';
            form.room.value = slot.room || '';
            
            document.getElementById('modal-timetable').style.display = 'flex';
        }

        window.saveTimetableSlot = async (e) => {
            e.preventDefault();
            const form = e.target;
            const { className, dayIndex, periodId } = window.currentTimetableSlot;
            const slotKey = `${dayIndex}_${periodId}`;
            
            const slotData = {
                subject: form.subject.value,
                teacher: form.teacher.value,
                room: form.room.value
            };
            
            try {
                await set(ref(db, `timetables/${className}/${slotKey}`), slotData);
                Swal.fire('Thành công', 'Đã cập nhật thời khóa biểu!', 'success');
                closeModal('modal-timetable');
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        window.clearTimetableSlot = async () => {
            const { className, dayIndex, periodId } = window.currentTimetableSlot;
            const slotKey = `${dayIndex}_${periodId}`;
            
            const result = await Swal.fire({
                title: 'Xác nhận xóa',
                text: 'Bạn có chắc muốn xóa tiết học này?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            });
            
            if (result.isConfirmed) {
                try {
                    await remove(ref(db, `timetables/${className}/${slotKey}`));
                    Swal.fire('Đã xóa', 'Tiết học đã được xóa!', 'success');
                    closeModal('modal-timetable');
                } catch (error) {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        // ==================== SCHEDULE SETTINGS FUNCTIONS ====================
        window.openScheduleSettings = () => {
            const morningPeriods = window.TIMETABLE_PERIODS.morning || window.DEFAULT_PERIODS.morning;
            const afternoonPeriods = window.TIMETABLE_PERIODS.afternoon || window.DEFAULT_PERIODS.afternoon;
            
            renderPeriodsList('morning', morningPeriods);
            renderPeriodsList('afternoon', afternoonPeriods);
            
            document.getElementById('modal-schedule-settings').style.display = 'flex';
        }

        function renderPeriodsList(session, periods) {
            const container = document.getElementById(`${session}-periods-container`);
            let html = '';
            
            periods.forEach((period, index) => {
                html += `
                    <div class="form-grid" style="align-items: end; margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Tên tiết</label>
                            <input type="text" class="form-control" value="${period.name}" 
                                   id="${session}-name-${index}" placeholder="VD: Tiết 1">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Thời gian (HH:MM-HH:MM)</label>
                            <input type="text" class="form-control" value="${period.time}" 
                                   id="${session}-time-${index}" placeholder="VD: 7:30-8:10">
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removePeriod('${session}', ${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }

        window.addPeriod = (session) => {
            const periods = session === 'morning' ? window.TIMETABLE_PERIODS.morning : window.TIMETABLE_PERIODS.afternoon;
            const nextId = periods.length > 0 ? Math.max(...periods.map(p => p.id)) + 1 : (session === 'morning' ? 1 : 6);
            
            periods.push({
                id: nextId,
                name: `Tiết ${nextId}`,
                time: session === 'morning' ? '7:30-8:10' : '13:30-14:10'
            });
            
            renderPeriodsList(session, periods);
        }

        window.removePeriod = (session, index) => {
            const periods = session === 'morning' ? window.TIMETABLE_PERIODS.morning : window.TIMETABLE_PERIODS.afternoon;
            
            if (periods.length <= 1) {
                Swal.fire('Lỗi', 'Phải có ít nhất 1 tiết trong mỗi buổi', 'warning');
                return;
            }
            
            periods.splice(index, 1);
            renderPeriodsList(session, periods);
        }

        window.saveScheduleSettings = async () => {
            try {
                // Collect morning periods
                const morningPeriods = [];
                const morningCount = document.querySelectorAll('[id^="morning-name-"]').length;
                
                for (let i = 0; i < morningCount; i++) {
                    const nameInput = document.getElementById(`morning-name-${i}`);
                    const timeInput = document.getElementById(`morning-time-${i}`);
                    
                    if (!nameInput || !timeInput) continue;
                    
                    const name = nameInput.value.trim();
                    const time = timeInput.value.trim();
                    
                    if (!name || !time) {
                        Swal.fire('Lỗi', 'Vui lòng điền đầy đủ tên và thời gian cho tất cả các tiết', 'warning');
                        return;
                    }
                    
                    // Validate time format
                    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(time)) {
                        Swal.fire('Lỗi', `Thời gian "${time}" không đúng định dạng. Vui lòng dùng HH:MM-HH:MM`, 'warning');
                        return;
                    }
                    
                    morningPeriods.push({
                        id: i + 1,
                        name: name,
                        time: time
                    });
                }
                
                // Collect afternoon periods
                const afternoonPeriods = [];
                const afternoonCount = document.querySelectorAll('[id^="afternoon-name-"]').length;
                
                for (let i = 0; i < afternoonCount; i++) {
                    const nameInput = document.getElementById(`afternoon-name-${i}`);
                    const timeInput = document.getElementById(`afternoon-time-${i}`);
                    
                    if (!nameInput || !timeInput) continue;
                    
                    const name = nameInput.value.trim();
                    const time = timeInput.value.trim();
                    
                    if (!name || !time) {
                        Swal.fire('Lỗi', 'Vui lòng điền đầy đủ tên và thời gian cho tất cả các tiết', 'warning');
                        return;
                    }
                    
                    // Validate time format
                    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(time)) {
                        Swal.fire('Lỗi', `Thời gian "${time}" không đúng định dạng. Vui lòng dùng HH:MM-HH:MM`, 'warning');
                        return;
                    }
                    
                    afternoonPeriods.push({
                        id: morningPeriods.length + i + 1,
                        name: name,
                        time: time
                    });
                }
                
                const scheduleSettings = {
                    morning: morningPeriods,
                    afternoon: afternoonPeriods
                };
                
                await set(ref(db, 'scheduleSettings'), scheduleSettings);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Đã lưu cài đặt!',
                    text: 'Thời gian tiết học đã được cập nhật.',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                closeModal('modal-schedule-settings');
                
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
            }
        }

        window.resetDefaultSchedule = async () => {
            const result = await Swal.fire({
                title: 'Khôi phục mặc định?',
                text: 'Thao tác này sẽ đặt lại thời gian về cài đặt mặc định',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Khôi phục',
                cancelButtonText: 'Hủy'
            });
            
            if (result.isConfirmed) {
                try {
                    await set(ref(db, 'scheduleSettings'), window.DEFAULT_PERIODS);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã khôi phục!',
                        text: 'Cài đặt đã được đặt về mặc định.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    closeModal('modal-schedule-settings');
                    
                } catch (error) {
                    Swal.fire('Lỗi', error.message, 'error');
                }
            }
        }

        // MODAL
        window.closeModal = (id) => {
            document.getElementById(id).style.display = 'none';
        }
