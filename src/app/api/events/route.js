import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import { getMemoryStore } from '@/lib/memoryStore';

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const events = await Event.find({}).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, data: events, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Events GET] MongoDB error, falling back to memory store:', err.message);
  }

  const store = getMemoryStore();
  return NextResponse.json({ success: true, data: store.events, source: 'memory' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, category, description, points, status } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Event name is required' }, { status: 400 });
    }

    const defaultPoints = {
      first: Number(points?.first ?? 5),
      second: Number(points?.second ?? 3),
      third: Number(points?.third ?? 1),
      gradeA: Number(points?.gradeA ?? 5),
      gradeB: Number(points?.gradeB ?? 3),
      gradeC: Number(points?.gradeC ?? 1),
    };

    const trimmedName = name.trim();
    const eventCategory = (category || 'General').trim();
    const eventDesc = (description || '').trim();
    const eventStatus = status || 'Upcoming';

    const conn = await connectToDatabase();
    if (conn) {
      const created = await Event.create({
        name: trimmedName,
        category: eventCategory,
        description: eventDesc,
        points: defaultPoints,
        status: eventStatus,
      });
      return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    const newEvent = {
      _id: 'e_' + Date.now(),
      name: trimmedName,
      category: eventCategory,
      description: eventDesc,
      points: defaultPoints,
      status: eventStatus,
      createdAt: new Date(),
    };
    store.events.unshift(newEvent);

    return NextResponse.json({ success: true, data: newEvent, source: 'memory' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, category, description, points, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Event ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (category) updateData.category = category.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status) updateData.status = status;
    if (points) {
      updateData.points = {
        first: Number(points.first ?? 5),
        second: Number(points.second ?? 3),
        third: Number(points.third ?? 1),
        gradeA: Number(points.gradeA ?? 5),
        gradeB: Number(points.gradeB ?? 3),
        gradeC: Number(points.gradeC ?? 1),
      };
    }

    const conn = await connectToDatabase();
    if (conn) {
      const updated = await Event.findByIdAndUpdate(id, updateData, { new: true });
      return NextResponse.json({ success: true, data: updated, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const idx = store.events.findIndex(e => e._id === id);
    if (idx !== -1) {
      store.events[idx] = { ...store.events[idx], ...updateData };
      return NextResponse.json({ success: true, data: store.events[idx], source: 'memory' });
    }

    return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Event ID is required' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      await Event.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Event deleted' });
    }

    const store = getMemoryStore();
    store.events = store.events.filter(e => e._id !== id);
    return NextResponse.json({ success: true, message: 'Event deleted from memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
