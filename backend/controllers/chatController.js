import pool from '../config/db.js';

// GET /api/chat/history/:userId
export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mark as read if admin is viewing the chat
    await pool.query(
      `UPDATE messages SET is_read = true 
       WHERE sender_id = $1 AND is_read = false`,
      [userId]
    );

    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 OR receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId]
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Gagal mengambil riwayat chat.' });
  }
};

// GET /api/chat/admin/list
export const getAdminChatList = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (u.id) 
        u.id, u.name, u.email, m.message as last_message, m.created_at,
        (SELECT COUNT(*)::int FROM messages WHERE sender_id = u.id AND is_read = false) as unread_count
       FROM users u
       JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
       WHERE u.is_admin = false
       ORDER BY u.id, m.created_at DESC`
    );
    res.json({ chats: result.rows });
  } catch (error) {
    console.error('Get admin chat list error:', error);
    res.status(500).json({ message: 'Gagal mengambil daftar chat.' });
  }
};

// DELETE /api/chat/history/:userId
export const deleteChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      `DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );
    res.json({ message: 'Riwayat chat berhasil dihapus.' });
  } catch (error) {
    console.error('Delete chat history error:', error);
    res.status(500).json({ message: 'Gagal menghapus riwayat chat.' });
  }
};
