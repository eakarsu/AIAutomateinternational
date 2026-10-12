const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const pool = require('../db');

module.exports = async function (req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token format invalid. Use: Bearer <token>' });
  }

  const token = parts[1];
  if (/^[a-f0-9]{64}$/i.test(token)) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const result = await pool.query(
        `SELECT r.id AS runtime_user_id, r.email, r.display_name AS name, r.role,
                COALESCE(
                  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
                  (SELECT id FROM users ORDER BY id LIMIT 1)
                ) AS id
         FROM runtime_app_sessions s
         JOIN runtime_app_users r ON r.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW() AND r.active = TRUE
         LIMIT 1`,
        [tokenHash]
      );
      if (result.rows.length && result.rows[0].id != null) {
        req.user = result.rows[0];
        return next();
      }
    } catch (err) {
      console.error('Runtime session verification error:', err.message);
    }
    return res.status(401).json({ error: 'Token is not valid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};
