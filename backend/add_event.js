import pool from './config/db.js';

// ======================================================
//  EDIT DATA EVENT DI BAWAH INI, LALU JALANKAN:
//  node add_event.js
// ======================================================

const newEvent = {
  title: 'Turnamen Padel Cup 2026',
  description: 'Turnamen padel terbuka untuk semua level. Hadiah jutaan rupiah!',
  content: `Detail lengkap event:

- Format: Double Elimination
- Kategori: Pemula, Menengah, Profesional
- Hadiah Total: Rp 10.000.000
- Pendaftaran: Rp 150.000/tim
- Fasilitas: Jersey, Makan Siang, Sertifikat

Hubungi admin untuk pendaftaran lebih lanjut.`,
  image: null,        // Kosongkan kalau tidak ada gambar, atau isi path seperti '/uploads/event1.jpg'
  date: '2026-05-15', // Format: YYYY-MM-DD
  location: 'PadelZone Court, Jakarta',
  is_active: true,    // true = tampil di website, false = disembunyikan
};

// ======================================================
//  JANGAN EDIT DI BAWAH INI
// ======================================================

const run = async () => {
  try {
    // Pastikan tabel sudah ada
    await pool.query(`CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      content TEXT,
      image VARCHAR(500),
      date DATE,
      location VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const result = await pool.query(
      `INSERT INTO events (title, description, content, image, date, location, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        newEvent.title,
        newEvent.description,
        newEvent.content,
        newEvent.image,
        newEvent.date,
        newEvent.location,
        newEvent.is_active,
      ]
    );

    console.log('\n✅ Event berhasil ditambahkan!\n');
    console.log('ID:', result.rows[0].id);
    console.log('Title:', result.rows[0].title);
    console.log('Date:', result.rows[0].date);
    console.log('Location:', result.rows[0].location);
    console.log('Active:', result.rows[0].is_active);
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Gagal menambahkan event:', error.message);
    process.exit(1);
  }
};

run();
