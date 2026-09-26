import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/models/Candidate';
import Event from '@/models/Event';
import Mekhala from '@/models/Mekhala';
import Parish from '@/models/Parish';
import { isAdminAuthenticated, requireAdmin } from '@/lib/adminAuth';
import { isRegistrationOpen } from '@/app/api/registration-status/route';
import { isEventAvailableForCandidate, isEventAvailableForGender, isGroupEvent } from '@/lib/eventUtils';

function toTitleCase(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (match, separator, letter) =>
    `${separator}${letter.toLocaleUpperCase()}`
  );
}

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

function isCandidateEligibleForEvent(event, section, sex) {
  return (isGroupEvent(event) && isEventAvailableForGender(event, sex)) ||
    isEventAvailableForCandidate(event, section, sex);
}

export async function GET(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    const mekhala = searchParams.get('mekhala');
    const parish = searchParams.get('parish');
    const section = searchParams.get('section');
    const search = searchParams.get('search');
    await connectToDatabase();
    const query = {};
    if (event) query.event = event;
    if (mekhala) query.mekhala = mekhala;
    if (parish) query.parish = parish;
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
  } catch (fatalErr) {
    return NextResponse.json({ success: false, message: 'MongoDB is required to load candidates.', error: fatalErr.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, houseName, dob, phone, parish, mekhala, section, sex, event, chestNo } = body;
    const isAdmin = isAdminAuthenticated(request);

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

    if (!name || !houseName || !parish || !mekhala || !sex || !event) {
      return NextResponse.json({
        success: false,
        message: 'All required fields (Name, House Name, Parish, Mekhala, Sex, Event) must be provided',
      }, { status: 400 });
    }

    const normalizedPhone = String(phone || '').trim();
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json({
        success: false,
        message: 'Phone number must contain exactly 10 digits.',
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
    const normalizedDob = String(dob || '').trim();
    const normalizedEvent = event.trim();

    await connectToDatabase();
    const [eventDoc, parishDoc, mekhalaDoc] = await Promise.all([
      Event.findOne({ name: normalizedEvent }),
      Parish.findOne({ name: parish.trim() }),
      Mekhala.findOne({ name: mekhala.trim() }),
    ]);
    if (!eventDoc) {
      return NextResponse.json({ success: false, message: 'The selected event was not found.' }, { status: 400 });
    }
    if (!parishDoc || !mekhalaDoc || parishDoc.mekhala !== mekhala.trim()) {
      return NextResponse.json({ success: false, message: 'Select a Parish that belongs to the selected Mekhala.' }, { status: 400 });
    }
    const groupEvent = isGroupEvent(eventDoc);

    if (!normalizedDob && !groupEvent) {
      return NextResponse.json({
        success: false,
        message: 'Date of Birth is required unless registering for a Group event.',
      }, { status: 400 });
    }

    const candidateSection = !normalizedDob && groupEvent ? 'Group' : String(section || '').trim();
    if (!candidateSection) {
      return NextResponse.json({
        success: false,
        message: 'Section is required for this event.',
      }, { status: 400 });
    }

    if (eventDoc && !isCandidateEligibleForEvent(eventDoc, candidateSection, trimmedSex)) {
      return NextResponse.json({
        success: false,
        message: `The event "${event}" is not available for a ${trimmedSex} candidate in section "${candidateSection}".`,
      }, { status: 400 });
    }

    const position = body.position || 'None';
    const grade = body.grade || 'None';
    const totalPoints = calculatePoints(eventDoc, position, grade);

    const candidate = await Candidate.create({
        chestNo: finalChestNo,
        name: toTitleCase(name),
        houseName: toTitleCase(houseName),
        dob: normalizedDob,
        phone: normalizedPhone,
        parish: parish.trim(),
        mekhala: mekhala.trim(),
        section: candidateSection,
        sex: sex.trim(),
        event: normalizedEvent,
        position,
        grade,
        totalPoints,
    });

    return NextResponse.json({ success: true, data: candidate, source: 'mongodb' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
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

    await connectToDatabase();
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
    if ((fields.event || fields.section || fields.sex) && eventDoc && !isCandidateEligibleForEvent(eventDoc, targetSection, targetSex)) {
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
    await Candidate.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
