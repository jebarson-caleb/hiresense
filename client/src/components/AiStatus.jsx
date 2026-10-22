import { useEffect, useState } from 'react';
import api from '../api/client';

/** Polls /api/ai/health and shows whether the local LLM is available. */
export default function AiStatus({ compact = false }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get('/ai/health')
        .then(({ data }) => alive && setHealth(data))
        .catch(() => alive && setHealth({ online: false, modelAvailable: false, message: 'API unreachable' }));
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!health) return null;
  const ready = health.online && health.modelAvailable;
  const cls = ready ? 'badge-good' : health.online ? 'badge-warn' : 'badge';
  const label = ready ? `AI online${compact ? '' : ` · ${health.model}`}` : health.online ? 'Model missing' : 'AI fallback';

  return (
    <span className={`badge badge-dot ${cls}`} title={health.message}>
      {label}
    </span>
  );
}
