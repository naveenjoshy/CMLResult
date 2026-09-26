import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/models/Candidate';
import Parish from '@/models/Parish';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mekhala = searchParams.get('mekhala');
    await connectToDatabase();
    const parishes = await Parish.find(mekhala ? { mekhala } : {}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: parishes, source: 'mongodb' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { name, mekhala } = await request.json();
    const trimmedName = String(name || '').trim();
    const trimmedMekhala = String(mekhala || '').trim();
    if (!trimmedName || !trimmedMekhala) {
      return NextResponse.json({ success: false, message: 'Name and Mekhala are required' }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await Parish.findOne({ name: trimmedName });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Parish already exists' }, { status: 409 });
    }

    const created = await Parish.create({ name: trimmedName, mekhala: trimmedMekhala });
    return NextResponse.json({ success: true, data: created, source: 'mongodb' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { id, name, mekhala: parentName } = await request.json();
    const trimmedName = String(name || '').trim();
    const trimmedMekhala = String(parentName || '').trim();
    if (!id || !trimmedName || !trimmedMekhala) {
      return NextResponse.json({ success: false, message: 'Parish ID, name, and Mekhala are required.' }, { status: 400 });
    }

    await connectToDatabase();
    const current = await Parish.findById(id);
    if (!current) {
      return NextResponse.json({ success: false, message: 'Parish not found.' }, { status: 404 });
    }

    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await Parish.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
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
    const parish = await Parish.findById(id).select('name').lean();
    if (!parish) {
      return NextResponse.json({ success: false, message: 'Parish not found' }, { status: 404 });
    }

    const [candidateCount, candidateSamples] = await Promise.all([
      Candidate.countDocuments({ parish: parish.name }),
      Candidate.find({ parish: parish.name }).select('name chestNo').limit(5).lean(),
    ]);
    if (candidateCount > 0) {
      const names = candidateSamples.map(candidate => candidate.chestNo ? `${candidate.name} (${candidate.chestNo})` : candidate.name).join(', ');
      return NextResponse.json({
        success: false,
        message: `Cannot delete Parish "${parish.name}". ${candidateCount} registered candidate${candidateCount === 1 ? '' : 's'}: ${names}${candidateCount > candidateSamples.length ? `, and ${candidateCount - candidateSamples.length} more` : ''}. Reassign or remove these candidates first.`,
      }, { status: 409 });
    }

    await Parish.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Parish deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}