import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import JobDetail from './pages/JobDetail';
import SeekerDashboard from './pages/seeker/Dashboard';
import ResumePage from './pages/seeker/ResumePage';
import AnalysisReport from './pages/seeker/AnalysisReport';
import JobMatches from './pages/seeker/JobMatches';
import MyApplications from './pages/seeker/MyApplications';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import JobFormPage from './pages/recruiter/JobFormPage';
import Applicants from './pages/recruiter/Applicants';
import CandidateView from './pages/recruiter/CandidateView';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import { useAuth, HOME_BY_ROLE } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <div className="frame" aria-hidden="true">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={user ? <Navigate to={HOME_BY_ROLE[user.role]} replace /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/applications/:id" element={<CandidateView />} />
          </Route>

          <Route element={<ProtectedRoute roles={['seeker']} />}>
            <Route path="/seeker" element={<SeekerDashboard />} />
            <Route path="/seeker/resume" element={<ResumePage />} />
            <Route path="/seeker/resume/:id" element={<AnalysisReport />} />
            <Route path="/seeker/jobs" element={<JobMatches />} />
            <Route path="/seeker/applications" element={<MyApplications />} />
          </Route>

          <Route element={<ProtectedRoute roles={['recruiter', 'admin']} />}>
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/recruiter/jobs/new" element={<JobFormPage />} />
            <Route path="/recruiter/jobs/:id/edit" element={<JobFormPage />} />
            <Route path="/recruiter/jobs/:id/applicants" element={<Applicants />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
