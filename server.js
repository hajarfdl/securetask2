const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// ── Connexion MySQL ──
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'securetask',
    port: process.env.MYSQLPORT || 3306
});

db.connect(err => {
    if (err) {
        console.error('Erreur MySQL:', err);
        return;
    }
    console.log('✅ MySQL connecté !');
    initDB();
});

// ── Créer les tables ──
function initDB() {
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            mot_de_passe VARCHAR(255),
            role VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS taches (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titre VARCHAR(200),
            description TEXT,
            priorite VARCHAR(50),
            echeance DATE,
            assigne_a VARCHAR(100),
            statut VARCHAR(50),
            labels VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.query(`SELECT COUNT(*) as count FROM users`, (err, results) => {
        if (!err && results[0].count === 0) {
            db.query(`
                INSERT INTO users (nom, email, mot_de_passe, role) VALUES
                ('Karim Alaoui', 'test@securetask.ma', 'password123', 'Lead Securite'),
                ('Ahmad', 'ahmad@securetask.ma', 'password123', 'Ingenieur SSI'),
                ('Sara', 'sara@securetask.ma', 'password123', 'Ingenieur SSI'),
                ('Laila', 'laila@securetask.ma', 'password123', 'Observateur')
            `);
            console.log('✅ Utilisateurs créés !');
        }
    });
}

// ── Pages HTML ──
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'connexion.html'));
});

// ── LOGIN ──
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const user = results[0];
        if (user && user.mot_de_passe === password) {
            return res.json({
                success: true,
                user: { id: user.id, nom: user.nom, email: user.email, role: user.role }
            });
        }
        res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    });
});

// ── TÂCHES ──
app.get('/api/taches', (req, res) => {
    db.query('SELECT * FROM taches ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        results.forEach(t => {
            if (t.echeance) t.echeance = t.echeance.toISOString().split('T')[0];
        });
        res.json(results);
    });
});

app.post('/api/taches', (req, res) => {
    const { titre, description, priorite, echeance, assigneA, statut, labels } = req.body;
    db.query(
        'INSERT INTO taches (titre, description, priorite, echeance, assigne_a, statut, labels) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [titre, description || '', priorite || 'Moyenne', echeance, assigneA || 'Non assigne', statut || 'A faire', (labels || []).join(', ')],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put('/api/taches/:id', (req, res) => {
    db.query('UPDATE taches SET statut = ? WHERE id = ?', [req.body.statut, req.params.id], err => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/taches/:id', (req, res) => {
    db.query('DELETE FROM taches WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// ── USERS ──
app.get('/api/users', (req, res) => {
    db.query('SELECT id, nom, email, role FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ── DÉMARRAGE ──
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`✅ SecureTask démarré sur le port ${PORT}`);
});