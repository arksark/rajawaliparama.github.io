const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const folderPath = 'F:\\Arief-IT Intern\\Dokumen\\'; // Update this to your folder path
const dbName = 'excelDb';
const collectionName = 'users';

// Function to generate a random password
const generateRandomPassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }
  return password;
};

// Function to establish MongoDB connection
async function connectToMongoDB() {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error; // Rethrow the error to stop further execution
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

// Function to fetch the password from the database based on ID
async function getPasswordFromDatabase(client, id) {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const result = await collection.findOne({ id });
    return result ? result.password : undefined;
  } catch (error) {
    console.error('Error fetching password from the database:', error);
    throw error;
  }
}

// Function to insert or update user data in the database
async function insertOrUpdateUserData(client, id, name, department) {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const existingPassword = await getPasswordFromDatabase(client, id);
    const password = existingPassword !== undefined ? existingPassword : generateRandomPassword();

    const document = { id, name, department, password };

    // Using replaceOne with upsert: true to insert or update the document
    await collection.replaceOne({ id }, document, { upsert: true });

    console.log('User Document replaced or inserted:', document);
  } catch (error) {
    console.error('Error inserting or updating user data:', error);
    throw error;
  }
}

// Function to process employee data from the Excel sheet
async function processEmployeeData(client, data) {
  try {
    // Cleaning data by removing undefined and null cells
    const cleanedData = data.map(row => row.filter(cell => cell !== undefined && cell !== null));

    // Filtering rows with seven-digit IDs
    const rowsWithSevenDigitIDs = cleanedData.filter(row => row[0] !== null && /^\d{7}$/.test(String(row[0])));

    await Promise.all(rowsWithSevenDigitIDs.map(async row => {
      const id = String(row[0]);
      const name = row[1] !== null ? String(row[1]) : '';
      const department = row[2] !== null ? String(row[2]) : '';

      // Call the function to insert or update user data in the database
      await insertOrUpdateUserData(client, id, name, department);
    }));

    // Replace the line below with the call to fetch and insert date data
    // await fetchAndInsertDateData(client, documentsToInsert);
  } catch (error) {
    console.error('Error processing employee data:', error);
    throw error;
  }
}

// Function to get all Excel files in a folder
function getExcelFilesInFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  return files.filter(file => path.extname(file).toLowerCase() === '.xls' || path.extname(file).toLowerCase() === '.xlsx');
}

// Function to process all Excel files in a folder
async function processAllExcelFiles(client) {
  try {
    const excelFiles = getExcelFilesInFolder(folderPath);

    await Promise.all(excelFiles.map(async file => {
      const excelFilePath = path.join(folderPath, file);

      const workbook = XLSX.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

      // Cleaning and processing data...

      await processEmployeeData(client, data);
    }));
  } catch (error) {
    console.error('Error processing all Excel files:', error);
    throw error;
  }
}

// Main function
async function main() {
  let client;

  try {
    // Establish MongoDB connection
    client = await connectToMongoDB();

    // Call the function to process all Excel files in the folder
    await processAllExcelFiles(client);
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
