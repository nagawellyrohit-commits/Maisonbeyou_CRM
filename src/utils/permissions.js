export const DASHBOARD_MODULES = [
  { id: 'dashboard', label: 'Dashboard overview' },
  { id: 'visits', label: 'Visits & billing' },
  { id: 'visitor_intake', label: 'Visitor registration & check-in' },
  { id: 'clients', label: 'Client records' },
  { id: 'services', label: 'Services' },
  { id: 'team', label: 'Team' },
  { id: 'membership', label: 'Membership' },
  { id: 'reports', label: 'Reports & analytics' }
];

export const MANAGER_PERMISSION_MODULES = DASHBOARD_MODULES.filter(module => module.id !== 'visitor_intake');

export function canAccessModule(user, moduleId) {
  if (!user) return false;
  if (user.role === 'master_admin') return true;
  if (user.role === 'visitor') return moduleId === 'visitor_intake';
  if (user.role === 'reception' && moduleId === 'visitor_intake') return true;
  if (user.role === 'admin' && !user.permission_profile_exists) return true;
  if (user.permission_profile_exists) {
    return Array.isArray(user.permissions) && user.permissions.includes(moduleId);
  }

  const legacyDefaults = {
    admin: DASHBOARD_MODULES.map(module => module.id),
    reception: ['dashboard', 'visits', 'clients'],
    visitor: ['visitor_intake'],
    staff: ['dashboard', 'visitor_intake']
  };
  return (legacyDefaults[user.role] || []).includes(moduleId);
}
