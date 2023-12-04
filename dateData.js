const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const folderPath = 'F:\\Arief-IT Intern\\Dokumen\\'; // Replace with the actual path to your folder
const dbName = 'excelDb'; // Replace 'excelDb' with your actual database name
const collectionName = 'users'; // Replace 'users' with your actual collection name

// Function to establish MongoDB connection
async function connectToMongoDB() {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Function to close MongoDB connection
async function closeMongoDBConnection(client) {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

// Function to insert or update data in the database
async function insertOrUpdateData(client, id, newDates, newTimeIn, newTimeOut) {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Find the document with the given ID
    const existingDoc = await collection.findOne({ id });

    if (existingDoc) {
      // If the document with the ID exists, update it
      const updatedDates = Array.from(new Set(existingDoc.dates.concat(newDates)));
      const updatedTimeInMap = new Map(existingDoc.dates.map((date, index) => [date, existingDoc.timeIn[index]]));
      const updatedTimeOutMap = new Map(existingDoc.dates.map((date, index) => [date, existingDoc.timeOut[index]]));

      // Add new entries to the maps
      newDates.forEach((date, index) => {
        updatedTimeInMap.set(date, newTimeIn[index]);
        updatedTimeOutMap.set(date, newTimeOut[index]);
      });

      // Convert maps to arrays
      const updatedTimeIn = updatedDates.map(date => updatedTimeInMap.get(date));
      const updatedTimeOut = updatedDates.map(date => updatedTimeOutMap.get(date));

      await collection.updateOne(
        { id },
        {
          $set: {
            id,
            dates: updatedDates,
            timeIn: updatedTimeIn,
            timeOut: updatedTimeOut,
          },
        }
      );
      console.log(`Data updated in the database for ID: ${id}`);
    } else {
      // If the document with the ID doesn't exist, insert a new document
      await collection.insertOne({
        id,
        dates: newDates,
        timeIn: newTimeIn,
        timeOut: newTimeOut,
      });
      console.log(`Data inserted into the database for ID: ${id}`);
    }
  } catch (error) {
    console.error('Error inserting/updating data into the database:', error);
  }
}


// Function to process rows from the Excel sheet and insert/update data in the database
async function processRowsAndInsertData(sheet, client) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][0]);

    if (/^\d{7}$/.test(id)) {
      // If the ID is a seven-digit number
      const dates = [];
      const timeIn = [];
      const timeOut = [];

      // Fetch dates starting from 2 rows below until an undefined or empty cell is encountered
      let rowIndex = i + 2;
      while (rows[rowIndex] && rows[rowIndex][0] !== undefined && rows[rowIndex][0] !== '') {
        const date = String(rows[rowIndex][0]);
        dates.push(date);

        const checkIn = rows[rowIndex][2] !== undefined ? String(rows[rowIndex][2]) : '0';
        const checkOut = rows[rowIndex][3] !== undefined ? String(rows[rowIndex][3]) : '0';

        timeIn.push(checkIn);
        timeOut.push(checkOut);

        rowIndex++;
      }

      // Call the function to insert/update data in the database
      await insertOrUpdateData(client, id, dates, timeIn, timeOut);
    }
  }
}

// Main function to process data from all Excel files in the folder
async function main() {
  let client;

  try {
    // Establish MongoDB connection
    client = await connectToMongoDB();

    // Get a list of all files in the folder
    const files = fs.readdirSync(folderPath);

    // Iterate over each file in the folder
    for (const file of files) {
      if (file.endsWith('.xls') || file.endsWith('.xlsx')) {
        const filePath = path.join(folderPath, file);
        console.log(`Processing file: ${filePath}`);

        // Read the Excel file and process the data
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Call the function to process rows and insert/update data in the database
        await processRowsAndInsertData(sheet, client);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close MongoDB connection
    if (client) {
      await closeMongoDBConnection(client);
    }
  }
}

// Call the main function to start the process
main();
