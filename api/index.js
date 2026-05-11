const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const db = await mysql.createConnection(dbConfig);
    const url = req.url;
    const method = req.method;

    try {
        // LOGIN
        if (url === '/api/login' && method === 'POST') {
            const { email, password } = req.body;
            const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            const user = rows[0];
            if (user && user.mot_de_passe === password) {
                return res.json({ success: true, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
            }
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
        }

        // GET TACHES
        if (url === '/api/taches' && method === 'GET') {
            const [rows] = await db.execute('SELECT * FROM taches ORDER BY created_at DESC');
            rows.forEach(t => { if (t.echeance) t.echeance = t.echeance.toString().split('T')[0]; });
            return res.json(rows);
        }

        // CREATE TACHE
        if (url === '/api/taches' && method === 'POST') {
            const { titre, description, priorite, echeance, assigneA, statut, labels } = req.body;
            await db.execute(
                'INSERT INTO taches (titre, description, priorite, echeance, assigne_a, statut, labels) VALUES (?,?,?,?,?,?,?)',
                [titre, description || '', priorite || 'Moyenne', echeance, assigneA || 'Non assigne', statut || 'A faire', (labels || []).join(', ')]
            );
            return res.json({ success: true });
        }

        // UPDATE TACHE
        if (url.startsWith('/api/taches/') && method === 'PUT') {
            const id = url.split('/')[3];
            await db.execute('UPDATE taches SET statut = ? WHERE id = ?', [req.body.statut, id]);
            return res.json({ success: true });
        }

        // DELETE TACHE
        if (url.startsWith('/api/taches/') && method === 'DELETE') {
            const id = url.split('/')[3];
            await db.execute('DELETE FROM taches WHERE id = ?', [id]);
            return res.json({ success: true });
        }

        // GET USERS
        if (url === '/api/users' && method === 'GET') {
            const [rows] = await db.execute('SELECT id, nom, email, role FROM users');
            return res.json(rows);
        }

        return res.status(404).json({ error: 'Route non trouvée' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        await db.end();
    }
};