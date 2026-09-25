import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/models/Candidate';
import Event from '@/models/Event';
import { getMemoryStore } from '@/lib/memoryStore';
import { isRegistrationOpen } from '@/app/api/registration-status/route';
import { isEventAvailableForCandidate } from '@/lib/eventUtils';

// Helper to compute points from event rules
function calculatePoints(event, position, grade) {
  let points = 0;
  const pConfig = event?.points || {
    first: 5,
    second: 3,
    third: 1,
    gradeA: 5,
    gradeB: 3,
    gradeC: 1,
  };

  if (position === 'First') points += Number(pConfig.first ?? 5);
  else if (position === 'Second') points += Number(pConfig.second ?? 3);
  else if (position === 'Third') points += Number(pConfig.third ?? 1);

  if (grade === 'A') points += Number(pConfig.gradeA ?? 5);
  else if (grade === 'B') points += Number(pConfig.gradeB ?? 3);
  else if (grade === 'C') points += Number(pConfig.gradeC ?? 1);

  return points;
}

export async function GET(request) {
  try {
    try {
      const { searchParams } = new URL(request.url);
      const event = searchParams.get('event');
      const mekhala = searchParams.get('mekhala');
      const sakha = searchParams.get('sakha');
      const section = searchParams.get('section');
      const search = searchParams.get('search');

      const conn = await connectToDatabase();
      if (conn) {
        const query = {};
        if (event) query.event = event;
        if (mekhala) query.mekhala = mekhala;
        if (sakha) query.sakha = sakha;
        if (section) query.section = section;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { chestNo: { $regex: search, $options: 'i' } },
            { houseName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ];
        }

        const candidates = await Candidate.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: candidates, source: 'mongodb' });
      }
    } catch (err) {
      console.warn('[Candidates GET] MongoDB error, falling back to memory store:', err.message);
    }

    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    const mekhala = searchParams.get('mekhala');
    const sakha = searchParams.get('sakha');
    const section = searchParams.get('section');
    const search = searchParams.get('search');

    const store = getMemoryStore();
    let list = [...store.candidates];

    if (event) list = list.filter(c => c.event === event);
    if (mekhala) list = list.filter(c => c.mekhala === mekhala);
    if (sakha) list = list.filter(c => c.sakha === sakha);
    if (section) list = list.filter(c => c.section === section);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.chestNo && c.chestNo.toLowerCase().includes(q)) ||
        (c.houseName && c.houseName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, data: list, source: 'memory' });
  } catch (fatalErr) {
    console.error('[Candidates GET] Fatal error:', fatalErr);
    return NextResponse.json({ success: false, message: fatalErr.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, houseName, dob, phone, sakha, mekhala, section, sex, event, chestNo, isAdmin } = body;

    // Check registration deadline for non-admin requests
    if (!isAdmin) {
      const regStatus = isRegistrationOpen();
      if (!regStatus.isOpen) {
        return NextResponse.json({
          success: false,
          isClosed: true,
          message: 'Registration date is over, contact admin for more details.',
        }, { status: 403 });
      }
    }

    if (!name || !houseName || !dob || !sakha || !mekhala || !section || !sex || !event) {
      return NextResponse.json({
        success: false,
        message: 'All required fields (Name, House Name, DOB, Sakha, Mekhala, Section, Sex, Event) must be provided',
      }, { status: 400 });
    }

    const trimmedSex = sex.trim();
    if (!['Male', 'Female'].includes(trimmedSex)) {
      return NextResponse.json({
        success: false,
        message: 'Sex must be either Male or Female',
      }, { status: 400 });
    }

    // Do NOT auto-issue chest number. Chest numbers are issued after registration is completed by the admin.
    const finalChestNo = chestNo ? chestNo.trim() : '';

    const conn = await connectToDatabase();
    if (conn) {
      // Find event to get points config if position/grade provided
      const eventDoc = await Event.findOne({ name: event.trim() });
      if (eventDoc && !isEventAvailableForCandidate(eventDoc, section.trim(), trimmedSex)) {
        return NextResponse.json({
          success: false,
          message: `The event "${event}" is not available for a ${trimmedSex} candidate in section "${section}".`,
        }, { status: 400 });
      }

      const position = body.position || 'None';
      const grade = body.grade || 'None';
      const totalPoints = calculatePoints(eventDoc, position, grade);

      const candidate = await Candidate.create({
        chestNo: finalChestNo,
        name: name.trim(),
        houseName: houseName.trim(),
        dob: dob.trim(),
        phone: (phone || '').trim(),
        sakha: sakha.trim(),
        mekhala: mekhala.trim(),
        section: section.trim(),
        sex: sex.trim(),
        event: event.trim(),
        position,
        grade,
        totalPoints,
      });

      return NextResponse.json({ success: true, data: candidate, source: 'mongodb' }, { status: 201 });
    }

    const store = getMemoryStore();
    const eventDoc = store.events.find(e => e.name === event.trim());
    if (eventDoc && !isEventAvailableForCandidate(eventDoc, section.trim(), trimmedSex)) {
      return NextResponse.json({
        success: false,
        message: `The event "${event}" is not available for a ${trimmedSex} candidate in section "${section}".`,
      }, { status: 400 });
    }
    const position = body.position || 'None';
    const grade = body.grade || 'None';
    const totalPoints = calculatePoints(eventDoc, position, grade);

    const newCandidate = {
      _id: 'c_' + Date.now(),
      chestNo: finalChestNo,
      name: name.trim(),
      houseName: houseName.trim(),
      dob: dob.trim(),
      phone: (phone || '').trim(),
      sakha: sakha.trim(),
      mekhala: mekhala.trim(),
      section: section.trim(),
      sex: sex.trim(),
      event: event.trim(),
      position,
      grade,
      totalPoints,
      createdAt: new Date(),
    };

    store.candidates.unshift(newCandidate);
    return NextResponse.json({ success: true, data: newCandidate, source: 'memory' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Candidate ID is required' }, { status: 400 });
    }

    if (fields.sex !== undefined) {
      fields.sex = fields.sex.trim();
      if (!['Male', 'Female'].includes(fields.sex)) {
        return NextResponse.json({ success: false, message: 'Sex must be either Male or Female' }, { status: 400 });
      }
    }

    const conn = await connectToDatabase();
    if (conn) {
      const candidate = await Candidate.findById(id);
      if (!candidate) {
        return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
      }

      // If position, grade or event is updated, recalculate points
      const targetEventName = fields.event || candidate.event;
      const targetSection = fields.section || candidate.section;
      const targetSex = fields.sex || candidate.sex;
      const targetPosition = fields.position !== undefined ? fields.position : candidate.position;
      const targetGrade = fields.grade !== undefined ? fields.grade : candidate.grade;

      const eventDoc = await Event.findOne({ name: targetEventName });
      if ((fields.event || fields.section || fields.sex) && eventDoc && !isEventAvailableForCandidate(eventDoc, targetSection, targetSex)) {
        return NextResponse.json({
          success: false,
          message: `The event "${targetEventName}" is not available for a ${targetSex} candidate in section "${targetSection}".`,
        }, { status: 400 });
      }

      const totalPoints = calculatePoints(eventDoc, targetPosition, targetGrade);

      const updateData = {
        ...fields,
        totalPoints,
      };

      const updated = await Candidate.findByIdAndUpdate(id, updateData, { new: true });
      return NextResponse.json({ success: true, data: updated, source: 'mongodb' });
    }

    const store = getMemoryStore();
    const idx = store.candidates.findIndex(c => c._id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
    }

    const current = store.candidates[idx];
    const targetEventName = fields.event || current.event;
    const targetSection = fields.section || current.section;
    const targetSex = fields.sex || current.sex;
    const targetPosition = fields.position !== undefined ? fields.position : current.position;
    const targetGrade = fields.grade !== undefined ? fields.grade : current.grade;

    const eventDoc = store.events.find(e => e.name === targetEventName);
    if ((fields.event || fields.section || fields.sex) && eventDoc && !isEventAvailableForCandidate(eventDoc, targetSection, targetSex)) {
      return NextResponse.json({
        success: false,
        message: `The event "${targetEventName}" is not available for a ${targetSex} candidate in section "${targetSection}".`,
      }, { status: 400 });
    }

    const totalPoints = calculatePoints(eventDoc, targetPosition, targetGrade);

    store.candidates[idx] = {
      ...current,
      ...fields,
      totalPoints,
    };

    return NextResponse.json({ success: true, data: store.candidates[idx], source: 'memory' });
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
      await Candidate.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Candidate deleted' });
    }

    const store = getMemoryStore();
    store.candidates = store.candidates.filter(c => c._id !== id);
    return NextResponse.json({ success: true, message: 'Candidate deleted from memory' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
