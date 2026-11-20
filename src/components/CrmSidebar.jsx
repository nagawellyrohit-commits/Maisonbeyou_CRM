import React from 'react';
import {
  Award, BarChart3, Building2, CalendarDays, Crown, LayoutDashboard,
  Receipt, Scissors, Settings, Target, Users, Gift
} from 'lucide-react';
import { canAccessModule } from '../utils/permissions';
import logoImg from '../assets/brand-logo.png';

export default function CrmSidebar({
  currentUser,
  activeLocation,
  activeTab,
  dashboardSection,
  setActiveTab,
  onNavigateDashboardSection
}) {
  const isAdmin = ['admin', 'master_admin'].includes(currentUser?.role);
  const can = moduleId => canAccessModule(currentUser, moduleId);
  const hasLocation = Boolean(activeLocation?.location_id);
  const items = [
    { id: 'visits', label: 'Dashboard', icon: LayoutDashboard, show: can('dashboard') || can('visits'), kind: 'section' },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, show: can('visits') || can('visitor_intake'), kind: 'tab' },
    { id: 'branch_details', label: 'Branch Details', icon: Building2, show: isAdmin && hasLocation, kind: 'section' },
    { id: 'store-targets', label: 'Store target', icon: Target, show: hasLocation && (isAdmin || can('dashboard') || can('visits')), kind: 'section' },
    { id: 'day-cash', label: 'Day closing', icon: Receipt, show: hasLocation && currentUser?.role === 'reception', kind: 'section' },
    { id: 'team-master', label: 'Master', icon: Settings, show: isAdmin && can('team'), kind: 'section' },
    { id: 'clients', label: 'Clients', icon: Users, show: can('clients'), kind: 'tab' },
    { id: 'services', label: 'Services', icon: Scissors, show: !isAdmin && can('services'), kind: 'tab' },
    { id: 'staff', label: 'Team', icon: Users, show: !isAdmin && can('team'), kind: 'tab' },
    { id: 'membership', label: 'Membership', icon: Crown, show: !isAdmin && can('membership'), kind: 'tab' },
    { id: 'gift-vouchers', label: 'Gift vouchers', icon: Gift, show: can('gift_vouchers'), kind: 'section' },
    { id: 'reports', label: 'Reports', icon: BarChart3, show: can('reports'), kind: 'section' }
  ].filter(item => item.show);

  const isActive = item => item.kind === 'tab'
    ? activeTab === item.id || (item.id === 'clients' && activeTab === 'client-profile')
    : activeTab === 'dashboard' && dashboardSection === item.id;

  const navigate = item => {
    if (item.id === 'branch_details') {
      onNavigateDashboardSection?.('branch_details');
      return;
    }
    if (item.kind === 'tab') {
      if (item.id === 'appointments' && !(can('visits') || can('visitor_intake'))) return;
      if (!can(item.id === 'staff' ? 'team' : item.id === 'membership' ? 'membership' : item.id)) return;
      setActiveTab(item.id);
      return;
    }
    onNavigateDashboardSection?.(item.id);
  };

  return (
    <aside className="crm-sidebar" aria-label="CRM navigation">
      <div className="crm-sidebar-brand">
        <img src={logoImg} alt="Maison BeYou" />
        <div className="crm-sidebar-location">
          <span className="crm-sidebar-location-dot" />
          <span title={activeLocation?.name || 'Studio workspace'}>
            {activeLocation?.name || 'Studio workspace'}
          </span>
        </div>
      </div>

      <div className="crm-sidebar-caption">Workspace</div>
      <nav className="crm-sidebar-nav">
        {items.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`crm-sidebar-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              onClick={() => navigate(item)}
            >
              <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="crm-sidebar-spacer" />
      <div className="crm-sidebar-user" title={`${currentUser?.name || 'Team member'} · ${currentUser?.role || ''}`}>
        <span className="crm-sidebar-avatar">{currentUser?.name?.charAt(0)?.toUpperCase() || 'M'}</span>
        <span className="crm-sidebar-user-copy">
          <strong>{currentUser?.name || 'Team member'}</strong>
          <small>{String(currentUser?.role || '').replaceAll('_', ' ')}</small>
        </span>
        <Award size={15} aria-hidden="true" />
      </div>
    </aside>
  );
}
