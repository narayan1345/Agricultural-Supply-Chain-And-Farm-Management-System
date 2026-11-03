require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

const collectionName = 'farm_activity_logs';
const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['event_type', 'actor_id', 'description', 'metadata', 'created_at'],
    properties: {
      event_type: { bsonType: 'string', minLength: 1 },
      actor_id: { bsonType: ['int', 'long', 'double'] },
      actor_email: { bsonType: 'string' },
      description: { bsonType: 'string', minLength: 1 },
      metadata: { bsonType: 'object' },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
};

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI in .env.local before setting up MongoDB.');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  const databaseName = process.env.MONGODB_DATABASE || 'agritrack_nosql';

  try {
    await client.connect();
    const database = client.db(databaseName);
    const existing = await database.listCollections({ name: collectionName }).toArray();

    if (existing.length === 0) {
      await database.createCollection(collectionName, {
        validator,
        validationLevel: 'moderate',
        validationAction: 'error',
      });
    } else {
      await database.command({
        collMod: collectionName,
        validator,
        validationLevel: 'moderate',
        validationAction: 'error',
      });
    }

    const collection = database.collection(collectionName);
    await collection.createIndex({ actor_id: 1, created_at: -1 }, { name: 'actor_recent_activity' });
    await collection.createIndex({ event_type: 1 }, { name: 'activity_type' });
    console.log(`MongoDB collection ready: ${databaseName}.${collectionName}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('MongoDB setup failed:', error.message);
  process.exitCode = 1;
});
