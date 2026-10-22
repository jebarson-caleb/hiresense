import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader } from '../../components/ui';
import { formatDate, initials } from '../../utils/format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = () =>
    api
      .get('/admin/users', { params: { ...(q && { q }), ...(role && { role }) } })
      .then(({ data }) => setUsers(data.users))
      .catch((e) => toast(errMsg(e), 'error'));

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (id, body, msg) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}`, body);
      setUsers((list) => list.map((u) => (u._id === id ? data.user : u)));
      toast(msg, 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((list) => list.filter((u) => u._id !== id));
      toast('User deleted', 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Activate, deactivate, change roles or remove accounts.</p>
        </div>
      </div>
      <div className="filters">
        <input className="input" placeholder="Search name, email or company" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <select className="input" style={{ flex: '0 1 200px' }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="seeker">Seekers</option>
          <option value="recruiter">Recruiters</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div className="card">
        {!users ? (
          <Loader />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u._id === me._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                          <span className="avatar">{initials(u.name)}</span>
                          <div>
                            <strong>{u.name}</strong> {self && <span className="badge">you</span>}
                            <div className="small muted">{u.email}{u.company && ` · ${u.company}`}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select className="input" style={{ width: 'auto', padding: '5px 8px' }} value={u.role} disabled={self}
                          aria-label={`Role for ${u.name}`}
                          onChange={(e) => patch(u._id, { role: e.target.value }, `Role changed to ${e.target.value}`)}>
                          <option value="seeker">seeker</option>
                          <option value="recruiter">recruiter</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="small">{formatDate(u.createdAt)}</td>
                      <td>
                        <span className={`badge badge-dot ${u.isActive ? 'badge-good' : 'badge-bad'}`}>{u.isActive ? 'active' : 'deactivated'}</span>
                      </td>
                      <td>
                        {!self && (
                          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <button className="btn btn-sm btn-outline"
                              onClick={() => patch(u._id, { isActive: !u.isActive }, u.isActive ? 'User deactivated' : 'User activated')}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            {confirmId === u._id ? (
                              <>
                                <button className="btn btn-sm btn-danger" onClick={() => remove(u._id)}>Confirm delete</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
                              </>
                            ) : (
                              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(u._id)}>Delete</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!users.length && <p className="muted center">No users found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
