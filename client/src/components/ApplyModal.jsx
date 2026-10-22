import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ApplyModal({ job, onClose, onApplied }) {
  const toast = useToast();
  const [coverNote, setCoverNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/applications', { jobId: job._id, coverNote });
      toast(`Applied to ${job.title} - match score ${data.application.matchScore}%`, 'success');
      onApplied?.(data.application);
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="apply-title">
        <h2 id="apply-title">Apply to {job.title}</h2>
        <p className="muted small">
          {job.company} · Your primary resume will be attached and scored against this job by the AI.
        </p>
        <div className="field">
          <label htmlFor="cover">Cover note (optional)</label>
          <textarea id="cover" maxLength={2000} value={coverNote} onChange={(e) => setCoverNote(e.target.value)}
            placeholder="Why are you a good fit for this role?" />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" disabled={busy}>
            {busy ? <><span className="spinner spinner-sm" /> Scoring & applying...</> : 'Submit application'}
          </button>
        </div>
      </form>
    </div>
  );
}
