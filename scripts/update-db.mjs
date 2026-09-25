import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  try { process.loadEnvFile(envLocalPath); } catch (e) {}
} else if (fs.existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch (e) {}
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI is not defined. Please set it in .env.local');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'CMLResult';

// ─── Schemas ─────────────────────────────────────────────────────────────────
const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  minDob:      { type: String, default: '' },
  maxDob:      { type: String, default: '' },
  description: { type: String, default: '' },
  order:       { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

const ParishSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true, trim: true },
  mekhala:    { type: String, required: true, trim: true },
  createdAt:  { type: Date, default: Date.now },
});

const CandidateSchema = new mongoose.Schema({
  chestNo:     { type: String, trim: true },
  name:        { type: String, required: true, trim: true },
  houseName:   { type: String, required: true, trim: true },
  dob:         { type: String, required: true },
  phone:       { type: String, trim: true },
  parish:       { type: String, required: true, trim: true },
  mekhala:     { type: String, required: true, trim: true },
  section:     { type: String, required: true, trim: true },
  sex:         { type: String, required: true, enum: ['Male', 'Female'] },
  event:       { type: String, required: true, trim: true },
  position:    { type: String, enum: ['First', 'Second', 'Third', 'None'], default: 'None' },
  grade:       { type: String, enum: ['A', 'B', 'C', 'None'], default: 'None' },
  totalPoints: { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

const Category = mongoose.model('Category', CategorySchema);
const Parish = mongoose.model('Parish', ParishSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);

// ─── Ensure database structure ────────────────────────────────────────────────
async function main() {
  console.log(`Connecting to database: ${dbName}...`);

  await mongoose.connect(uri, { dbName });
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  const existingCollections = new Set(
    (await db.listCollections().toArray()).map(collection => collection.name)
  );

  for (const model of [Category, Parish, Candidate]) {
    const collectionName = model.collection.name;
    if (!existingCollections.has(collectionName)) {
      await db.createCollection(collectionName);
      console.log(`Created ${collectionName} collection.`);
    }
    await model.createIndexes();
    console.log(`Ensured schema indexes for ${collectionName}.`);
  }

  await mongoose.disconnect();
  console.log('Database structure is up to date. No documents were inserted, updated, or deleted.');
}

main().catch(err => {
  console.error('\n❌ Error during database update:', err.message);
  process.exit(1);
});
