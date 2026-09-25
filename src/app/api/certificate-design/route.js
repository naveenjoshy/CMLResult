import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db';
import CertificateDesign from '@/models/CertificateDesign';
import { getMemoryStore } from '@/lib/memoryStore';

const ALLOWED_FIELDS = new Set(['name', 'houseName', 'mekhala', 'parish', 'event', 'position', 'grade']);

function normalizeDesign(body, key) {
  if (!['blank', 'uploaded'].includes(body.mode)) {
    throw new Error('Choose a valid certificate design mode.');
  }
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Enter a heading for this certificate design.');

  const backgroundImage = typeof body.backgroundImage === 'string' ? body.backgroundImage : '';
  if (backgroundImage.length > 5_000_000 || (backgroundImage && !/^data:image\/(png|jpeg|webp);base64,/.test(backgroundImage))) {
    throw new Error('Upload a PNG, JPEG, or WebP background smaller than 4 MB.');
  }

  const fields = Array.isArray(body.fields) ? body.fields : [];
  const normalizedFields = fields.map(field => {
    if (!ALLOWED_FIELDS.has(field.key)) {
      throw new Error('The design contains an unsupported certificate field.');
    }

    const color = typeof field.color === 'string' && /^#[0-9a-f]{6}$/i.test(field.color)
      ? field.color
      : '#172033';

    return {
      key: field.key,
      x: Math.max(0, Math.min(100, Number(field.x) || 0)),
      y: Math.max(0, Math.min(100, Number(field.y) || 0)),
      fontSize: Math.max(8, Math.min(72, Number(field.fontSize) || 18)),
      color,
      align: ['left', 'center', 'right'].includes(field.align) ? field.align : 'center',
      groupId: typeof field.groupId === 'string' ? field.groupId.slice(0, 80) : '',
    };
  });

  return {
    key,
    name: name.slice(0, 80),
    mode: body.mode,
    title: String(body.title || '').slice(0, 100),
    subtitle: String(body.subtitle || '').slice(0, 160),
    backgroundImage,
    fields: normalizedFields,
    updatedAt: new Date(),
  };
}

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const designs = await CertificateDesign.find({}).sort({ updatedAt: -1, name: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: designs.map(design => ({ ...design, name: design.name || 'Default Certificate Design' })),
        source: 'mongodb',
      });
    }
  } catch (err) {
    console.warn('[Certificate Designs GET] MongoDB error, falling back to memory store:', err.message);
  }

  const store = getMemoryStore();
  const designs = store.certificateDesigns || (store.certificateDesign ? [store.certificateDesign] : []);
  return NextResponse.json({ success: true, data: designs, source: 'memory' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const design = normalizeDesign(body, randomUUID());
    const conn = await connectToDatabase();

    if (conn) {
      const savedDesign = await CertificateDesign.create(design);
      return NextResponse.json({ success: true, data: savedDesign, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    if (!store.certificateDesigns) store.certificateDesigns = [];
    store.certificateDesigns.unshift(design);
    return NextResponse.json({ success: true, data: design, source: 'memory' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.key) {
      return NextResponse.json({ success: false, message: 'Design key is required.' }, { status: 400 });
    }
    const design = normalizeDesign(body, String(body.key));
    const conn = await connectToDatabase();

    if (conn) {
      const savedDesign = await CertificateDesign.findOneAndUpdate(
        { key: design.key },
        { $set: design },
        { new: true, runValidators: true }
      ).lean();
      if (!savedDesign) {
        return NextResponse.json({ success: false, message: 'Certificate design not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: savedDesign, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const designs = store.certificateDesigns || [];
    const index = designs.findIndex(item => item.key === design.key);
    if (index < 0) {
      return NextResponse.json({ success: false, message: 'Certificate design not found.' }, { status: 404 });
    }
    designs[index] = design;
    store.certificateDesigns = designs;
    return NextResponse.json({ success: true, data: design, source: 'memory' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ success: false, message: 'Design key is required.' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      const deletedDesign = await CertificateDesign.findOneAndDelete({ key });
      if (!deletedDesign) {
        return NextResponse.json({ success: false, message: 'Certificate design not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: deletedDesign, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const designs = store.certificateDesigns || [];
    const retainedDesigns = designs.filter(design => design.key !== key);
    if (retainedDesigns.length === designs.length) {
      return NextResponse.json({ success: false, message: 'Certificate design not found.' }, { status: 404 });
    }
    store.certificateDesigns = retainedDesigns;
    return NextResponse.json({ success: true, source: 'memory' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}