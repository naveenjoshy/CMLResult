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

async function main() {
  console.log('Connecting to MongoDB Atlas cluster...');
  await mongoose.connect(uri, { dbName });
  console.log(`Connected successfully to database: ${dbName}`);

  const db = mongoose.connection.db;

  // 1. Create collections explicitly
  const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
  console.log('Existing collections:', existingCollections);

  const neededCollections = ['mekhalas', 'sakhas', 'events', 'candidates'];
  for (const col of neededCollections) {
    if (!existingCollections.includes(col)) {
      console.log(`Creating collection: ${col}...`);
      await db.createCollection(col);
    }
  }

  // 2. Initialize Seed Data if empty
  const Mekhala = mongoose.model('Mekhala', new mongoose.Schema({
    name: { type: String, unique: true },
    code: String,
    createdAt: { type: Date, default: Date.now },
  }));

  const Sakha = mongoose.model('Sakha', new mongoose.Schema({
    name: { type: String, unique: true },
    mekhala: String,
    createdAt: { type: Date, default: Date.now },
  }));

  const Event = mongoose.model('Event', new mongoose.Schema({
    name: String,
    category: String,
    categories: [String],
    description: String,
    points: {
      first: Number,
      second: Number,
      third: Number,
      gradeA: Number,
      gradeB: Number,
      gradeC: Number,
    },
    status: String,
    createdAt: { type: Date, default: Date.now },
  }));

  const Candidate = mongoose.model('Candidate', new mongoose.Schema({
    chestNo: String,
    name: String,
    houseName: String,
    dob: String,
    phone: String,
    sakha: String,
    mekhala: String,
    section: String,
    sex: String,
    event: String,
    position: { type: String, default: 'None' },
    grade: { type: String, default: 'None' },
    totalPoints: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  }));

  const mekhalaCount = await Mekhala.countDocuments();
  if (mekhalaCount === 0) {
    console.log('Seeding initial Mekhalas...');
    await Mekhala.insertMany([
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
    ]);
  }

  const sakhaCount = await Sakha.countDocuments();
  if (sakhaCount === 0) {
    console.log('Seeding initial Sakhas...');
    await Sakha.insertMany([
      { name: 'Kozhikode Town', mekhala: 'North Zone' },
      { name: 'Vadakara', mekhala: 'North Zone' },
      { name: 'Ernakulam City', mekhala: 'Central Zone' },
      { name: 'Aluva', mekhala: 'Central Zone' },
      { name: 'Trivandrum Central', mekhala: 'South Zone' },
      { name: 'Kollam City', mekhala: 'South Zone' },
      { name: 'Feroke', mekhala: 'Kozhikode South' },
      { name: 'Manjeri', mekhala: 'Malappuram East' },
      { name: '1000 Acre', mekhala: 'Adimali - Koompanpara' },
      { name: 'Kallarkutty', mekhala: 'Adimali - Koompanpara' },
      { name: 'Sahayagiri', mekhala: 'Adimali - Koompanpara' },
      { name: 'Adimali', mekhala: 'Adimali - Koompanpara' },
      { name: 'Thokkupara', mekhala: 'Adimali - Koompanpara' },
      { name: 'Machiplavu', mekhala: 'Adimali - Koompanpara' },
      { name: 'Koompanpara', mekhala: 'Adimali - Koompanpara' },
      { name: 'Munnar', mekhala: 'Adimali - Koompanpara' },
      { name: 'Kuthupara', mekhala: 'Adimali - Koompanpara' },
      { name: 'Irumbupalam', mekhala: 'Adimali - Koompanpara' },
    ]);
  }

  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    console.log('Seeding initial Events...');
    await Event.insertMany([
      {
        name: 'Elocution (English)',
        category: 'Junior',
        categories: ['Junior'],
        gender: 'Both',
        description: 'Individual public speaking event',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'Completed',
      },
      {
        name: 'Classical Music',
        category: 'Senior',
        categories: ['Senior'],
        gender: 'Both',
        description: 'Solo vocal performance',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'Completed',
      },
      {
        name: 'Quiz Competition',
        category: 'Sub-Junior, Junior, Senior, Super Senior, General',
        categories: ['Sub-Junior', 'Junior', 'Senior', 'Super Senior', 'General'],
        gender: 'Both',
        description: 'General knowledge & history',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'In Progress',
      },
      {
        name: 'Essay Writing',
        category: 'Sub-Junior',
        categories: ['Sub-Junior'],
        gender: 'Both',
        description: 'Creative and analytical writing',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'Upcoming',
      },
    ]);
  }

  const candidateCount = await Candidate.countDocuments();
  if (candidateCount === 0) {
    console.log('Seeding initial sample Candidates...');
    await Candidate.insertMany([
      {
        chestNo: 'CML-101',
        name: 'Muhammed Nihal',
        houseName: 'Rose Villa',
        dob: '2008-05-14',
        phone: '9847123456',
        sakha: 'Kozhikode Town',
        mekhala: 'North Zone',
        section: 'Junior',
        sex: 'Male',
        event: 'Elocution (English)',
        position: 'First',
        grade: 'A',
        totalPoints: 10,
      },
      {
        chestNo: 'CML-102',
        name: 'Fathima Zahra',
        houseName: 'Green Meadows',
        dob: '2009-08-22',
        phone: '9847654321',
        sakha: 'Vadakara',
        mekhala: 'North Zone',
        section: 'Junior',
        sex: 'Female',
        event: 'Elocution (English)',
        position: 'Second',
        grade: 'A',
        totalPoints: 8,
      },
      {
        chestNo: 'CML-103',
        name: 'Aysha Mariyam',
        houseName: 'Sunrise Cottage',
        dob: '2007-02-10',
        phone: '9745112233',
        sakha: 'Ernakulam City',
        mekhala: 'Central Zone',
        section: 'Senior',
        sex: 'Female',
        event: 'Classical Music',
        position: 'First',
        grade: 'A',
        totalPoints: 10,
      },
      {
        chestNo: 'CML-104',
        name: 'Bilal Ahmed',
        houseName: 'Al-Barka House',
        dob: '2006-11-03',
        phone: '9895001122',
        sakha: 'Trivandrum Central',
        mekhala: 'South Zone',
        section: 'Senior',
        sex: 'Male',
        event: 'Classical Music',
        position: 'Second',
        grade: 'B',
        totalPoints: 6,
      },
    ]);
  }

  // Display final counts
  console.log('\n--- MongoDB CMLResult Database Status ---');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`Collection [${c.name}]: ${count} documents`);
  }

  await mongoose.disconnect();
  console.log('MongoDB initialization complete!');
}

main().catch((err) => {
  console.error('MongoDB Initialization Error:', err);
  process.exit(1);
});
