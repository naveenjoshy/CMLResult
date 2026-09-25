import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/models/Candidate';
import Parish from '@/models/Parish';
import { getMemoryStore } from '@/lib/memoryStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mekhala = searchParams.get('mekhala');

    const conn = await connectToDatabase();
    if (conn) {
      const filter = mekhala ? { mekhala } : {};
      const parishes = await Parish.find(filter).sort({ name: 1 });
      return NextResponse.json({ success: true, data: parishes, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Parishes GET] MongoDB error, falling back to memory store:', err.message);
  }

  const { searchParams } = new URL(request.url);
  const mekhala = searchParams.get('mekhala');
  const store = getMemoryStore();
  let parishes = store.parishes;
  if (mekhala) {
    parishes = parishes.filter(parish => parish.mekhala === mekhala);
  }
  return NextResponse.json({ success: true, data: parishes, source: 'memory' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, mekhala } = body;

    if (!name || name.trim() === '' || !mekhala || mekhala.trim() === '') {
      return NextResponse.json({ success: false, message: 'Name and Mekhala are required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedMekhala = mekhala.trim();
    const conn = await connectToDatabase();

    if (conn) {
      const existing = await Parish.findOne({ name: trimmedName });
      if (existing) {
        return NextResponse.json({ success: false, message: 'Parish already exists' }, { status: 409 });
      }

      const created = await Parish.create({
        name: trimmedName,
        mekhala: trimmedMekhala,
      });
      return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    const exists = store.parishes.some(parish => parish.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return NextResponse.json({ success: false, message: 'Parish already exists' }, { status: 409 });
    }

    const newParish = {
      _id: 'p_' + Date.now(),
      name: trimmedName,
      mekhala: trimmedMekhala,
      createdAt: new Date(),
    };
    store.parishes.push(newParish);

    return NextResponse.json({ success: true, data: newParish, source: 'memory' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, mekhala } = body;
    const trimmedName = String(name || '').trim();
    const trimmedMekhala = String(mekhala || '').trim();

    if (!id || !trimmedName || !trimmedMekhala) {
      return NextResponse.json({ success: false, message: 'Parish ID, name, and Mekhala are required.' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      const current = await Parish.findById(id);
      if (!current) {
        return NextResponse.json({ success: false, message: 'Parish not found.' }, { status: 404 });
      }

      const duplicate = await Parish.findOne({
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, message: `Parish "${trimmedName}" already exists.` }, { status: 409 });
      }

      const previousName = current.name;
      const updated = await Parish.findByIdAndUpdate(
        id,
        { name: trimmedName, mekhala: trimmedMekhala },
        { new: true, runValidators: true }
      );

      if (previousName !== trimmedName || current.mekhala !== trimmedMekhala) {
        await Candidate.updateMany(
          { parish: previousName },
          { $set: { parish: trimmedName, mekhala: trimmedMekhala } }
        );
      }

      return NextResponse.json({ success: true, data: updated, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const index = store.parishes.findIndex(parish => String(parish._id) === String(id));
    if (index < 0) {
      return NextResponse.json({ success: false, message: 'Parish not found.' }, { status: 404 });
    }

    const duplicate = store.parishes.some(parish =>
      String(parish._id) !== String(id) && parish.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json({ success: false, message: `Parish "${trimmedName}" already exists.` }, { status: 409 });
    }

    const previousName = store.parishes[index].name;
    store.parishes[index] = { ...store.parishes[index], name: trimmedName, mekhala: trimmedMekhala };
    store.candidates = store.candidates.map(candidate => candidate.parish === previousName
      ? { ...candidate, parish: trimmedName, mekhala: trimmedMekhala }
      : candidate
    );

    return NextResponse.json({ success: true, data: store.parishes[index], source: 'memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      await Parish.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Parish deleted' });
    }

    const store = getMemoryStore();
    store.parishes = store.parishes.filter(parish => parish._id !== id);
    return NextResponse.json({ success: true, message: 'Parish deleted from memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}