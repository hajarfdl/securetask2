const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join('/tmp', 'securetask.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT,
        email TEXT UNIQUE,
        mot_de_passe TEXT,
        role TEXT
    );
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
    );
`);

const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (count.c === 0) {
    db.prepare("INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)").run('Karim Alaoui', 'test@securetask.ma', 'password123', 'Lead Securite');
    db.prepare("INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)").run('Ahmad', 'ahmad@securetask.ma', 'password123', 'Ingenieur SSI');
    db.prepare("INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)").run('Sara', 'sara@securetask.ma', 'password123', 'Ingenieur SSI');
    db.prepare("INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)").run('Laila', 'laila@securetask.ma', 'password123', 'Observateur');
}

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url;
    const method = req.method;

    try {
        if (url.includes('/login') && method === 'POST') {
            const { email, password } = req.body;
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (user && user.mot_de_passe === password) {
                return res.json({ success: true, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
            }
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
        }

        if (url.includes('/taches') && method === 'GET' && !url.match(/\/taches\/\d+/)) {
            const taches = db.prepare('SELECT * FROM taches ORDER BY created_at DESC').all();
            return res.json(taches);
        }

        if (url.includes('/taches') && method === 'POST') {
            const { titre, description, priorite, echeance, assigneA, statut, labels } = req.body;
            db.prepare('INSERT INTO taches (titre, description, priorite, echeance, assigne_a, statut, labels) VALUES (?,?,?,?,?,?,?)').run(
                titre, description || '', priorite || 'Moyenne', echeance || '', assigneA || 'Non assigne', statut || 'A faire', (labels || []).join(', ')
            );
            return res.json({ success: true });
        }

        if (url.match(/\/taches\/\d+/) && method === 'PUT') {
            const id = url.split('/').pop();
            db.prepare('UPDATE taches SET statut = ? WHERE id = ?').run(req.body.statut, id);
            return res.json({ success: true });
        }

        if (url.match(/\/taches\/\d+/) && method === 'DELETE') {
            const id = url.split('/').pop();
            db.prepare('DELETE FROM taches WHERE id = ?').run(id);
            return res.json({ success: true });
        }
        
        if (url.includes('/register') && method === 'POST') {
    const { nom, email, password } = req.body;

    // Vérifications
    if (!nom || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Mot de passe trop court (6 caractères min).' });
    }

    // Vérifier si l'email existe déjà
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    // Insérer le nouvel utilisateur
    db.prepare('INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)')
      .run(nom, email, password, 'Utilisateur');

    return res.json({ success: true, message: 'Compte créé avec succès.' });
}

        if (url.includes('/register') && method === 'POST') {
            const { nom, email, password } = req.body;

            if (!nom || !email || !password) {
                return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Mot de passe trop court (6 caractères min).' });
            }

            const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existing) {
                return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
            }

            db.prepare('INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?,?,?,?)')
              .run(nom, email, password, 'Utilisateur');

            return res.json({ success: true, message: 'Compte créé avec succès.' });
        }

        if (url.includes('/users') && method === 'GET') {
            const users = db.prepare('SELECT id, nom, email, role FROM users').all();
            return res.json(users);
        }

        return res.status(404).json({ error: 'Route non trouvee' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};