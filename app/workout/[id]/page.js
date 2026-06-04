import { publicSupabase } from '../../../lib/supabase';
import { fmtDuration, fmtDistance, fmtPace, sportIcon } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function LineChart({ points, field, label }){
  const vals=(points||[]).map(p=>Number(p[field])).filter(v=>Number.isFinite(v));
  if(vals.length<2)return <div className="notice">Нет данных для графика: {label}</div>;
  const min=Math.min(...vals), max=Math.max(...vals), span=max-min || 1;
  const sampled=(points||[]).filter(p=>Number.isFinite(Number(p[field]))).slice(0,600);
  const d=sampled.map((p,i)=>{const x=(i/(sampled.length-1))*1000;const y=160-((Number(p[field])-min)/span)*130;return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join(' ');
  return <div><h3>{label}</h3><div className="chart"><svg viewBox="0 0 1000 180" preserveAspectRatio="none"><path d={d} fill="none" stroke="currentColor" strokeWidth="4"/></svg></div><div className="muted small">min {Math.round(min)} · max {Math.round(max)}</div></div>
}
function MapMini({points}){
  const pts=(points||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))).slice(0,1000);
  if(pts.length<2)return null;
  const lats=pts.map(p=>Number(p.lat)), lons=pts.map(p=>Number(p.lon)); const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLon=Math.min(...lons), maxLon=Math.max(...lons);
  const d=pts.map((p,i)=>{const x=((Number(p.lon)-minLon)/((maxLon-minLon)||1))*1000; const y=700-((Number(p.lat)-minLat)/((maxLat-minLat)||1))*700; return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join(' ');
  return <><h3>Маршрут</h3><div className="map"><svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"><path d={d} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></svg></div></>
}
export default async function Workout({params}){
  const supabase=publicSupabase();
  const id = params?.id;
const { data: w } = await supabase
  .from('workouts')
  .select('*')
  .eq('id', id)
  .maybeSingle();
  if(!w)return <main className="wrap"><div className="card">Тренировка не найдена</div></main>;
  const pace=w.distance_m? w.duration_sec/(w.distance_m/1000):null;
  return <main className="wrap"><a className="muted" href="/">← Все тренировки</a><section className="hero"><h1>{sportIcon(w.sport||w.title)} {w.title||w.sport||'Тренировка'}</h1><div className="muted">{new Date(w.started_at||w.created_at).toLocaleString('ru-RU')}</div></section>
    <section className="grid2">
      <div className="stat"><span className="muted">Время</span><b>{fmtDuration(w.duration_sec)}</b></div><div className="stat"><span className="muted">Дистанция</span><b>{fmtDistance(w.distance_m)}</b></div>
      <div className="stat"><span className="muted">Темп</span><b>{fmtPace(pace)}</b></div><div className="stat"><span className="muted">Пульс</span><b>{w.avg_hr?Math.round(w.avg_hr):'—'}</b></div>
      <div className="stat"><span className="muted">Нагрузка</span><b>{Math.round(w.load_score)||'—'}</b></div><div className="stat"><span className="muted">Калории</span><b>{Math.round(w.calories)||'—'}</b></div>
    </section>
    <section className="card" style={{marginTop:16}}><MapMini points={w.points}/><LineChart points={w.points} field="hr" label="Пульс"/><LineChart points={w.points} field="pace" label="Темп, сек/км"/><LineChart points={w.points} field="alt" label="Высота"/></section>
  </main>
}
