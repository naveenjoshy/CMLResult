import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import Candidate from '@/models/Candidate';
import Mekhala from '@/models/Mekhala';
import Sakha from '@/models/Sakha';
import { getMemoryStore } from '@/lib/memoryStore';

function aggregateResults(events, candidates, mekhalas, sakhas) {
  // Mekhala points map
  const mekhalaMap = {};
  mekhalas.forEach(m => {
    mekhalaMap[m.name] = {
      name: m.name,
      code: m.code || '',
      totalPoints: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      gradeA: 0,
      gradeB: 0,
      gradeC: 0,
      candidateCount: 0,
    };
  });

  // Sakha points map
  const sakhaMap = {};
  sakhas.forEach(s => {
    sakhaMap[s.name] = {
      name: s.name,
      mekhala: s.mekhala,
      totalPoints: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      gradeA: 0,
      gradeB: 0,
      gradeC: 0,
      candidateCount: 0,
    };
  });

  // Events map with winners
  const eventMap = {};
  events.forEach(e => {
    eventMap[e.name] = {
      ...e,
      candidates: [],
      winners: {
        first: [],
        second: [],
        third: [],
      },
    };
  });

  // Process candidates
  candidates.forEach(cand => {
    // Tally candidate to Mekhala
    if (cand.mekhala) {
      if (!mekhalaMap[cand.mekhala]) {
        mekhalaMap[cand.mekhala] = {
          name: cand.mekhala,
          code: '',
          totalPoints: 0,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          candidateCount: 0,
        };
      }
      mekhalaMap[cand.mekhala].candidateCount += 1;
      mekhalaMap[cand.mekhala].totalPoints += cand.totalPoints || 0;
      if (cand.position === 'First') mekhalaMap[cand.mekhala].firsts += 1;
      if (cand.position === 'Second') mekhalaMap[cand.mekhala].seconds += 1;
      if (cand.position === 'Third') mekhalaMap[cand.mekhala].thirds += 1;
      if (cand.grade === 'A') mekhalaMap[cand.mekhala].gradeA += 1;
      if (cand.grade === 'B') mekhalaMap[cand.mekhala].gradeB += 1;
      if (cand.grade === 'C') mekhalaMap[cand.mekhala].gradeC += 1;
    }

    // Tally candidate to Sakha
    if (cand.sakha) {
      if (!sakhaMap[cand.sakha]) {
        sakhaMap[cand.sakha] = {
          name: cand.sakha,
          mekhala: cand.mekhala || '',
          totalPoints: 0,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          candidateCount: 0,
        };
      }
      sakhaMap[cand.sakha].candidateCount += 1;
      sakhaMap[cand.sakha].totalPoints += cand.totalPoints || 0;
      if (cand.position === 'First') sakhaMap[cand.sakha].firsts += 1;
      if (cand.position === 'Second') sakhaMap[cand.sakha].seconds += 1;
      if (cand.position === 'Third') sakhaMap[cand.sakha].thirds += 1;
      if (cand.grade === 'A') sakhaMap[cand.sakha].gradeA += 1;
      if (cand.grade === 'B') sakhaMap[cand.sakha].gradeB += 1;
      if (cand.grade === 'C') sakhaMap[cand.sakha].gradeC += 1;
    }

    // Attach to event
    if (eventMap[cand.event]) {
      eventMap[cand.event].candidates.push(cand);
      if (cand.position === 'First') eventMap[cand.event].winners.first.push(cand);
      else if (cand.position === 'Second') eventMap[cand.event].winners.second.push(cand);
      else if (cand.position === 'Third') eventMap[cand.event].winners.third.push(cand);
    }
  });

  // Sort leaderboards
  const topMekhalas = Object.values(mekhalaMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    return b.seconds - a.seconds;
  }).map((item, idx) => ({ ...item, rank: idx + 1 }));

  const topSakhas = Object.values(sakhaMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    return b.seconds - a.seconds;
  }).map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Events array
  const eventsList = Object.values(eventMap);

  return {
    events: eventsList,
    topMekhalas,
    topSakhas,
    stats: {
      totalCandidates: candidates.length,
      totalEvents: events.length,
      completedEvents: events.filter(e => e.status === 'Completed').length,
      leadingMekhala: topMekhalas[0] || null,
      leadingSakha: topSakhas[0] || null,
    },
  };
}

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const [events, candidates, mekhalas, sakhas] = await Promise.all([
        Event.find({}).lean(),
        Candidate.find({}).lean(),
        Mekhala.find({}).lean(),
        Sakha.find({}).lean(),
      ]);

      const result = aggregateResults(events, candidates, mekhalas, sakhas);
      return NextResponse.json({ success: true, data: result, source: 'mongodb' });
    }
  } catch (err) {
    console.warn('[Results GET] MongoDB error, falling back to memory store:', err.message);
  }

  const store = getMemoryStore();
  const result = aggregateResults(store.events, store.candidates, store.mekhalas, store.sakhas);
  return NextResponse.json({ success: true, data: result, source: 'memory' });
}
