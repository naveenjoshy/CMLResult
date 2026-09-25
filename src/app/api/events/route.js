import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import { getSectionEventName } from '@/lib/eventUtils';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: events, source: 'mongodb' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'MongoDB is required to load events.', error: err.message }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const { name, category, categories, gender, description, stageNumber, stageDescription, points, status, separateEvents } = body;

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
    
    // Normalize categories to an array
    let eventCategories = [];
    if (Array.isArray(categories) && categories.length > 0) {
      eventCategories = categories.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof category === 'string' && category.trim()) {
      eventCategories = category.split(',').map(c => c.trim()).filter(Boolean);
    }
    if (eventCategories.length === 0) {
      eventCategories = ['General'];
    }

    const separateGenderEvents = gender === 'Separate';
    const eventGenders = separateGenderEvents
      ? ['Male', 'Female']
      : [['Male', 'Female'].includes(gender) ? gender : 'Both'];
    const eventDesc = (description || '').trim();
    const eventStageNumber = stageNumber !== undefined && stageNumber !== '' && stageNumber !== null ? Number(stageNumber) : null;
    const eventStageDesc = (stageDescription || '').trim();
    const eventStatus = status || 'Upcoming';

    // When multiple categories are selected, create individual events for each category by default
    const shouldCreateSeparate = separateEvents !== false && eventCategories.length > 1;
    const shouldCreateMultiple = shouldCreateSeparate || separateGenderEvents;

    await connectToDatabase();

    if (shouldCreateMultiple) {
      const createdList = [];
      const categoryGroups = shouldCreateSeparate
        ? eventCategories.map((section) => [section])
        : [eventCategories];

      for (const categoryGroup of categoryGroups) {
        const baseEventName = shouldCreateSeparate
          ? getSectionEventName(trimmedName, categoryGroup[0])
          : trimmedName;
        for (const eventGender of eventGenders) {
          const eventName = separateGenderEvents
            ? `${baseEventName} (${eventGender})`
            : baseEventName;
          let evDoc = await Event.findOne({ name: eventName });
          if (!evDoc) {
            evDoc = await Event.create({
              name: eventName,
              category: categoryGroup.join(', '),
              categories: categoryGroup,
              gender: eventGender,
              description: eventDesc,
              stageNumber: eventStageNumber,
              stageDescription: eventStageDesc,
              points: defaultPoints,
              status: eventStatus,
            });
          }
          createdList.push(evDoc);
        }
      }
      return NextResponse.json({ 
        success: true, 
        data: createdList, 
        count: createdList.length, 
        source: 'mongodb'
      }, { status: 201 });
    }

    // Single event creation
    const eventCategory = eventCategories.join(', ');
    const created = await Event.create({
      name: trimmedName,
      category: eventCategory,
      categories: eventCategories,
      gender: eventGenders[0],
      description: eventDesc,
      stageNumber: eventStageNumber,
      stageDescription: eventStageDesc,
      points: defaultPoints,
      status: eventStatus,
    });
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
    const { id, name, category, categories, gender, description, stageNumber, stageDescription, points, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Event ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();

    if (categories !== undefined) {
      const arr = Array.isArray(categories) ? categories.map(c => String(c).trim()).filter(Boolean) : [];
      updateData.categories = arr;
      updateData.category = arr.join(', ');
    } else if (category !== undefined) {
      const arr = typeof category === 'string' ? category.split(',').map(c => c.trim()).filter(Boolean) : [];
      updateData.categories = arr;
      updateData.category = category.trim();
    }

    if (gender !== undefined && gender !== 'Separate') {
      updateData.gender = ['Male', 'Female'].includes(gender) ? gender : 'Both';
    }

    if (description !== undefined) updateData.description = description.trim();
    if (stageNumber !== undefined) updateData.stageNumber = stageNumber !== '' && stageNumber !== null ? Number(stageNumber) : null;
    if (stageDescription !== undefined) updateData.stageDescription = stageDescription.trim();
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

    await connectToDatabase();
    const updated = await Event.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
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
      return NextResponse.json({ success: false, message: 'Event ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    await Event.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
