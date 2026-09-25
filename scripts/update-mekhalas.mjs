import mongoose from 'mongoose';

const uri = "mongodb+srv://naveen:OXJ1IwYRujl6sXOL@cluster0.dnq0gk9.mongodb.net/CMLResult?retryWrites=true&w=majority";

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
  console.log('Connecting to MongoDB Atlas database: CMLResult...');
  await mongoose.connect(uri, { dbName: 'CMLResult' });

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
