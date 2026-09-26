import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import Candidate from '@/models/Candidate';
import Mekhala from '@/models/Mekhala';
import Parish from '@/models/Parish';

function assignPointsRanks(items) {
  let currentRank = 0;
  let previousPoints;

  return items.map((item, index) => {
    if (index === 0 || item.totalPoints !== previousPoints) {
      currentRank += 1;
    }
    previousPoints = item.totalPoints;
    return { ...item, rank: currentRank };
  });
}

function aggregateResults(events, candidates, mekhalas, parishes) {
  // Mekhala points map
  const mekhalaMap = {};
  mekhalas.forEach(m => {
    mekhalaMap[m.name] = {
      name: m.name,
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

  // Parish points map
  const parishMap = {};
  const parishCountsByMekhala = {};
  parishes.forEach(s => {
    if (s.mekhala) {
      parishCountsByMekhala[s.mekhala] = (parishCountsByMekhala[s.mekhala] || 0) + 1;
    }
    parishMap[s.name] = {
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

    // Tally candidate to Parish
    if (cand.parish) {
      if (!parishMap[cand.parish]) {
        parishMap[cand.parish] = {
          name: cand.parish,
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
      parishMap[cand.parish].candidateCount += 1;
      parishMap[cand.parish].totalPoints += cand.totalPoints || 0;
      if (cand.position === 'First') parishMap[cand.parish].firsts += 1;
      if (cand.position === 'Second') parishMap[cand.parish].seconds += 1;
      if (cand.position === 'Third') parishMap[cand.parish].thirds += 1;
      if (cand.grade === 'A') parishMap[cand.parish].gradeA += 1;
      if (cand.grade === 'B') parishMap[cand.parish].gradeB += 1;
      if (cand.grade === 'C') parishMap[cand.parish].gradeC += 1;
    }

    // Attach to event
    if (eventMap[cand.event]) {
      eventMap[cand.event].candidates.push(cand);
      if (cand.position === 'First') eventMap[cand.event].winners.first.push(cand);
      else if (cand.position === 'Second') eventMap[cand.event].winners.second.push(cand);
      else if (cand.position === 'Third') eventMap[cand.event].winners.third.push(cand);
    }
  });

  const hasPublishedResults = candidates.some(cand =>
    (cand.position && cand.position !== 'None') ||
    (cand.grade && cand.grade !== 'None') ||
    Number(cand.totalPoints || 0) > 0
  );

  // Sort leaderboards
  const sortedMekhalas = Object.values(mekhalaMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    return b.seconds - a.seconds;
  });
  const topMekhalas = assignPointsRanks(sortedMekhalas).map(item => ({
    ...item,
    parishCount: parishCountsByMekhala[item.name] || 0,
  }));

  const sortedParishes = Object.values(parishMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    return b.seconds - a.seconds;
  });
  const topParishes = assignPointsRanks(sortedParishes);
  const leadingMekhalas = hasPublishedResults && topMekhalas.length > 0
    ? topMekhalas.filter(item => item.totalPoints === topMekhalas[0].totalPoints)
    : [];
  const leadingParishes = hasPublishedResults && topParishes.length > 0
    ? topParishes.filter(item => item.totalPoints === topParishes[0].totalPoints)
    : [];

  // Events array
  const eventsList = Object.values(eventMap);

  return {
    events: eventsList,
    topMekhalas,
    topParishes,
    stats: {
      totalCandidates: candidates.length,
      totalEvents: events.length,
      completedEvents: events.filter(e => e.status === 'Completed').length,
      hasPublishedResults,
      leadingMekhala: leadingMekhalas[0] || null,
      leadingParish: leadingParishes[0] || null,
      leadingMekhalas,
      leadingParishes,
    },
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const [events, candidates, mekhalas, parishes] = await Promise.all([
      Event.find({}).lean(),
      Candidate.find({}).lean(),
      Mekhala.find({}).lean(),
      Parish.find({}).lean(),
    ]);

    const publicCandidates = candidates.map(candidate => ({
      _id: candidate._id,
      chestNo: candidate.chestNo,
      name: candidate.name,
      houseName: candidate.houseName,
      parish: candidate.parish,
      mekhala: candidate.mekhala,
      section: candidate.section,
      sex: candidate.sex,
      event: candidate.event,
      position: candidate.position,
      grade: candidate.grade,
      totalPoints: candidate.totalPoints,
    }));
    const result = aggregateResults(events, publicCandidates, mekhalas, parishes);
    return NextResponse.json({ success: true, data: result, source: 'mongodb' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'MongoDB is required to load results.' }, { status: 503 });
  }
}
