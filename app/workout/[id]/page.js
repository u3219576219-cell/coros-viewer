ted small">min {Math.round(min)} · max {Math.round(max)}</div>
    </div>
  );
}

function MapMini({ points }) {
  const pts = (points || [])
    .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .slice(0, 1000);

  if (pts.length < 2) return null;

  const lats = pts.map(p => Number(p.lat));
  const lons = pts.map(p => Number(p.lon));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const d = pts.map((p, i) => {
    const x = ((Number(p.lon) - minLon) / ((maxLon - minLon) || 1)) * 1000;
    const y = 700 - ((Number(p.lat) - minLat) / ((maxLat - minLat) || 1)) * 700;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <>
      <h3>Маршрут</h3>
      <div className="map">
        <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
          <path d={d} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
}

export default async function Workout({ params }) {
  const { id } = await params;
  const supabase = publicSupabase();

  const { data: rows } = await supabase
    .from('workouts')
    .select('*');

  const w = (rows || []).find(item => String(item.id) === String(id));

  if (!w) {
    return (
      <main className="wrap">
        <div className="card">Тренировка не найдена</div>
      </main>
    );
  }

  const pace = w.distance_m ? w.duration_sec / (w.distance_m / 1000) : null;

  return (
    <main className="wrap">
      <a className="muted" href="/">← Все тренировки</a>

      <section className="hero">
        <h1>{sportIcon(w.sport || w.title)} {w.title || w.sport || 'Тренировка'}</h1>
        <div className="muted">{new Date(w.started_at || w.created_at).toLocaleString('ru-RU')}</div>
      </section>

      <section className="grid2">
        <div className="stat"><span className="muted">Время</span><b>{fmtDuration(w.duration_sec)}</b></div>
        <div className="stat"><span className="muted">Дистанция</span><b>{fmtDistance(w.distance_m)}</b></div>
        <div className="stat"><span className="muted">Темп</span><b>{fmtPace(pace)}</b></div>
        <div className="stat"><span className="muted">Пульс</span><b>{w.avg_hr ? Math.round(w.avg_hr) : '--'}</b></div>
        <div className="stat"><span className="muted">Нагрузка</span><b>{Math.round(w.load_score) || '--'}</b></div>
        <div className="stat"><span className="muted">Калории</span><b>{Math.round(w.calories) || '--'}</b></div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <MapMini points={w.points} />
        <LineChart points={w.points} field="hr" label="Пульс" />
        <LineChart points={w.points} field="pace" label="Темп, сек/км" />
        <LineChart points={w.points} field="alt" label="Высота" />
      </section>
    </main>
  );
}