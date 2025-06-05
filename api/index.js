const express = require('express');
const cors = require('cors');
const path = require('path');
const { query, get, run } = require('./db-sqlite');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, '../documents.db');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  console.log('Database not found. Initializing...');
  require('../init-db');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));
app.use('/components', express.static(path.join(__dirname, '../components')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// Route for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Get all documents with their addendums
app.get('/api/documents', async (req, res) => {
    try {
        // Get all main documents with their addendums
        const documents = await query(`
            SELECT 
                d1.doc_id as id,
                d1.document_name as titel,
                d1.tag as categorie,
                d1.publication_date as publicatiedatum,
                d1.status,
                d1.content,
                d2.doc_id as addendum_id,
                d2.document_name as addendum_titel,
                d2.publication_date as addendum_datum
            FROM documents d1
            LEFT JOIN documents d2 ON d1.doc_id = d2.parent_id
            WHERE d1.parent_id IS NULL
            ORDER BY d1.document_name, d2.publication_date
        `);

        // Group addendums with their parent documents
        const grouped = {};
        documents.forEach(row => {
            if (!grouped[row.id]) {
                grouped[row.id] = {
                    id: row.id,
                    titel: row.titel,
                    categorie: row.categorie,
                    publicatiedatum: row.publicatiedatum,
                    status: row.status,
                    content: row.content,
                    addendums: []
                };
            }
            
            if (row.addendum_id) {
                grouped[row.id].addendums.push({
                    id: row.addendum_id,
                    titel: row.addendum_titel,
                    publicatiedatum: row.addendum_datum
                });
            }
        });
        
        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Error reading documents:', error);
        res.status(500).json({ error: 'Failed to load documents' });
    }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res) => {
    try {
        const document = await get(
            `SELECT 
                doc_id as id,
                document_name as titel,
                tag as categorie,
                publication_date as publicatiedatum,
                status,
                content
             FROM documents 
             WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Return document with empty subdocuments array for compatibility
        res.json({
            ...document,
            subdocuments: []
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// Update document
app.put('/api/documents/:id', async (req, res) => {
    try {
        const { titel, categorie } = req.body;
        
        // Validate required fields
        if (titel === undefined || titel === null || titel.trim() === '') {
            return res.status(400).json({ 
                error: 'Validation error',
                details: 'Document title is required' 
            });
        }
        
        // Check if document exists
        const existingDoc = await get(
            `SELECT doc_id, document_name, tag FROM documents WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (!existingDoc) {
            return res.status(404).json({ 
                error: 'Not found',
                details: 'Document not found' 
            });
        }
        
        // Only update fields that were provided in the request
        const updates = [];
        const params = [];
        
        if (titel !== undefined) {
            updates.push('document_name = ?');
            params.push(titel);
        }
        
        if (categorie !== undefined) {
            updates.push('tag = ?');
            params.push(categorie);
        }
        
        // Handle status update
        if (req.body.status !== undefined) {
            updates.push('status = ?');
            params.push(req.body.status);
        }
        
        // Handle parent_id for addendums
        if (req.body.parent_id !== undefined) {
            updates.push('parent_id = ?');
            params.push(req.body.parent_id);
        }
        
        // If no valid updates, return the current document
        if (updates.length === 0) {
            const currentDoc = await get(
                `SELECT 
                    doc_id as id,
                    document_name as titel,
                    tag as categorie,
                    publication_date as publicatiedatum,
                    status,
                    content
                 FROM documents 
                 WHERE doc_id = ?`,
                [req.params.id]
            );
            currentDoc.addendums = [];
            return res.json(currentDoc);
        }
        
        // Add the document ID for the WHERE clause
        params.push(req.params.id);
        
        // Update the document
        const sql = `UPDATE documents SET ${updates.join(', ')} WHERE doc_id = ?`;
        const result = await run(sql, params);
        
        if (result.changes === 0) {
            return res.status(404).json({ 
                error: 'Not found',
                details: 'Document not found or no changes made' 
            });
        }
        
        // Fetch the updated document
        const updatedDoc = await get(
            `SELECT 
                doc_id as id,
                document_name as titel,
                tag as categorie,
                publication_date as publicatiedatum,
                status,
                content
             FROM documents 
             WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (!updatedDoc) {
            return res.status(500).json({ 
                error: 'Server error',
                details: 'Failed to fetch updated document' 
            });
        }
        
        // Add empty array for addendums for compatibility
        updatedDoc.addendums = [];
        
        res.json(updatedDoc);
    } catch (error) {
        console.error('Error updating document:', error);
        
        // Handle SQLite constraint errors
        if (error.code === 'SQLITE_CONSTRAINT') {
            if (error.message.includes('NOT NULL')) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: 'Document title cannot be empty'
                });
            }
        }
        
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to update document' 
        });
    }
});

// Publish document
app.put('/api/documents/:id/publish', async (req, res) => {
    try {
        // Eerst controleren of het document bestaat
        const existingDoc = await get(
            `SELECT doc_id FROM documents WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (!existingDoc) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Update het document
        const result = await run(
            `UPDATE documents 
             SET status = 'Gepubliceerd',
                 publication_date = date('now')
             WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Document not found or no changes made' });
        }
        
        // Haal het bijgewerkte document op
        const updatedDoc = await get(
            `SELECT 
                doc_id as id,
                document_name as titel,
                tag as categorie,
                publication_date as publicatiedatum,
                status,
                content
             FROM documents 
             WHERE doc_id = ?`,
            [req.params.id]
        );
        
        if (!updatedDoc) {
            return res.status(500).json({ error: 'Failed to fetch updated document' });
        }
        
        // Voeg een lege array toe voor addendums voor compatibiliteit
        updatedDoc.addendums = [];
        
        res.json({
            success: true,
            message: 'Document published successfully',
            document: updatedDoc
        });
    } catch (error) {
        console.error('Error publishing document:', error);
        res.status(500).json({ 
            error: 'Failed to publish document',
            details: error.message 
        });
    }
});

// Add new document
app.post('/api/documents', async (req, res) => {
    try {
        const { titel, categorie, content } = req.body;
        
        if (!titel || !categorie) {
            return res.status(400).json({ 
                error: 'Missing required fields: titel and categorie are required' 
            });
        }
        
        const result = await run(
            `INSERT INTO documents (document_name, tag, status, content, parent_id)
             VALUES (?, ?, 'Concept', ?, NULL)`,
            [titel, categorie, content || '']
        );
        
        if (!result.lastID) {
            throw new Error('Failed to retrieve new document ID');
        }
        
        // Haal het nieuwe document op
        const newDoc = await get(
            `SELECT 
                doc_id as id,
                document_name as titel,
                tag as categorie,
                publication_date as publicatiedatum,
                status,
                content
             FROM documents 
             WHERE doc_id = ?`,
            [result.lastID]
        );
        
        if (!newDoc) {
            throw new Error('Failed to fetch created document');
        }
        
        // Voeg een lege array toe voor addendums voor compatibiliteit
        newDoc.addendums = [];
        
        res.status(201).json(newDoc);
    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ 
            error: 'Failed to create document',
            details: error.message 
        });
    }
});

// Get documents without category
app.get('/api/documents/uncategorized', async (req, res) => {
    try {
        const documents = await query(`
            SELECT 
                doc_id as id,
                document_name as titel,
                tag as categorie,
                strftime('%Y-%m-%d', publication_date) as publicatiedatum,
                status
            FROM Documents
            WHERE parent_id IS NULL 
            AND (tag IS NULL OR tag = '')
        `);
        res.json(documents);
    } catch (error) {
        console.error('Error reading uncategorized documents:', error);
        res.status(500).json({ error: 'Failed to load uncategorized documents' });
    }
});

// Update document category
app.put('/api/documents/:id', async (req, res) => {
    try {
        await run(
            'UPDATE Documents SET tag = ? WHERE doc_id = ?',
            [req.body.categorie, req.params.id]
        );
        
        const document = await get(
            'SELECT * FROM Documents WHERE doc_id = ?',
            [req.params.id]
        );
        
        res.json(document);
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// Update document status and publication date
app.put('/api/documents/:id/publish', async (req, res) => {
    try {
        await run(
            'UPDATE Documents SET status = ?, publication_date = CURRENT_TIMESTAMP WHERE doc_id = ?',
            ['Gepubliceerd', req.params.id]
        );
        
        const document = await get(
            'SELECT * FROM Documents WHERE doc_id = ?',
            [req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Document published successfully',
            document: document
        });
    } catch (error) {
        console.error('Error publishing document:', error);
        res.status(500).json({ error: 'Failed to publish document' });
    }
});

// Start de server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
