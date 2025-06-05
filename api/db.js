const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

// Maak verbinding met SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialiseer de database met benodigde tabellen
function initializeDatabase() {
    db.serialize(() => {
        // Controleer of de Documents tabel al bestaat
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Documents'", [], (err, row) => {
            if (err) {
                console.error('Error checking for tables:', err);
                return;
            }
            
            if (!row) {
                // Maak de Documents tabel aan als deze nog niet bestaat
                db.run(`
                    CREATE TABLE Documents (
                        doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        document_name TEXT NOT NULL,
                        tag TEXT,
                        publication_date DATE,
                        status TEXT,
                        parent_id INTEGER,
                        content TEXT,
                        FOREIGN KEY (parent_id) REFERENCES Documents (doc_id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating tables:', err);
                    } else {
                        console.log('Database tables created successfully');
                        // Voeg hier eventuele initiële data toe indien nodig
                    }
                });
            }
        });
    });
}

// Functie om queries uit te voeren
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Functie om een enkele rij op te halen
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Functie om een query uit te voeren (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

module.exports = {
    db,
    query,
    get,
    run
};
