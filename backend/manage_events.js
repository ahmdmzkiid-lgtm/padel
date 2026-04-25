import pool from './config/db.js';

// ======================================================
//  Script untuk melihat semua event & menghapus event
//
//  Lihat semua event:
//    node manage_events.js list
//
//  Hapus event berdasarkan ID:
//    node manage_events.js delete 3
//
//  Toggle aktif/nonaktif event:
//    node manage_events.js toggle 3
// ======================================================

const command = process.argv[2];
const eventId = process.argv[3];

const run = async () => {
  try {
    if (command === 'list' || !command) {
      const result = await pool.query('SELECT id, title, date, location, is_active FROM events ORDER BY date DESC');
      
      if (result.rows.length === 0) {
        console.log('\n📭 Belum ada event.\n');
      } else {
        console.log('\n📋 Daftar Event:\n');
        console.log('─'.repeat(80));
        result.rows.forEach((e) => {
          const status = e.is_active ? '✅ Aktif' : '❌ Nonaktif';
          const dateStr = e.date ? new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
          console.log(`  ID: ${e.id} | ${e.title}`);
          console.log(`       📅 ${dateStr} | 📍 ${e.location || '-'} | ${status}`);
          console.log('─'.repeat(80));
        });
        console.log(`\nTotal: ${result.rows.length} event\n`);
      }

    } else if (command === 'delete') {
      if (!eventId) {
        console.log('\n⚠️  Masukkan ID event. Contoh: node manage_events.js delete 3\n');
        process.exit(1);
      }
      const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING title', [eventId]);
      if (result.rows.length === 0) {
        console.log(`\n⚠️  Event dengan ID ${eventId} tidak ditemukan.\n`);
      } else {
        console.log(`\n🗑️  Event "${result.rows[0].title}" (ID: ${eventId}) berhasil dihapus.\n`);
      }

    } else if (command === 'toggle') {
      if (!eventId) {
        console.log('\n⚠️  Masukkan ID event. Contoh: node manage_events.js toggle 3\n');
        process.exit(1);
      }
      const result = await pool.query(
        'UPDATE events SET is_active = NOT is_active WHERE id = $1 RETURNING title, is_active',
        [eventId]
      );
      if (result.rows.length === 0) {
        console.log(`\n⚠️  Event dengan ID ${eventId} tidak ditemukan.\n`);
      } else {
        const status = result.rows[0].is_active ? '✅ Aktif' : '❌ Nonaktif';
        console.log(`\n🔄 Event "${result.rows[0].title}" sekarang: ${status}\n`);
      }

    } else {
      console.log('\n❓ Perintah tidak dikenali. Gunakan: list, delete, atau toggle\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

run();
