import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Sakha from '@/models/Sakha';
import { getMemoryStore } from '@/lib/memoryStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mekhala = searchParams.get('mekhala');

    const conn = await connectToDatabase();
    if (conn) {
      const filter = mekhala ? { mekhala } : {};
      const sakhas = await Sakha.find(filter).sort({ name: 1 });
      return NextResponse.json({ success: true, data: sakhas, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Sakhas GET] MongoDB error, falling back to memory store:', err.message);
  }

  const { searchParams } = new URL(request.url);
  const mekhala = searchParams.get('mekhala');
  const store = getMemoryStore();
  let sakhas = store.sakhas;
  if (mekhala) {
    sakhas = sakhas.filter(s => s.mekhala === mekhala);
  }
  return NextResponse.json({ success: true, data: sakhas, source: 'memory' });
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
      const existing = await Sakha.findOne({ name: trimmedName });
      if (existing) {
        return NextResponse.json({ success: false, message: 'Sakha already exists' }, { status: 409 });
      }

      const created = await Sakha.create({
        name: trimmedName,
        mekhala: trimmedMekhala,
      });
      return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    const exists = store.sakhas.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return NextResponse.json({ success: false, message: 'Sakha already exists' }, { status: 409 });
    }

    const newSakha = {
      _id: 's_' + Date.now(),
      name: trimmedName,
      mekhala: trimmedMekhala,
      createdAt: new Date(),
    };
    store.sakhas.push(newSakha);

    return NextResponse.json({ success: true, data: newSakha, source: 'memory' }, { status: 201 });
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
      await Sakha.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Sakha deleted' });
    }

    const store = getMemoryStore();
    store.sakhas = store.sakhas.filter(s => s._id !== id);
    return NextResponse.json({ success: true, message: 'Sakha deleted from memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
