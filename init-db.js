const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('documents.db');

// Create documents table with the correct structure
db.serialize(() => {
  // Drop existing tables if they exist
  db.run(`DROP TABLE IF EXISTS documents`);
  
  // Create new table with parent_id for addendums
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_name TEXT NOT NULL,
    tag TEXT,
    publication_date TEXT,
    status TEXT NOT NULL,
    content TEXT,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES documents(doc_id)
  )`);

  console.log('Inserting sample documents...');
  
  // Insert main documents
  const stmt = db.prepare(
    "INSERT INTO documents (document_name, tag, publication_date, status, content, parent_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const mainDocuments = [
    {
      document_name: "Beleidsnota Duurzaamheid 2025",
      tag: "Convenant",
      publication_date: "2025-05-15",
      status: "Gepubliceerd",
      content: "Beleidsnota met duurzaamheidsdoelstellingen voor 2025-2030",
      parent_id: null
    },
    {
      document_name: "Adviesrapport Mobiliteitsplan",
      tag: "Adviesstuk",
      publication_date: "2025-04-10",
      status: "Gepubliceerd",
      content: "Advies over het nieuwe mobiliteitsplan voor de binnenstad",
      parent_id: null
    },
    {
      document_name: "Samenwerkingsovereenkomst Onderwijs",
      tag: "Convenant",
      publication_date: "2025-05-28",
      status: "In bewerking",
      content: "Conceptversie van de samenwerkingsovereenkomst met onderwijsinstellingen",
      parent_id: null
    }
  ];

  // Insert main documents first
  mainDocuments.forEach((doc, index) => {
    stmt.run(
      doc.document_name,
      doc.tag,
      doc.publication_date,
      doc.status,
      doc.content,
      doc.parent_id,
      function(err) {
        if (err) {
          return console.error('Error inserting document:', err);
        }
        
        // If this is the first document, add some addendums
        if (index === 0) {
          const mainDocId = this.lastID;
          const addendumStmt = db.prepare(
            "INSERT INTO documents (document_name, tag, publication_date, status, content, parent_id) VALUES (?, ?, ?, ?, ?, ?)"
          );
          
          const addendums = [
            {
              document_name: "Bijlage A - Uitgebreide cijfers",
              tag: "Bijlage",
              publication_date: "2025-05-16",
              status: "Gepubliceerd",
              content: "Uitgebreide cijfers en statistieken bij de beleidsnota",
              parent_id: mainDocId
            },
            {
              document_name: "Bijlage B - Reacties consultatie",
              tag: "Bijlage",
              publication_date: "2025-05-17",
              status: "Gepubliceerd",
              content: "Overzicht van alle binnengekomen reacties op de conceptnota",
              parent_id: mainDocId
            }
          ];
          
          addendums.forEach(addendum => {
            addendumStmt.run(
              addendum.document_name,
              addendum.tag,
              addendum.publication_date,
              addendum.status,
              addendum.content,
              addendum.parent_id,
              (err) => {
                if (err) console.error('Error inserting addendum:', err);
              }
            );
          });
          
          addendumStmt.finalize();
        }
      }
    );
  });

  stmt.finalize(err => {
    if (err) {
      return console.error('Error finalizing statement:', err);
    }
    
    console.log('Successfully inserted sample data');
    
    // Verify the data was inserted
    db.all(`
      SELECT d1.doc_id, d1.document_name, d1.tag, d1.status, 
             d2.doc_id as addendum_id, d2.document_name as addendum_name
      FROM documents d1
      LEFT JOIN documents d2 ON d1.doc_id = d2.parent_id
      WHERE d1.parent_id IS NULL
      ORDER BY d1.doc_id, d2.publication_date
    `, [], (err, rows) => {
      if (err) {
        return console.error('Error verifying data:', err);
      }
      
      console.log('\nCurrent documents with addendums in database:');
      const grouped = {};
      
      rows.forEach(row => {
        if (!grouped[row.doc_id]) {
          grouped[row.doc_id] = {
            document: {
              id: row.doc_id,
              name: row.document_name,
              tag: row.tag,
              status: row.status
            },
            addendums: []
          };
        }
        
        if (row.addendum_id) {
          grouped[row.doc_id].addendums.push({
            id: row.addendum_id,
            name: row.addendum_name
          });
        }
      });
      
      console.table(Object.values(grouped).map(g => ({
        'Document ID': g.document.id,
        'Document': g.document.name,
        'Type': g.document.tag,
        'Status': g.document.status,
        'Addendums': g.addendums.length
      })));
      
      db.close();
    });
  });
});
