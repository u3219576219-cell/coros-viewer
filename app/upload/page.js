'use client';
import { useState } from 'react';

export default function Upload(){
  const [msg,setMsg]=useState('');
  async function submit(e){
    e.preventDefault(); setMsg('Загрузка...');
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/upload',{method:'POST',body:fd});
    const json = await res.json().catch(()=>({error:'Неизвестная ошибка'}));
    if(!res.ok){setMsg('Ошибка: '+(json.error||res.status));return}
    setMsg('Готово. Тренировка добавлена. Откройте главную страницу.');
    e.currentTarget.reset();
  }
  return <main className="wrap"><section className="hero"><h1>Загрузка тренировок</h1><div className="muted">Только для вас. Зрителям отправляйте главную ссылку сайта.</div></section>
    <form className="uploadBox" onSubmit={submit}>
      <label>Пароль загрузки</label><input name="password" type="password" required />
      <label>Название тренировки, можно оставить пустым</label><input name="title" type="text" placeholder="Например: Бег, Сила, Плавание" />
      <label>FIT или TCX файл из COROS</label><input name="file" type="file" accept=".fit,.tcx,.xml" required />
      <button>Загрузить</button>
      {msg && <div className="notice">{msg}</div>}
    </form>
  </main>
}
