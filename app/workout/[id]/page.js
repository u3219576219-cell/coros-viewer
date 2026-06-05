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
    .map((p, i) => {
      const start = new Date(points?.[0]?.t || p.t).getTime();
      const current = new Date(p.t).getTime();

      return {
        ...p,
        i,
        minute: Number.isFinite(current - start) ? (current - start) / 60000 : i / 60,
        value: Number(p[field])
      };
    })
    .filter(p => Number.isFinite(p.value));

  if (field === 'pace') valid = valid.filter(p => p.value >= 210 && p.value <= 720);
  if (field === 'hr') valid = valid.filter(p => p.value >= 40 && p.value <= 220);
  if (field === 'alt') valid = valid.filter(p => p.value > -500 && p.value < 9000);
  if (field === 'cadence_spm') valid = valid.filter(p => p.value > 0);
if (field === 'stride_cm') valid = valid.filter(p => p.value > 0);
if (field === 'power') valid = valid.filter(p => p.value > 0);

  if (valid.length < 2) {
    return (
      <section className="darkCard corosChartCard">
        <h2>{title}</h2>
        <div className="muted">Нет данных</div>
      </section>
    );
  }

  const durationMin = Math.max(...valid.map(p => p.minute));
  const values = valid.map(p => p.value).sort((a, b) => a - b);

  let minVal = values[Math.floor(values.length * 0.02)];
  let maxVal = values[Math.floor(values.length * 0.98)];

  if (field === 'pace') {
    minVal = Math.max(210, minVal);
    maxVal = Math.min(720, maxVal);
  }

  const span = maxVal - minVal || 1;
  const average = avg(valid.map(p => p.value));
  const maximum = max(valid.map(p => p.value));
  const best = field === 'pace' ? minVal : maximum;

  const xFor = (minute) => durationMin ? (minute / durationMin) * 1000 : 0;

  const yFor = (value) => {
    const raw = Math.max(minVal, Math.min(maxVal, value));
    const norm = (raw - minVal) / span;
    return invert ? 34 + norm * 196 : 230 - norm * 196;
  };

  const sampleStep = Math.max(1, Math.ceil(valid.length / 650));
  const sampled = valid.filter((_, i) => i % sampleStep === 0);

  const d = sampled.map((p, i) => {
    const x = xFor(p.minute);
    const y = yFor(p.value);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const showValue = (v) => {
    if (!Number.isFinite(v)) return '--';
    if (field === 'pace') return formatPace(v);
    return Math.round(v);
  };

  const avgY = yFor(average);
  const yTicks = [maxVal, (maxVal + minVal) / 2, minVal];

  const rawTicks = [0, 10, 20, 30, Math.round(durationMin)];
  const xTicks = rawTicks.filter((v, i, arr) => v <= durationMin + 1 && arr.indexOf(v) === i);

  return (
    <section className="darkCard corosChartCard">
      <div className="corosChartHeader">
        <h2>{title}</h2>
        <div className="corosChartNumbers">
          <span>{field === 'pace' ? 'Лучший' : 'Макс.'} <b>{showValue(best)}</b></span>
          <span>Средн. <b>{showValue(average)}</b></span>
        </div>
      </div>

      <div className="corosChart">
        <svg viewBox="0 0 1000 285" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`fill-${field}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.36" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((v, idx) => {
            const y = yFor(v);
            return (
              <g key={`yt-${idx}`}>
                <line x1="70" x2="1000" y1={y} y2={y} stroke="#343434" strokeWidth="2" />
                <text x="4" y={y + 8} fill="#a3a3a3" fontSize="16">{showValue(v)}</text>
              </g>
            );
          })}

          {xTicks.map((v, idx) => {
            const x = Math.max(70, Math.min(990, xFor(v)));
            return (
              <text key={`xt-${idx}`} x={x} y="276" fill="#a3a3a3" fontSize="22" textAnchor="middle">
                {v}
              </text>
            );
          })}

          {Number.isFinite(avgY) && (
            <line x1="70" x2="1000" y1={avgY} y2={avgY} stroke="#ef4444" strokeWidth="3" strokeDasharray="7 7" />
          )}

          <path d={`${d} L1000 246 L70 246 Z`} fill={`url(#fill-${field})`} />
          <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
const avgPower = avg(points.map(p => p.power));
const avgCadence = avg(points.map(p => p.cadence));
const avgStride = avg(points.map(p => p.stride_length));
  const title = w.title || w.sport || 'Тренировка';
  const pace = w.distance_m ? w.duration_sec / (w.distance_m / 1000) : null;

const chartPoints = points.map(p => ({
  ...p,
  cadence_spm: p.cadence ? p.cadence * 2 : null,
  stride_cm: p.stride_length ? p.stride_length / 10 : null
}));
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

        <Metric label="Калории" value={Math.round(w.calories) || '--'} />
        
      </section>

    <LineChart points={points} field="pace" title="Темп (мин/км)" unit="" color="#22c55e" invert />
<LineChart points={points} field="hr" title="Пульс (уд/мин)" unit="" color="#22c55e" />


<LineChart points={chartPoints} field="cadence_spm" title="Каденс" unit="" color="#22d3ee" />
<LineChart points={chartPoints} field="stride_cm" title="Длина шага (см)" unit="" color="#8b5cf6" />
<LineChart points={points} field="power" title="Мощность (Вт)" unit="" color="#f97316" />

<LineChart points={points} field="alt" title="Высота" unit=" м" color="#06b6d4" />
<HeartZones points={points} />
    </main>
  );
}