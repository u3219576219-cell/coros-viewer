import { publicSupabase } from '../../../lib/supabase';
import { fmtDuration, fmtDistance, sportIcon } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function avg(arr) {
  const nums = arr.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function max(arr) {
  const nums = arr.map(Number).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : null;
}

function formatPace(sec) {
  if (!sec || !Number.isFinite(sec)) return '--';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, '0');
  return `${m}'${s}"`;
}

function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function cleanPoints(points) {
  return (points || []).filter(p => p && p.t);
}

function Metric({ label, value }) {
  return (
    <div className="darkMetric">
      <div>{label}</div>
      <b>{value}</b>
    </div>
  );
}

function LineChart({ points, field, title, unit, color = '#22c55e', invert = false }) {
  const valid = cleanPoints(points)
    .map((p, i) => ({ ...p, i, value: Number(p[field]) }))
    .filter(p => Number.isFinite(p.value));

  if (valid.length < 2) {
    return (
      <section className="darkCard">
        <h2>{title}</h2>
        <div className="muted">Нет данных</div>
      </section>
    );
  }

  let values = valid.map(p => p.value);

  values.sort((a, b) => a - b);
  const low = values[Math.floor(values.length * 0.05)];
  const high = values[Math.floor(values.length * 0.95)];
  const min = low ?? Math.min(...values);
  const maxVal = high ?? Math.max(...values);
  const span = maxVal - min || 1;

  const sampled = valid.slice(0, 700);
  const d = sampled.map((p, i) => {
    const x = (i / (sampled.length - 1)) * 1000;
    const raw = Math.max(min, Math.min(maxVal, p.value));
    const yNorm = (raw - min) / span;
    const y = invert ? 30 + yNorm * 220 : 250 - yNorm * 220;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const average = avg(valid.map(p => p.value));
  const maximum = max(valid.map(p => p.value));

  return (
    <section className="darkCard">
      <div className="chartHead">
        <h2>{title}</h2>
        <div>
          <span>Макс. <b>{maximum ? Math.round(maximum) : '--'}</b></span>
          <span>Средн. <b>{average ? Math.round(average) : '--'}</b></span>
        </div>
      </div>

      <div className="darkChart">
        <svg viewBox="0 0 1000 280" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`g-${field}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d={`${d} L1000 280 L0 280 Z`} fill={`url(#g-${field})`} />
          <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="chartFoot">
        <span>min {Math.round(min)}{unit}</span>
        <span>max {Math.round(maxVal)}{unit}</span>
      </div>
    </section>
  );
}

function HeartZones({ points }) {
  const hrs = cleanPoints(points).map(p => Number(p.hr)).filter(Number.isFinite);
  if (!hrs.length) return null;

  const zones = [
    ['Восстановление', '<132', h => h < 132],
    ['Аэробная выносливость', '132–149', h => h >= 132 && h <= 149],
    ['Аэробная мощность', '150–157', h => h >= 150 && h <= 157],
    ['ПАНО', '158–168', h => h >= 158 && h <= 168],
    ['Анаэробная выносливость', '169–175', h => h >= 169 && h <= 175],
    ['Анаэробная мощность', '>175', h => h > 175],
  ];

  return (
    <section className="darkCard">
      <h2>Зоны пульса</h2>
      {zones.map(([name, range, fn]) => {
        const count = hrs.filter(fn).length;
        const pct = Math.round((count / hrs.length) * 100);
        const sec = count;
        return (
          <div className="zoneRow" key={name}>
            <div>{name}</div>
            <span>{range}</span>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <b>{pct}%</b>
            <span>{fmtDuration(sec)}</span>
          </div>
        );
      })}
    </section>
  );
}

export default async function Workout({ params }) {
  const { id } = await params;
  const supabase = publicSupabase();

  const { data: rows } = await supabase.from('workouts').select('*');
  const w = (rows || []).find(item => String(item.id) === String(id));

  if (!w) {
    return <main className="wrap"><div className="card">Тренировка не найдена</div></main>;
  }

  const points = cleanPoints(w.points);
  const hrs = points.map(p => Number(p.hr)).filter(Number.isFinite);
  const avgHr = w.avg_hr || avg(hrs);
  const maxHr = w.max_hr || max(hrs);

  const title = w.title || w.sport || 'Тренировка';
  const pace = w.distance_m ? w.duration_sec / (w.distance_m / 1000) : null;

  return (
    <main className="darkPage">
      <a className="backLink" href="/">← Все тренировки</a>

      <section className="darkHero">
        <h1>{sportIcon(w.sport || title)} {title}</h1>
        <div>{formatDate(w.started_at || w.created_at)}</div>
      </section>

      <section className="darkGrid">
        <Metric label="Время" value={fmtDuration(w.duration_sec)} />
        <Metric label="Дистанция" value={fmtDistance(w.distance_m)} />
        <Metric label="Темп" value={formatPace(pace)} />
        <Metric label="Средний пульс" value={avgHr ? Math.round(avgHr) : '--'} />
        <Metric label="Макс. пульс" value={maxHr ? Math.round(maxHr) : '--'} />
        <Metric label="Нагрузка" value={Math.round(w.load_score) || '--'} />
        <Metric label="Калории" value={Math.round(w.calories) || '--'} />
      </section>

      <LineChart points={points} field="pace" title="Темп (мин/км)" unit="" color="#22c55e" invert />
      <LineChart points={points} field="hr" title="Пульс (уд/мин)" unit="" color="#22c55e" />
      <HeartZones points={points} />
      <LineChart points={points} field="alt" title="Высота" unit=" м" color="#f97316" />
    </main>
  );
}