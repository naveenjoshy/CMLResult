import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Category from '@/models/Category';
import { getMemoryStore } from '@/lib/memoryStore';

const DEFAULT_CATEGORIES = [
  {
    name: 'Sub-Junior',
    minDob: '2016-01-01',
    maxDob: '2022-12-31',
    description: 'Born between 2016 and 2022 (Classes 1 to 4)',
    order: 1,
  },
  {
    name: 'Junior',
    minDob: '2013-01-01',
    maxDob: '2015-12-31',
    description: 'Born between 2013 and 2015 (Classes 5 to 7)',
    order: 2,
  },
  {
    name: 'Senior',
    minDob: '2010-01-01',
    maxDob: '2012-12-31',
    description: 'Born between 2010 and 2012 (Classes 8 to 10)',
    order: 3,
  },
  {
    name: 'Super Senior',
    minDob: '2007-01-01',
    maxDob: '2009-12-31',
    description: 'Born between 2007 and 2009 (Plus One & Plus Two)',
    order: 4,
  },
  {
    name: 'General',
    minDob: '',
    maxDob: '',
    description: 'Open to all / Common events',
    order: 5,
  },
];

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      let categories = await Category.find({}).sort({ order: 1, name: 1 });
      if (!categories || categories.length === 0) {
        await Category.insertMany(DEFAULT_CATEGORIES);
        categories = await Category.find({}).sort({ order: 1, name: 1 });
      }
      return NextResponse.json({ success: true, data: categories, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Categories GET] MongoDB error, falling back to memory store:', err.message);
  }

  const store = getMemoryStore();
  return NextResponse.json({ success: true, data: store.categories || DEFAULT_CATEGORIES, source: 'memory' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, minDob, maxDob, description, order } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const conn = await connectToDatabase();

    if (conn) {
      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
      if (existing) {
        return NextResponse.json({ success: false, message: `Category "${trimmedName}" already exists` }, { status: 409 });
      }

      const created = await Category.create({
        name: trimmedName,
        minDob: (minDob || '').trim(),
        maxDob: (maxDob || '').trim(),
        description: (description || '').trim(),
        order: Number(order) || 10,
      });

      return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    if (!store.categories) store.categories = [...DEFAULT_CATEGORIES];
    const exists = store.categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return NextResponse.json({ success: false, message: `Category "${trimmedName}" already exists` }, { status: 409 });
    }

    const newCat = {
      _id: 'cat_' + Date.now(),
      name: trimmedName,
      minDob: (minDob || '').trim(),
      maxDob: (maxDob || '').trim(),
      description: (description || '').trim(),
      order: Number(order) || 10,
      createdAt: new Date(),
    };
    store.categories.push(newCat);

    return NextResponse.json({ success: true, data: newCat, source: 'memory' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, minDob, maxDob, description, order } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (minDob !== undefined) updateData.minDob = minDob.trim();
    if (maxDob !== undefined) updateData.maxDob = maxDob.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (order !== undefined) updateData.order = Number(order);

    if (conn) {
      const updated = await Category.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) {
        return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const idx = (store.categories || []).findIndex(c => String(c._id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }

    store.categories[idx] = { ...store.categories[idx], ...updateData };
    return NextResponse.json({ success: true, data: store.categories[idx], source: 'memory' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      await Category.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Category deleted' });
    }

    const store = getMemoryStore();
    store.categories = (store.categories || []).filter(c => String(c._id) !== String(id));
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
