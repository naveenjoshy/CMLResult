import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Mekhala from '@/models/Mekhala';
import Parish from '@/models/Parish';
import Candidate from '@/models/Candidate';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  try {
    await connectToDatabase();
    const mekhalas = await Mekhala.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: mekhalas, source: 'mongodb' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'MongoDB is required to load Mekhalas.', error: err.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    await connectToDatabase();
    const existing = await Mekhala.findOne({ name: trimmedName });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Mekhala already exists' }, { status: 409 });
    }

    const created = await Mekhala.create({ name: trimmedName });
    return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const { id, name } = body;
    const trimmedName = String(name || '').trim();

    if (!id || !trimmedName) {
      return NextResponse.json({ success: false, message: 'Mekhala ID and name are required' }, { status: 400 });
    }

    await connectToDatabase();
    const current = await Mekhala.findById(id);
    if (!current) {
      return NextResponse.json({ success: false, message: 'Mekhala not found' }, { status: 404 });
    }

    const duplicate = await Mekhala.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      _id: { $ne: id },
    });
    if (duplicate) {
      return NextResponse.json({ success: false, message: `Mekhala "${trimmedName}" already exists` }, { status: 409 });
    }

    const previousName = current.name;
    const updated = await Mekhala.findByIdAndUpdate(
      id,
      { name: trimmedName },
      { new: true, runValidators: true }
    );

    if (previousName !== trimmedName) {
      await Promise.all([
        Parish.updateMany({ mekhala: previousName }, { $set: { mekhala: trimmedName } }),
        Candidate.updateMany({ mekhala: previousName }, { $set: { mekhala: trimmedName } }),
      ]);
    }

    return NextResponse.json({ success: true, data: updated, source: 'mongodb' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const mekhala = await Mekhala.findById(id).select('name').lean();
    if (!mekhala) {
      return NextResponse.json({ success: false, message: 'Mekhala not found' }, { status: 404 });
    }

    const [parishCount, candidateCount, parishSamples, candidateSamples] = await Promise.all([
      Parish.countDocuments({ mekhala: mekhala.name }),
      Candidate.countDocuments({ mekhala: mekhala.name }),
      Parish.find({ mekhala: mekhala.name }).select('name').limit(5).lean(),
      Candidate.find({ mekhala: mekhala.name }).select('name chestNo').limit(5).lean(),
    ]);
    if (parishCount > 0 || candidateCount > 0) {
      const details = [];
      if (parishCount > 0) {
        const names = parishSamples.map(parish => parish.name).join(', ');
        details.push(`${parishCount} child Parish${parishCount === 1 ? '' : 'es'}: ${names}${parishCount > parishSamples.length ? `, and ${parishCount - parishSamples.length} more` : ''}`);
      }
      if (candidateCount > 0) {
        const names = candidateSamples.map(candidate => candidate.chestNo ? `${candidate.name} (${candidate.chestNo})` : candidate.name).join(', ');
        details.push(`${candidateCount} registered candidate${candidateCount === 1 ? '' : 's'}: ${names}${candidateCount > candidateSamples.length ? `, and ${candidateCount - candidateSamples.length} more` : ''}`);
      }
      return NextResponse.json({
        success: false,
        message: `Cannot delete Mekhala "${mekhala.name}". ${details.join('; ')}. Reassign or remove these records first.`,
      }, { status: 409 });
    }

    await Mekhala.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Mekhala deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
