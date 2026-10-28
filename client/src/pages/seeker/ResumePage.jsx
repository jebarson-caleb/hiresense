import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { AnalyzedByBadge, Empty, Loader, ScoreRing } from '../../components/ui';
import { DocIcon } from '../../components/Art';
import { formatDate } from '../../utils/format';

const ACCEPT = '.pdf,.docx,.txt';
const STAGES = ['Uploading file...', 'Extracting text...', 'AI is reading your resume...', 'Scoring and generating feedback...'];

export default function ResumePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [resumes, setResumes] = useState(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/resumes').then(({ data }) => setResumes(data.resumes)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (file) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) return toast('Please choose a PDF, DOCX or TXT file', 'error');
    if (file.size > 4 * 1024 * 1024) return toast('File is larger than 4 MB', 'error');

    const body = new FormData();
    body.append('resume', file);
    setUploading(true);
    setStage(0);
    setProgress(0);
    // Analysis can take a while on a local LLM, so walk through the stages while waiting.
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2500);
    try {
      const { data } = await api.post('/resumes', body, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          if (e.loaded === e.total) setStage((s) => Math.max(s, 1));
        },
      });
      if (data.aiError) toast(`AI unavailable, used rule-based analysis (${data.aiError})`, 'info');
      else toast('Resume analysed successfully', 'success');
      navigate(`/seeker/resume/${data.resume._id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      clearInterval(timer);
      setUploading(false);
    }
  };

  const act = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      if (okMsg) toast(okMsg, 'success');
      await load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>My Resume</h1>
          <p>Upload a resume to get an AI analysis. Your newest upload is used for job matching.</p>
        </div>
      </div>

      <div
        className={`dropzone mb ${drag ? 'drag' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!uploading) upload(e.dataTransfer.files[0]);
        }}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => upload(e.target.files[0])} />
        {uploading ? (
          <div className="stack" style={{ alignItems: 'center' }}>
            <span className="spinner" />
            <strong className="pulse">{STAGES[stage]}</strong>
            {stage === 0 && <span className="small muted">{progress}%</span>}
            <span className="small muted">A local LLM can take 10-60 seconds depending on your hardware.</span>
          </div>
        ) : (
          <>
            <DocIcon />
            <h3>Drag & drop your resume here</h3>
            <p className="muted">or click to browse · PDF, DOCX or TXT · max 4 MB</p>
          </>
        )}
      </div>

      <h2>Uploaded resumes</h2>
      {!resumes ? (
        <Loader />
      ) : !resumes.length ? (
        <div className="card">
          <Empty title="No resumes yet">
            <p>Upload your first resume above. Sample resumes are available in the project's <code>samples/</code> folder.</p>
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {resumes.map((r) => (
            <div key={r._id} className="card row" style={{ gap: 16 }}>
              <ScoreRing score={r.analysis.atsScore} size={64} stroke={6} />
              <div className="grow" style={{ minWidth: 200 }}>
                <div className="row" style={{ gap: 8 }}>
                  <strong style={{ wordBreak: 'break-word' }}>{r.fileName}</strong>
                  {r.isPrimary && <span className="badge badge-good">Primary</span>}
                  <AnalyzedByBadge by={r.analyzedBy} model={r.model} />
                </div>
                <div className="small muted">
                  Uploaded {formatDate(r.createdAt)} · {r.analysis.skills.length} skills · {r.analysis.experienceYears} yrs
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Link to={`/seeker/resume/${r._id}`} className="btn btn-sm">View report</Link>
                {!r.isPrimary && (
                  <button className="btn btn-sm btn-outline" disabled={busyId === r._id}
                    onClick={() => act(r._id, () => api.patch(`/resumes/${r._id}/primary`), 'Primary resume updated')}>
                    Make primary
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" disabled={busyId === r._id}
                  onClick={() => act(r._id, () => api.delete(`/resumes/${r._id}`), 'Resume deleted')}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
