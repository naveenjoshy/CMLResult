import mongoose from 'mongoose';

const uri = "mongodb+srv://naveen:OXJ1IwYRujl6sXOL@cluster0.dnq0gk9.mongodb.net/CMLResult?retryWrites=true&w=majority";

async function main() {
  console.log('Connecting to MongoDB Atlas cluster...');
  await mongoose.connect(uri, { dbName: 'CMLResult' });
  console.log('Connected successfully to database: CMLResult');

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
      { name: 'North Zone', code: 'NZ' },
      { name: 'Central Zone', code: 'CZ' },
      { name: 'South Zone', code: 'SZ' },
      { name: 'Kozhikode South', code: 'KS' },
      { name: 'Malappuram East', code: 'ME' },
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
    ]);
  }

  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    console.log('Seeding initial Events...');
    await Event.insertMany([
      {
        name: 'Elocution (English)',
        category: 'Junior',
        description: 'Individual public speaking event',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'Completed',
      },
      {
        name: 'Classical Music',
        category: 'Senior',
        description: 'Solo vocal performance',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'Completed',
      },
      {
        name: 'Quiz Competition',
        category: 'General',
        description: 'General knowledge & history',
        points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
        status: 'In Progress',
      },
      {
        name: 'Essay Writing',
        category: 'Sub-Junior',
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
