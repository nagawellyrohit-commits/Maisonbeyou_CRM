import React, { useEffect, useState } from 'react';
import { Check, Edit2, Plus, ShieldCheck, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { DASHBOARD_MODULES, MANAGER_PERMISSION_MODULES } from '../utils/permissions';

const emptyForm = {
  name: '',
  designation: '',
  phone: '',
  email: '',
  role: 'reception',
  teamRole: '',
  permissions: ['dashboard', 'visits', 'clients']
};

export default function BranchUserManagement({ activeLocation, branding }) {
  const [users, setUsers] = useState([]);
  const [teamOptions, setTeamOptions] = useState({ roles: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Master Admin can manage accounts across branches, so always scope this
      // branch page to the branch currently selected in the application.
      const branchQuery = activeLocation?.location_id
        ? `?location_id=${encodeURIComponent(activeLocation.location_id)}`
        : '';
      const result = await apiRequest(`/admin/branch-users${branchQuery}`);
      setUsers(result.users || []);
      setError('');
      window.dispatchEvent(new Event('branch_users_updated'));
    } catch (err) {
      setError(err.message || 'Could not load branch users.');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamOptions = async () => {
    try {
      const result = await apiRequest('/admin/team-options');
      setTeamOptions({ roles: result.roles || [], designations: result.designations || [] });
    } catch (err) {
      console.error('Could not load Master role and designation options:', err);
      setError(err.message || 'Could not load Role and Designation Master options.');
    }
  };

  useEffect(() => { loadUsers(); loadTeamOptions(); }, [activeLocation?.location_id]);

  const startCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      designation: user.designation || (user.role === 'reception' ? 'Manager' : 'Visitor'),
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      teamRole: user.team_role || '',
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    });
    setError('');
  };

  const togglePermission = (permission) => {
    setForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(item => item !== permission)
        : [...current.permissions, permission]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.phone.trim() || !form.email.trim()) {
      setError('Mobile number and email address are required.');
      return;
    }
    if (form.role === 'reception' && (!form.teamRole || !form.designation)) {
      setError('Choose a team role and designation from Master.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        designation: form.role === 'reception' ? form.designation.trim() : 'Visitor',
        team_role: form.role === 'reception' ? form.teamRole : '',
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        ...(activeLocation?.location_id ? { location_id: activeLocation.location_id } : {}),
        permissions: form.role === 'visitor' ? ['visitor_intake'] : form.permissions
      };
      if (editingUser) {
        await apiRequest(`/admin/branch-users/${editingUser.user_id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/admin/branch-users', { method: 'POST', body: JSON.stringify(payload) });
      }
      await loadUsers();
      setEditingUser(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || 'Could not save this account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await apiRequest(`/admin/branch-users/${user.user_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: user.active ? 0 : 1 })
      });
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Could not update account status.');
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(`Delete ${user.name}? They will no longer be able to sign in. Past visits and records will be preserved.`);
    if (!confirmed) return;
    try {
      await apiRequest(`/admin/branch-users/${user.user_id}`, { method: 'DELETE' });
      if (editingUser?.user_id === user.user_id) {
        setEditingUser(null);
        setForm(emptyForm);
      }
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Could not delete this account.');
    }
  };

  const buttonStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    border: '1px solid var(--tenant-primary, #D8BD91)', borderRadius: 'var(--tenant-radius, 9px)', padding: '9px 13px',
    background: 'var(--tenant-card-bg, #FFF)', color: 'var(--tenant-primary, #8C6228)', cursor: 'pointer', fontWeight: 700, fontSize: 12
  };

  const renderUserCard = (user) => (
    <article className="card" key={user.user_id} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, opacity: user.active ? 1 : .68, background: '#FFFFFF', border: '1px solid #D99A64', borderRadius: 22, boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={{ display: 'block', color: '#29231E', fontSize: 15 }}>{user.name}</strong>
          <span style={{ color: '#9F7335', fontSize: 12 }}>{user.team_role ? `${user.team_role}${user.designation ? ` · ${user.designation}` : ''}` : (user.designation || (user.role === 'reception' ? 'Manager' : 'Visitor'))} · {user.role === 'reception' ? 'Manager access' : 'Visitor access'}</span>
        </div>
        <span style={{ alignSelf: 'flex-start', borderRadius: 999, padding: '4px 9px', fontSize: 10, fontWeight: 800, color: user.active ? '#3F6B4A' : '#78716C', background: user.active ? '#EDF7EE' : '#F1EFEB' }}>{user.active ? 'ACTIVE' : 'INACTIVE'}</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#57534E', lineHeight: 1.7 }}>{user.phone}<br />{user.email}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(user.permissions || []).map(permission => (
          <span key={permission} style={{ background: '#FAF6EE', color: '#8C6228', border: '1px solid #E9D9BD', borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 700 }}>
            {DASHBOARD_MODULES.find(module => module.id === permission)?.label || permission}
          </span>
        ))}
        {!(user.permissions || []).length && <span style={{ color: '#A8A29E', fontSize: 11 }}>No modules assigned</span>}
      </div>
      <div className="branch-user-management-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #EEE7DD', paddingTop: 12 }}>
        <button type="button" className="tenant-accent-button" style={buttonStyle} onClick={() => startEdit(user)}><Edit2 size={14} /> Edit access</button>
        <button type="button" className="tenant-accent-button" style={buttonStyle} onClick={() => toggleStatus(user)}>{user.active ? <UserX size={14} /> : <UserCheck size={14} />}{user.active ? 'Deactivate' : 'Activate'}</button>
        <button type="button" style={{ ...buttonStyle, color: '#B42318', borderColor: '#F0B7B3' }} onClick={() => deleteUser(user)}><Trash2 size={14} /> Delete</button>
      </div>
    </article>
  );

  const branchName = activeLocation?.name || 'this branch';
  const pageSubtitle = (branding?.user_access_subtitle || 'Create Manager and Visitor accounts for {branch}.').replaceAll('{branch}', branchName);
  const accountGroups = [
    { role: 'reception', label: branding?.user_access_managers_label || 'Managers', emptyLabel: branding?.user_access_manager_empty || 'No Manager accounts yet.' },
    { role: 'visitor', label: branding?.user_access_visitors_label || 'Visitors', emptyLabel: branding?.user_access_visitor_empty || 'No Visitor accounts yet.' }
  ];

  return (
    <section className="animate-fade-in branch-user-management" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 0 18px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <h2 style={{ margin: 0, color: '#29231E' }}>{branding?.user_access_heading || 'Manage Users'}</h2>
          <div className="branch-user-management-description" style={{ fontSize: 13, color: '#78716C' }}>{pageSubtitle}</div>
        </div>
        <button type="button" className="tenant-accent-button" style={buttonStyle} onClick={startCreate}><Plus size={15} /> {branding?.user_access_add_button || 'Add User'}</button>
      </header>

      {error && <div role="alert" style={{ padding: '11px 14px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13 }}>{error}</div>}

      {loading ? <div style={{ color: '#78716C', padding: 18 }}>Loading branch users…</div> : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
          alignItems: 'start',
          gap: 18
        }}>
          {accountGroups.map(group => {
            const groupUsers = users.filter(user => user.role === group.role);
            return (
              <section key={group.role} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <h3 style={{ margin: 0, color: '#29231E', fontSize: 16 }}>{group.label}</h3>
                  <span style={{ background: '#F2EBDD', color: '#8C6228', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>{groupUsers.length}</span>
                </div>
                {groupUsers.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
                    {groupUsers.map(renderUserCard)}
                  </div>
                ) : (
                  <div className="card" style={{ padding: '13px 16px', color: '#78716C', fontSize: 13 }}>{group.emptyLabel}</div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: '#29231E' }}>{editingUser ? 'Edit User Access' : 'Create User'}</h3>
            {editingUser && <button type="button" aria-label="Cancel edit" onClick={startCreate} style={{ ...buttonStyle, padding: 7 }}><X size={15} /></button>}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 10 }}>
              <label style={labelStyle}>Full name *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Account access<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, permissions: e.target.value === 'reception' ? ['dashboard', 'visits', 'clients'] : ['visitor_intake'] })} style={{ ...inputStyle, cursor: 'pointer' }}><option value="reception">Manager</option><option value="visitor">Visitor</option></select></label>
              {form.role === 'reception' && <>
                <label style={labelStyle}>Team role *<select required value={form.teamRole} onChange={e => setForm(current => ({ ...current, teamRole: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}><option value="">Select a role</option>{form.teamRole && !teamOptions.roles.some(item => item.option_name === form.teamRole) && <option value={form.teamRole}>{form.teamRole} (saved)</option>}{teamOptions.roles.map(item => <option key={item.option_id} value={item.option_name}>{item.option_name}</option>)}</select><span style={{ fontSize: 10, color: '#A8A29E', fontWeight: 400 }}>Scroll to browse roles from Master.</span></label>
                <label style={labelStyle}>Designation *<select required value={form.designation} onChange={e => setForm(current => ({ ...current, designation: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}><option value="">Select a designation</option>{form.designation && !teamOptions.designations.some(item => item.option_name === form.designation) && <option value={form.designation}>{form.designation} (saved)</option>}{teamOptions.designations.map(item => <option key={item.option_id} value={item.option_name}>{item.option_name}</option>)}</select><span style={{ fontSize: 10, color: '#A8A29E', fontWeight: 400 }}>Scroll to browse designations from Master.</span></label>
              </>}
              <label style={labelStyle}>Mobile number *<input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Email address *<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} /></label>
            </div>

            {form.role === 'reception' && (
              <div style={{ border: '1px solid #E9D9BD', borderRadius: 9, padding: '10px 12px', color: '#785624', background: '#FAF6EE', fontSize: 12.5 }}>
                Managers must already be registered under Team at this branch. Use the same mobile number as their Team profile.
              </div>
            )}

            <div style={{ borderTop: '1px solid #EEE7DD', paddingTop: 15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8C6228', fontWeight: 800, fontSize: 13, marginBottom: 10 }}><ShieldCheck size={16} /> {form.role === 'visitor' ? 'Visitor access' : 'Dashboard modules'}</div>
              {form.role === 'visitor' ? (
                <div style={{ border: '1px solid #E8DFD3', borderRadius: 9, padding: '12px 14px', color: '#57534E', fontSize: 12.5, background: '#FCFAF6' }}>
                  Visitor registration and check-in only. Visitors can update information in this flow; all other modules stay unavailable.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 8 }}>
                  {MANAGER_PERMISSION_MODULES.map(module => (
                    <label key={module.id} style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #E8DFD3', borderRadius: 9, padding: '10px 12px', color: '#44403C', fontSize: 12.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.permissions.includes(module.id)} onChange={() => togglePermission(module.id)} />
                      {module.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
              <button type="button" style={buttonStyle} onClick={startCreate}>Clear</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px' }}><Check size={15} />{saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </form>
        </div>
      </>
    </section>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#57534E' };
const inputStyle = { border: '1px solid #DED5C9', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#29231E', background: '#fff', outlineColor: '#B88B4A' };
