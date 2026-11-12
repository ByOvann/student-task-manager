# Student Task Manager

Aplikasi pengelola tugas mahasiswa berbasis **React Native** dan **Expo**. Aplikasi ini dibuat untuk membantu mahasiswa mencatat, mengatur, dan memantau tugas agar aktivitas perkuliahan menjadi lebih terorganisir.

## Tentang Aplikasi

Student Task Manager menyediakan fitur untuk mengelola tugas berdasarkan kategori, prioritas, status pengerjaan, dan deadline. Aplikasi juga dilengkapi dashboard, statistik, penyimpanan lokal, serta notifikasi pengingat.

## Fitur Utama

- **Dashboard:** Menampilkan ringkasan dan progres tugas.
- **Manajemen Tugas:** Menambahkan, mengedit, menghapus, dan mengubah status tugas.
- **Pencarian:** Mencari tugas berdasarkan judul atau deskripsi.
- **Filter Tugas:** Memisahkan tugas yang sudah dan belum selesai.
- **Kategori:** Mengelompokkan tugas Kuliah, Pribadi, dan Pekerjaan.
- **Prioritas:** Mengatur tingkat prioritas Rendah, Sedang, dan Tinggi.
- **Deadline:** Menentukan tanggal penyelesaian tugas.
- **Analytics:** Melihat statistik dan ringkasan tugas.
- **Penyimpanan Lokal:** Menyimpan data menggunakan AsyncStorage.
- **Notifikasi:** Memberikan pengingat tugas berdasarkan deadline.

## Teknologi yang Digunakan

- React Native
- Expo
- TypeScript
- Expo Notifications
- AsyncStorage
- React Native SVG
- React Native DateTimePicker
- Expo Vector Icons

## Konsep React Hooks

Aplikasi ini menerapkan beberapa React Hooks:

| Hooks | Fungsi |
|---|---|
| `useState` | Mengelola state aplikasi |
| `useEffect` | Menangani efek samping dan penyimpanan data |
| `useMemo` | Mengoptimalkan perhitungan data |
| `useCallback` | Mengoptimalkan fungsi |
| `useRef` | Mengakses referensi komponen |
| `useReducer` | Mengelola perubahan state tugas |

## Struktur Project

```text
student-task-manager/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── components/
│   │   └── TaskCard.tsx
│   └── utils/
│       └── notifications.ts
├── assets/
├── app.json
├── package.json
└── README.md
```

## Cara Menjalankan Aplikasi

Pastikan Node.js dan Expo sudah terpasang.

1. Clone repository:

```bash
git clone https://github.com/ByOvann/student-task-manager.git
```

2. Masuk ke folder project:

```bash
cd student-task-manager
```

3. Instal dependencies:

```bash
npm install
```

4. Jalankan aplikasi:

```bash
npx expo start
```

## Screenshot Aplikasi

Tambahkan screenshot asli aplikasi ke folder `screenshots/`, kemudian tampilkan di bagian ini.

Contoh:

```markdown
![Home](screenshots/home.png)
![Tasks](screenshots/tasks.png)
![Analytics](screenshots/analytics.png)
![Settings](screenshots/settings.png)
```

## Repository

GitHub: https://github.com/ByOvann/student-task-manager

---

**Student Task Manager**  
Developed as a React Native academic project.