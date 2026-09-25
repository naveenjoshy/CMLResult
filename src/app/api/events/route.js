import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import { getMemoryStore } from '@/lib/memoryStore';
import { getSectionEventName } from '@/lib/eventUtils';

export async function GET() {
  try {
    try {
      const conn = await connectToDatabase();
      if (conn) {
        const events = await Event.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: events, source: 'mongodb' });
      }
    } catch (dbErr) {
      console.warn('[Events GET] MongoDB error, falling back to memory store:', dbErr.message);
    }

    const store = getMemoryStore();
    return NextResponse.json({ success: true, data: store.events, source: 'memory' });
  } catch (err) {
    console.error('[Events GET] Fatal error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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

    const conn = await connectToDatabase();

    if (shouldCreateMultiple) {
      const createdList = [];
      const categoryGroups = shouldCreateSeparate
        ? eventCategories.map((section) => [section])
        : [eventCategories];

      if (conn) {
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

      const store = getMemoryStore();
      for (const categoryGroup of categoryGroups) {
        const baseEventName = shouldCreateSeparate
          ? getSectionEventName(trimmedName, categoryGroup[0])
          : trimmedName;
        for (const eventGender of eventGenders) {
          const eventName = separateGenderEvents
            ? `${baseEventName} (${eventGender})`
            : baseEventName;
          let evDoc = store.events.find(e => e.name === eventName);
          if (!evDoc) {
            evDoc = {
              _id: 'e_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              name: eventName,
              category: categoryGroup.join(', '),
              categories: categoryGroup,
              gender: eventGender,
              description: eventDesc,
              stageNumber: eventStageNumber,
              stageDescription: eventStageDesc,
              points: defaultPoints,
              status: eventStatus,
              createdAt: new Date(),
            };
            store.events.unshift(evDoc);
          }
          createdList.push(evDoc);
        }
      }
      return NextResponse.json({ 
        success: true, 
        data: createdList, 
        count: createdList.length, 
        source: 'memory' 
      }, { status: 201 });
    }

    // Single event creation
    const eventCategory = eventCategories.join(', ');
    if (conn) {
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
    }

    const store = getMemoryStore();
    const newEvent = {
      _id: 'e_' + Date.now(),
      name: trimmedName,
      category: eventCategory,
      categories: eventCategories,
      gender: eventGenders[0],
      description: eventDesc,
      stageNumber: eventStageNumber,
      stageDescription: eventStageDesc,
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
