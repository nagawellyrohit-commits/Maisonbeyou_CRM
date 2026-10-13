import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewVisitWizard from './components/NewVisitWizard';
import ClientProfile from './components/ClientProfile';
import ClientsList from './components/ClientsList';
import ServiceManagement from './components/ServiceManagement';
import StaffManagement from './components/StaffManagement';
import ReportsView from './components/ReportsView';
import ReceiptModal from './components/ReceiptModal';
import { getStoredToken, getStoredUser, apiRequest } from './utils/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Navigation contextual state
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [preSelectedVisitClient, setPreSelectedVisitClient] = useState(null);
  const [initialVisitType, setInitialVisitType] = useState(null);
  const [receiptVisitId, setReceiptVisitId] = useState(null);
  const [activeVisitClient, setActiveVisitClient] = useState(null);


  // Check auth validity on load
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      apiRequest('/auth/me')
        .then(res => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          setCurrentUser(null);
        });
    } else {
      setCurrentUser(null);
    }

    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Guard: if non-admin attempts to view protected tabs, redirect to dashboard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (activeTab !== 'dashboard' && activeTab !== 'new-visit') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Handlers
  const handleStartVisit = (type = null, client = null) => {
    setInitialVisitType(type);
    setPreSelectedVisitClient(client);
    setActiveTab('new-visit');
  };

  const handleOpenClient = (clientId) => {
    if (!isAdmin) return;
    setSelectedClientId(clientId);
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
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (!isAdmin && tab !== 'dashboard' && tab !== 'new-visit') {
            return;
          }
          if (tab === 'new-visit' || tab === 'dashboard') {
            setPreSelectedVisitClient(null);
            setInitialVisitType(null);
            if (tab === 'dashboard') setActiveVisitClient(null);
          }
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        activeVisitClient={activeVisitClient}
      />

      <main className="app-container" style={{ flex: 1, width: '100%' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            onStartVisit={handleStartVisit}
            onOpenClient={handleOpenClient}
            onOpenReceipt={handleOpenReceipt}
            onBackToDashboard={() => {
              setActiveVisitClient(null);
              setActiveTab('dashboard');
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'new-visit' && (
          <NewVisitWizard
            key={preSelectedVisitClient ? `client_${preSelectedVisitClient.client_id}` : `flow_${initialVisitType || 'choose'}`}
            preSelectedClient={preSelectedVisitClient}
            initialType={initialVisitType}
            onClientChange={(client) => setActiveVisitClient(client)}
            onCancel={() => {
              setActiveVisitClient(null);
              setActiveTab('dashboard');
            }}
            onComplete={(visitId) => {
              setActiveVisitClient(null);
              handleVisitComplete(visitId);
            }}
          />
        )}

        {isAdmin && activeTab === 'clients' && (
          <ClientsList
            onOpenClient={handleOpenClient}
            onStartVisit={handleStartVisit}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {isAdmin && activeTab === 'client-profile' && selectedClientId && (
          <ClientProfile
            clientId={selectedClientId}
            onBack={() => setActiveTab('clients')}
            onStartVisit={handleStartVisit}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {isAdmin && activeTab === 'services' && (
          <ServiceManagement />
        )}

        {isAdmin && activeTab === 'staff' && (
          <StaffManagement />
        )}

        {isAdmin && activeTab === 'reports' && (
          <ReportsView />
        )}
      </main>

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
