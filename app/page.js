import { publicSupabase } from '../lib/supabase';
import { fmtDuration, fmtDistance, fmtPace, dateKey, dayTitle, sportIcon } from '../lib/format';

export const dynamic = 'force-dynamic';

export default async function Home(){
  const supabase = publicSupabase();
  const { data, error } = await supabase
  .from('workouts')
  .select('*')
  .order('started_at', { ascending: false });

const workouts = data || [];
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate()-30);
  const week = workouts.filter(w=>new Date(w.started_at)>=weekAgo);
  const month = workouts.filter(w=>new Date(w.started_at)>=monthAgo);
  const sum = (arr,k)=>arr.reduce((a,w)=>a+(Number(w[k])||0),0);
  const groups = workouts.reduce((acc,w)=>{const k=dateKey(w.started_at||w.created_at);(acc[k] ||= []).push(w);return acc},{});
  return <main className="wrap">
    <section className="hero"><h1>Дневник тренировок</h1><div className="muted">Публичная страница без авторизации</div></section>
    <section className="stats">
      <div className="stat"><span className="muted">За 7 дней</span><b>{fmtDuration(sum(week,'duration_sec'))}</b></div>
      <div className="stat"><span className="muted">За 30 дней</span><b>{fmtDuration(sum(month,'duration_sec'))}</b></div>
      <div className="stat"><span className="muted">Дистанция 7 дней</span><b>{fmtDistance(sum(week,'distance_m'))}</b></div>
      <div className="stat"><span className="muted">Нагрузка 7 дней</span><b>{Math.round(sum(week,'load_score'))||'—'}</b></div>
    </section>
    {workouts.length===0 && <div className="card">Пока нет тренировок. Загрузите FIT/TCX на странице <a href="/upload"><b>/upload</b></a>.</div>}
    {Object.entries(groups).map(([day,items])=>{
      const dayTime=sum(items,'duration_sec'), dayLoad=sum(items,'load_score');
      return <section className="day" key={day}>
        <div className="dayHead"><div><h2>{dayTitle(day)}</h2><div className="muted small">{items.length} трен. · {fmtDuration(dayTime)} · нагрузка {Math.round(dayLoad)||'—'}</div></div></div>
        {items.map(w=>{const pace=w.distance_m? (w.duration_sec/(w.distance_m/1000)):null;return <a className="workout" href={`/workout/${w.id}`} key={w.id}>
          <div className="icon">{sportIcon(w.sport||w.title)}</div><div className="wmain"><div className="wtitle">{w.title || w.sport || 'Тренировка'}</div><div className="wmeta">{fmtDuration(w.duration_sec)} · {fmtDistance(w.distance_m)} · {fmtPace(pace)} · ЧСС {w.avg_hr?Math.round(w.avg_hr):'—'}</div></div><span className="pill">Открыть</span>
        </a>})}
      </section>
    })}
  </main>
}
