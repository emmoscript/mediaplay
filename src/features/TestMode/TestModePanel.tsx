import { useEffect, useMemo, useRef, useState } from 'react';

type LogEvent = { type: string; t: number; meta?: Record<string, unknown> };

type TaskKey = 'photo_edit' | 'sound' | 'voice' | 'three';

type TaskConfig = {
  key: TaskKey;
  label: string;
  successEvents: string[];
};

const TASKS: TaskConfig[] = [
  { key: 'photo_edit', label: 'Editar foto (aplicar recorte)', successEvents: ['photo_preview_ready', 'photo_exported'] },
  { key: 'sound', label: 'Reproducir sonido', successEvents: ['sound_played'] },
  { key: 'voice', label: 'Comando correcto (programar publicación)', successEvents: ['post_scheduled', 'voice_match_true'] },
  { key: 'three', label: 'Cargar intro 3D', successEvents: ['three_visible'] },
];

type TestModePanelProps = {
  events: LogEvent[];
  now?: () => number;
};

type TaskState = {
  running: boolean;
  startT: number | null;
  endT: number | null;
};

export default function TestModePanel({ events, now }: TestModePanelProps) {
  const nowFn = now ?? (() => Date.now());
  const [taskState, setTaskState] = useState<Record<TaskKey, TaskState>>({
    photo_edit: { running: false, startT: null, endT: null },
    sound: { running: false, startT: null, endT: null },
    voice: { running: false, startT: null, endT: null },
    three: { running: false, startT: null, endT: null },
  });

  const lastEventRef = useRef<LogEvent | null>(null);
  useEffect(() => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    lastEventRef.current = last;
    // Auto-complete tasks on matching success events
    TASKS.forEach((task) => {
      const st = taskState[task.key];
      if (!st.running || st.startT == null || st.endT != null) return;
      if (task.successEvents.includes(last.type)) {
        setTaskState((prev) => ({
          ...prev,
          [task.key]: { running: false, startT: st.startT, endT: last.t },
        }));
      }
    });
  }, [events, taskState]);

  const startTask = (key: TaskKey) => {
    const t = nowFn();
    setTaskState((prev) => ({ ...prev, [key]: { running: true, startT: t, endT: null } }));
  };
  const resetTask = (key: TaskKey) => {
    setTaskState((prev) => ({ ...prev, [key]: { running: false, startT: null, endT: null } }));
  };

  const rows = useMemo(() => TASKS.map((task) => {
    const st = taskState[task.key];
    const elapsedMs = st.startT == null ? 0 : (st.endT ?? nowFn()) - st.startT;
    const elapsedStr = (elapsedMs / 1000).toFixed(2) + 's';
    const status = st.endT ? 'Completada' : (st.running ? 'En curso' : 'Pendiente');
    return { task, st, elapsedStr, status };
  }), [taskState, nowFn]);

  return (
    <section className="rounded-lg border bg-white p-4" aria-labelledby="testmode-title">
      <h2 id="testmode-title" className="font-medium mb-2">Modo Test</h2>
      <p className="text-sm text-gray-600 mb-3">Inicia cada tarea y deja que se marque automáticamente al detectar los eventos de éxito.</p>
      <div className="space-y-3">
        {rows.map(({ task, st, elapsedStr, status }) => (
          <div key={task.key} className="flex items-center justify-between gap-3 border rounded p-2">
            <div>
              <div className="font-medium text-sm">{task.label}</div>
              <div className="text-xs text-gray-600">Estado: {status} · Tiempo: {elapsedStr}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={() => startTask(task.key)}
                disabled={st.running}
              >
                Iniciar
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-200 text-sm"
                onClick={() => resetTask(task.key)}
              >
                Reiniciar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


