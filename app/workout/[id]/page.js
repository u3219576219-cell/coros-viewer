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
  let valid = cleanPoints(points)
    .map((p, i) => ({ ...p, i, value: Number(p[field]) }))
    .filter(p => Number.isFinite(p.value));

  if (field === 'pace') {
    valid = valid.filter(p => p.value >= 180 && p.value <= 900);
  }

  if (field === 'hr') {
    valid = valid.filter(p => p.value >= 40 && p.value <= 220);
  }

  if (valid.length < 2) {
    return (
      <section className="darkCard">
        <h2>{title}</h2>
        <div className="muted">Нет данных</div>
      </section>
    );
  }

  const values = valid.map(p => p.value).sort((a, b) => a - b);
  const min = values[Math.floor(values.length * 0.03)];
  const maxVal = values[Math.floor(values.length * 0.97)];
  const span = maxVal - min || 1;

  const sampled = valid.slice(0, 700);

  const yFor = (value) => {
    const raw = Math.max(min, Math.min(maxVal, value));
    const yNorm = (raw - min) / span;
    return invert ? 30 + yNorm * 220 : 250 - yNorm * 220;
  };

  const d = sampled.map((p, i) => {
    const x = (i / (sampled.length - 1)) * 1000;
    const y = yFor(p.value);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const average = avg(valid.map(p => p.value));
  const maximum = max(valid.map(p => p.value));

  const guideValues = [
    min,
    min + span * 0.5,
    maxVal
  ];

  const showValue = (v) => {
    if (field === 'pace') return formatPace(v);
    return Math.round(v);
  };

  return (
    <section className="darkCard">
      <div className="chartHead">
        <h2>{title}</h2>
        <div>
          <span>Макс. <b>{field === 'pace' ? formatPace(min) : Math.round(maximum)}</b></span>
          <span>Средн. <b>{field === 'pace' ? formatPace(average) : Math.round(average)}</b></span>
        </div>
      </div>

      <div className="darkChart withGuides">
        <svg viewBox="0 0 1000 280" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`g-${field}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {guideValues.map((v, idx) => {
            const y = yFor(v);
            return (
              <g key={idx}>
                <line x1="0" x2="1000" y1={y} y2={y} stroke="#3a3a3a" strokeWidth="2" strokeDasharray="8 8" />
                <text x="8" y={y - 6} fill="#aaa" fontSize="24">{showValue(v)}</text>
              </g>
            );
          })}

          <path d={`${d} L1000 280 L0 280 Z`} fill={`url(#g-${field})`} />
          <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="chartFoot">
        <span>min {showValue(min)}{field === 'pace' ? '' : unit}</span>
        <span>max {showValue(maxVal)}{field === 'pace' ? '' : unit}</span>
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