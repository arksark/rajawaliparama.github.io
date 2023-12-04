const { MongoClient, ObjectId } = require('mongodb');

async function fetchAttendanceData(userId) {
  const url = 'mongodb://localhost:27017';
  const dbName = 'excelDb';

  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection('users');

    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return null; // Handle case where user is not found
    }

    return user.attendance;
  } finally {
    await client.close();
  }
}

module.exports = fetchAttendanceData;
