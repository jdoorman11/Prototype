const mysql = require('mysql2/promise');

async function testConnection() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,  // Standaard MySQL poort
    user: 'root',
    password: ''
  });

  console.log('Verbonden met MySQL server!');
  
  const [dbs] = await connection.query('SHOW DATABASES');
  console.log('Beschikbare databases:', dbs.map(db => db.Database).join(', '));
  
  await connection.end();
  process.exit(0);
}

testConnection().catch(err => {
  console.error('Fout bij verbinden met MySQL:', err);
  process.exit(1);
});
