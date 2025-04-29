# **App Name**: PetaPolnep

## Core Features:

- Map Exploration: Users explore 2D visual maps with 2D avatars.
- Interactive Quizzes: Admins create multiple-choice, short answer, matching, sequencing, drag-and-drop, hotspot identification, and word/sentence arrangement questions, associating them with specific map nodes and difficulty levels.
- Multiplayer Interaction: Users create or join rooms, view other players' avatars in real-time, complete synchronized quizzes, and see a real-time leaderboard.

## Style Guidelines:

- Primary color: Dark blue (#1A237E) to reflect Polnep's brand identity.
- Secondary color: Light blue (#E3F2FD) for a clean and modern feel.
- Accent: Yellow (#FFEB3B) to highlight interactive elements and call-to-actions, adding a touch of gamification.
- Clear and readable sans-serif fonts, optimized for both desktop and mobile screens.
- Pixel art icons to maintain the visual style of the 2D maps and avatars.
- Clean and intuitive layout, optimized for easy navigation and interaction.

## Original User Request:
Prompt untuk AI Pengembang Aplikasi Edutech Gamifikasi

1. Tujuan Proyek:
Mengembangkan prototipe fungsional sebuah Aplikasi Edutech Berbasis Web dengan Gamifikasi. Tujuan utamanya adalah menciptakan pengalaman belajar yang lebih menarik dan interaktif untuk mahasiswa Politeknik Negeri Pontianak (Polnep), dengan studi kasus awal pada Mata Kuliah Bahasa Inggris.

2. Konsep Inti:
Aplikasi menyajikan materi pembelajaran (khususnya Bahasa Inggris untuk studi kasus ini) melalui peta visual 2D interaktif yang dapat dijelajahi oleh pengguna menggunakan avatar 2D. Pada titik-titik tertentu (node) di peta, pengguna akan dihadapkan pada kuis atau tantangan kontekstual. Aplikasi ini juga mendukung interaksi multiplayer dasar secara real-time dalam satu sesi/peta permainan dan menerapkan elemen gamifikasi seperti poin dan leaderboard sesi.

3. Target Pengguna:

Mahasiswa Politeknik Negeri Pontianak: Sebagai pengguna utama (learner), bisa login (User) atau mencoba sebagai Pengunjung.
Dosen/Admin Politeknik Negeri Pontianak: Sebagai pembuat konten (peta, node, kuis) dan pengelola sesi/hasil.
4. Fitur Utama yang Dibutuhkan:

Manajemen Pengguna:
Registrasi dan Login untuk Mahasiswa (User).
Akses Pengunjung (tanpa simpan progres permanen).
Halaman Profil User (menampilkan riwayat penyelesaian kuis/peta & skor per sesi).
Autentikasi aman.
Pengelolaan Konten (Hanya untuk Admin/Dosen):
Membuat/Mengedit/Menghapus Peta Visual 2D (misal: upload tileset, definisikan area).
Membuat/Mengedit/Menghapus Node pada Peta (menentukan lokasi X,Y, mungkin judul/deskripsi).
Membuat/Mengedit/Menghapus Soal/Kuis dan mengaitkannya ke Node spesifik. Dukungan format kuis: Pilihan Ganda, Isian Singkat, Mencocokkan, Mengurutkan, Seret dan Lepas (Drag & Drop), Identifikasi Hotspot, Menyusun Kata/Kalimat. Pembuat konten menentukan jawaban benar dan tingkat kesulitan implisit dari soal.
Interaksi Pembelajaran Gamified (Untuk Mahasiswa & Pengunjung):
Memilih Peta Pembelajaran yang tersedia.
Mengendalikan Avatar 2D untuk eksplorasi Peta Visual 2D.
Interaksi Avatar dengan Node untuk memicu Kuis/Tantangan.
Menjawab Kuis dalam berbagai format interaktif.
Menerima umpan balik langsung (Benar/Salah).
Mendapatkan Poin Sesi untuk jawaban benar (poin ini tidak terakumulasi secara global permanen).
Fitur Multiplayer Dasar (Real-Time):
Membuat atau Bergabung ke dalam Ruang (Room) permainan berdasarkan Peta tertentu (bisa dengan kode room).
Menampilkan avatar pemain lain di dalam room yang sama pada peta secara real-time (sinkronisasi posisi dasar).
Menyajikan Kuis/Tantangan yang sama secara sinkron kepada semua pemain dalam room.
Menampilkan Leaderboard Sesi secara real-time yang mengurutkan pemain dalam room berdasarkan skor sesi mereka saat itu.
Fitur untuk Dosen/Admin:
Melihat rekapitulasi hasil dari sesi permainan yang telah selesai (partisipan, skor akhir sesi).
Mengekspor (mengunduh) data rekapitulasi skor sesi tersebut ke dalam format file (misal: CSV).
5. Fitur yang Secara Eksplisit Dikecualikan (Lingkup D3):

Leaderboard Global Permanen (berdasarkan total poin akumulasi).
Fitur bagi mahasiswa umum (User) untuk membuat Soal/Kuis/Peta.
Optimasi performa multiplayer untuk skala besar.
Pengukuran dampak kuantitatif pada hasil belajar (evaluasi fokus pada fungsionalitas & usabilitas awal).
6. Tumpukan Teknologi (Sesuai Proposal):

Framework Full-stack: Next.js (dengan React)
Game Engine 2D (Client-side): Phaser 3
Komunikasi Real-time: WebSocket (implementasi bisa menggunakan library seperti Socket.IO atau ws di backend Node.js)
Database: PostgreSQL
ORM: Prisma
Styling: Tailwind CSS
Asset Creation: Aseprite (untuk pixel art)
Lingkungan Server: Node.js
7. Struktur Basis Data (Ringkasan - Sesuai Revisi):

Tabel utama: User (tanpa total_points), Map (info peta), MapNode (info node di peta), Question (detail soal & jawaban benar, link ke node), Answer (rekaman jawaban user), Room (info sesi multiplayer), RoomParticipant (user dalam room & current_score sesi).
TIDAK ADA tabel Leaderboard global.
Relasi antar tabel sesuai ERD yang telah disesuaikan (Gambar 3 versi revisi).
8. Catatan UI/UX:

Menggunakan gaya visual Pixel Art.   
Menerapkan prinsip desain: Kesederhanaan, Kejelasan, Konsistensi, Umpan Balik, Estetika Gamifikasi Menarik, Berorientasi Pengguna.
Desain responsif untuk desktop dan mobile.   
9. Konten Awal:

Fokus pada pembuatan beberapa contoh Peta dan Kuis untuk studi kasus Mata Kuliah Bahasa Inggris di Polnep (misal: Kosakata IT, Tata Bahasa Dasar).
Catatan Penggunaan Prompt:

Prompt ini memberikan gambaran detail mengenai lingkup dan fitur. Bergantung pada kemampuan AI yang Anda gunakan, Anda mungkin perlu memecah permintaan ini menjadi bagian-bagian yang lebih kecil (misalnya, "Buatkan skema database Prisma berdasarkan tabel ini", "Implementasikan fitur login menggunakan Next.js dan Prisma", "Buatkan komponen React untuk menampilkan leaderboard sesi", "Setup game scene Phaser 3 untuk memuat tilemap dan avatar").
Anda juga perlu menyediakan aset grafis (pixel art dari Aseprite) jika meminta AI untuk membangun bagian visual game.
  