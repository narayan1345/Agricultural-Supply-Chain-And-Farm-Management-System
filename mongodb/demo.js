require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI in .env.local before running the MongoDB demo.');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  const database = process.env.MONGODB_DATABASE || 'agritrack_nosql';

  try {
    await client.connect();
    const collection = client.db(database).collection('farm_activity_logs');
    const inserted = await collection.insertOne({
      event_type: 'CROP_INSPECTION',
      actor_id: 2,
      actor_email: 'farmer@agritrack.local',
      description: 'Leaf health inspection completed for the tomato field.',
      metadata: {
        crop: 'Tomato',
        field: 'North plot',
        soil_moisture_percent: 31,
        quality_observation: 'Healthy growth',
      },
      created_at: new Date(),
    });
    console.log('CREATE:', inserted.insertedId.toString());

    const createdRecord = await collection.findOne({ _id: inserted.insertedId });
    console.log('READ:', JSON.stringify(createdRecord, null, 2));

    const update = await collection.updateOne(
      { _id: inserted.insertedId },
      {
        $set: {
          description: 'Leaf health inspection completed; irrigation is scheduled.',
          'metadata.irrigation_follow_up': true,
          updated_at: new Date(),
        },
      },
    );
    console.log('UPDATE:', update.modifiedCount);

    const updatedRecord = await collection.findOne({ _id: inserted.insertedId });
    console.log('READ AFTER UPDATE:', JSON.stringify(updatedRecord, null, 2));

    const deletion = await collection.deleteOne({ _id: inserted.insertedId });
    console.log('DELETE:', deletion.deletedCount);
    console.log('READ AFTER DELETE:', await collection.findOne({ _id: inserted.insertedId }));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('MongoDB demo failed:', error.message);
  process.exitCode = 1;
});
