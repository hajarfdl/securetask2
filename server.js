const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Utilisation de sqlite3 au lieu de mysql2
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Connexion SQLite (Fichier local) ──
// Remplace ton ancienne ligne par celle-ci :
const dbPath = path.join('/tmp', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur SQLite:', err.message);
    } else {
        console.log('✅ SQLite connecté !');
        initDB();
    }
});

// ── Créer les tables (Syntaxe SQLite) ──
function initDB() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT,
                email TEXT UNIQUE,
                mot_de_passe TEXT,
                role TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS taches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titre TEXT,
                description TEXT,
                priorite TEXT,
                echeance TEXT,
                assigne_a TEXT,
                statut TEXT,
                labels TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertion des utilisateurs par défaut si la table est vide
        db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
            if (!err && row.count === 0) {
                const stmt = db.prepare(`INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)`);
                stmt.run('Karim Alaoui', 'test@securetask.ma', 'password123', 'Lead Securite');
                stmt.run('Ahmad', 'ahmad@securetask.ma', 'password123', 'Ingenieur SSI');
                stmt.run('Sara', 'sara@securetask.ma', 'password123', 'Ingenieur SSI');
                stmt.run('Laila', 'laila@securetask.ma', 'password123', 'Observateur');
                stmt.finalize();
                console.log('✅ Utilisateurs initiaux créés !');
            }
        });
    });
}

// ── Routes API (Adaptées pour SQLite) ──

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'connexion.html'));
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (user && user.mot_de_passe === password) {
            return res.json({
                success: true,
                user: { id: user.id, nom: user.nom, email: user.email, role: user.role }
            });
        }
        res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    });
});

app.post('/api/register', (req, res) => {
    const { nom, email, password } = req.body;

    if (!nom || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Mot de passe trop court (6 caractères min).' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
        if (existing) {
            return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
        }
        db.run(
            'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
            [nom, email, password, 'Utilisateur'],
            function(err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, message: 'Compte créé avec succès.' });
            }
        );
    });
});

app.get('/api/taches', (req, res) => {
    db.all('SELECT * FROM taches ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/taches', (req, res) => {
    const { titre, description, priorite, echeance, assigneA, statut, labels } = req.body;
    const sql = 'INSERT INTO taches (titre, description, priorite, echeance, assigne_a, statut, labels) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [titre, description || '', priorite || 'Moyenne', echeance, assigneA || 'Non assigne', statut || 'A faire', (labels || []).join(', ')];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/taches/:id', (req, res) => {
    db.run('UPDATE taches SET statut = ? WHERE id = ?', [req.body.statut, req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/taches/:id', (req, res) => {
    db.run('DELETE FROM taches WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT id, nom, email, role FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`✅ SecureTask démarré sur le port ${PORT}`);
});