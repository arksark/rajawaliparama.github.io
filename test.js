const XLSX = require('xlsx');

// Specify the path to your Excel file
const excelFilePath = 'F:\\Arief-IT Intern\\Dokumen\\custom31102023(2).xls';

// Read the Excel file
const workbook = XLSX.readFile(excelFilePath);

// Assuming you want data from the first sheet (index 0)
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Specify the column containing dates (adjust as needed)
const columnWithDates = 'A';

// Get all cell addresses in the specified column
const cellAddresses = Object.keys(sheet)
  .filter(cellAddress => cellAddress.startsWith(columnWithDates));

// Iterate over the cell addresses and retrieve the values
cellAddresses.forEach(cellAddress => {
  const dateCell = sheet[cellAddress];

  // Check if the cell exists
  if (dateCell.t === 'n') {
    // Convert numeric date to human-readable date
    const humanReadableDate = XLSX.SSF.format('yyyy-mm-dd', dateCell.v);
    console.log(`Date Cell at ${cellAddress} Value:`, humanReadableDate);
  } else {
    console.log(`Non-numeric Date Cell at ${cellAddress}`);
  }
});
