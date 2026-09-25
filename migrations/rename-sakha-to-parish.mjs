import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  try { process.loadEnvFile(envLocalPath); } catch (error) {}
} else if (fs.existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch (error) {}
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'CMLResult';

async function migrate() {
  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  const collectionNames = new Set((await db.listCollections().toArray()).map(collection => collection.name));
  const hasOldCollection = collectionNames.has('sakhas');
  const hasNewCollection = collectionNames.has('parishes');
  const hasArchiveCollection = collectionNames.has('parishes_legacy');
  const candidates = collectionNames.has('candidates') ? db.collection('candidates') : null;

  if (hasOldCollection && hasArchiveCollection) {
    throw new Error('Both sakhas and parishes_legacy collections exist. Resolve them before migrating.');
  }

  if (candidates) {
    const conflicts = await candidates.countDocuments({
      sakha: { $exists: true },
      parish: { $exists: true },
      $expr: { $ne: ['$sakha', '$parish'] },
    });
    if (conflicts > 0) {
      throw new Error(`${conflicts} candidates have different sakha and parish values. No migration was performed.`);
    }
  }

  if (hasOldCollection) {
    if (!hasNewCollection) {
      await db.collection('sakhas').rename('parishes');
      console.log('Renamed sakhas collection to parishes.');
    } else {
      const oldParishes = await db.collection('sakhas').find({}).toArray();
      const newParishCollection = db.collection('parishes');
      const additions = [];

      for (const oldParish of oldParishes) {
        const existingById = await newParishCollection.findOne({ _id: oldParish._id });
        const existingByName = await newParishCollection.findOne({ name: oldParish.name });
        if (existingById || existingByName) {
          const existing = existingById || existingByName;
          if (existing.name !== oldParish.name || existing['mekhala'] !== oldParish['mekhala']) {
            throw new Error(`Conflicting Parish record found for "${oldParish.name}". No collection merge was performed.`);
          }
          continue;
        }
        additions.push(oldParish);
      }

      if (additions.length > 0) await newParishCollection.insertMany(additions);
      await db.collection('sakhas').rename('parishes_legacy');
      console.log(`Copied ${additions.length} Parish records and preserved the original collection as parishes_legacy.`);
    }
  } else if (hasNewCollection) {
    console.log('Parishes collection already exists.');
  } else {
    await db.createCollection('parishes');
    console.log('Created parishes collection; there was no sakhas collection.');
  }

  if (candidates) {
    const renamed = await candidates.updateMany(
      { sakha: { $exists: true }, parish: { $exists: false } },
      { $rename: { sakha: 'parish' } }
    );
    const duplicatesRemoved = await candidates.updateMany(
      { sakha: { $exists: true }, parish: { $exists: true } },
      { $unset: { sakha: '' } }
    );
    console.log(`Renamed sakha field on ${renamed.modifiedCount} candidates.`);
    console.log(`Removed matching duplicate sakha fields from ${duplicatesRemoved.modifiedCount} candidates.`);
  }

  if (collectionNames.has('certificatedesigns')) {
    const certificateFields = await db.collection('certificatedesigns').updateMany(
      { 'fields.key': 'sakha' },
      { $set: { 'fields.$[field].key': 'parish' } },
      { arrayFilters: [{ 'field.key': 'sakha' }] }
    );
    console.log(`Renamed Sakha fields in ${certificateFields.modifiedCount} saved certificate designs.`);
  }

  console.log('Parish migration complete. No documents were deleted.');
}

migrate()
  .catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });