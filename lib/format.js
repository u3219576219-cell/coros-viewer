export function fmtDuration(s=0){s=Math.round(Number(s)||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`}
export function fmtDistance(m){if(!m)return '—';return m>=1000?`${(m/1000).toFixed(2)} км`:`${Math.round(m)} м`}
export function fmtPace(secPerKm){if(!secPerKm||!isFinite(secPerKm))return '—';const m=Math.floor(secPerKm/60),s=Math.round(secPerKm%60);return `${m}:${String(s).padStart(2,'0')}/км`}
export function dateKey(d){return new Date(d).toISOString().slice(0,10)}
export function dayTitle(key){return new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(key+'T12:00:00'))}
export function sportIcon(s=''){s=s.toLowerCase();if(s.includes('swim')||s.includes('плав'))return '🏊';if(s.includes('tennis')||s.includes('теннис'))return '🎾';if(s.includes('strength')||s.includes('сила'))return '💪';if(s.includes('bike')||s.includes('velo')||s.includes('вел'))return '🚴';if(s.includes('walk')||s.includes('ход'))return '🚶';return '🏃'}
