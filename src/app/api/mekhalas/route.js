import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Mekhala from '@/models/Mekhala';
import { getMemoryStore } from '@/lib/memoryStore';

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const mekhalas = await Mekhala.find({}).sort({ name: 1 });
      return NextResponse.json({ success: true, data: mekhalas, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Mekhalas GET] MongoDB error, falling back to memory store:', err.message);
  }

  const store = getMemoryStore();
  return NextResponse.json({ success: true, data: store.mekhalas, source: 'memory' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, code } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const conn = await connectToDatabase();

    if (conn) {
      const existing = await Mekhala.findOne({ name: trimmedName });
      if (existing) {
        return NextResponse.json({ success: false, message: 'Mekhala already exists' }, { status: 409 });
      }

      const created = await Mekhala.create({
        name: trimmedName,
        code: (code || '').trim(),
      });
      return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    const exists = store.mekhalas.some(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return NextResponse.json({ success: false, message: 'Mekhala already exists' }, { status: 409 });
    }

    const newMekhala = {
      _id: 'm_' + Date.now(),
      name: trimmedName,
      code: (code || '').trim(),
      createdAt: new Date(),
    };
    store.mekhalas.push(newMekhala);

    return NextResponse.json({ success: true, data: newMekhala, source: 'memory' }, { status: 201 });
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
      await Mekhala.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Mekhala deleted' });
    }

    const store = getMemoryStore();
    store.mekhalas = store.mekhalas.filter(m => m._id !== id);
    return NextResponse.json({ success: true, message: 'Mekhala deleted from memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
