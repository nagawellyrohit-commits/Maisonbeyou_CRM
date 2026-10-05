import React, { useState, useEffect } from 'react';
import { 
  UserPlus, UserCheck, ArrowLeft, ArrowRight, Check, Plus, 
  Trash2, ShieldAlert, Sparkles, CheckCircle2, Clock, 
  IndianRupee, ChevronRight, Search, Phone, Calendar 
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function NewVisitWizard({ preSelectedClient, initialType, onCancel, onComplete }) {
  // Wizard Steps:
  // 'client-type' -> 'client-info' (new) | 'client-search' (regular) -> 'repeat-prompt' -> 'categories' -> 'sub-services' -> 'selected-services' -> 'staff-assignment' -> 'billing-payment' -> 'confirmation'
  const [step, setStep] = useState(() => {
    if (preSelectedClient) return 'repeat-prompt';
    if (initialType === 'new') return 'client-info';
    if (initialType === 'regular') return 'client-search';
    return 'client-type';
  });

  // Client State
  const [clientType, setClientType] = useState(() => {
    if (preSelectedClient) return 'regular';
    if (initialType === 'new') return 'new';
    if (initialType === 'regular') return 'regular';
    return '';
  });

  const [clientName, setClientName] = useState(preSelectedClient?.name || '');
  const [clientPhone, setClientPhone] = useState(preSelectedClient?.phone || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [phoneCheckMessage, setPhoneCheckMessage] = useState(null); // { exists: boolean, client: object }
  
  // Regular Client Selection
  const [selectedRegularClient, setSelectedRegularClient] = useState(preSelectedClient || null);
  const [clientHistory, setClientHistory] = useState(null); // { last_visit, previous_services, ... }
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search State for Regular Client
  const [searchQuery, setSearchQuery] = useState('');
  const [regularClientsList, setRegularClientsList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Repeat Previous Service State
  const [repeatAnswer, setRepeatAnswer] = useState('yes'); // Default 'yes' so previous services are immediately visible
  const [selectedRepeatServiceKeys, setSelectedRepeatServiceKeys] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);

  // Catalog State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Staff State
  const [staffList, setStaffList] = useState([]);

  // Selected Services Cart
  // Array of { temp_id, service_id, service_name, price, staff_id }
  const [selectedServices, setSelectedServices] = useState([]);

  // Billing & Payment State
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percentage'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'Cash' | 'UPI' | 'Card' | 'Other'
  const [amountPaid, setAmountPaid] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedVisitResult, setCompletedVisitResult] = useState(null);

  // Synchronize when preSelectedClient or initialType changes from props
  useEffect(() => {
    if (preSelectedClient) {
      setSelectedRegularClient(preSelectedClient);
      setClientType('regular');
      setStep('repeat-prompt');
    } else if (initialType === 'new') {
      setClientType('new');
      setStep('client-info');
    } else if (initialType === 'regular') {
      setClientType('regular');
      setStep('client-search');
    }
  }, [preSelectedClient, initialType]);

  // Load Catalog Categories & Staff Members on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoadingCatalog(true);
        const [catRes, staffRes] = await Promise.all([
          apiRequest('/categories'),
          apiRequest('/staff')
        ]);
        setCategories(catRes.categories || []);
        setStaffList(staffRes.staff || []);
      } catch (err) {
        console.error('Failed to load catalog or staff:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadMasterData();
  }, []);

  // Fetch regular clients list for Search Client screen
  const fetchRegularClients = async (query = '') => {
    try {
      setIsSearching(true);
      const res = await apiRequest(`/clients/search?q=${encodeURIComponent(query.trim())}`);
      setRegularClientsList(res.clients || []);
    } catch (err) {
      console.error('Failed to search clients:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Load regular clients when entering client-search
  useEffect(() => {
    if (step === 'client-search') {
      fetchRegularClients(searchQuery);
    }
  }, [step]);

  // Debounced search query handler
  useEffect(() => {
    if (step === 'client-search') {
      const timer = setTimeout(() => {
        fetchRegularClients(searchQuery);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Fetch complete dossier when a regular client is chosen
  useEffect(() => {
    if (selectedRegularClient?.client_id) {
      setLoadingHistory(true);
      apiRequest(`/clients/${selectedRegularClient.client_id}`)
        .then(res => {
          setClientHistory(res);
          // If repeatAnswer is yes, automatically pre-select services from their last visit
          if (repeatAnswer === 'yes' && res?.last_visit?.services?.length > 0) {
            const lastVisitServices = res.last_visit.services;
            const keys = [];
            const newItems = [];
            const now = Date.now();
            lastVisitServices.forEach((s, idx) => {
              const key = String(s.service_id || s.service_name_snapshot);
              if (!keys.includes(key)) keys.push(key);
              newItems.push({
                temp_id: `item_rep_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                service_id: s.service_id,
                service_name: s.service_name_snapshot,
                price: s.price_snapshot,
                staff_id: s.staff_id || null,
                is_repeat: true,
                source_visit_id: res.last_visit.visit_id
              });
            });
            setSelectedRepeatServiceKeys(keys);
            setSelectedServices(prev => {
              const nonRepeat = prev.filter(item => !item.is_repeat);
              return [...newItems, ...nonRepeat];
            });
          }
        })
        .catch(err => {
          console.error('Failed to fetch client history:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [selectedRegularClient]);

  // Synchronize default staff if staffList loads or changes
  useEffect(() => {
    if (staffList.length > 0) {
      setSelectedServices(prev => prev.map(s => {
        if (!s.staff_id) {
          return { ...s, staff_id: staffList[0].staff_id };
        }
        return s;
      }));
    }
  }, [staffList]);

  // Duplicate Phone Check for New Client Flow (Rule 1)
  useEffect(() => {
    if (clientType === 'new') {
      const clean = clientPhone.replace(/\D/g, '');
      if (clean.length >= 10) {
        apiRequest(`/clients/check-phone?phone=${clean}`)
          .then(res => {
            if (res.exists) {
              setPhoneCheckMessage({ exists: true, client: res.client });
            } else {
              setPhoneCheckMessage({ exists: false });
            }
          })
          .catch(() => {});
      } else {
        setPhoneCheckMessage(null);
      }
    }
  }, [clientPhone, clientType]);

  // Financial Calculations
  const subtotal = selectedServices.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  
  let calculatedDiscount = 0;
  const numDisc = parseFloat(discountValue) || 0;
  if (discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * Math.min(Math.max(numDisc, 0), 100)) / 100);
  } else {
    calculatedDiscount = Math.min(Math.max(numDisc, 0), subtotal);
  }

  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const effectivePaid = amountPaid === '' ? totalAmount : Math.max(0, parseFloat(amountPaid) || 0);
  const calculatedBalance = Math.max(0, totalAmount - effectivePaid);

  let paymentStatus = 'Pending';
  if (effectivePaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'Paid';
  } else if (effectivePaid > 0) {
    paymentStatus = 'Partially Paid';
  } else if (totalAmount === 0 && selectedServices.length > 0) {
    paymentStatus = 'Paid';
  }

  // Cart & Repeat Handlers
  const populateLastVisitServices = (history) => {
    const lastVisitServices = history?.last_visit?.services || [];
    if (!lastVisitServices || lastVisitServices.length === 0) return;

    const keys = [];
    const newItems = [];
    const now = Date.now();

    lastVisitServices.forEach((s, idx) => {
      const key = String(s.service_id || s.service_name_snapshot);
      if (!keys.includes(key)) {
        keys.push(key);
      }
      const assignedStaff = staffList.find(st => st.staff_id === s.staff_id) || staffList[0];
      newItems.push({
        temp_id: `item_rep_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        service_id: s.service_id,
        service_name: s.service_name_snapshot,
        price: s.price_snapshot,
        staff_id: assignedStaff ? assignedStaff.staff_id : (staffList[0]?.staff_id || null),
        is_repeat: true,
        source_visit_id: history.last_visit.visit_id
      });
    });

    setSelectedRepeatServiceKeys(keys);
    setSelectedServices(prev => {
      const nonRepeat = prev.filter(item => !item.is_repeat);
      return [...newItems, ...nonRepeat];
    });
    setToastNotification(`✓ Loaded ${lastVisitServices.length} repeat service(s) from last visit`);
    setTimeout(() => setToastNotification(null), 3000);
  };

  const handleRepeatYes = () => {
    setRepeatAnswer('yes');
    if (clientHistory?.last_visit?.services?.length > 0) {
      populateLastVisitServices(clientHistory);
    }
  };

  const handleRepeatNo = () => {
    setRepeatAnswer('no');
    setSelectedRepeatServiceKeys([]);
    setSelectedServices(prev => prev.filter(item => !item.is_repeat));
    setStep('categories');
  };

  const handleClearAllRepeat = () => {
    setSelectedRepeatServiceKeys([]);
    setSelectedServices(prev => prev.filter(item => !item.is_repeat));
    setToastNotification('Cleared repeat service selection');
    setTimeout(() => setToastNotification(null), 2500);
  };

  const handleAddService = (service, stayOnPage = false) => {
    const defaultStaff = staffList.length > 0 ? staffList[0].staff_id : null;
    const newItem = {
      temp_id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      service_id: service.service_id,
      service_name: service.service_name,
      price: service.price,
      staff_id: defaultStaff,
      is_repeat: false
    };
    setSelectedServices(prev => [...prev, newItem]);
    setToastNotification(`✓ Added "${service.service_name}" (${formatCurrency(service.price)}) to visit`);
    setTimeout(() => setToastNotification(null), 3000);

    if (!stayOnPage) {
      setStep('selected-services');
    }
  };

  const handleRemoveService = (tempId) => {
    setSelectedServices(prev => {
      const itemToRemove = prev.find(s => s.temp_id === tempId);
      if (itemToRemove && itemToRemove.is_repeat) {
        const key = String(itemToRemove.service_id || itemToRemove.service_name);
        setSelectedRepeatServiceKeys(kPrev => kPrev.filter(k => k !== key));
      }
      return prev.filter(s => s.temp_id !== tempId);
    });
  };

  const handleStaffChange = (tempId, staffId) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.temp_id === tempId) {
        return { ...s, staff_id: parseInt(staffId) };
      }
      return s;
    }));
  };

  // Toggle Repeat Previous Service
  const handleToggleRepeatService = (prevService) => {
    const key = String(prevService.service_id || prevService.service_name);
    const isSelected = selectedRepeatServiceKeys.includes(key);

    if (isSelected) {
      setSelectedRepeatServiceKeys(prev => prev.filter(k => k !== key));
      setSelectedServices(prev => prev.filter(s => 
        !(s.is_repeat && (s.service_id === prevService.service_id || s.service_name === prevService.service_name))
      ));
      setToastNotification(`Removed repeat "${prevService.service_name}"`);
      setTimeout(() => setToastNotification(null), 2500);
    } else {
      setSelectedRepeatServiceKeys(prev => [...prev, key]);
      const defaultStaff = staffList.length > 0 ? staffList[0].staff_id : null;
      const newItem = {
        temp_id: 'item_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        service_id: prevService.service_id,
        service_name: prevService.service_name,
        price: prevService.current_price || prevService.last_price,
        staff_id: defaultStaff,
        is_repeat: true
      };
      setSelectedServices(prev => [...prev, newItem]);
      setToastNotification(`✓ Added repeat "${prevService.service_name}"`);
      setTimeout(() => setToastNotification(null), 2500);
    }
  };

  const renderToast = () => {
    if (!toastNotification) return null;
    return (
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#1C1917',
        color: '#FAF7F2',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #B88B4A',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        fontWeight: '600',
        animation: 'fadeIn 0.2s ease'
      }}>
        <CheckCircle2 size={18} color="#B88B4A" />
        <span>{toastNotification}</span>
      </div>
    );
  };

  // Final Submit to Backend
  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      if (selectedServices.length === 0) {
        throw new Error('Please select at least one service');
      }

      for (const s of selectedServices) {
        if (!s.staff_id) {
          throw new Error(`Please assign a staff member for "${s.service_name}"`);
        }
      }

      const payload = {
        client_type: clientType,
        client_id: clientType === 'regular' ? selectedRegularClient?.client_id : null,
        name: clientType === 'new' ? clientName : selectedRegularClient?.name,
        phone: clientType === 'new' ? clientPhone : selectedRegularClient?.phone,
        visit_date: visitDate,
        services: selectedServices.map(s => ({
          service_id: s.service_id,
          service_name: s.service_name,
          price: s.price,
          staff_id: s.staff_id
        })),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        payment_method: paymentMethod,
        amount_paid: effectivePaid,
        notes: visitNotes
      };

      const res = await apiRequest('/visits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCompletedVisitResult(res);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // STEP 1: CLIENT TYPE
  // ==========================================
  if (step === 'client-type') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#B88B4A', fontWeight: '700', marginBottom: '6px' }}>
            Visit Reception Flow
          </div>
          <h1 style={{ fontSize: '32px', color: '#1C1917' }}>
            CLIENT TYPE
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Please select whether the guest is visiting for the first time or is a regular client.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* NEW CLIENT */}
          <div 
            onClick={() => {
              setClientType('new');
              setStep('client-info');
            }}
            className="card"
            style={{
              padding: '40px 30px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid var(--border-color)',
              background: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#B88B4A';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'var(--success-bg)',
              color: '#166534',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <UserPlus size={36} />
            </div>
            <h2 style={{ fontSize: '22px', color: '#1C1917', marginBottom: '8px' }}>
              NEW CLIENT
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
              First-time guest registration with 10-digit mobile number validation and duplicate check.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontWeight: '600' }}>
              Register New Client
              <ArrowRight size={16} />
            </button>
          </div>

          {/* REGULAR CLIENT */}
          <div 
            onClick={() => {
              setClientType('regular');
              setStep('client-search');
            }}
            className="card"
            style={{
              padding: '40px 30px',
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px solid var(--border-color)',
              background: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#B88B4A';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'var(--primary-subtle)',
              color: '#B88B4A',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <UserCheck size={36} />
            </div>
            <h2 style={{ fontSize: '22px', color: '#1C1917', marginBottom: '8px' }}>
              REGULAR CLIENT
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
              Returning guest lookup by mobile number or name. Loads previous service history & repeat options.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontWeight: '600' }}>
              Lookup Existing Client
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button onClick={onCancel} style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2A: NEW CLIENT REGISTRATION
  // ==========================================
  if (step === 'client-info') {
    const cleanDigits = clientPhone.replace(/\D/g, '');
    const isMobileValid = cleanDigits.length >= 10;
    const isDuplicate = phoneCheckMessage?.exists;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '640px', margin: '40px auto' }}>
        <button 
          onClick={() => setStep('client-type')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}
        >
          <ArrowLeft size={16} />
          Change Client Type
        </button>

        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '4px' }}>
            Guest Registration
          </div>
          <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '8px' }}>
            NEW CLIENT REGISTRATION
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Enter the client's name and mobile number. Mobile numbers are checked to prevent duplicate profiles.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                Client Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Priya Shah"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  outline: 'none',
                  fontSize: '15px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                Mobile Number (10 digits) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-muted)'
                }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={14}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="98765 43210"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isDuplicate ? '#DC2626' : (isMobileValid ? '#16A34A' : 'var(--border-color)')}`,
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '16px',
                    letterSpacing: '0.05em'
                  }}
                />
              </div>

              {/* DUPLICATE WARNING (Rule 1) */}
              {isDuplicate && (
                <div style={{
                  marginTop: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-bg)',
                  border: '1.5px solid var(--danger-border)',
                  color: 'var(--danger-text)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px' }}>
                    <ShieldAlert size={18} />
                    Client already exists. Please use Regular Client.
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px', color: '#7F1D1D' }}>
                    Found registered client: <strong>{phoneCheckMessage.client.name}</strong> ({phoneCheckMessage.client.total_visits} past visits).
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRegularClient(phoneCheckMessage.client);
                      setClientType('regular');
                      setStep('repeat-prompt');
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Switch to {phoneCheckMessage.client.name}'s Profile & Continue →
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                Date of Visit
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              onClick={() => {
                if (!clientName.trim()) {
                  alert('Please enter client name');
                  return;
                }
                if (!isMobileValid) {
                  alert('Please enter a valid 10-digit mobile number');
                  return;
                }
                if (isDuplicate) {
                  alert('Client already exists with this phone number. Please use Regular Client.');
                  return;
                }
                setStep('categories');
              }}
              disabled={!clientName.trim() || !isMobileValid || isDuplicate}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                marginTop: '10px',
                opacity: (!clientName.trim() || !isMobileValid || isDuplicate) ? 0.5 : 1
              }}
            >
              Continue to Service Selection
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2B: REGULAR CLIENT SEARCH (Section 6)
  // ==========================================
  if (step === 'client-search') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '40px auto' }}>
        <button 
          onClick={() => setStep('client-type')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}
        >
          <ArrowLeft size={16} />
          Change Client Type
        </button>

        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '4px' }}>
            Returning Client Identification
          </div>
          <h2 style={{ fontSize: '26px', color: '#1C1917', marginBottom: '8px' }}>
            SEARCH CLIENT
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Lookup client using <strong>Mobile Number</strong> (primary) or <strong>Client Name</strong>.
          </p>

          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '2px solid #B88B4A',
            borderRadius: 'var(--radius-md)',
            padding: '4px 16px',
            background: '#FFFFFF',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(184, 139, 74, 0.15)'
          }}>
            <Search size={20} color="#B88B4A" style={{ marginRight: '12px' }} />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by 10-digit mobile (e.g. 98765...) or name (e.g. Priya)"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                color: 'var(--text-main)'
              }}
            />
            {isSearching && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Searching...</span>
            )}
          </div>

          {/* Immediate Results List */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            maxHeight: '380px',
            overflowY: 'auto',
            background: '#FFFFFF'
          }}>
            <div style={{
              padding: '10px 18px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{searchQuery.trim() ? `Search Results (${regularClientsList.length})` : `Registered Regular Clients (${regularClientsList.length})`}</span>
              <span>Click a client to proceed</span>
            </div>

            {regularClientsList.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {isSearching ? 'Searching database...' : (
                  <div>
                    <p style={{ marginBottom: '10px' }}>No client found matching "{searchQuery}".</p>
                    <button
                      onClick={() => {
                        setClientType('new');
                        setClientPhone(searchQuery.replace(/\D/g, ''));
                        setStep('client-info');
                      }}
                      style={{ color: '#B88B4A', fontWeight: '700', textDecoration: 'underline' }}
                    >
                      + Register as New Client instead
                    </button>
                  </div>
                )}
              </div>
            ) : (
              regularClientsList.map(c => (
                <div
                  key={c.client_id}
                  onClick={() => {
                    setSelectedRegularClient(c);
                    setStep('repeat-prompt');
                  }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#1C1917' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#B88B4A' }}>
                        {formatPhone(c.phone)}
                      </span>
                      <span>•</span>
                      <span>{c.total_visits} Visits</span>
                      <span>•</span>
                      <span>Last Visit: {formatDate(c.last_visit_date)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRegularClient(c);
                      setStep('repeat-prompt');
                    }}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderColor: 'var(--primary-border)',
                      color: '#B88B4A',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Select Client
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2C: CLIENT PROFILE, HISTORY & REPEAT SERVICE (Section 6, 7 & 8)
  // ==========================================
  if (step === 'repeat-prompt' && selectedRegularClient) {
    const client = selectedRegularClient;
    const lastVisit = clientHistory?.last_visit;
    const previousServices = clientHistory?.previous_services || [];

    return (
      <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setStep('client-search')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Search Different Client
          </button>
          <span className="badge badge-gold">
            Regular Client Identified
          </span>
        </div>

        {/* SECTION 6: CLIENT PROFILE HEADER */}
        <div className="card" style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
          border: '1.5px solid var(--primary-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
                Client Profile
              </div>
              <h1 style={{ fontSize: '30px', color: '#1C1917', lineHeight: 1.1 }}>
                {client.name.toUpperCase()}
              </h1>
              <div style={{ fontSize: '16px', color: '#B88B4A', fontWeight: '600', marginTop: '4px' }}>
                {formatPhone(client.phone)}
              </div>
            </div>

            {/* Client Stats Box */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px',
              background: '#FFFFFF',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>First Visit</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                  {formatDate(client.first_visit_date)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Last Visit</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                  {formatDate(client.last_visit_date)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Total Visits</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E40AF', marginTop: '1px' }}>
                  {client.total_visits}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Total Spend</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#166534', marginTop: '1px' }}>
                  {formatCurrency(client.total_spend)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: LAST VISIT DETAILS */}
          {loadingHistory ? (
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Loading client history...
            </div>
          ) : lastVisit ? (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>
                LAST VISIT • {formatDate(lastVisit.visit_date)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {lastVisit.services?.map(s => (
                  <div key={s.visit_service_id} style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{s.service_name_snapshot}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>• Staff: {s.staff_name || 'Staff'}</span>
                    <span style={{ fontWeight: '700', color: '#B88B4A' }}>{formatCurrency(s.price_snapshot)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Toast Notification */}
        {renderToast()}

        {/* SECTION 8: WOULD YOU LIKE TO REPEAT A PREVIOUS SERVICE? */}
        <div className="card" style={{ padding: '32px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', color: '#1C1917', marginBottom: '6px' }}>
              WOULD YOU LIKE TO REPEAT A PREVIOUS SERVICE?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Choose whether to repeat treatments {client.name} had on previous visits, or proceed to new service categories.
            </p>

            {/* Toggle: [ YES ] [ NO ] */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              padding: '5px',
              borderRadius: 'var(--radius-md)',
              marginTop: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={handleRepeatYes}
                style={{
                  padding: '10px 32px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '15px',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  background: repeatAnswer === 'yes' ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : 'transparent',
                  color: repeatAnswer === 'yes' ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: repeatAnswer === 'yes' ? '0 2px 8px rgba(184,139,74,0.3)' : 'none'
                }}
              >
                YES
              </button>
              <button
                type="button"
                onClick={handleRepeatNo}
                style={{
                  padding: '10px 32px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '15px',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  background: repeatAnswer === 'no' ? '#1C1917' : 'transparent',
                  color: repeatAnswer === 'no' ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: repeatAnswer === 'no' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                NO
              </button>
            </div>
          </div>

          {/* If YES: Show previous services list with SELECT button */}
          {repeatAnswer === 'yes' && (
            <div className="animate-fade-in" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PREVIOUS SERVICES
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Click any service card to select or deselect for current visit
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {lastVisit && (
                    <button
                      type="button"
                      onClick={() => populateLastVisitServices(clientHistory)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: 'var(--primary-subtle)',
                        color: '#B88B4A',
                        border: '1px solid var(--primary-border)'
                      }}
                    >
                      ✓ Select All from Last Visit
                    </button>
                  )}
                  {selectedRepeatServiceKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllRepeat}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      Clear Selection
                    </button>
                  )}
                  <div style={{ fontSize: '13px', color: '#B88B4A', fontWeight: '700' }}>
                    {selectedRepeatServiceKeys.length} repeat service{selectedRepeatServiceKeys.length !== 1 ? 's' : ''} chosen ({formatCurrency(selectedServices.filter(s => s.is_repeat).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0))})
                  </div>
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading previous services...
                </div>
              ) : previousServices.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <p>No previous services on record for this client yet.</p>
                  <button
                    onClick={() => setStep('categories')}
                    className="btn-primary"
                    style={{ marginTop: '12px' }}
                  >
                    + Browse All Service Categories
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {previousServices.map((ps) => {
                    const key = String(ps.service_id || ps.service_name);
                    const isSelected = selectedRepeatServiceKeys.includes(key);

                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleRepeatService(ps)}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? '#B88B4A' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--primary-subtle)' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 2px 8px rgba(184, 139, 74, 0.15)' : 'none'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1C1917' }}>
                              {ps.service_name}
                            </div>
                            {isSelected && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#B88B4A',
                                color: '#FFFFFF'
                              }}>
                                ✓ REPEAT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Last taken: {formatDate(ps.last_taken_date)} {ps.last_staff_name ? `• ${ps.last_staff_name}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#B88B4A' }}>
                            {formatCurrency(ps.current_price || ps.last_price)}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRepeatService(ps);
                            }}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: isSelected ? '#B88B4A' : 'var(--bg-surface)',
                              color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                              border: isSelected ? '1px solid #B88B4A' : '1px solid var(--border-color)'
                            }}
                          >
                            {isSelected ? '✓ SELECTED' : '+ SELECT'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions: + ADD NEW SERVICE or CONTINUE */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('categories')}
                  className="btn-secondary"
                  style={{ fontWeight: '600', padding: '10px 18px' }}
                >
                  <Plus size={16} />
                  + ADD MORE SERVICES (from Catalog)
                </button>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {selectedServices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep('selected-services')}
                      className="btn-secondary"
                      style={{ fontWeight: '600', padding: '10px 18px', borderColor: 'var(--primary-border)', color: '#B88B4A' }}
                    >
                      Review Selected ({selectedServices.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep(selectedServices.length > 0 ? 'selected-services' : 'categories')}
                    disabled={selectedServices.length === 0}
                    className="btn-primary"
                    style={{ opacity: selectedServices.length === 0 ? 0.5 : 1, padding: '10px 22px' }}
                  >
                    Continue with Selected ({selectedServices.length}) • {formatCurrency(subtotal)}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 3: 6 MAIN SERVICE CATEGORIES (Section 9)
  // ==========================================
  if (step === 'categories') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '30px auto' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
              Service Catalog
            </div>
            <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
              MAIN SERVICE CATEGORIES
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Client: <strong style={{ color: 'var(--text-main)' }}>{activeClientName}</strong> • Click any category card to view and select treatments
            </p>
          </div>

          {selectedServices.length > 0 && (
            <button
              onClick={() => setStep('selected-services')}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              View Selected ({selectedServices.length}) • {formatCurrency(subtotal)}
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Persistent Cart Banner */}
        {selectedServices.length > 0 && (
          <div style={{
            background: 'var(--primary-subtle)',
            border: '1.5px solid var(--primary-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#B88B4A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>
                  Current Visit Cart: {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} • {formatCurrency(subtotal)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedServices.map(s => s.service_name).join(' • ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Review Selected Services ({selectedServices.length}) →
              </button>
            </div>
          </div>
        )}

        {/* 6 Large Selectable Cards (Section 9 Requirement) */}
        {loadingCatalog ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading service categories...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px' }}>
            {categories.map((cat, idx) => (
              <div
                key={cat.category_id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep('sub-services');
                }}
                className="card"
                style={{
                  padding: '28px 24px',
                  cursor: 'pointer',
                  border: '1.5px solid var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#B88B4A';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'var(--primary-subtle)',
                    color: '#B88B4A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={24} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', letterSpacing: '0.08em' }}>
                    0{idx + 1}
                  </span>
                </div>

                <h2 style={{ fontSize: '19px', color: '#1C1917', marginBottom: '6px' }}>
                  {cat.category_name}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '20px', minHeight: '36px' }}>
                  {cat.description || 'Specialized clinical therapies & treatments'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                  <span style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600' }}>
                    {cat.services?.length || 0} Treatments
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    <span>Browse</span>
                    <ChevronRight size={16} color="#B88B4A" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Back Button */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (selectedServices.length > 0) {
                setStep('selected-services');
              } else if (clientType === 'regular') {
                setStep('repeat-prompt');
              } else {
                setStep('client-info');
              }
            }}
            style={{ fontSize: '14px', color: 'var(--text-muted)' }}
          >
            ← Back
          </button>

          {selectedServices.length > 0 && (
            <button
              onClick={() => setStep('selected-services')}
              className="btn-primary"
            >
              Continue with Selected ({selectedServices.length}) →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 4: SUB-SERVICES (Section 10)
  // ==========================================
  if (step === 'sub-services' && selectedCategory) {
    const subServices = selectedCategory.services || [];

    return (
      <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '30px auto' }}>
        {/* Toast Notification */}
        {renderToast()}

        <button
          onClick={() => setStep('categories')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          Back to Main Categories
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700' }}>
              Category
            </div>
            <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
              {selectedCategory.category_name}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Prices retrieved directly from database catalog. Click anywhere on a service card to add to visit.
            </p>
          </div>

          {selectedServices.length > 0 && (
            <button
              onClick={() => setStep('selected-services')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              View Cart: {selectedServices.length} ({formatCurrency(subtotal)})
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {subServices.map(service => {
            const countInCart = selectedServices.filter(s => s.service_id === service.service_id).length;
            const isAlreadyAdded = countInCart > 0;

            return (
              <div
                key={service.service_id}
                onClick={() => handleAddService(service, true)}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isAlreadyAdded ? '2px solid #B88B4A' : '1.5px solid var(--border-color)',
                  background: isAlreadyAdded ? 'var(--primary-subtle)' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isAlreadyAdded ? '0 2px 8px rgba(184, 139, 74, 0.15)' : 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  if (!isAlreadyAdded) e.currentTarget.style.borderColor = '#B88B4A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isAlreadyAdded ? '0 2px 8px rgba(184, 139, 74, 0.15)' : 'var(--shadow-sm)';
                  if (!isAlreadyAdded) e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '16px', color: '#1C1917', fontWeight: '700' }}>
                      {service.service_name}
                    </h3>
                    {isAlreadyAdded && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#166534',
                        color: '#FFFFFF',
                        flexShrink: 0
                      }}>
                        ✓ In Visit ({countInCart})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {service.description || `${service.duration_mins || 45} mins session`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917' }}>
                    {formatCurrency(service.price)}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddService(service, true);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '700',
                        fontSize: '12px',
                        background: isAlreadyAdded ? '#1C1917' : 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 6px rgba(184, 139, 74, 0.25)'
                      }}
                    >
                      {isAlreadyAdded ? '+ Add Another' : '+ Add to Visit'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddService(service, false);
                      }}
                      className="btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                      title="Add and immediately review visit cart"
                    >
                      Review →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Cart Bar */}
        {selectedServices.length > 0 && (
          <div style={{
            position: 'sticky',
            bottom: '20px',
            marginTop: '28px',
            background: '#1C1917',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
            border: '1px solid #B88B4A',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Visit In Progress
              </div>
              <div style={{ fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>
                {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''} in Cart • {formatCurrency(subtotal)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep('categories')}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: '1px solid #555',
                  color: '#FAF7F2',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                + Other Categories
              </button>
              <button
                type="button"
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '14px', fontWeight: '700' }}
              >
                Review Selected Services ({selectedServices.length}) →
              </button>
              <button
                type="button"
                onClick={() => setStep('staff-assignment')}
                style={{
                  padding: '9px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#B88B4A',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '14px'
                }}
              >
                Proceed to Staff Assignment →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STEP 5: SELECTED SERVICES SCREEN (Section 11, 12 & 13)
  // ==========================================
  if (step === 'selected-services') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '820px', margin: '30px auto' }}>
        {/* Toast Notification */}
        {renderToast()}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
            Current Visit Selection
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            SELECTED SERVICES
          </h1>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Client: <strong style={{ color: '#1C1917' }}>{activeClientName}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
          {selectedServices.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No services selected yet.</p>
              <button onClick={() => setStep('categories')} className="btn-primary">
                + Browse Service Categories
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {selectedServices.map((item, index) => (
                  <div
                    key={item.temp_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--primary-subtle)',
                        color: '#B88B4A',
                        fontWeight: '700',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {index + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{item.service_name}</span>
                          {item.is_repeat ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'var(--primary-subtle)',
                              color: '#B88B4A',
                              border: '1px solid var(--primary-border)'
                            }}>
                              Repeat Service
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-color)'
                            }}>
                              Catalog Service
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {formatCurrency(item.price)}
                      </span>

                      {/* Section 13: Service Editing: Remove */}
                      <button
                        onClick={() => handleRemoveService(item.temp_id)}
                        title="Remove service"
                        style={{
                          padding: '6px',
                          color: '#DC2626',
                          background: 'var(--danger-bg)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--danger-border)',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal & Total */}
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>Discount:</span>
                  <span>{formatCurrency(calculatedDiscount)}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: '#1C1917' }}>
                  <span>Total:</span>
                  <span style={{ color: '#B88B4A' }}>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons: ADD MORE SERVICE & CONTINUE (Section 11 & 12) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('categories')}
                className="btn-secondary"
                style={{ fontWeight: '600', padding: '12px 22px' }}
              >
                <Plus size={16} />
                ADD MORE SERVICE
              </button>

              {clientType === 'regular' && (
                <button
                  onClick={() => setStep('repeat-prompt')}
                  className="btn-secondary"
                  style={{ fontWeight: '600', padding: '12px 18px', color: 'var(--text-muted)' }}
                >
                  ← Repeat Options
                </button>
              )}
            </div>

            <button
              onClick={() => setStep('staff-assignment')}
              disabled={selectedServices.length === 0}
              className="btn-primary"
              style={{ padding: '12px 26px', fontSize: '15px', opacity: selectedServices.length === 0 ? 0.5 : 1 }}
            >
              Continue to Staff Assignment
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 6: ASSIGN SERVICE PROVIDER (Section 14)
  // ==========================================
  if (step === 'staff-assignment') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '820px', margin: '30px auto' }}>
        <button
          onClick={() => setStep('selected-services')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          Back to Selected Services
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
            Service Team
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            ASSIGN SERVICE PROVIDER
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Client: <strong>{activeClientName}</strong> • Provider selection happens <strong>per service</strong> from verified staff database
          </p>
        </div>

        <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Service</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Price</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Assigned Provider</th>
              </tr>
            </thead>
            <tbody>
              {selectedServices.map((item, idx) => (
                <tr key={item.temp_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1C1917' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{idx + 1}. {item.service_name}</span>
                      {item.is_repeat && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'var(--primary-subtle)', color: '#B88B4A', fontWeight: '700' }}>
                          Repeat
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: '700', color: '#B88B4A' }}>
                    {formatCurrency(item.price)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={item.staff_id || ''}
                      onChange={(e) => handleStaffChange(item.temp_id, e.target.value)}
                      required
                      style={{
                        width: '100%',
                        maxWidth: '260px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border-color)',
                        background: '#FFFFFF',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        outline: 'none'
                      }}
                    >
                      <option value="" disabled>Select Staff Member</option>
                      {staffList.map(st => (
                        <option key={st.staff_id} value={st.staff_id}>
                          {st.name} — ({st.role})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={() => setStep('selected-services')} className="btn-secondary">
              ← Back to Services
            </button>
            <button
              onClick={() => {
                const unassigned = selectedServices.find(s => !s.staff_id);
                if (unassigned) {
                  alert(`Please select a service provider for "${unassigned.service_name}"`);
                  return;
                }
                setStep('billing-payment');
              }}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              Continue to Billing & Payment
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 7: BILLING & PAYMENT (Section 15 & 16)
  // ==========================================
  if (step === 'billing-payment') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '840px', margin: '30px auto' }}>
        <button
          onClick={() => setStep('staff-assignment')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          Back to Staff Assignment
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
            Checkout & Invoicing
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            BILL SUMMARY & PAYMENT
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Client: <strong style={{ color: '#1C1917' }}>{activeClientName}</strong>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Bill Summary Column */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Service Line Items ({selectedServices.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {selectedServices.map(s => {
                const staffMember = staffList.find(st => st.staff_id === s.staff_id);
                return (
                  <div key={s.temp_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{s.service_name}</span>
                        {s.is_repeat && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'var(--primary-subtle)', color: '#B88B4A', fontWeight: '700' }}>
                            Repeat
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Staff: {staffMember?.name || 'Unassigned'}
                      </div>
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                      {formatCurrency(s.price)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Discount Section */}
            <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                Apply Discount
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: discountType === 'fixed' ? '#B88B4A' : 'transparent',
                      color: discountType === 'fixed' ? '#FFFFFF' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    ₹ Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: discountType === 'percentage' ? '#B88B4A' : 'transparent',
                      color: discountType === 'percentage' ? '#FFFFFF' : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    % Percent
                  </button>
                </div>

                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Bill Summary Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : '₹'}):</span>
                <span style={{ color: '#DC2626', fontWeight: '600' }}>- {formatCurrency(calculatedDiscount)}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '700', color: '#1C1917' }}>
                <span>Total Payable:</span>
                <span style={{ color: '#B88B4A' }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Collection */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                PAYMENT METHOD
              </h3>

              {/* Payment Methods */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {['UPI', 'Card', 'Cash', 'Other'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: '700',
                      fontSize: '14px',
                      border: `2px solid ${paymentMethod === method ? '#B88B4A' : 'var(--border-color)'}`,
                      background: paymentMethod === method ? 'var(--primary-subtle)' : '#FFFFFF',
                      color: paymentMethod === method ? '#B88B4A' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {paymentMethod === method && <Check size={16} />}
                    {method}
                  </button>
                ))}
              </div>

              {/* Amount Paid & Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                      Amount Received Today (₹)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(totalAmount)}
                      style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '700' }}
                    >
                      Paid in Full
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={amountPaid === '' ? totalAmount : amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '16px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: calculatedBalance > 0 ? 'var(--warning-bg)' : 'var(--success-bg)',
                  border: `1px solid ${calculatedBalance > 0 ? 'var(--warning-border)' : 'var(--success-border)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: calculatedBalance > 0 ? '#92400E' : '#166534' }}>
                      Status: {paymentStatus}
                    </div>
                    <div style={{ fontSize: '13px', color: calculatedBalance > 0 ? '#78350F' : '#14532D' }}>
                      {calculatedBalance > 0 ? 'Customer will have outstanding balance' : 'Zero balance remaining'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Balance</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: calculatedBalance > 0 ? '#DC2626' : '#166534' }}>
                      {formatCurrency(calculatedBalance)}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Visit Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="e.g. Skin reaction check, complimentary tester provided"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('confirmation')}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              Review & Submit Visit
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 8: FINAL CONFIRMATION & SUBMIT (Section 17 & 18)
  // ==========================================
  if (step === 'confirmation') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;
    const activeClientPhone = clientType === 'new' ? clientPhone : selectedRegularClient?.phone;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '620px', margin: '30px auto' }}>
        <button
          onClick={() => setStep('billing-payment')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} />
          Back to Billing
        </button>

        {submitError && (
          <div style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            border: '1px solid var(--danger-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {submitError}
          </div>
        )}

        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="/logo.png"
              alt="Maison BeYou"
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'contain',
                margin: '0 auto 12px auto',
                display: 'block',
                filter: 'drop-shadow(0 2px 6px rgba(184, 139, 74, 0.25))'
              }}
            />
            <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '4px' }}>
              CONFIRM & SUBMIT VISIT
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Please review all visit details before creating permanent records
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.08em' }}>
                CLIENT
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                {activeClientName}
              </div>
              <div style={{ fontSize: '13px', color: '#B88B4A', fontWeight: '500' }}>
                {formatPhone(activeClientPhone)} ({clientType === 'new' ? 'New Client Registration' : 'Regular Client'})
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '6px' }}>
                SERVICES & STAFF
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedServices.map(s => {
                  const staffMember = staffList.find(st => st.staff_id === s.staff_id);
                  return (
                    <div key={s.temp_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                        • {s.service_name} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({staffMember?.name || 'Staff'})</span>
                      </span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(s.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                  TOTAL
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                  PAID ({paymentMethod})
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#166534', marginTop: '2px' }}>
                  {formatCurrency(effectivePaid)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                  BALANCE
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: calculatedBalance > 0 ? '#DC2626' : '#1C1917', marginTop: '2px' }}>
                  {formatCurrency(calculatedBalance)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', padding: '15px', fontSize: '16px', fontWeight: '700' }}
          >
            {isSubmitting ? 'Recording Visit & Updating History...' : (
              <>
                <CheckCircle2 size={18} />
                CONFIRM & SUBMIT
              </>
            )}
          </button>
        </div>

        {/* Success Modal */}
        {completedVisitResult && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div className="card animate-fade-in" style={{
              maxWidth: '460px',
              width: '100%',
              padding: '36px 30px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: '#166534',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '8px' }}>
                Visit Successfully Recorded!
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
                Client service history, lifetime spend, and studio revenue metrics have been updated in real-time.
              </p>

              <button
                onClick={() => onComplete(completedVisitResult.visit?.visit_id)}
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '15px' }}
              >
                Return to Dashboard
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
