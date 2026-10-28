import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewVisitWizard from './components/NewVisitWizard';
import ClientProfile from './components/ClientProfile';
import ClientsList from './components/ClientsList';
import ServiceManagement from './components/ServiceManagement';
import StaffManagement from './components/StaffManagement';
import MembershipManagement from './components/MembershipManagement';
import ReportsView from './components/ReportsView';
import ReceiptModal from './components/ReceiptModal';
import ErrorBoundary from './components/ErrorBoundary';
import StudioManagement from './components/StudioManagement';
import LocationSelection from './components/LocationSelection';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  getStoredLocation,
  setStoredLocation,
  apiRequest
} from './utils/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [selectedLocation, setSelectedLocation] = useState(getStoredLocation());
  const [masterAdminView, setMasterAdminView] = useState('types'); // 'types' | 'locations'
  const [selectedLocationType, setSelectedLocationType] = useState('branch'); // 'branch' | 'franchise'

  const [activeTab, setActiveTab] = useState(() => {
    const user = getStoredUser();
    return user?.role === 'visitor' ? 'new-visit' : 'dashboard';
  });
  const [wizardResetKey, setWizardResetKey] = useState(0);
  
  // Navigation contextual state
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientProfileSource, setClientProfileSource] = useState('dashboard');
  const [preSelectedVisitClient, setPreSelectedVisitClient] = useState(null);
  const [initialVisitType, setInitialVisitType] = useState(() => new URLSearchParams(window.location.search).get('type') || null);
  const [receiptVisitId, setReceiptVisitId] = useState(null);
  const [activeVisitClient, setActiveVisitClient] = useState(() => {
    const type = new URLSearchParams(window.location.search).get('type');
    if (type === 'welcome') {
      return { name: 'Rohit', surname: 'nagawelly', reg_no: 'MB-00-0055' };
    }
    return null;
  });
  const [cartInfo, setCartInfo] = useState({ count: 0, openCart: null, visible: false });

  const handleLogout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setStoredLocation(null);
    setCurrentUser(null);
    setSelectedLocation(null);
    setMasterAdminView('locations'); // Back to studio list
  };

  const handleSelectLocation = (location) => {
    setSelectedClientId(null);
    setActiveVisitClient(null);
    setPreSelectedVisitClient(null);
    setReceiptVisitId(null);
    setSelectedLocation(location);
    setStoredLocation(location);
    setActiveTab('dashboard');
    window.dispatchEvent(new Event('auth_change'));
  };

  const handleSwitchLocation = async () => {
    if (currentUser?.role !== 'master_admin' && currentUser?.original_role === 'master_admin') {
      try {
        const data = await apiRequest('/auth/switch-role', {
          method: 'POST',
          body: JSON.stringify({ role: 'master_admin' })
        });
        if (data?.token && data?.user) {
          setStoredToken(data.token);
          setStoredUser(data.user);
          setCurrentUser(data.user);
        }
      } catch (e) {
        console.error('Error restoring master_admin role on studio switch:', e);
      }
    }
    setSelectedClientId(null);
    setActiveVisitClient(null);
    setPreSelectedVisitClient(null);
    setReceiptVisitId(null);
    setSelectedLocation(null);
    setStoredLocation(null);
    setMasterAdminView('locations'); // Back to studio list
    window.dispatchEvent(new Event('auth_change'));
  };

  // Check auth validity on load
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      apiRequest('/auth/me')
        .then(res => {
          setCurrentUser(res.user);
          setStoredUser(res.user);
          if (res.user?.role === 'master_admin') {
            const loc = getStoredLocation();
            if (!loc) {
              setMasterAdminView('types');
            } else {
              setActiveTab('dashboard');
            }
          } else {
            if (res.location) {
              setSelectedLocation(res.location);
              setStoredLocation(res.location);
            }
            if (res.user?.role === 'visitor') {
              setActiveTab('new-visit');
            } else {
              setActiveTab('dashboard');
              setActiveVisitClient(null);
            }
          }
        })
        .catch(() => {
          setCurrentUser(null);
        });
    } else {
      setCurrentUser(null);
    }

    const handleAuthChange = () => {
      const u = getStoredUser();
      const loc = getStoredLocation();
      setCurrentUser(u);
      setSelectedLocation(loc);
      if (u?.role === 'master_admin') {
        if (!loc) {
          setMasterAdminView('locations');
        } else {
          setActiveTab('dashboard');
        }
      } else if (u?.role === 'visitor') {
        setActiveTab('new-visit');
      } else {
        setActiveTab('dashboard');
        setActiveVisitClient(null);
      }
    };
    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';

  // Guard: Role-based tab permissions
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'visitor') {
        if (activeTab !== 'new-visit') {
          setActiveTab('new-visit');
        }
      } else {
        // Reception and Admin must never see visitor wizard ('new-visit')
        if (activeTab === 'new-visit') {
          setActiveTab('dashboard');
        } else if (!isAdmin && activeTab !== 'dashboard' && activeTab !== 'client-profile' && activeTab !== 'clients') {
          setActiveTab('dashboard');
        }
      }
    }
  }, [currentUser, activeTab, isAdmin]);

  // Handlers
  const handleOpenClient = (clientId, source = 'dashboard') => {
    setSelectedClientId(clientId);
    setClientProfileSource(source);
    setActiveTab('client-profile');
  };

  const handleOpenReceipt = (visitId) => {
    setReceiptVisitId(visitId);
  };

  const handleVisitComplete = (visitId) => {
    setActiveTab('dashboard');
    if (visitId) {
      setReceiptVisitId(visitId);
    }
  };

  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={(user, location) => {
          setCurrentUser(user);
          setActiveVisitClient(null);
          setPreSelectedVisitClient(null);
          setInitialVisitType(null);
          if (user?.role === 'master_admin') {
            // Master admin must never be redirected directly to a branch dashboard
            setSelectedLocation(null);
            setStoredLocation(null);
            setMasterAdminView('types');
          } else {
            const locToSet = location || user?.location || null;
            if (locToSet) {
              setSelectedLocation(locToSet);
              setStoredLocation(locToSet);
            }
            if (user?.role === 'visitor') {
              setActiveTab('new-visit');
              setWizardResetKey(k => k + 1);
            } else {
              setActiveTab('dashboard');
            }
          }
        }}
      />
    );
  }

  // Master Admin View: When no location is selected, display Studio Management or Location Selection
  if ((currentUser?.role === 'master_admin' || currentUser?.original_role === 'master_admin') && !selectedLocation) {
    if (masterAdminView === 'locations') {
      return (
        <LocationSelection
          type={selectedLocationType}
          currentUser={currentUser}
          onSelectLocation={handleSelectLocation}
          onBack={() => setMasterAdminView('types')}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <StudioManagement
        currentUser={currentUser}
        onSelectType={(type) => {
          setSelectedLocationType(type);
          setMasterAdminView('locations');
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        activeLocation={selectedLocation}
        onSwitchLocation={handleSwitchLocation}
        setActiveTab={(tab) => {
          if (currentUser?.role === 'visitor') {
            setPreSelectedVisitClient(null);
            setInitialVisitType(null);
            setActiveVisitClient(null);
            setWizardResetKey(k => k + 1);
            setActiveTab('new-visit');
            return;
          }
          if (tab === 'new-visit') {
            return;
          }
          if (!isAdmin && tab !== 'dashboard' && tab !== 'client-profile' && tab !== 'clients') {
            return;
          }
          if (tab === 'dashboard') {
            setPreSelectedVisitClient(null);
            setInitialVisitType(null);
            setActiveVisitClient(null);
          }
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        activeVisitClient={activeVisitClient}
        cartCount={cartInfo.count}
        cartVisible={cartInfo.visible}
        onOpenCart={cartInfo.openCart}
        onResetVisit={() => {
          setActiveVisitClient(null);
          setPreSelectedVisitClient(null);
          setInitialVisitType(null);
          setCartInfo({ count: 0, openCart: null, visible: false });
          setWizardResetKey(k => k + 1);
          if (currentUser?.role !== 'visitor') {
            setActiveTab('dashboard');
          } else {
            setActiveTab('new-visit');
          }
        }}
      />

      <ErrorBoundary>
        <main
          className="app-container"
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '44px',
            ...(activeTab === 'new-visit' ? { paddingBottom: '24px' } : {})
          }}
        >
        {activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            activeLocation={selectedLocation}
            onSwitchLocation={handleSwitchLocation}
            onOpenClient={handleOpenClient}
            onOpenReceipt={handleOpenReceipt}
            onBackToDashboard={() => {
              setActiveVisitClient(null);
              setCartInfo({ count: 0, openCart: null, visible: false });
              setActiveTab('dashboard');
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'new-visit' && (
          <NewVisitWizard
            key={`${wizardResetKey}_${preSelectedVisitClient ? `client_${preSelectedVisitClient.client_id}` : `flow_${initialVisitType || 'choose'}`}`}
            preSelectedClient={preSelectedVisitClient}
            initialType={initialVisitType}
            currentUser={currentUser}
            selectedLocation={selectedLocation}
            onClientChange={(client) => setActiveVisitClient(client)}
            onCartChange={setCartInfo}
            onCancel={() => {
              setActiveVisitClient(null);
              setPreSelectedVisitClient(null);
              setInitialVisitType(null);
              setCartInfo({ count: 0, openCart: null, visible: false });
              if (currentUser?.role === 'visitor') {
                setWizardResetKey(k => k + 1);
              } else {
                setActiveTab('dashboard');
              }
            }}
            onComplete={(visitId) => {
              setActiveVisitClient(null);
              setPreSelectedVisitClient(null);
              setInitialVisitType(null);
              setCartInfo({ count: 0, openCart: null, visible: false });
              if (currentUser?.role === 'visitor') {
                if (visitId) {
                  setReceiptVisitId(visitId);
                }
                setWizardResetKey(k => k + 1);
              } else {
                handleVisitComplete(visitId);
              }
            }}
          />
        )}

        {(isAdmin || currentUser?.role === 'reception') && activeTab === 'clients' && (
          <ClientsList
            onOpenClient={(id) => handleOpenClient(id, 'clients')}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {(isAdmin || currentUser?.role === 'reception') && activeTab === 'client-profile' && selectedClientId && (
          <ClientProfile
            clientId={selectedClientId}
            onBack={() => setActiveTab(clientProfileSource === 'clients' ? 'clients' : 'dashboard')}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {isAdmin && activeTab === 'services' && (
          <ServiceManagement />
        )}

        {isAdmin && activeTab === 'staff' && (
          <StaffManagement />
        )}

        {activeTab === 'membership' && (
          <MembershipManagement currentUser={currentUser} activeLocation={selectedLocation} />
        )}

        {isAdmin && activeTab === 'reports' && (
          <ReportsView />
        )}
      </main>
      </ErrorBoundary>

      {/* Global Receipt / Invoice Modal */}
      {receiptVisitId && (
        <ReceiptModal
          visitId={receiptVisitId}
          onClose={() => setReceiptVisitId(null)}
        />
      )}
    </div>
  );
}
