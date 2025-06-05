const fs = require('fs').promises;
const { query, run } = require('./api/db');

async function importDocuments() {
    try {
        // Lees het JSON bestand
        const data = await fs.readFile('./documents.json', 'utf8');
        const { documents } = JSON.parse(data);

        console.log(`Gevonden ${documents.length} documenten om te importeren...`);

        // Importeer elk document
        for (const doc of documents) {
            try {
                await run(
                    `INSERT INTO Documents (
                        doc_id, 
                        document_name, 
                        tag, 
                        publication_date, 
                        status
                    ) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(doc_id) DO UPDATE SET
                        document_name = excluded.document_name,
                        tag = excluded.tag,
                        publication_date = excluded.publication_date,
                        status = excluded.status`,
                    [doc.id, doc.titel, doc.categorie, doc.publicatiedatum, doc.status]
                );
                console.log(`Geïmporteerd document: ${doc.id} - ${doc.titel}`);
            } catch (err) {
                console.error(`Fout bij importeren document ${doc.id}:`, err.message);
            }
        }

        console.log('Import voltooid!');
        process.exit(0);
    } catch (error) {
        console.error('Fout bij importeren:', error);
        process.exit(1);
    }
}

// Voer de import uit
importDocuments();
