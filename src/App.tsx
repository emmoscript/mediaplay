import { useMemo, useState } from 'react';
import PhotoEditor from './features/PhotoEdit/PhotoEditor';
import './index.css';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type LogEvent = { type: string; t: number; meta?: Record<string, unknown> };
type ScheduledPost = { id: string; createdAt: number; title: string; description: string; scheduledAt: number };

function useEventLog() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const t0 = useMemo(() => Date.now(), []);
  const log = (type: string, meta?: Record<string, unknown>) => {
    const e: LogEvent = { type, t: Date.now(), meta };
    setEvents((prev) => [...prev, e]);
  };
  const relative = (t: number) => ((t - t0) / 1000).toFixed(2) + 's';
  const download = () => {
    const blob = new Blob([JSON.stringify({ t0, events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    a.download = `promostudio_log_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return { events, log, relative, download };
}

function App() {
  const { events, log, relative, download } = useEventLog();
  const [feedback, setFeedback] = useState<string>('Bienvenido a PromoStudio');
  const [activeSection, setActiveSection] = useState<'designer' | 'scheduler'>('designer');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [manualTitle, setManualTitle] = useState<string>('Publicación programada');
  const [description, setDescription] = useState<string>('');
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const handleFeedback = (msg: string, type: string, meta?: Record<string, unknown>) => {
    setFeedback(msg);
    log(type, meta);
  };

  const saveScheduledPost = () => {
    const id = String(Date.now());
    const title = manualTitle.trim() || 'Publicación programada';
    const desc = description.trim();
    const scheduledAtMs = new Date(scheduledAtLocal).getTime();
    const post: ScheduledPost = { id, createdAt: Date.now(), title, description: desc, scheduledAt: scheduledAtMs };
    setScheduledPosts((prev) => [post, ...prev]);
    log('post_scheduled', { id: post.id, title: post.title, scheduledAt: scheduledAtMs });
    handleFeedback('Publicación guardada y programada', 'post_scheduled', { id: post.id, scheduledAt: scheduledAtMs });
  };

  // Scheduling handled via saveScheduledPost within Designer

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-white to-indigo-50/40">
      <header className="w-full border-b bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-white/20 ring-1 ring-white/30" aria-hidden="true" />
            <h1 className="text-xl font-semibold tracking-tight">PromoStudio</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">Eventos: {events.length}</span>
            <button
              className="px-3 py-2 rounded-md bg-white/15 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={download}
              aria-label="Descargar métricas"
            >
              Descargar métricas
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <div role="tablist" aria-label="Secciones de la aplicación" className="grid grid-cols-2 gap-2">
            {([
              { id: 'designer', label: 'Diseñador' },
              { id: 'scheduler', label: 'Programación' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeSection === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === tab.id ? 'bg-white text-indigo-700 shadow' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
          <p className="text-sm text-gray-700 mb-4">Diseña publicaciones promocionales rápidas: sube una imagen, recórtala, aplica un estilo y exporta. Usa comandos de voz simulados ("programar publicación"), escucha un sonido de confirmación y visualiza una intro 3D.</p>
          {activeSection === 'designer' && (
            <div id="panel-designer" role="tabpanel" aria-labelledby="tab-designer" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhotoEditor onFeedback={handleFeedback} log={log} />

              <section className="rounded-lg border bg-white p-4" aria-labelledby="schedule-title">
                <h2 id="schedule-title" className="font-medium mb-2">Guardar y programar</h2>
                <div className="flex flex-col gap-3">
                  <label className="text-sm text-gray-700">Título</label>
                  <input
                    className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Título de la publicación"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    aria-label="Título de publicación"
                  />
                  <label className="text-sm text-gray-700">Descripción</label>
                  <textarea
                    className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
                    placeholder="Añade una descripción"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    aria-label="Descripción"
                  />
                  <label className="text-sm text-gray-700">Fecha y hora de publicación</label>
                  <input
                    type="datetime-local"
                    className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={scheduledAtLocal}
                    onChange={(e) => setScheduledAtLocal(e.target.value)}
                    aria-label="Fecha y hora de programación"
                  />
                  <button
                    className="mt-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onClick={saveScheduledPost}
                  >
                    Guardar publicación programada
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'scheduler' && (
            <section id="panel-scheduler" role="tabpanel" aria-labelledby="tab-scheduler" className="rounded-lg border bg-white p-6 text-sm text-gray-700">
              <h2 className="font-medium mb-2">Programación</h2>
              <p className="mb-3">Publicaciones programadas.</p>
              {scheduledPosts.length === 0 ? (
                <div className="text-gray-500">No hay publicaciones programadas todavía.</div>
              ) : (
                <ul className="space-y-2">
                  {scheduledPosts.map((p) => (
                    <li key={p.id} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-gray-600">ID: {p.id} · Creado: {new Date(p.createdAt).toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Programado: {new Date(p.scheduledAt).toLocaleString()}</div>
                        {p.description && (
                          <div className="text-xs text-gray-700 mt-1 line-clamp-2">{p.description}</div>
                        )}
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Programada</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          
        </main>

      <footer className="mt-auto border-t bg-white" aria-live="polite" aria-atomic="true">
        <div className="mx-auto max-w-5xl px-4 py-3 text-sm flex items-center justify-between">
          <div>
            <span className="font-medium">Feedback:</span> {feedback}
          </div>
          <div className="text-gray-600">
            {events.slice(-3).map((e, i) => (
              <span key={i} className="ml-3">{e.type} · {relative(e.t)}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
