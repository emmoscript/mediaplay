import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ThreeCanvas from './features/ThreeD/ThreeCanvas';
import PhotoEditor from './features/PhotoEdit/PhotoEditor';
import TestModePanel from './features/TestMode/TestModePanel';
import './index.css';

type LogEvent = { type: string; t: number; meta?: Record<string, unknown> };
type ScheduledPost = { id: string; createdAt: number; title: string };

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
  const [voiceText, setVoiceText] = useState<string>('');
  const [loading3D, setLoading3D] = useState<boolean>(false);
  const [show3D, setShow3D] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'designer' | 'assets' | 'scheduler' | 'analytics'>('designer');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const handleFeedback = (msg: string, type: string, meta?: Record<string, unknown>) => {
    setFeedback(msg);
    log(type, meta);
  };

  const playSound = async () => {
    log('click_play_sound');
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      o.stop(ctx.currentTime + 0.2);
      handleFeedback('Sonido reproducido', 'sound_played');
    } catch (e) {
      handleFeedback('Error al reproducir sonido', 'sound_error', { error: String(e) });
    }
  };

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const isScheduleIntent = (s: string) => {
    const n = normalize(s);
    const patterns = [
      /\bprogram(ar|a)\b.*\b(publicacion|publicacion|post)\b/,
      /\bprogramar publicacion\b/,
      /\bprogramar post\b/,
      /\bschedule (a )?post\b/,
      /\bcrear (una )?programacion\b/,
    ];
    return patterns.some((re) => re.test(n));
  };
  const onVoiceSubmit = () => {
    log('voice_submit', { value: voiceText });
    const ok = isScheduleIntent(voiceText);
    if (ok) {
      const id = String(Date.now());
      const post: ScheduledPost = { id, createdAt: Date.now(), title: 'Publicación programada' };
      setScheduledPosts((prev) => [post, ...prev]);
      log('post_scheduled', { id: post.id, title: post.title });
      handleFeedback('Publicación programada', 'post_scheduled', { id: post.id });
    } else {
      handleFeedback('Comando no reconocido', 'voice_match_false');
    }
  };

  const onView3D = async () => {
    setShow3D(false);
    setLoading3D(true);
    handleFeedback('Cargando animación…', 'loader_shown');
    setTimeout(() => {
      setLoading3D(false);
      setShow3D(true);
      handleFeedback('Animación cargada', 'three_visible');
    }, 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="w-full border-b bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-white/20" aria-hidden="true" />
            <h1 className="text-xl font-semibold">PromoStudio</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
              Modo Test
            </label>
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
      </header>

      <div className="flex-1 mx-auto max-w-6xl w-full px-4 py-6 flex gap-6 bg-gradient-to-b from-white to-indigo-50/40">
        <aside className="hidden md:block w-60 shrink-0">
          <nav className="sticky top-20 space-y-1" aria-label="Secciones">
            <button
              className={`w-full text-left px-3 py-2 rounded ${activeSection==='designer'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}
              onClick={() => setActiveSection('designer')}
            >
              Diseñador
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded ${activeSection==='assets'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}
              onClick={() => setActiveSection('assets')}
            >
              Activos
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded ${activeSection==='scheduler'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}
              onClick={() => setActiveSection('scheduler')}
            >
              Programación
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded ${activeSection==='analytics'?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}
              onClick={() => setActiveSection('analytics')}
            >
              Analítica
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          <p className="text-sm text-gray-700 mb-4">Diseña publicaciones promocionales rápidas: sube una imagen, recórtala, aplica un estilo y exporta. Usa comandos de voz simulados ("programar publicación"), escucha un sonido de confirmación y visualiza una intro 3D.</p>
          {activeSection === 'designer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhotoEditor onFeedback={handleFeedback} log={log} />

              <section className="rounded-lg border bg-white p-4" aria-labelledby="sound-title">
                <h2 id="sound-title" className="font-medium mb-2">Confirmación sonora</h2>
                <p className="text-sm text-gray-600 mb-2">Reproduce un sonido de confirmación para validar acciones.</p>
                <button
                  className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                  onClick={playSound}
                >
                  Reproducir sonido
                </button>
              </section>

              <section className="rounded-lg border bg-white p-4" aria-labelledby="voice-title">
                <h2 id="voice-title" className="font-medium mb-2">Comandos (simulados)</h2>
                <p className="text-sm text-gray-600 mb-2">Escribe "programar publicación" para simular una acción frecuente de social media.</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Escribe aquí tu comando…"
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    aria-label="Entrada de comando"
                  />
                  <button
                    className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={onVoiceSubmit}
                  >
                    Enviar
                  </button>
                </div>
              </section>

              <section className="rounded-lg border bg-white p-4" aria-labelledby="three-title">
                <h2 id="three-title" className="font-medium mb-2">Intro 3D</h2>
                <p className="text-sm text-gray-600 mb-2">Simula un recurso 3D de marca mientras se preparan los assets.</p>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    className="px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    onClick={onView3D}
                  >
                    Ver animación 3D
                  </button>
                  {loading3D && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, repeat: Infinity, repeatType: 'reverse' }}
                      className="text-sm text-gray-600"
                    >
                      Cargando…
                    </motion.span>
                  )}
                </div>
                <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
                  {show3D ? (
                    <div className="w-full h-full">
                      <ThreeCanvas onReady={() => log('three_ready')} />
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Canvas 3D aparecerá aquí</span>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'assets' && (
            <section className="rounded-lg border bg-white p-6 text-sm text-gray-700">
              <h2 className="font-medium mb-2">Activos</h2>
              <p>Gestiona imágenes y materiales de marca (pendiente en este prototipo). Úsalo para discutir arquitectura y navegación.</p>
            </section>
          )}

          {activeSection === 'scheduler' && (
            <section className="rounded-lg border bg-white p-6 text-sm text-gray-700">
              <h2 className="font-medium mb-2">Programación</h2>
              <p className="mb-3">Escribe el comando en Diseñador y vuelve aquí para ver publicaciones programadas.</p>
              {scheduledPosts.length === 0 ? (
                <div className="text-gray-500">No hay publicaciones programadas todavía.</div>
              ) : (
                <ul className="space-y-2">
                  {scheduledPosts.map((p) => (
                    <li key={p.id} className="border rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-gray-600">ID: {p.id} · {new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Programada</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeSection === 'analytics' && (
            <section className="rounded-lg border bg-white p-6 text-sm text-gray-700">
              <h2 className="font-medium mb-2">Analítica</h2>
              <p>Descarga y analiza el JSON de métricas para obtener tiempos y eventos. Integra tu dashboard externo.</p>
            </section>
          )}

          {testMode && (
            <div className="mt-6">
              <TestModePanel events={events} />
            </div>
          )}
        </main>
      </div>

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
