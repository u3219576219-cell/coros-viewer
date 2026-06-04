import { publicSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Workout({ params }) {
  const { id } = await params;

  const supabase = publicSupabase();

  const { data: rows, error } = await supabase
    .from('workouts')
    .select('*');

  if (error) {
    return (
      <main className="wrap">
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>DEBUG</h1>

      <h3>id из URL</h3>
      <pre>{JSON.stringify(id, null, 2)}</pre>

      <h3>Найденные записи</h3>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </main>
  );
}