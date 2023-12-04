// db.js

const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');

async function replaceDocuments(documentsToInsert) {
    try {
        await client.connect();

        // Access the specific database
        const db = client.db('excelDb'); // Replace 'your_database' with your MongoDB database name

        // Access the specific collection
        const collection = db.collection('users'); // Replace 'your_collection' with your MongoDB collection name

        // Assuming 'documentsToInsert' is an array of documents with unique IDs
        for (const document of documentsToInsert) {
            // Replace the entire document based on the ID
            const result = await collection.replaceOne({ id: document.id }, document, { upsert: true });
            console.log('Document replaced or inserted:', result);
        }
    } catch (err) {
        console.error('Error replacing or inserting documents:', err);
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
}

module.exports = { replaceDocuments };
