const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a new database connection
const db = new sqlite3.Database(path.join(__dirname, '../documents.db'), (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Promisify the database methods
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error executing query:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Error executing get:', err);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error executing run:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = { query, get, run };
