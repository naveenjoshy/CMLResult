import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local or .env if available
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  try {
    process.loadEnvFile(envLocalPath);
  } catch (e) {
    // ignore if already loaded or not supported
  }
} else if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // ignore
  }
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not defined.');
  console.error('Please configure MONGODB_URI in your .env.local file or environment.');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'CMLResult';

const newMekhalas = [
  { name: 'Adimali - Koompanpara', code: 'AK' },
  { name: 'Churuly', code: 'CH' },
  { name: 'Erattayar', code: 'ER' },
  { name: 'Kunjithanny', code: 'KJ' },
  { name: 'Mankulam', code: 'MK' },
  { name: 'Murickassery', code: 'MU' },
  { name: 'Nedumkandom', code: 'ND' },
  { name: 'Parathode', code: 'PT' },
  { name: 'Rajakkadu', code: 'RJ' },
  { name: 'Thankamany', code: 'TM' },
  { name: 'Vazhathope', code: 'VZ' },
  { name: 'Vellayamkudy', code: 'VY' },
];

async function updateMekhalas() {
  console.log(`Connecting to MongoDB Atlas database: ${dbName}...`);
  await mongoose.connect(uri, { dbName });

  const db = mongoose.connection.db;
  const mekhalaCollection = db.collection('mekhalas');

  console.log('Deleting current mekhala records...');
  const deleteResult = await mekhalaCollection.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} old mekhala records.`);

  console.log('Inserting 12 new Mekhalas...');
  const docs = newMekhalas.map(m => ({
    name: m.name,
    code: m.code,
    createdAt: new Date(),
  }));

  const insertResult = await mekhalaCollection.insertMany(docs);
  console.log(`Successfully added ${insertResult.insertedCount} new Mekhalas.`);

  console.log('\n--- Current Mekhalas in MongoDB CMLResult ---');
  const allMekhalas = await mekhalaCollection.find({}).sort({ name: 1 }).toArray();
  allMekhalas.forEach((m, idx) => {
    console.log(`${idx + 1}. ${m.name} (${m.code})`);
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

updateMekhalas().catch(err => {
  console.error('Error updating mekhalas:', err);
  process.exit(1);
});
