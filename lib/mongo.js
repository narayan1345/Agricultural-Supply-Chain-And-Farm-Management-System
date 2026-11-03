import { MongoClient } from 'mongodb';
let clientPromise;
export async function getMongoCollection(name='farm_activity_logs') {
  if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured. Add it to .env.local to enable MongoDB features.');
  if(!clientPromise) { const client=new MongoClient(process.env.MONGODB_URI); clientPromise=client.connect(); }
  const client=await clientPromise; return client.db(process.env.MONGODB_DATABASE||'agritrack_nosql').collection(name);
}
