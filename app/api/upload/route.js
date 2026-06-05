import { NextResponse } from 'next/server';
import { adminSupabase } from '../../../lib/supabase';
import { XMLParser } from 'fast-xml-parser';

export const runtime = 'nodejs';

function semicircleToDeg(v) {
  return Number(v) * (180 / Math.pow(2, 31));
}

function calcDistance(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return 0;

  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
    Math.cos(toRad(b.lat)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function normalizeSport(s) {
  s = String(s || '').toLowerCase();

  if (s.includes('swim')) return 'Плавание';
  if (s.includes('tennis')) return 'Теннис';
  if (s.includes('strength') || s.includes('training')) return 'Сила';
  if (s.includes('cycling') || s.includes('bike')) return 'Велосипед';
  if (s.includes('walking')) return 'Ходьба';
  if (s.includes('run') || s.includes('running')) return 'Бег';

  return s ? s : 'Тренировка';
}

function arr(x) {
  return Array.isArray(x) ? x : (x ? [x] : []);
}

function average(vals) {
  vals = vals.map(Number).filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function max(vals) {
  vals = vals.map(Number).filter(Number.isFinite);
  return vals.length ? Math.max(...vals) : null;
}

function estimateLoad(duration, avgHr) {
  if (!duration) return null;
  const hr = Number(avgHr) || 120;
  return Math.max(1, (duration / 3600) * Math.pow(hr / 140, 2) * 50);
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function parseFit(buffer) {
  const mod = await import('fit-file-parser');
  const FitParser = mod.default || mod;

  const parser = new FitParser({
    force: true,
    speedUnit: 'm/s',
    lengthUnit: 'm',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'both'
  });

  const fit = await new Promise((resolve, reject) =>
    parser.parse(buffer, (err, data) => err ? reject(err) : resolve(data))
  );

  const records = fit.records || fit.activity?.records || [];
const sessions = fit.sessions || fit.activity?.sessions || [];
const session = sessions[0] || {};

console.log('FIT RECORD SAMPLE 0');
console.log(records[0]);

console.log('FIT RECORD SAMPLE 50');
console.log(records[50]);

console.log('FIT SESSION SAMPLE');
console.log(session);

let last = null;
let dist = 0;

  let last = null;
  let dist = 0;

  const points = records.map(r => {
    const lat =
      r.position_lat != null
        ? (Math.abs(r.position_lat) > 180 ? semicircleToDeg(r.position_lat) : Number(r.position_lat))
        : undefined;

    const lon =
      r.position_long != null
        ? (Math.abs(r.position_long) > 180 ? semicircleToDeg(r.position_long) : Number(r.position_long))
        : undefined;

    const p = {
      t: r.timestamp ? new Date(r.timestamp).toISOString() : null,

      hr: toNumberOrNull(r.heart_rate),

      alt: toNumberOrNull(
        r.altitude ??
        r.enhanced_altitude
      ),

      speed: toNumberOrNull(
        r.speed ??
        r.enhanced_speed
      ),

      cadence: toNumberOrNull(
        r.cadence ??
        r.run_cadence
      ),

      power: toNumberOrNull(
        r.power
      ),

      temperature: toNumberOrNull(
        r.temperature
      ),

      ground_time: toNumberOrNull(
        r.ground_contact_time
      ),

      stride_length: toNumberOrNull(
        r.stride_length
      ),

      vertical_ratio: toNumberOrNull(
        r.vertical_ratio
      ),

      vertical_oscillation: toNumberOrNull(
        r.vertical_oscillation
      ),

      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      distance: toNumberOrNull(r.distance)
    };

    if (p.distance == null && p.lat != null && p.lon != null) {
      dist += calcDistance(last, p);
      p.distance = dist;
      last = p;
    }

    if (p.speed && p.speed > 0) {
      p.pace = 1000 / p.speed;
    }

    return p;
  });

  const validPoints = points.filter(
    p =>
      p.t ||
      p.hr ||
      p.distance ||
      p.lat ||
      p.cadence ||
      p.power ||
      p.temperature ||
      p.ground_time ||
      p.stride_length ||
      p.vertical_ratio ||
      p.vertical_oscillation
  );

  const first = validPoints[0] || {};
  const lastPoint = validPoints[validPoints.length - 1] || {};

  const duration =
    session.total_elapsed_time ||
    session.total_timer_time ||
    (
      first.t && lastPoint.t
        ? (new Date(lastPoint.t) - new Date(first.t)) / 1000
        : null
    );

  const distance =
    session.total_distance ||
    lastPoint.distance ||
    null;

  const sport = normalizeSport(
    session.sport ||
    fit.sport ||
    fit.activity?.sport ||
    ''
  );

  const avgHr =
    session.avg_heart_rate ||
    average(validPoints.map(p => p.hr));

  return {
    sport,
    started_at: first.t || session.start_time || new Date().toISOString(),
    duration_sec: duration,
    distance_m: distance,
    avg_hr: avgHr,
    max_hr: session.max_heart_rate || max(validPoints.map(p => p.hr)),
    calories: session.total_calories,
    ascent_m: session.total_ascent,
    load_score: estimateLoad(duration, avgHr),
    points: validPoints
  };
}

function parseTcx(text) {
  const xml = new XMLParser({ ignoreAttributes: false }).parse(text);
  const acts = arr(xml.TrainingCenterDatabase?.Activities?.Activity);
  const act = acts[0] || {};
  const laps = arr(act.Lap);
  const trackpoints = laps.flatMap(l => arr(l.Track?.Trackpoint));

  let dist = 0;
  let last = null;

  const points = trackpoints.map(tp => {
    const p = {
      t: tp.Time || null,
      hr: tp.HeartRateBpm?.Value ?? null,
      alt: tp.AltitudeMeters ?? null,
      distance: tp.DistanceMeters ?? null,
      lat: tp.Position?.LatitudeDegrees ?? null,
      lon: tp.Position?.LongitudeDegrees ?? null
    };

    p.lat = p.lat != null ? Number(p.lat) : null;
    p.lon = p.lon != null ? Number(p.lon) : null;
    p.hr = p.hr != null ? Number(p.hr) : null;
    p.alt = p.alt != null ? Number(p.alt) : null;
    p.distance = p.distance != null ? Number(p.distance) : null;

    if (p.distance == null && p.lat != null && p.lon != null) {
      dist += calcDistance(last, p);
      p.distance = dist;
      last = p;
    }

    return p;
  });

  for (let i = 1; i < points.length; i++) {
    const dt = (new Date(points[i].t) - new Date(points[i - 1].t)) / 1000;
    const dd = (points[i].distance ?? 0) - (points[i - 1].distance ?? 0);

    if (dt > 0 && dd > 0) {
      points[i].pace = dt / (dd / 1000);
    }
  }

  const duration =
    laps.reduce((a, l) => a + (Number(l.TotalTimeSeconds) || 0), 0) ||
    null;

  const distance =
    laps.reduce((a, l) => a + (Number(l.DistanceMeters) || 0), 0) ||
    points.at(-1)?.distance ||
    null;

  const avgHr = average(points.map(p => p.hr));

  return {
    sport: normalizeSport(act['@_Sport']),
    started_at: points[0]?.t || act.Id || new Date().toISOString(),
    duration_sec: duration,
    distance_m: distance,
    avg_hr: avgHr,
    max_hr: max(points.map(p => p.hr)),
    calories: laps.reduce((a, l) => a + (Number(l.Calories) || 0), 0) || null,
    ascent_m: null,
    load_score: estimateLoad(duration, avgHr),
    points
  };
}

export async function POST(req) {
  try {
    const form = await req.formData();

    if (String(form.get('password') || '') !== process.env.UPLOAD_PASSWORD) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    const file = form.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const title = String(form.get('title') || '').trim();
    const name = file.name || 'activity';
    const buf = Buffer.from(await file.arrayBuffer());

    let parsed;

    if (name.toLowerCase().endsWith('.tcx') || name.toLowerCase().endsWith('.xml')) {
      parsed = parseTcx(buf.toString('utf8'));
    } else {
      parsed = await parseFit(buf);
    }

    parsed.title = title || parsed.sport || 'Тренировка';
    parsed.source_file = name;

    const supabase = adminSupabase();

    const { data, error } = await supabase
      .from('workouts')
      .insert(parsed)
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || 'Не удалось обработать файл' },
      { status: 500 }
    );
  }
}