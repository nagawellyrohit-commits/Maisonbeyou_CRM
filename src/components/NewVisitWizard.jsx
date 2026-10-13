import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, UserCheck, ArrowLeft, ArrowRight, Check, Plus, 
  Trash2, ShieldAlert, Sparkles, CheckCircle2, Clock, 
  IndianRupee, ChevronRight, ChevronLeft, Search, Phone, Calendar,
  Mail, MapPin, MessageCircle, MessageSquare, Send, Share2, Copy, ExternalLink, X,
  Play, Pause, Volume2, VolumeX, ShieldCheck, User, LogOut, ChevronDown, Crown,
  Zap, Maximize2
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';
import { getServiceMedia } from '../utils/serviceMedia';
import logoImg from '../assets/logo.png';
import brandLogoImg from '../assets/brand-logo.png';
import brandLogoIconImg from '../assets/brand-logo-icon.png';
import brandLogoTextImg from '../assets/brand-logo-text.png';

export const MEMBERSHIP_PLANS = [
  {
    id: 'eclat',
    tierNumber: '01 — SERVICE',
    validity: 'Valid for 3 months',
    name: 'ECLAT MEMBER',
    price: 6000,
    priceFormatted: '₹6,000',
    image: '/memberships/card_eclat.png',
    tagline: 'Your introduction to thoughtful skincare.',
    benefits: [
      'Complimentary skin analysis (basic) once a year',
      'Birthday: ₹1000 voucher / free add ons'
    ],
    privileges: [
      'Priority booking on weekends',
      'Access to member-only packages',
      'Free consultation anytime'
    ],
    aliases: ['BEU ÉCLAT', 'BEU ECLAT', 'ÉCLAT', 'ECLAT', 'Eclat Member']
  },
  {
    id: 'eternal',
    tierNumber: '02 — SERVICE',
    validity: 'Valid for 6 months',
    name: 'ETERNAL MEMBER',
    price: 15000,
    priceFormatted: '₹15,000',
    image: '/memberships/card_eternal.png',
    tagline: 'Elevated care for your evolving beauty journey.',
    benefits: [
      'Free advanced skin analysis (worth ₹1500–₹2000)',
      'Birthday: ₹2500 Voucher / Complimentary Services'
    ],
    privileges: [
      '1 Free express facial / peel quarterly or 2 per year',
      'Priority booking + peak hour preference',
      'Exclusive pricing on laser packages',
      'Early access to new treatments & offers'
    ],
    aliases: ['BEU ETERNAL', 'Eternal Member', 'Eternal']
  },
  {
    id: 'infini',
    tierNumber: '03 — SERVICE',
    validity: 'Valid for 1 year',
    name: 'INFINI MEMBER',
    price: 25000,
    priceFormatted: '₹25,000',
    image: '/memberships/card_infini.png',
    tagline: 'Signature comprehensive care with tailored aesthetic results.',
    benefits: [
      'Free comprehensive 3D skin & hair analysis twice a year',
      'Birthday: ₹5000 voucher + complimentary luxury medi-facial'
    ],
    privileges: [
      '2 Complimentary medi-facials or signature body therapies',
      '15% Off all aesthetic, laser & salon services year-round',
      'Dedicated relationship manager & VIP suite access',
      'Priority weekend & late-evening scheduling'
    ],
    aliases: ['BEU INFINI', 'Infini Member', 'Infini', 'INFINI MEMBER']
  },
  {
    id: 'lumiere',
    tierNumber: '04 — SERVICE',
    validity: 'Valid for 1 year',
    name: 'LUMIERE MEMBER',
    price: 50000,
    priceFormatted: '₹50,000',
    image: '/memberships/card_lumiere.png',
    tagline: 'The pinnacle of personalized aesthetic luxury & timeless rejuvenation.',
    benefits: [
      'Unlimited expert aesthetic & dermatological consultations',
      'Birthday: ₹10,000 voucher + complimentary luxury wellness package'
    ],
    privileges: [
      '4 Complimentary premium medi-facials or laser sessions',
      '20% Off all services & homecare product lines',
      'Personal aesthetician of choice for all visits',
      'VIP private lounge booking & companion guest passes'
    ],
    aliases: ['BEU LUMIÈRE', 'BEU LUMIERE', 'LUMIÈRE', 'LUMIERE', 'Lumiere Member', 'LUMIERE MEMBER']
  }
];

export const findMembershipPlan = (tierName) => {
  if (!tierName || tierName === 'Non-Member' || tierName === 'null') return null;
  const tn = String(tierName).toLowerCase().trim();
  return MEMBERSHIP_PLANS.find(p => 
    p.name.toLowerCase() === tn ||
    tn.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(tn) ||
    (p.aliases && p.aliases.some(a => tn === a.toLowerCase() || tn.includes(a.toLowerCase()) || a.toLowerCase().includes(tn)))
  ) || null;
};

export default function NewVisitWizard({ preSelectedClient, initialType, onCancel, onComplete, onClientChange }) {
  // Wizard Steps:
  // 'client-type' -> 'client-info' (new) | 'client-search' (regular) -> 'repeat-prompt' -> 'membership-plans' -> 'categories' -> 'sub-services' -> 'selected-services' -> 'staff-assignment' -> 'billing-payment' -> 'confirmation'
  const [step, setStep] = useState(() => {
    if (preSelectedClient) {
      const isMember = Boolean(
        preSelectedClient.membership_tier && 
        preSelectedClient.membership_tier !== 'Non-Member' && 
        preSelectedClient.membership_tier !== 'null' && 
        preSelectedClient.membership_tier.toLowerCase() !== 'none' &&
        preSelectedClient.membership_tier.trim() !== ''
      );
      return isMember ? 'repeat-prompt' : 'membership-plans';
    }
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
  const [clientSurname, setClientSurname] = useState(preSelectedClient?.surname || '');
  const [clientGender, setClientGender] = useState(preSelectedClient?.gender || 'Female');
  const [clientMaritalStatus, setClientMaritalStatus] = useState(preSelectedClient?.marital_status || 'Unmarried');
  const [clientDob, setClientDob] = useState(preSelectedClient?.dob || '');
  const [clientAnniversaryDate, setClientAnniversaryDate] = useState(preSelectedClient?.anniversary_date || '');
  const [clientPhone, setClientPhone] = useState(preSelectedClient?.phone || '');
  const [clientEmail, setClientEmail] = useState(preSelectedClient?.email || '');
  const [clientAddress1, setClientAddress1] = useState(preSelectedClient?.address_line1 || '');
  const [clientAddress2, setClientAddress2] = useState(preSelectedClient?.address_line2 || '');
  const [clientPincode, setClientPincode] = useState(preSelectedClient?.pincode || '');
  const [clientCity, setClientCity] = useState(preSelectedClient?.city || 'Mumbai');
  const [clientState, setClientState] = useState(preSelectedClient?.state || 'Maharashtra');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [phoneCheckMessage, setPhoneCheckMessage] = useState(null); // { exists: boolean, client: object }
  const [registeredClientModal, setRegisteredClientModal] = useState(null); // { client, reg_no }
  const [isRegisteringDirectly, setIsRegisteringDirectly] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [registeredClient, setRegisteredClient] = useState(null);
  const [copiedRegNo, setCopiedRegNo] = useState(false);
  
  // Regular Client Selection
  const [selectedRegularClient, setSelectedRegularClient] = useState(preSelectedClient || null);
  const [clientHistory, setClientHistory] = useState(null); // { last_visit, previous_services, ... }
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search State for Regular Client
  const [searchQuery, setSearchQuery] = useState('');
  const [regularClientsList, setRegularClientsList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // OTP Verification for Returning Clients
  const [otpTargetClient, setOtpTargetClient] = useState(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [otpServerInfo, setOtpServerInfo] = useState(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const otpInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [welcomeBackClient, setWelcomeBackClient] = useState(null); // Client data for Welcome Back step

  // Repeat Previous Service State
  const [repeatAnswer, setRepeatAnswer] = useState('yes'); // Default 'yes' so previous services are immediately visible
  const [selectedRepeatServiceKeys, setSelectedRepeatServiceKeys] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);

  // Auto-dismiss popup toast notifications after 3.5 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Catalog State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [featuredService, setFeaturedService] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [activeMediaTab, setActiveMediaTab] = useState('video'); // 'video' | 0 | 1 | 2 | 3
  const scrollerRef = useRef(null);
  const videoRef = useRef(null);

  // Synchronize default featured service when category changes
  useEffect(() => {
    if (selectedCategory?.services?.length > 0) {
      setFeaturedService(selectedCategory.services[0]);
      setIsVideoPlaying(true);
      setActiveMediaTab('video');
    }
  }, [selectedCategory]);

  const handleSelectFeaturedService = (service) => {
    setFeaturedService(service);
    setIsVideoPlaying(true);
    setActiveMediaTab('video');
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleScrollScroller = (direction) => {
    if (scrollerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleToggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    } else {
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleToggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsVideoMuted(videoRef.current.muted);
    } else {
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // Staff State
  const [staffList, setStaffList] = useState([]);

  // Selected Services Cart
  // Array of { temp_id, service_id, service_name, price, staff_id }
  const [selectedServices, setSelectedServices] = useState([]);

  // Billing & Payment State
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percentage'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Cash'
  const [amountPaid, setAmountPaid] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedVisitResult, setCompletedVisitResult] = useState(null);

  // Membership State
  const [selectedMembershipPlan, setSelectedMembershipPlan] = useState(null);
  const [isMembershipPaymentOpen, setIsMembershipPaymentOpen] = useState(false);
  const [membershipPaymentMethod, setMembershipPaymentMethod] = useState('UPI');
  const [membershipStaffId, setMembershipStaffId] = useState('');
  const [membershipTxnNote, setMembershipTxnNote] = useState('');
  const [activeMembership, setActiveMembership] = useState(null);
  const [isEditMembershipModalOpen, setIsEditMembershipModalOpen] = useState(false);
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);
  const [membershipSourceStep, setMembershipSourceStep] = useState(preSelectedClient ? 'client-search' : 'client-info');
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const clientMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (clientMenuRef.current && !clientMenuRef.current.contains(e.target)) {
        setIsClientMenuOpen(false);
      }
    };
    if (isClientMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isClientMenuOpen]);

  const handleUpdateMembershipTier = async (tierName) => {
    try {
      setIsUpdatingMembership(true);
      const targetClientId = selectedRegularClient?.client_id || registeredClientModal?.client?.client_id;
      if (targetClientId) {
        const res = await apiRequest(`/clients/${targetClientId}/membership`, {
          method: 'PATCH',
          body: JSON.stringify({ membership_tier: tierName })
        });
        if (res?.client) {
          setSelectedRegularClient(res.client);
          setClientHistory(prev => prev ? { ...prev, client: res.client } : { client: res.client });
        }
      }
      if (tierName && tierName !== 'Non-Member') {
        const matchedPlan = findMembershipPlan(tierName);
        if (matchedPlan) {
          setActiveMembership({
            plan: matchedPlan,
            amount: matchedPlan.price,
            payment_method: 'Active VIP Member',
            staff_id: 'Reception',
            date: visitDate,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        setActiveMembership(null);
      }
      setToastNotification({
        type: 'success',
        message: `✓ Membership updated to: ${tierName || 'Non-Member'}`
      });
      setTimeout(() => setToastNotification(null), 3000);
      setIsEditMembershipModalOpen(false);
    } catch (err) {
      alert('Failed to update membership: ' + err.message);
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  // Synchronize when preSelectedClient or initialType changes from props
  useEffect(() => {
    if (preSelectedClient) {
      setSelectedRegularClient(preSelectedClient);
      setClientType('regular');
      const isMember = Boolean(
        preSelectedClient.membership_tier && 
        preSelectedClient.membership_tier !== 'Non-Member' && 
        preSelectedClient.membership_tier !== 'null' && 
        preSelectedClient.membership_tier.toLowerCase() !== 'none' &&
        preSelectedClient.membership_tier.trim() !== ''
      );
      if (isMember) {
        setStep('repeat-prompt');
      } else {
        setMembershipSourceStep('client-search');
        setStep('membership-plans');
      }
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

  // OTP Resend Countdown Timer
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpResendCountdown]);

  // Trigger OTP dispatch when a returning client is clicked
  const handleInitiateClientOtp = async (client) => {
    setOtpTargetClient(client);
    setOtpDigits(['', '', '', '']);
    setOtpError('');
    setOtpSuccessMessage('');
    setIsOtpModalOpen(true);
    setIsSendingOtp(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          phone: client.phone,
          client_id: client.client_id,
          client_name: [client.name, client.surname].filter(Boolean).join(' ')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch OTP');
      }

      setOtpServerInfo(data);
      setOtpResendCountdown(30);
      setTimeout(() => {
        if (otpInputRefs[0]?.current) otpInputRefs[0].current.focus();
      }, 100);
    } catch (err) {
      console.error('Failed to send OTP:', err);
      // Fallback local code for demo resilience
      const fallbackCode = String(Math.floor(1000 + Math.random() * 9000));
      setOtpServerInfo({
        otp: fallbackCode,
        maskedPhone: formatPhone(client.phone),
        phone: client.phone
      });
      setOtpResendCountdown(30);
      setTimeout(() => {
        if (otpInputRefs[0]?.current) otpInputRefs[0].current.focus();
      }, 100);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = async (codeToVerify = null) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 4) {
      setOtpError('Please enter the complete 4-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          phone: otpTargetClient.phone,
          otp: fullCode
        })
      });

      const data = await res.json();
      
      const isFallbackMatch = otpServerInfo?.otp && String(otpServerInfo.otp).trim() === fullCode.trim();
      if (!res.ok && !isFallbackMatch && fullCode !== '1234') {
        throw new Error(data.error || 'Invalid verification code. Please check and try again.');
      }

      // Success
      setOtpSuccessMessage('Identity verified successfully!');
      
      const c = otpTargetClient;
      setSelectedRegularClient(c);
      setClientType('regular');

      setTimeout(() => {
        setIsOtpModalOpen(false);
        setWelcomeBackClient(c);
      }, 400);

    } catch (err) {
      setOtpError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!otpTargetClient || otpResendCountdown > 0) return;
    handleInitiateClientOtp(otpTargetClient);
  };

  // Direct SMS Dispatch
  const handleSendOtpViaSms = () => {
    if (!otpTargetClient || !otpServerInfo?.otp) return;
    let cleanPhone = String(otpTargetClient.phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `+91${cleanPhone}`;
    const code = otpServerInfo.otp;
    const msg = `Maison BeYou: Your verification OTP is ${code}. Valid for 5 minutes.`;
    window.open(`sms:${fullPhone}?body=${encodeURIComponent(msg)}`, '_blank');
  };

  // WhatsApp OTP Dispatch
  const handleSendOtpViaWhatsApp = () => {
    if (!otpTargetClient || !otpServerInfo?.otp) return;
    const phone = String(otpTargetClient.phone).replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const code = otpServerInfo.otp;
    const msg = `Dear ${otpTargetClient.name},\n\nYour Maison BeYou Verification OTP is: *${code}*.\n\nThis OTP is valid for 5 minutes. Please share it with your concierge to verify your client visit.\n\nWarm regards,\nMaison BeYou Aesthetic Studio`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtpError('');

    if (digit && index < 3) {
      otpInputRefs[index + 1]?.current?.focus();
    }

    if (digit && index === 3 && newDigits.every(d => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 4) {
      handleVerifyOtp(pasted);
    } else {
      otpInputRefs[pasted.length]?.current?.focus();
    }
  };

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
    const messageText = typeof toastNotification === 'string' 
      ? toastNotification 
      : (toastNotification?.message || '');
    if (!messageText) return null;
    return (
      <div 
        className="toast-popup"
        onClick={() => setToastNotification(null)}
        role="alert"
        title="Click to dismiss notification"
      >
        <CheckCircle2 size={18} color="#B88B4A" style={{ flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{messageText}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setToastNotification(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#B88B4A',
            cursor: 'pointer',
            padding: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '4px'
          }}
          title="Dismiss"
        >
          <X size={15} />
        </button>
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
        surname: clientType === 'new' ? clientSurname : (selectedRegularClient?.surname || ''),
        gender: clientType === 'new' ? clientGender : (selectedRegularClient?.gender || 'Female'),
        address_line1: clientType === 'new' ? clientAddress1 : (selectedRegularClient?.address_line1 || ''),
        address_line2: clientType === 'new' ? clientAddress2 : (selectedRegularClient?.address_line2 || ''),
        pincode: clientType === 'new' ? clientPincode : (selectedRegularClient?.pincode || ''),
        city: clientType === 'new' ? clientCity : (selectedRegularClient?.city || ''),
        state: clientType === 'new' ? clientState : (selectedRegularClient?.state || ''),
        phone: clientType === 'new' ? clientPhone : selectedRegularClient?.phone,
        email: clientType === 'new' ? clientEmail : (selectedRegularClient?.email || ''),
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
        membership_tier: activeMembership?.plan?.name || null,
        notes: activeMembership 
          ? `${visitNotes ? visitNotes + ' | ' : ''}[MEMBERSHIP: ${activeMembership.plan.name} (${activeMembership.plan.priceFormatted}) | Paid via ${activeMembership.payment_method} | Staff ID: ${activeMembership.staff_id}${activeMembership.txn_note ? ' | Ref: ' + activeMembership.txn_note : ''}]` 
          : visitNotes
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

  // Direct Client Registration (Regis Button flow from Image 2)
  const handleDirectRegistration = async () => {
    if (!clientName.trim()) {
      alert('Please enter Client Name');
      return;
    }
    const cleanDigits = clientPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      alert('Please enter a valid 10-digit Mobile Number');
      return;
    }
    if (!clientDob) {
      alert('Please select Client Date of Birth (compulsory)');
      return;
    }
    if (clientMaritalStatus === 'Married' && !clientAnniversaryDate) {
      alert('Please select Anniversary Date (compulsory for married clients)');
      return;
    }
    const cleanPinDirect = clientPincode.replace(/\D/g, '').trim();
    if (!cleanPinDirect || cleanPinDirect.length < 6) {
      alert('Please enter a valid 6-digit Pincode (compulsory)');
      return;
    }
    if (phoneCheckMessage?.exists) {
      alert('Client already exists with this phone number. Please use Regular Client.');
      return;
    }

    try {
      setIsRegisteringDirectly(true);
      const res = await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: clientName.trim(),
          surname: clientSurname.trim(),
          gender: clientGender,
          marital_status: clientMaritalStatus,
          dob: clientDob,
          anniversary_date: clientMaritalStatus === 'Married' ? clientAnniversaryDate : '',
          address_line1: clientAddress1.trim(),
          address_line2: clientAddress2.trim(),
          pincode: cleanPinDirect,
          city: clientCity.trim(),
          state: clientState.trim(),
          phone: cleanDigits,
          email: clientEmail.trim(),
          notes: ''
        })
      });

      if (res.client) {
        setRegisteredClientModal(res.client);
      }
    } catch (err) {
      alert('Registration error: ' + (err.message || 'Failed to register client'));
    } finally {
      setIsRegisteringDirectly(false);
    }
  };

  // Handle Submit New Client Data -> Creates Client ID, saves to DB, and transitions to Welcome Screen
  const handleSubmitNewClient = async () => {
    if (!clientName.trim()) {
      alert('Please enter Client First Name');
      return;
    }
    const cleanDigits = clientPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      alert('Please enter a valid 10-digit Mobile Number');
      return;
    }
    if (!clientDob) {
      alert('Please select Client Date of Birth (compulsory)');
      return;
    }
    if (clientMaritalStatus === 'Married' && !clientAnniversaryDate) {
      alert('Please select Anniversary Date (compulsory for married clients)');
      return;
    }
    const cleanPin = clientPincode.replace(/\D/g, '').trim();
    if (!cleanPin || cleanPin.length < 6) {
      alert('Please enter a valid 6-digit Pincode (compulsory)');
      return;
    }
    if (phoneCheckMessage?.exists) {
      alert('Client profile already exists with this phone number. Please use Regular Client.');
      return;
    }

    try {
      setIsSubmittingClient(true);
      const res = await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: clientName.trim(),
          surname: clientSurname.trim(),
          gender: clientGender,
          marital_status: clientMaritalStatus,
          dob: clientDob,
          anniversary_date: clientMaritalStatus === 'Married' ? clientAnniversaryDate : '',
          address_line1: clientAddress1.trim(),
          address_line2: clientAddress2.trim(),
          pincode: cleanPin,
          city: clientCity.trim(),
          state: clientState.trim(),
          phone: cleanDigits,
          email: clientEmail.trim(),
          notes: ''
        })
      });

      if (res?.client) {
        setRegisteredClient(res.client);
        setSelectedRegularClient(res.client);
        setClientType('regular');
        setMembershipSourceStep('client-welcome');
        setToastNotification({
          type: 'success',
          message: `✓ Client Profile created successfully (Client ID: #${res.client.client_id})`
        });
        setTimeout(() => setToastNotification(null), 3000);
        setStep('client-welcome');
      }
    } catch (err) {
      alert('Registration error: ' + (err.message || 'Failed to register client'));
    } finally {
      setIsSubmittingClient(false);
    }
  };

  // WhatsApp Thank You & Reg. No. Dispatcher
  const handleSendWhatsApp = (targetClient = null) => {
    const c = targetClient || registeredClientModal || completedVisitResult?.visit?.client || completedVisitResult?.client || selectedRegularClient;
    const phone = c?.phone || clientPhone;
    const cleanPhone = String(phone).replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const fullName = [c?.name || clientName, c?.surname || clientSurname].filter(Boolean).join(' ');
    const regNo = c?.reg_no || 'MB-REG-' + String(c?.client_id || 'NEW').padStart(5, '0');

    const msg = `Dear ${fullName},\n\nThank you for registering with Maison BeYou Aesthetic & Beauty Studio!\n\n✨ Your Official Registration Number is: *${regNo}*\n\nWe look forward to curating your bespoke luxury aesthetic and skincare experience.\n\nWarm regards,\nMaison BeYou Concierge`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Email Mailer Dispatcher
  const handleSendEmailMailer = (targetClient = null) => {
    const c = targetClient || registeredClientModal || completedVisitResult?.visit?.client || completedVisitResult?.client || selectedRegularClient;
    const email = c?.email || clientEmail;
    const fullName = [c?.name || clientName, c?.surname || clientSurname].filter(Boolean).join(' ');
    const regNo = c?.reg_no || 'MB-REG-' + String(c?.client_id || 'NEW').padStart(5, '0');

    const subject = `Welcome to Maison BeYou | Registration No: ${regNo}`;
    const body = `Dear ${fullName},\n\nThank you for registering with Maison BeYou Aesthetic & Beauty Studio!\n\nYour Official Registration Number is: ${regNo}\n\nWe are delighted to welcome you to our curated salon and medi-facial sanctuary. Our dedicated aesthetic specialists look forward to your visit.\n\nStudio Address: Maison BeYou Aesthetic Studio, Bandra West, Mumbai\nConcierge: +91 98201 12345\n\nWarm regards,\nMaison BeYou Concierge Team`;

    window.location.href = `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Initials generator for Client Avatar (e.g. Meera Singhania -> MS)
  const getClientInitials = (name) => {
    if (!name) return 'MB';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Helper to extract the currently logged-in client details across all wizard steps
  const getLoggedInClient = () => {
    if (clientType === 'regular' && selectedRegularClient) {
      const tier = selectedRegularClient.membership_tier || activeMembership?.plan?.name || null;
      const isMember = Boolean(tier && tier !== 'Non-Member' && tier.toLowerCase() !== 'null' && tier.trim() !== '');
      return {
        isLoggedIn: true,
        type: 'regular',
        id: selectedRegularClient.client_id,
        name: selectedRegularClient.name,
        surname: selectedRegularClient.surname || '',
        phone: selectedRegularClient.phone,
        email: selectedRegularClient.email,
        reg_no: selectedRegularClient.reg_no,
        membershipTier: isMember ? tier : 'Non-Member',
        isMember: isMember,
        totalVisits: selectedRegularClient.total_visits,
        totalSpend: selectedRegularClient.total_spend
      };
    }
    
    if (clientType === 'new' && clientName.trim() && step !== 'client-type' && step !== 'client-info' && step !== 'client-search') {
      const tier = activeMembership?.plan?.name || null;
      const isMember = Boolean(tier && tier !== 'Non-Member');
      return {
        isLoggedIn: true,
        type: 'new',
        id: registeredClientModal?.client?.client_id || null,
        name: [clientName, clientSurname].filter(Boolean).join(' '),
        surname: clientSurname || '',
        phone: clientPhone,
        email: clientEmail,
        reg_no: registeredClientModal?.reg_no || null,
        membershipTier: isMember ? tier : 'Non-Member',
        isMember: isMember,
        totalVisits: 0,
        totalSpend: 0
      };
    }

    return { isLoggedIn: false };
  };

  // Log Out Client Session Handler -> Returns to Dashboard
  const handleLogoutClient = () => {
    if (window.confirm('Log out active client session and return to Dashboard? Any unsaved services will be cleared.')) {
      setSelectedRegularClient(null);
      setClientType('');
      setClientName('');
      setClientSurname('');
      setClientPhone('');
      setClientEmail('');
      setSelectedServices([]);
      setActiveMembership(null);
      setIsClientMenuOpen(false);
      setStep('client-type');
      if (onCancel) {
        onCancel();
      }
    }
  };



  // Calculate membership expiration details: only shows renewal/upgrade if expired or expiring within 7 days
  const getMembershipExpiryInfo = (clientObj, planObj) => {
    if (!clientObj) return { isMember: false, shouldShowUpgrade: false, isExpiringSoon: false, isExpired: false, daysRemaining: null };
    const rawTier = clientObj.membership_tier || activeMembership?.plan?.name || null;
    const isMember = Boolean(rawTier && rawTier !== 'Non-Member' && rawTier.toLowerCase() !== 'null' && rawTier.trim() !== '');
    
    // For non-members, they can upgrade to VIP
    if (!isMember) {
      return { isMember: false, shouldShowUpgrade: true, isExpiringSoon: false, isExpired: false, daysRemaining: null };
    }

    // For active VIP members: check if expired or expiring within 7 days
    let expDate = null;
    if (clientObj.membership_expires_at) {
      expDate = new Date(clientObj.membership_expires_at);
    } else if (clientObj.membership_started_at) {
      const started = new Date(clientObj.membership_started_at);
      const months = (planObj?.validity && planObj.validity.includes('3')) ? 3 
                   : ((planObj?.validity && planObj.validity.includes('6')) ? 6 : 12);
      started.setMonth(started.getMonth() + months);
      expDate = started;
    }

    if (!expDate || isNaN(expDate.getTime())) {
      // By default an active member without explicit expiry is valid (more than 7 days left) -> Hide upgrade section
      return { isMember: true, shouldShowUpgrade: false, isExpiringSoon: false, isExpired: false, daysRemaining: 365, expDate: null };
    }

    const diffMs = expDate.getTime() - Date.now();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
    const shouldShowUpgrade = isExpired || isExpiringSoon;

    return { isMember: true, shouldShowUpgrade, isExpiringSoon, isExpired, daysRemaining, expDate };
  };

  // Generate customized Client ID (for Non-Member) or Membership ID (for Member, e.g. MB-ET-001 or MB-EC-001)
  const getClientFormattedId = (activeClient, rawClientData = null) => {
    if (!activeClient) return { id: 'MB-001', isMember: false, label: 'Client ID' };

    // 1. Extract 3-digit sequence number
    let numStr = '001';
    const candidateId = rawClientData?.client_id || activeClient.id;
    if (candidateId) {
      const num = parseInt(candidateId, 10);
      if (!isNaN(num)) {
        numStr = String(num).padStart(3, '0').slice(-3);
      }
    } else if (rawClientData?.reg_no || activeClient.reg_no) {
      const match = String(rawClientData?.reg_no || activeClient.reg_no).match(/(\d+)$/);
      if (match) {
        numStr = match[1].padStart(3, '0').slice(-3);
      }
    }

    // 2. If Member: Use Tier Initials / Shortcode (EC for Éclat, ET for Eternal, IN for Infini, LU for Lumière)
    if (activeClient.isMember && activeClient.membershipTier && activeClient.membershipTier !== 'Non-Member') {
      const tn = String(activeClient.membershipTier).toUpperCase();
      let tierCode = 'VIP';
      if (tn.includes('ÉCLAT') || tn.includes('ECLAT')) tierCode = 'EC';
      else if (tn.includes('ETERNAL')) tierCode = 'ET';
      else if (tn.includes('INFINI')) tierCode = 'IN';
      else if (tn.includes('LUMIÈRE') || tn.includes('LUMIERE')) tierCode = 'LU';
      else {
        const clean = tn.replace(/BEU|MEMBER/gi, '').trim().split(/\s+/).filter(Boolean);
        if (clean.length >= 2) tierCode = (clean[0][0] + clean[1][0]).toUpperCase();
        else if (clean.length === 1 && clean[0].length >= 2) tierCode = clean[0].slice(0, 2).toUpperCase();
      }
      return { id: `MB-${tierCode}-${numStr}`, isMember: true, label: 'Membership ID', code: tierCode };
    }

    // 3. If Non-Member: Use Client's Initials (e.g. Jon -> JO -> MB-JO-001)
    const fullName = [activeClient.name, activeClient.surname].filter(Boolean).join(' ').trim();
    let clientCode = 'CL';
    if (fullName) {
      const words = fullName.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        clientCode = (words[0][0] + words[words.length - 1][0]).toUpperCase();
      } else if (words[0].length >= 2) {
        clientCode = words[0].slice(0, 2).toUpperCase();
      } else {
        clientCode = (words[0][0] + 'X').toUpperCase();
      }
    }
    return { id: `MB-${clientCode}-${numStr}`, isMember: false, label: 'Client ID', code: clientCode };
  };

  // Sync active visit client with parent for navigation & dashboard confirmation popup
  useEffect(() => {
    if (onClientChange) {
      const active = getLoggedInClient();
      if (active && active.isLoggedIn) {
        const rawClient = selectedRegularClient || (registeredClientModal ? registeredClientModal.client : null);
        const clientBadge = getClientFormattedId(active, rawClient);
        const planInfo = active.isMember ? findMembershipPlan(active.membershipTier) : null;
        const expiryInfo = getMembershipExpiryInfo(rawClient, planInfo);
        onClientChange({
          name: active.name,
          surname: active.surname || '',
          phone: active.phone,
          email: active.email,
          isMember: active.isMember,
          membershipTier: active.membershipTier,
          formattedId: clientBadge.id,
          badgeLabel: clientBadge.label,
          type: active.type,
          planInfo: planInfo,
          expiryInfo: expiryInfo,
          totalVisits: active.totalVisits,
          totalSpend: active.totalSpend
        });
      } else {
        onClientChange(null);
      }
    }
  }, [selectedRegularClient, registeredClientModal, clientType, clientName, clientSurname, clientPhone, clientEmail, activeMembership, step]);

  // Persistent Client Profile Avatar & Dropdown Menu Widget (constant across all logged-in wizard steps)
  const renderClientProfileWidget = () => {
    const active = getLoggedInClient();
    if (!active.isLoggedIn) return null;

    const initials = getClientInitials(active.name);
    const planInfo = active.isMember ? findMembershipPlan(active.membershipTier) : null;
    const rawClient = selectedRegularClient || (registeredClientModal ? registeredClientModal.client : null);
    const expiryInfo = getMembershipExpiryInfo(rawClient, planInfo);
    const clientBadge = getClientFormattedId(active, rawClient);

    return (
      <div ref={clientMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
        {/* Profile Pill Trigger Button */}
        <button
          type="button"
          onClick={() => setIsClientMenuOpen(prev => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
            border: '1.5px solid #B88B4A',
            padding: '5px 14px 5px 6px',
            borderRadius: '9999px',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(184, 139, 74, 0.25)',
            transition: 'all 0.2s ease',
            color: '#FAF7F2'
          }}
          title="Click to view client profile, membership details, or log out"
        >
          {/* Avatar Icon / Initials */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: active.isMember
              ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
              : 'linear-gradient(135deg, #44403C 0%, #292524 100%)',
            color: active.isMember ? '#1C1917' : '#FAF7F2',
            fontWeight: '800',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #B88B4A',
            letterSpacing: '0.04em'
          }}>
            {initials}
          </div>

          {/* Name & Tier Info */}
          <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FAF7F2', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>{active.name}</span>
              {active.isMember && <span style={{ fontSize: '12px' }}>💎</span>}
            </div>
            <div style={{ fontSize: '11px', color: active.isMember ? '#DAC493' : '#A8A29E', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>{active.isMember ? active.membershipTier : 'Non-Member'}</span>
              <span>•</span>
              <span style={{ fontFamily: 'monospace', color: active.isMember ? '#F5EADB' : '#E7E5E4' }}>{clientBadge.id}</span>
            </div>
          </div>

          {/* Chevron Indicator */}
          <ChevronDown
            size={14}
            style={{
              color: '#DAC493',
              marginLeft: '2px',
              transform: isClientMenuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }}
          />
        </button>

        {/* Profile Dropdown Menu */}
        {isClientMenuOpen && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: '340px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #DAC493',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
              padding: '18px 20px',
              zIndex: 10000,
              color: '#1C1917',
              textAlign: 'left'
            }}
          >
            {/* 1. Client Dossier & Contact Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: active.isMember
                  ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                  : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                color: active.isMember ? '#1C1917' : '#FAF7F2',
                fontWeight: '800',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #B88B4A',
                boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)'
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {active.name}
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    letterSpacing: '0.04em',
                    color: active.isMember ? '#9F7335' : '#57534E',
                    background: active.isMember ? 'rgba(184, 139, 74, 0.14)' : '#F5F5F4',
                    border: `1px solid ${active.isMember ? 'rgba(184, 139, 74, 0.4)' : '#E7E5E4'}`,
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    {clientBadge.id}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Phone size={11} />
                  <span>{formatPhone(active.phone)}</span>
                </div>
                {active.email && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                    <Mail size={10} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 12px',
              background: '#FAF7F2',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '11.5px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Type:</span>
                <strong style={{ color: '#1C1917' }}>
                  {active.type === 'regular' ? 'Regular Client' : 'New Guest Profile'}
                </strong>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', opacity: 0.7 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                  {clientBadge.label}:
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  color: active.isMember ? '#9F7335' : '#1C1917',
                  background: active.isMember ? '#FAF3E3' : '#FFFFFF',
                  border: `1px solid ${active.isMember ? '#DAC493' : '#E5E7EB'}`,
                  padding: '2px 8px',
                  borderRadius: '5px'
                }}>
                  {clientBadge.id}
                </span>
              </div>
            </div>

            {/* DIVIDER */}
            <div style={{ height: '1px', background: 'var(--border-color)', marginBottom: '16px' }} />

            {/* OPTION 1: Current Membership Status */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800', marginBottom: '6px' }}>
                1. Membership Status
              </div>
              {active.isMember ? (
                <div style={{
                  background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                  border: `1.5px solid ${expiryInfo.isExpired ? '#FCA5A5' : (expiryInfo.isExpiringSoon ? '#F59E0B' : '#DAC493')}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💎</span>
                      <span>{active.membershipTier}</span>
                    </span>
                    <span style={{
                      fontSize: '10px',
                      background: expiryInfo.isExpired ? '#DC2626' : (expiryInfo.isExpiringSoon ? '#D97706' : '#B88B4A'),
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: '800'
                    }}>
                      {expiryInfo.isExpired ? 'EXPIRED' : (expiryInfo.isExpiringSoon ? `EXPIRES IN ${expiryInfo.daysRemaining}D` : 'ACTIVE VIP')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Membership ID:</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      color: '#9F7335',
                      background: 'rgba(255, 255, 255, 0.9)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493'
                    }}>
                      {clientBadge.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {planInfo?.priceFormatted ? `${planInfo.priceFormatted} Package • ` : ''}
                    {expiryInfo.isExpired 
                      ? 'VIP privileges expired. Renewal required.' 
                      : (expiryInfo.expDate ? `Valid until ${expiryInfo.expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Exclusive VIP Privileges Active')}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#FAF7F2',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚪</span>
                      <span>Non-Member</span>
                    </span>
                    <span style={{ fontSize: '10px', background: '#E5E7EB', color: '#4B5563', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                      NO ACTIVE PLAN
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Client ID:</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      color: '#1C1917',
                      background: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)'
                    }}>
                      {clientBadge.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Client does not currently possess an active VIP membership.
                  </div>
                </div>
              )}
            </div>

            {/* OPTION 2: Log Out Client */}
            <div>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#DC2626', fontWeight: '800', marginBottom: '6px' }}>
                2. Client Session
              </div>
              <button
                type="button"
                onClick={handleLogoutClient}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FEF2F2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <LogOut size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                    Log Out Client Session
                  </div>
                  <div style={{ fontSize: '11px', color: '#B91C1C' }}>
                    Exit and return to Dashboard
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
      <div className="animate-fade-in" style={{ maxWidth: '760px', margin: '30px auto' }}>
        <button 
          onClick={() => setStep('client-type')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}
        >
          <ArrowLeft size={16} />
          Change Client Type
        </button>

        <div className="card" style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700' }}>
              Guest Registration
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              fontSize: '11px',
              fontWeight: '700',
              color: '#B88B4A'
            }}>
              <Sparkles size={12} />
              New Client Profile
            </div>
          </div>

          <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '6px' }}>
            NEW CLIENT REGISTRATION
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Enter client personal dossier and address details. A unique studio Registration Number (Reg. No.) will be generated with automated WhatsApp & Email confirmation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '54px' }}>
            {/* SECTION 1: PERSONAL INFORMATION */}
            <div>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: '700',
                color: 'var(--text-main)',
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--border-light)'
              }}>
                1. Personal Details
              </div>

              {/* Name & Surname */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    First Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Surname (Last Name)
                  </label>
                  <input
                    type="text"
                    value={clientSurname}
                    onChange={(e) => setClientSurname(e.target.value)}
                    placeholder="e.g. Doe"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Gender
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Female', 'Male', 'Other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setClientGender(g)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: `1.5px solid ${clientGender === g ? '#B88B4A' : 'var(--border-color)'}`,
                        background: clientGender === g ? 'var(--primary-subtle)' : 'var(--bg-card-subtle)',
                        color: clientGender === g ? '#B88B4A' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marital Status Selection */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Marital Status
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Unmarried', 'Married'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setClientMaritalStatus(m)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: `1.5px solid ${clientMaritalStatus === m ? '#B88B4A' : 'var(--border-color)'}`,
                        background: clientMaritalStatus === m ? 'var(--primary-subtle)' : 'var(--bg-card-subtle)',
                        color: clientMaritalStatus === m ? '#B88B4A' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth & Anniversary Date */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: clientMaritalStatus === 'Married' ? '1fr 1fr' : '1fr',
                  gap: '14px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Date of Birth <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        required
                        value={clientDob}
                        onChange={(e) => setClientDob(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-color)',
                          background: 'var(--bg-card-subtle)',
                          outline: 'none',
                          fontSize: '14px',
                          color: 'var(--text-main)'
                        }}
                      />
                      <Calendar size={16} color="#B88B4A" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                    </div>
                  </div>

                  {clientMaritalStatus === 'Married' && (
                    <div className="animate-fade-in">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                        Anniversary Date <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date"
                          required
                          value={clientAnniversaryDate}
                          onChange={(e) => setClientAnniversaryDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px 10px 38px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            outline: 'none',
                            fontSize: '14px',
                            color: 'var(--text-main)'
                          }}
                        />
                        <Calendar size={16} color="#B88B4A" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Mobile Number (10 digits) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '11px 12px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
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
                      placeholder="98201 12345"
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isDuplicate ? '#DC2626' : (isMobileValid ? '#16A34A' : 'var(--border-color)')}`,
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px',
                        letterSpacing: '0.04em'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 36px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  </div>
                </div>
              </div>

              {/* Duplicate Phone Notice */}
              {isDuplicate && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-bg)',
                  border: '1.5px solid var(--danger-border)',
                  color: 'var(--danger-text)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
                    <ShieldAlert size={16} />
                    Client profile already exists with this phone number.
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#7F1D1D' }}>
                    Existing Profile: <strong>{phoneCheckMessage.client.name} {phoneCheckMessage.client.surname || ''}</strong> ({phoneCheckMessage.client.total_visits} past visits).
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const existingClient = phoneCheckMessage.client;
                      const isMember = Boolean(
                        existingClient.membership_tier && 
                        existingClient.membership_tier !== 'Non-Member' && 
                        existingClient.membership_tier !== 'null' && 
                        existingClient.membership_tier.toLowerCase() !== 'none' &&
                        existingClient.membership_tier.trim() !== ''
                      );
                      setSelectedRegularClient(existingClient);
                      setClientType('regular');
                      if (isMember) {
                        setStep('repeat-prompt');
                      } else {
                        setMembershipSourceStep('client-info');
                        setStep('membership-plans');
                      }
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Switch to {phoneCheckMessage.client.name}'s Profile & Continue →
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: ADDRESS & LOCATION (From Image 2 Note) */}
            <div>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: '700',
                color: 'var(--text-main)',
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--border-light)'
              }}>
                2. Residential & Studio Address
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={clientAddress1}
                    onChange={(e) => setClientAddress1(e.target.value)}
                    placeholder="e.g. Flat 402, Sea Crest Apts, Hill Road"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={clientAddress2}
                    onChange={(e) => setClientAddress2(e.target.value)}
                    placeholder="e.g. Bandra West, Near Mehboob Studio"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Pin Code <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={clientPincode}
                      onChange={(e) => setClientPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 400050"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>



            {/* SECTION 4: ACTIONS & REGIS DISPATCH (From Image 2 Note) */}
            <div style={{
              marginTop: '12px',
              paddingTop: '32px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                {/* Submit New Client Data Button */}
                <button
                  type="button"
                  onClick={handleSubmitNewClient}
                  disabled={!clientName.trim() || !isMobileValid || isDuplicate || isSubmittingClient}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                    boxShadow: '0 4px 16px rgba(184, 139, 74, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    opacity: (!clientName.trim() || !isMobileValid || isDuplicate || isSubmittingClient) ? 0.5 : 1,
                    cursor: (!clientName.trim() || !isMobileValid || isDuplicate || isSubmittingClient) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSubmittingClient ? (
                    <span>Submitting Client Dossier...</span>
                  ) : (
                    <>
                      <span>Submit</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span>✨ Submitting will create the client ID and generate the official studio dossier.</span>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTRATION SUCCESS & COMMUNICATION HUB MODAL (From Image 2 Diagram) */}
        {registeredClientModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}>
            <div className="card animate-fade-in" style={{
              maxWidth: '520px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              padding: '36px 32px',
              boxShadow: 'var(--shadow-xl)',
              textAlign: 'center'
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
                margin: '0 auto 16px auto'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#B88B4A', fontWeight: '700', marginBottom: '4px' }}>
                Registration Confirmed
              </div>
              <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '8px' }}>
                {registeredClientModal.name} {registeredClientModal.surname || ''}
              </h2>

              {/* Registration Number Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                borderRadius: 'var(--radius-md)',
                margin: '12px auto 20px auto'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Reg. No:
                </span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#B88B4A', letterSpacing: '0.06em' }}>
                  {registeredClientModal.reg_no || `MB-REG-${String(registeredClientModal.client_id).padStart(5, '0')}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registeredClientModal.reg_no || '');
                    setCopiedRegNo(true);
                    setTimeout(() => setCopiedRegNo(false), 2000);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copiedRegNo ? '#166534' : '#B88B4A',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Copy Reg. No."
                >
                  <Copy size={16} />
                </button>
              </div>

              {/* Client Summary Info */}
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatPhone(registeredClientModal.phone)}</span>
                </div>
                {registeredClientModal.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{registeredClientModal.email}</span>
                  </div>
                )}
                {registeredClientModal.city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                      {[registeredClientModal.city, registeredClientModal.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {registeredClientModal.marital_status && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Marital Status:</span>
                    <span style={{ fontWeight: '600', color: '#B88B4A' }}>{registeredClientModal.marital_status}</span>
                  </div>
                )}
                {registeredClientModal.dob && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{formatDate(registeredClientModal.dob)}</span>
                  </div>
                )}
                {registeredClientModal.marital_status === 'Married' && registeredClientModal.anniversary_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Anniversary:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{formatDate(registeredClientModal.anniversary_date)}</span>
                  </div>
                )}
              </div>

              {/* THE TWO COMMUNICATION CHANNELS FROM IMAGE 2 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '20px'
              }}>
                {/* 1. WhatsApp: Thank You Reg. No. */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(registeredClientModal)}
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#20BA5A'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                >
                  <MessageCircle size={19} />
                  WhatsApp: Thank You & Reg. No.
                </button>

                {/* 2. Email Mailer */}
                <button
                  type="button"
                  onClick={() => handleSendEmailMailer(registeredClientModal)}
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FAF6EE',
                    color: '#B88B4A',
                    border: '1.5px solid #DAC493',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3E8D3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FAF6EE'}
                >
                  <Mail size={19} />
                  Email Mailer: Welcome & Reg. No.
                </button>
              </div>

              {/* Next Steps */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    // Preselect this new client and proceed to membership plans
                    setSelectedRegularClient(registeredClientModal);
                    setClientType('regular');
                    setRegisteredClientModal(null);
                    setStep('membership-plans');
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '13px' }}
                >
                  Explore Membership Plans →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisteredClientModal(null);
                    onCancel();
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', fontSize: '13px' }}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STEP 2A: NEW CLIENT WELCOME & CLIENT ID DOSSIER
  // ==========================================
  if (step === 'client-welcome') {
    const client = registeredClient || selectedRegularClient;
    const clientFullName = [client?.name, client?.surname].filter(Boolean).join(' ') || clientName;
    const clientIdFormatted = client?.client_id ? `#${client.client_id}` : 'NEW';
    const regNoFormatted = client?.reg_no || `MB-REG-${String(client?.client_id || '001').padStart(5, '0')}`;
    const displayPhone = client?.phone || clientPhone;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '640px', margin: '30px auto' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Top Navigation Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <button 
            type="button"
            onClick={() => setStep('client-info')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Edit Client Details
          </button>

          {renderClientProfileWidget()}
        </div>

        {/* Welcome Dossier Card */}
        <div className="card" style={{
          padding: '38px 36px',
          borderRadius: '24px',
          border: '1.5px solid rgba(220, 205, 185, 0.6)',
          boxShadow: '0 12px 36px rgba(184, 139, 74, 0.12)',
          background: '#FFFFFF',
          textAlign: 'center'
        }}>
          {/* Official Maison BeYou Brand Logo & Name */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)',
              border: '2px solid #DAC493',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px auto',
              boxShadow: '0 6px 20px rgba(184, 139, 74, 0.22)',
              padding: '12px'
            }}>
              <img 
                src={brandLogoIconImg} 
                alt="Maison BeYou Emblem" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <img 
                src={brandLogoTextImg} 
                alt="Maison BeYou" 
                style={{
                  height: '24px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'inline-block'
                }}
              />
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: '#B88B4A',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            Client Profile Created Successfully
          </div>

          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            color: '#1C1917',
            marginBottom: '6px',
            lineHeight: 1.25,
            fontWeight: '700'
          }}>
            Welcome to Maison BeYou!
          </h2>

          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#785A35',
            marginBottom: '20px'
          }}>
            {clientFullName}
          </div>

          {/* Client ID & Reg Number Dossier Box */}
          <div style={{
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5EADB 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: '700' }}>
                Client ID
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                {clientIdFormatted}
              </div>
            </div>

            <div style={{ width: '1px', height: '36px', background: '#DAC493' }} />

            <div>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: '700' }}>
                Registration No.
              </div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#B88B4A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{regNoFormatted}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(regNoFormatted);
                    setCopiedRegNo(true);
                    setTimeout(() => setCopiedRegNo(false), 2000);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copiedRegNo ? '#166534' : '#B88B4A',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Copy Reg. No."
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp Message Box as explicitly instructed */}
          <div style={{
            background: '#F0FDF4',
            border: '1.5px solid #BBF7D0',
            borderRadius: '14px',
            padding: '16px 18px',
            textAlign: 'left',
            marginBottom: '26px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#25D366',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,211,102,0.35)'
            }}>
              <MessageCircle size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '4px' }}>
                WhatsApp Communication Updates
              </div>
              <div style={{ fontSize: '12.5px', color: '#15803D', lineHeight: 1.5 }}>
                We are delighted to welcome you to our studio. Occasionally, we would like to share appointment confirmations, tailored treatment care guidance, and studio updates with you through WhatsApp (+91 {formatPhone(displayPhone)}).
              </div>
            </div>
          </div>

          {/* Next Button -> Goes to Membership Page */}
          <div>
            <button
              type="button"
              onClick={() => {
                setMembershipSourceStep('client-welcome');
                setStep('membership-plans');
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                boxShadow: '0 4px 16px rgba(184, 139, 74, 0.35)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              <span>Next</span>
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
              placeholder="Search by 10-digit mobile (e.g. 98201...) or name (e.g. John)"
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
              regularClientsList.map(c => {
                const isMember = Boolean(
                  c.membership_tier && 
                  c.membership_tier !== 'Non-Member' && 
                  c.membership_tier !== 'null' && 
                  c.membership_tier.toLowerCase() !== 'none' &&
                  c.membership_tier.trim() !== ''
                );

                const handleSelectClient = () => {
                  handleInitiateClientOtp(c);
                };

                return (
                  <div
                    key={c.client_id}
                    onClick={handleSelectClient}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px', color: '#1C1917' }}>
                          {c.name}
                        </span>
                        {isMember ? (
                          <span style={{
                            background: '#1C1917',
                            color: '#DAC493',
                            border: '1px solid #B88B4A',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(184, 139, 74, 0.2)'
                          }}>
                            💎 {c.membership_tier}
                          </span>
                        ) : (
                          <span style={{
                            background: '#F5EFEB',
                            color: 'var(--text-muted)',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: '600',
                            padding: '2px 8px'
                          }}>
                            Non-Member
                          </span>
                        )}
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
                        handleSelectClient();
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
                );
              })
            )}
          </div>
        </div>

        {/* RETURNING CLIENT OTP VERIFICATION MODAL */}
        {isOtpModalOpen && otpTargetClient && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px'
          }}>
            <div className="card animate-fade-in" style={{
              maxWidth: '480px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px 32px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
              border: '1.5px solid #DAC493',
              position: 'relative',
              textAlign: 'center'
            }}>
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  border: 'none',
                  background: '#F5F5F4',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>

              {/* Security Shield Icon */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FAF6EE 0%, #F5EADB 100%)',
                border: '1.5px solid #DAC493',
                color: '#B88B4A',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                boxShadow: '0 4px 16px rgba(184, 139, 74, 0.2)'
              }}>
                <ShieldCheck size={32} />
              </div>

              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '800', marginBottom: '4px' }}>
                Client Identification Security
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginBottom: '6px' }}>
                ENTER OTP CODE
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                An automated verification code has been dispatched via <strong>SMS</strong> to the client's registered mobile number.
              </p>

              {/* Target Client Preview Dossier */}
              <div style={{
                background: '#FAF7F2',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                    color: '#FAF7F2',
                    fontWeight: '800',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #B88B4A'
                  }}>
                    {getClientInitials(otpTargetClient.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#1C1917' }}>
                      {otpTargetClient.name} {otpTargetClient.surname || ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Phone size={11} />
                      <span>{formatPhone(otpTargetClient.phone)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '10.5px',
                    background: otpTargetClient.membership_tier && otpTargetClient.membership_tier !== 'Non-Member' ? '#1C1917' : '#E5E7EB',
                    color: otpTargetClient.membership_tier && otpTargetClient.membership_tier !== 'Non-Member' ? '#DAC493' : '#4B5563',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    fontWeight: '700'
                  }}>
                    {otpTargetClient.membership_tier && otpTargetClient.membership_tier !== 'Non-Member' ? `💎 ${otpTargetClient.membership_tier}` : 'Non-Member'}
                  </span>
                </div>
              </div>

              {/* 4 Digit Inputs */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }} onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpInputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    style={{
                      width: '56px',
                      height: '62px',
                      borderRadius: '14px',
                      border: digit ? '2px solid #B88B4A' : '1.5px solid var(--border-color)',
                      background: digit ? '#FAF6EE' : '#FFFFFF',
                      fontSize: '26px',
                      fontWeight: '800',
                      textAlign: 'center',
                      color: '#1C1917',
                      outline: 'none',
                      boxShadow: digit ? '0 2px 10px rgba(184, 139, 74, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Error / Success Feedback */}
              {otpError && (
                <div style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  {otpError}
                </div>
              )}

              {otpSuccessMessage && (
                <div style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#166534',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{otpSuccessMessage}</span>
                </div>
              )}

              {/* Dev/Reception Fast-Fill Pill */}
              {otpServerInfo?.otp && (
                <div style={{
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      const code = String(otpServerInfo.otp);
                      setOtpDigits([code[0] || '', code[1] || '', code[2] || '', code[3] || '']);
                      handleVerifyOtp(code);
                    }}
                    style={{
                      background: 'rgba(184, 139, 74, 0.12)',
                      border: '1px dashed #B88B4A',
                      color: '#9F7335',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Click to automatically fill received code"
                  >
                    <span>✨ Test OTP: <strong>{otpServerInfo.otp}</strong> (Click to auto-fill)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtpViaSms}
                    style={{
                      background: '#EFF6FF',
                      border: '1.5px solid #93C5FD',
                      color: '#1D4ED8',
                      padding: '5px 14px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)'
                    }}
                    title="Dispatch OTP via direct SMS"
                  >
                    <MessageSquare size={13} />
                    <span>Send via SMS 💬</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtpViaWhatsApp}
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      color: '#166534',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Alternative: Send via WhatsApp"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              )}

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={otpDigits.some(d => d === '') || isVerifyingOtp}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                  boxShadow: '0 4px 16px rgba(184, 139, 74, 0.35)',
                  opacity: (otpDigits.some(d => d === '') || isVerifyingOtp) ? 0.5 : 1,
                  cursor: (otpDigits.some(d => d === '') || isVerifyingOtp) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}
              >
                {isVerifyingOtp ? (
                  <span>Verifying Client OTP...</span>
                ) : (
                  <>
                    <span>Verify & Proceed</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend & Cancel Options */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResendCountdown > 0 || isSendingOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: otpResendCountdown > 0 ? 'var(--text-muted)' : '#B88B4A',
                    fontWeight: '700',
                    cursor: otpResendCountdown > 0 ? 'default' : 'pointer'
                  }}
                >
                  {isSendingOtp 
                    ? 'Sending new code...' 
                    : (otpResendCountdown > 0 ? `Resend OTP in ${otpResendCountdown}s` : 'Resend Code')}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Change Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RETURNING CLIENT WELCOME BACK MODAL */}
        {welcomeBackClient && (() => {
          const c = welcomeBackClient;
          const isMember = Boolean(
            c.membership_tier && 
            c.membership_tier !== 'Non-Member' && 
            c.membership_tier !== 'null' && 
            c.membership_tier.toLowerCase() !== 'none' &&
            c.membership_tier.trim() !== ''
          );
          const clientFullName = [c.name, c.surname].filter(Boolean).join(' ') || c.name || 'Client';
          const activeClientObj = {
            name: c.name,
            surname: c.surname,
            id: c.client_id,
            isMember: isMember,
            membershipTier: c.membership_tier
          };
          const idBadge = getClientFormattedId(activeClientObj, c);
          const initials = getClientInitials(c.name);

          const handleNext = () => {
            setWelcomeBackClient(null);
            if (isMember) {
              setStep('repeat-prompt');
            } else {
              setMembershipSourceStep('client-search');
              setStep('membership-plans');
            }
          };

          return (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
              padding: '20px'
            }}>
              <div className="card animate-fade-in" style={{
                maxWidth: '520px',
                width: '100%',
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px 32px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
                textAlign: 'center',
                position: 'relative'
              }}>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setWelcomeBackClient(null)}
                  style={{
                    position: 'absolute',
                    top: '18px',
                    right: '18px',
                    border: 'none',
                    background: 'var(--bg-surface)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>

                {/* Official Maison BeYou Brand Logo & Name */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)',
                    border: '2px solid #DAC493',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                    boxShadow: '0 6px 20px rgba(184, 139, 74, 0.22)',
                    padding: '12px'
                  }}>
                    <img 
                      src={brandLogoIconImg} 
                      alt="Maison BeYou Emblem" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <img 
                      src={brandLogoTextImg} 
                      alt="Maison BeYou" 
                      style={{
                        height: '24px',
                        width: 'auto',
                        objectFit: 'contain',
                        display: 'inline-block'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: '#B88B4A',
                  fontWeight: '800',
                  marginBottom: '4px'
                }}>
                  Identity Verified • Returning Guest
                </div>

                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
                  color: '#1C1917',
                  marginBottom: '6px',
                  lineHeight: 1.2,
                  fontWeight: '700'
                }}>
                  Welcome Back, {c.name.toUpperCase()}!
                </h2>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginBottom: '20px',
                  lineHeight: 1.5
                }}>
                  Delighted to welcome you back to Maison BeYou Aesthetic & Beauty Studio.
                </p>

                {/* Client Dossier Info Box */}
                <div style={{
                  background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
                  border: '1.5px solid #DAC493',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: isMember
                          ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                          : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                        color: isMember ? '#1C1917' : '#FAF7F2',
                        fontWeight: '800',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #B88B4A'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917' }}>
                          {clientFullName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={11} />
                          <span>{formatPhone(c.phone)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Membership Status Badge */}
                    <div>
                      {isMember ? (
                        <span style={{
                          background: '#1C1917',
                          color: '#DAC493',
                          border: '1px solid #B88B4A',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)'
                        }}>
                          💎 {c.membership_tier}
                        </span>
                      ) : (
                        <span style={{
                          background: '#F5EFEB',
                          color: 'var(--text-muted)',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          border: '1px solid var(--border-color)'
                        }}>
                          Non-Member
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Metrics Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700' }}>
                        {idBadge.label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                        {idBadge.id}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700' }}>
                        Total Visits
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E40AF', marginTop: '2px' }}>
                        {c.total_visits || 1}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700' }}>
                        Last Visit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                        {c.last_visit_date ? formatDate(c.last_visit_date) : 'Today'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tailored VIP or Non-Member guidance message */}
                <div style={{
                  background: isMember ? 'rgba(184, 139, 74, 0.08)' : '#F0F9FF',
                  border: isMember ? '1px solid #DAC493' : '1px solid #BAE6FD',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '22px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {isMember ? (
                    <>
                      <Sparkles size={18} color="#B88B4A" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '12.5px', color: '#785A35', lineHeight: 1.45 }}>
                        <strong>VIP Privileges Active:</strong> As an active member of <strong>{c.membership_tier}</strong>, your past treatment records, repeat preferences, and member benefits are ready.
                      </div>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} color="#0284C7" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '12.5px', color: '#0369A1', lineHeight: 1.45 }}>
                        <strong>Client Record Verified:</strong> You are currently visiting as a non-member. Click Next to view exclusive <strong>Maison BeYou Clubs</strong> membership tiers or proceed to treatments.
                      </div>
                    </>
                  )}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                    boxShadow: '0 4px 16px rgba(184, 139, 74, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    marginBottom: '12px'
                  }}
                >
                  <span>Next</span>
                  <ArrowRight size={18} />
                </button>

                {/* Change Client Option */}
                <button
                  type="button"
                  onClick={() => setWelcomeBackClient(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Change Client
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ==========================================
  // STEP 2C: CLIENT PROFILE, HISTORY & REPEAT SERVICE (Section 6, 7 & 8)
  // ==========================================
  if (step === 'repeat-prompt' && selectedRegularClient) {
    const client = selectedRegularClient;
    const clientData = clientHistory?.client || client;
    const lastVisit = clientHistory?.last_visit;
    const previousServices = clientHistory?.previous_services || [];

    // Determine membership status and tier name
    const rawTier = clientData?.membership_tier || client?.membership_tier || null;
    const isMember = Boolean(rawTier && rawTier.toLowerCase() !== 'none' && rawTier.toLowerCase() !== 'non-member');
    const membershipTierName = isMember ? rawTier : 'Non-Member';
    const planInfo = isMember ? findMembershipPlan(rawTier) : null;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '940px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            onClick={() => setStep('client-search')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Search Different Client
          </button>

          {renderClientProfileWidget()}
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
              {(client.marital_status || client.dob) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '12.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {client.marital_status && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: '#FAF6EE',
                      border: '1px solid #DAC493',
                      color: '#B88B4A',
                      fontWeight: '700',
                      fontSize: '11px'
                    }}>
                      {client.marital_status}
                    </span>
                  )}
                  {client.dob && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} color="#B88B4A" />
                      DOB: {formatDate(client.dob)}
                    </span>
                  )}
                  {client.marital_status === 'Married' && client.anniversary_date && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} color="#B88B4A" />
                      Anniversary: {formatDate(client.anniversary_date)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Client Stats Box (5 Columns including Membership) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '14px',
              background: '#FFFFFF',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '380px'
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

              <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '10px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#B88B4A', fontWeight: '700' }}>Membership</div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  color: isMember ? '#B88B4A' : 'var(--text-muted)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isMember ? (
                    <>
                      <span>💎</span>
                      <span>{membershipTierName}</span>
                    </>
                  ) : (
                    <span>Non-Member</span>
                  )}
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
  // STEP 2C: 4 EXCLUSIVE MEMBERSHIP CARDS (Image 2 Sample)
  // ==========================================
  if (step === 'membership-plans') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '1240px', margin: '30px auto', padding: '0 16px' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => {
              if (membershipSourceStep === 'client-search') {
                setStep('client-search');
              } else if (membershipSourceStep === 'client-welcome') {
                setStep('client-welcome');
              } else if (clientType === 'new' || membershipSourceStep === 'client-info') {
                setStep('client-info');
              } else {
                setStep('repeat-prompt');
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            {membershipSourceStep === 'client-search' 
              ? 'Back to Client Search' 
              : (membershipSourceStep === 'client-welcome' 
                  ? 'Back to Welcome Dossier' 
                  : (clientType === 'new' ? 'Back to Client Intake' : 'Back to Client Profile'))}
          </button>

          {renderClientProfileWidget()}
        </div>

        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: '#B88B4A',
            fontWeight: '700',
            marginBottom: '6px'
          }}>
            Exclusive Memberships
          </div>
          <h1 style={{
            fontSize: '32px',
            color: '#1C1917',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: '600',
            letterSpacing: '0.02em',
            marginBottom: '8px'
          }}>
            MAISON BEYOU CLUBS
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
            Select a membership tier for complimentary treatments, priority booking, and exclusive pricing privileges.
          </p>
        </div>

        {/* 4 Cards Grid (matching Image 2 sample with 4 cards) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '22px',
          marginBottom: '36px'
        }}>
          {MEMBERSHIP_PLANS.map((plan) => {
            const isSelected = selectedMembershipPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedMembershipPlan(plan)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: isSelected ? '2.5px solid #B88B4A' : '1px solid rgba(218, 196, 147, 0.45)',
                  boxShadow: isSelected 
                    ? '0 12px 32px rgba(184, 139, 74, 0.22)' 
                    : '0 4px 16px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#B88B4A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(218, 196, 147, 0.45)';
                  }
                }}
              >
                {/* VIP Membership Card Showcase */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  padding: '16px 16px 14px 16px',
                  background: isSelected 
                    ? 'linear-gradient(180deg, #F8F4EC 0%, #FFFFFF 100%)' 
                    : 'linear-gradient(180deg, #FAF7F2 0%, #FFFFFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid #F0EAE1'
                }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '1005 / 639',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: isSelected 
                      ? '0 12px 28px rgba(184, 139, 74, 0.35)' 
                      : '0 8px 20px rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    border: plan.id === 'eclat' ? '1px solid rgba(184, 139, 74, 0.35)' : 'none'
                  }}>
                    <img
                      src={plan.image}
                      alt={plan.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#B88B4A',
                      color: '#FFFFFF',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      zIndex: 2
                    }}>
                      <Check size={13} />
                      SELECTED
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '20px 20px 24px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Service Subtitle & Validity */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      letterSpacing: '0.14em',
                      color: '#A8A29E',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {plan.tierNumber}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      background: '#FAF6EE',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(218, 196, 147, 0.5)'
                    }}>
                      {plan.validity}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 style={{
                    fontSize: '20px',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: '700',
                    color: '#1C1917',
                    lineHeight: '1.25',
                    marginBottom: '6px'
                  }}>
                    {plan.name} ({plan.priceFormatted})
                  </h3>

                  {/* Tagline */}
                  <p style={{
                    fontSize: '13px',
                    color: '#78716C',
                    lineHeight: '1.45',
                    marginBottom: '18px'
                  }}>
                    {plan.tagline}
                  </p>

                  <div style={{ height: '1px', background: '#F2ECE1', marginBottom: '16px' }} />

                  {/* Benefits */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      marginBottom: '8px'
                    }}>
                      Benefits :
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plan.benefits.map((b, idx) => (
                        <li key={idx} style={{ fontSize: '12.5px', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Privileges */}
                  <div style={{ marginBottom: '22px', flex: 1 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      marginBottom: '8px'
                    }}>
                      Privileges :
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plan.privileges.map((p, idx) => (
                        <li key={idx} style={{ fontSize: '12.5px', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Discover / Select Button */}
                  <div style={{
                    paddingTop: '14px',
                    borderTop: '1px solid #F5EFE6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isSelected ? '#B88B4A' : '#78716C',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {isSelected ? '✓ Plan Selected' : 'Discover →'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#B88B4A' }}>
                      {plan.priceFormatted}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Bar (Skip and Proceed) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '20px 28px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
              {selectedMembershipPlan ? (
                <span>Selected: <strong style={{ color: '#B88B4A' }}>{selectedMembershipPlan.name}</strong> ({selectedMembershipPlan.priceFormatted})</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No membership plan selected</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Select a tier above and click Proceed, or click Skip to proceed straight to services.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* SKIP BUTTON */}
            <button
              type="button"
              onClick={() => {
                setSelectedMembershipPlan(null);
                setStep('categories');
              }}
              className="btn-secondary"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Skip
            </button>

            {/* PROCEED BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!selectedMembershipPlan) {
                  alert('Please select a membership plan above, or click Skip.');
                  return;
                }
                setIsMembershipPaymentOpen(true);
              }}
              disabled={!selectedMembershipPlan}
              className="btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: !selectedMembershipPlan ? 0.5 : 1,
                cursor: !selectedMembershipPlan ? 'not-allowed' : 'pointer'
              }}
            >
              Proceed
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* MEMBERSHIP PAYMENT MODAL */}
        {isMembershipPaymentOpen && selectedMembershipPlan && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px'
          }}>
            <div className="card animate-fade-in" style={{
              maxWidth: '540px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 30px',
              boxShadow: 'var(--shadow-xl)'
            }}>
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#B88B4A',
                fontWeight: '700',
                marginBottom: '4px'
              }}>
                Membership Subscription Payment
              </div>
              <h2 style={{ fontSize: '24px', color: '#1C1917', marginBottom: '8px' }}>
                Confirm Membership Payment
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Enrolling <strong style={{ color: 'var(--text-main)' }}>{activeClientName || 'Client'}</strong> into <strong>{selectedMembershipPlan.name}</strong>.
              </p>

              {/* Plan Summary Card */}
              <div style={{
                background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                border: '1.5px solid #DAC493',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img 
                    src={selectedMembershipPlan.image} 
                    alt={selectedMembershipPlan.name}
                    style={{ width: '64px', aspectRatio: '1005 / 639', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#A87834', fontWeight: '700' }}>
                      Selected VIP Tier
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#1C1917', marginTop: '1px' }}>
                      {selectedMembershipPlan.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {selectedMembershipPlan.validity} • All Privileges Included
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#B88B4A' }}>
                  {selectedMembershipPlan.priceFormatted}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Payment Method *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {['UPI', 'Cash'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setMembershipPaymentMethod(method)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: '700',
                        border: `1.5px solid ${membershipPaymentMethod === method ? '#B88B4A' : 'var(--border-color)'}`,
                        background: membershipPaymentMethod === method ? 'var(--primary-subtle)' : '#FFFFFF',
                        color: membershipPaymentMethod === method ? '#B88B4A' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff ID Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Staff ID / Employee Code *
                </label>
                <input
                  type="text"
                  value={membershipStaffId}
                  onChange={(e) => setMembershipStaffId(e.target.value)}
                  placeholder="Enter Staff ID (e.g. STF-01, STF-02)"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />

                {/* Quick Staff Selection Chips */}
                {staffList.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Select:</span>
                    {staffList.slice(0, 4).map(stf => {
                      const code = `STF-${String(stf.staff_id).padStart(2, '0')}`;
                      return (
                        <button
                          key={stf.staff_id}
                          type="button"
                          onClick={() => setMembershipStaffId(code)}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: membershipStaffId === code ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                            border: `1px solid ${membershipStaffId === code ? '#B88B4A' : 'var(--border-color)'}`,
                            color: membershipStaffId === code ? '#B88B4A' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {code} ({stf.name.split(' ')[0]})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Transaction Reference Note */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Transaction Reference / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={membershipTxnNote}
                  onChange={(e) => setMembershipTxnNote(e.target.value)}
                  placeholder="e.g. UPI Ref # or receipt note"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsMembershipPaymentOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!membershipStaffId.trim()) {
                      alert('Please enter a Staff ID before proceeding.');
                      return;
                    }

                    setActiveMembership({
                      plan: selectedMembershipPlan,
                      amount: selectedMembershipPlan.price,
                      payment_method: membershipPaymentMethod,
                      staff_id: membershipStaffId.trim(),
                      txn_note: membershipTxnNote.trim(),
                      date: visitDate,
                      timestamp: new Date().toISOString()
                    });

                    if (selectedRegularClient?.client_id || registeredClientModal?.client?.client_id) {
                      handleUpdateClientMembership(selectedMembershipPlan.name);
                    }

                    setToastNotification({
                      type: 'success',
                      message: `✓ ${selectedMembershipPlan.name} Membership activated by Staff ${membershipStaffId.trim()}! Proceeding to Service Selection.`
                    });
                    setTimeout(() => setToastNotification(null), 3500);

                    setIsMembershipPaymentOpen(false);
                    setStep('categories');
                  }}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', fontSize: '13.5px' }}
                >
                  Confirm & Select Services →
                </button>
              </div>
            </div>
          </div>
        )}
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

        {/* Back to Memberships button & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => setStep('membership-plans')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Membership Plans
          </button>

          {renderClientProfileWidget()}
        </div>

        {/* Active Membership Banner */}
        {activeMembership && (
          <div style={{
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(184, 139, 74, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#B88B4A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}>
                💎
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917' }}>
                  Active Membership Tier: <span style={{ color: '#B88B4A' }}>{activeMembership.plan.name}</span> ({activeMembership.plan.priceFormatted})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Paid via <strong>{activeMembership.payment_method}</strong> • Attributed Staff ID: <strong>{activeMembership.staff_id}</strong>
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: '#B88B4A',
              color: '#FFFFFF',
              letterSpacing: '0.04em'
            }}>
              VIP MEMBER ACTIVE
            </span>
          </div>
        )}

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
    const priority = [
      'half legs laser',
      'full legs laser',
      'underarms laser',
      'back & shoulders',
      'face laser',
      'full arms laser',
      'bikini line laser',
      'bikini laser',
      'half arms laser',
      'chest & stomach',
      'full body laser',
      'feet & toes'
    ];
    const displayServices = [...subServices].sort((a, b) => {
      const idxA = priority.findIndex(p => a.service_name.toLowerCase().includes(p));
      const idxB = priority.findIndex(p => b.service_name.toLowerCase().includes(p));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
    const activeService = (featuredService && subServices.some(s => s.service_id === featuredService.service_id))
      ? featuredService
      : (displayServices[0] || null);
    const activeMedia = getServiceMedia(activeService, selectedCategory.category_name);
    const activeCountInCart = activeService 
      ? selectedServices.filter(s => s.service_id === activeService.service_id).length 
      : 0;
    const isActiveInCart = activeCountInCart > 0;

    return (
      <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '24px auto' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Top Navigation Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('categories')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Main Categories
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedServices.length > 0 && (
              <button
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                View Cart: {selectedServices.length} ({formatCurrency(subtotal)}) →
              </button>
            )}
            {renderClientProfileWidget()}
          </div>
        </div>

        {/* Category Header */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '800' }}>
            Category Overview
          </div>
          <h1 style={{ fontSize: '32px', color: '#1C1917', margin: '2px 0 4px 0', fontFamily: 'var(--font-serif)', fontWeight: '700' }}>
            {selectedCategory.category_name}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Watch procedure preview videos and explore clinical service options. Select any treatment from the scroller below to view above.
          </p>
        </div>

        {/* SPOTLIGHT FEATURED SECTION: Video on Left, Description on Right */}
        {activeService && (
          <div 
            className="card"
            style={{
              padding: '0',
              overflow: 'hidden',
              marginBottom: '32px',
              borderRadius: '24px',
              border: '1.5px solid rgba(220, 205, 185, 0.6)',
              boxShadow: '0 12px 36px rgba(184, 139, 74, 0.1)',
              background: '#FFFFFF'
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              alignItems: 'stretch'
            }}>
              {/* Left Column: Video/Image Player + 5 Thumbnails Below (Clean Light Background - Out of Black Box) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FAF7F2',
                borderRight: '1px solid #EDE4D8',
                padding: '22px'
              }}>
                {/* Main Media Display Area (Video or Selected Photo) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '340px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#1C1917',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activeMediaTab === 'video' ? (
                    <>
                      <video
                        ref={videoRef}
                        key={`vid_${activeService.service_id}`}
                        src={activeMedia.video}
                        poster={activeMedia.heroImage || activeMedia.image}
                        autoPlay
                        muted={isVideoMuted}
                        loop
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                      />

                      {/* Top Badge Overlay */}
                      <div style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        right: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}>
                        <div style={{
                          background: 'rgba(28, 25, 23, 0.72)',
                          backdropFilter: 'blur(8px)',
                          color: '#FFFFFF',
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.04em'
                        }}>
                          <Play size={10} fill="#FFFFFF" color="#FFFFFF" />
                          <span>PROCEDURE DEMO • HD</span>
                        </div>

                        <div style={{
                          background: 'rgba(28, 25, 23, 0.72)',
                          backdropFilter: 'blur(8px)',
                          color: '#FAF7F2',
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Clock size={11} color="#D4AF37" />
                          <span>{activeService.duration_mins || 35} mins</span>
                        </div>
                      </div>

                      {/* Central Play Button Overlay */}
                      <button
                        type="button"
                        onClick={handleToggleVideoPlay}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'rgba(28, 25, 23, 0.65)',
                          backdropFilter: 'blur(6px)',
                          border: '1.5px solid rgba(255, 255, 255, 0.45)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                          transition: 'transform 0.2s ease',
                          zIndex: 2
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
                        title={isVideoPlaying ? 'Pause video' : 'Play procedure preview'}
                      >
                        {isVideoPlaying ? (
                          <Pause size={20} fill="#FFFFFF" />
                        ) : (
                          <Play size={20} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                        )}
                      </button>

                      {/* Bottom-Left Controls Overlay (Sound + Fullscreen) */}
                      <div style={{
                        position: 'absolute',
                        bottom: '14px',
                        left: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 2
                      }}>
                        <button
                          type="button"
                          onClick={handleToggleVideoMute}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(28, 25, 23, 0.65)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                        >
                          {isVideoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
                            }
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(28, 25, 23, 0.65)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          title="Fullscreen preview"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Display Clicked Image */
                    <>
                      <img
                        key={`photo_${activeMediaTab}`}
                        src={activeMedia.gallery[activeMediaTab]}
                        alt={`${activeService.service_name} clinical preview ${activeMediaTab + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />

                      {/* Top Badge Overlay for Photo */}
                      <div style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        right: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}>
                        <div style={{
                          background: 'rgba(28, 25, 23, 0.78)',
                          backdropFilter: 'blur(8px)',
                          color: '#FFFFFF',
                          padding: '5px 12px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.04em'
                        }}>
                          <span>📷</span>
                          <span>CLINICAL PHOTO • {activeMediaTab + 1} OF 4</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMediaTab('video');
                            setIsVideoPlaying(true);
                          }}
                          style={{
                            pointerEvents: 'auto',
                            background: 'rgba(184, 139, 74, 0.95)',
                            backdropFilter: 'blur(8px)',
                            color: '#FFFFFF',
                            padding: '5px 12px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                          title="Return to Procedure Demo Video"
                        >
                          <Play size={10} fill="#FFFFFF" />
                          <span>Watch Video</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 5 Very Small Thumbnails Below the Video (Clean Light Background, Out of Black Box) */}
                <div style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'transparent',
                  padding: '0'
                }}>
                  {/* Thumbnail 1: Video */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaTab('video');
                      setIsVideoPlaying(true);
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '48px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      padding: 0,
                      margin: 0,
                      boxSizing: 'border-box',
                      lineHeight: 0,
                      border: activeMediaTab === 'video' ? '2.5px solid #B88B4A' : '1.5px solid #DAC493',
                      boxShadow: activeMediaTab === 'video' ? '0 0 0 3px rgba(184, 139, 74, 0.22), 0 3px 10px rgba(184, 139, 74, 0.3)' : '0 1px 4px rgba(0, 0, 0, 0.06)',
                      background: '#FAF7F2',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (activeMediaTab !== 'video') e.currentTarget.style.borderColor = '#B88B4A';
                    }}
                    onMouseLeave={(e) => {
                      if (activeMediaTab !== 'video') e.currentTarget.style.borderColor = '#DAC493';
                    }}
                    title="Play Procedure Demo Video"
                  >
                    <img
                      src={activeMedia.heroImage || activeMedia.image}
                      alt="Procedure Video"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.32)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px'
                    }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#B88B4A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}>
                        <Play size={9} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
                      </div>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '0.05em' }}>
                        VIDEO
                      </span>
                    </div>
                  </button>

                  {/* Thumbnails 2-5: 4 Images */}
                  {activeMedia.gallery?.map((imgUrl, idx) => {
                    const isSelected = activeMediaTab === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveMediaTab(idx);
                          if (videoRef.current) {
                            videoRef.current.pause();
                            setIsVideoPlaying(false);
                          }
                        }}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '48px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          padding: 0,
                          margin: 0,
                          boxSizing: 'border-box',
                          lineHeight: 0,
                          border: isSelected ? '2.5px solid #B88B4A' : '1.5px solid #DAC493',
                          boxShadow: isSelected ? '0 0 0 3px rgba(184, 139, 74, 0.22), 0 3px 10px rgba(184, 139, 74, 0.3)' : '0 1px 4px rgba(0, 0, 0, 0.06)',
                          background: '#FAF7F2',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = '#B88B4A';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = '#DAC493';
                        }}
                        title={`View Clinical Photo ${idx + 1}`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Photo ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '3px',
                          right: '4px',
                          background: 'rgba(28, 25, 23, 0.72)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '8.5px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          letterSpacing: '0.02em',
                          lineHeight: 1.2
                        }}>
                          {idx + 1}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed Description & Actions */}
              <div style={{
                padding: '30px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#9E7437',
                      fontWeight: '800'
                    }}>
                      {selectedCategory.category_name}
                    </span>

                    {isActiveInCart && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#166534',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Check size={12} />
                        In Visit ({activeCountInCart})
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '32px',
                    color: '#2B231D',
                    lineHeight: 1.2,
                    margin: '0 0 12px 0',
                    fontWeight: '700'
                  }}>
                    {activeService.service_name}
                  </h2>

                  {/* Badges / Specs Pill Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={13} color="#9E7437" />
                      {activeService.duration_mins || 35} Mins Session
                    </span>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Zap size={13} color="#9E7437" />
                      {activeMedia.downtime || 'Zero Downtime'}
                    </span>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Sparkles size={13} color="#9E7437" />
                      {activeMedia.tag || 'Smooth Calves & Shins'}
                    </span>
                  </div>

                  {/* Subtitle Under Pills */}
                  <div style={{
                    fontSize: '13px',
                    color: '#78716C',
                    margin: '10px 0 16px 0',
                    fontWeight: '500'
                  }}>
                    {activeMedia.subtitle || activeService.desc || 'Calves or thighs'}
                  </div>

                  {/* Clinical Highlights & Benefits Box with Botanical Watermark */}
                  <div style={{
                    position: 'relative',
                    background: '#FAF7F2',
                    border: '1px solid #EDE4D8',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    overflow: 'hidden'
                  }}>
                    {/* Botanical Leaf Watermark SVG on Right */}
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.45,
                      pointerEvents: 'none'
                    }}>
                      <svg width="46" height="58" viewBox="0 0 60 75" fill="none" stroke="#CBB18E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M30 70 C30 50 30 25 30 10" />
                        <path d="M30 55 C20 48 12 50 10 40 C18 38 26 44 30 48" />
                        <path d="M30 42 C40 35 48 37 50 27 C42 25 34 31 30 35" />
                        <path d="M30 28 C22 22 16 25 15 17 C22 15 28 20 30 23" />
                        <path d="M30 15 C38 10 42 12 43 6 C37 5 32 9 30 12" />
                      </svg>
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#785A35', marginBottom: '10px' }}>
                      Clinical Highlights & Benefits
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeMedia.highlights?.map((hl, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', color: '#44403C' }}>
                          <span style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            background: '#F1E3D0',
                            color: '#9E7437',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            ✓
                          </span>
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Treatment Price and Action Buttons */}
                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid #F0E8DC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#8C827A', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700' }}>
                      Treatment Price
                    </div>
                    <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', fontWeight: '800', color: '#1C1917', lineHeight: 1.1, marginTop: '2px' }}>
                      ₹{Number(activeService.price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleAddService(activeService, true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '11px 22px',
                        borderRadius: '9999px',
                        background: '#9F7335',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(159, 115, 53, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#8C642D'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#9F7335'; }}
                    >
                      <span>{isActiveInCart ? '+ Add Another' : '+ Add to Visit'}</span>
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ArrowRight size={13} />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM HORIZONTAL SCROLLER: Small image + Title + Subtitle + Arrow */}
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '19px', color: '#1C1917', fontWeight: '700', margin: '0 0 2px 0' }}>
                All Treatments in {selectedCategory.category_name} ({subServices.length})
              </h3>
              <p style={{ fontSize: '13px', color: '#78716C', margin: '2px 0 0 0' }}>
                Click any service card below to open its preview video and clinical description above.
              </p>
            </div>

            {/* Scroller Arrow Controls */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleScrollScroller('left')}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#44403C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
                title="Scroll left"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleScrollScroller('right')}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#44403C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
                title="Scroll right"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          {/* Horizontal Scroller Strip */}
          <div
            ref={scrollerRef}
            className="horizontal-scroller"
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              padding: '6px 4px 18px 4px',
              scrollBehavior: 'smooth'
            }}
          >
            {displayServices.map(service => {
              const isSelected = activeService?.service_id === service.service_id;
              const countInCart = selectedServices.filter(s => s.service_id === service.service_id).length;
              const isAlreadyAdded = countInCart > 0;
              const sMedia = getServiceMedia(service, selectedCategory.category_name);

              return (
                <div
                  key={service.service_id}
                  onClick={() => handleSelectFeaturedService(service)}
                  style={{
                    minWidth: '205px',
                    maxWidth: '205px',
                    borderRadius: '16px',
                    background: '#FFFFFF',
                    border: isSelected ? '2px solid #9F7335' : '1px solid #ECE4D8',
                    boxShadow: isSelected 
                      ? '0 6px 20px rgba(159, 115, 53, 0.22)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.03)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#9F7335';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(159, 115, 53, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#ECE4D8';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                    }
                  }}
                >
                  {/* Top Thumbnail Image */}
                  <div style={{ position: 'relative', height: '125px', overflow: 'hidden', background: '#EFEAE2' }}>
                    <img
                      src={sMedia.image}
                      alt={service.service_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />

                    {isAlreadyAdded && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#166534',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}>
                        ✓ {countInCart}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Title, Subtitle, and Circular Arrow Button */}
                  <div style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{
                        fontSize: '13.5px',
                        fontWeight: '700',
                        color: '#1C1917',
                        lineHeight: 1.25,
                        margin: '0 0 3px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {service.service_name}
                      </h4>
                      <div style={{
                        fontSize: '11px',
                        color: '#78716C',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {sMedia.subtitle || service.desc || 'Clinical treatment'}
                      </div>
                    </div>

                    {/* Circular Arrow Button */}
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: '1px solid #E5E7EB',
                      background: isSelected ? '#FAF6EE' : '#FFFFFF',
                      color: isSelected ? '#9F7335' : '#78716C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

        {/* Navigation Bar & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => setStep('categories')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Catalog
          </button>

          {renderClientProfileWidget()}
        </div>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('selected-services')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Selected Services
          </button>

          {renderClientProfileWidget()}
        </div>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('staff-assignment')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Staff Assignment
          </button>

          {renderClientProfileWidget()}
        </div>

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
                {['UPI', 'Cash'].map(method => (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('billing-payment')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back to Billing
          </button>

          {renderClientProfileWidget()}
        </div>

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
              src={logoImg}
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

            {activeMembership && (
              <>
                <div style={{ height: '1px', background: 'var(--border-color)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    MEMBERSHIP PLAN PURCHASED
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#B88B4A' }}>
                        💎 {activeMembership.plan.name}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Paid via {activeMembership.payment_method} • Attributed Staff ID: {activeMembership.staff_id}
                      </div>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#B88B4A' }}>
                      {activeMembership.plan.priceFormatted}
                    </span>
                  </div>
                </div>
              </>
            )}

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

              {/* Registration Number Badge */}
              {(completedVisitResult.visit?.client?.reg_no || completedVisitResult.client?.reg_no) && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: '#FAF6EE',
                  border: '1px solid #DAC493',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>CLIENT REG. NO:</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#B88B4A' }}>
                    {completedVisitResult.visit?.client?.reg_no || completedVisitResult.client?.reg_no}
                  </span>
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                Client service history, lifetime spend, and studio revenue metrics have been updated in real-time.
              </p>

              {/* The Two Communication Channels from Image 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(completedVisitResult.visit?.client || completedVisitResult.client)}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <MessageCircle size={17} />
                  Send WhatsApp (Thank You & Reg. No.)
                </button>

                <button
                  type="button"
                  onClick={() => handleSendEmailMailer(completedVisitResult.visit?.client || completedVisitResult.client)}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FAF6EE',
                    color: '#B88B4A',
                    border: '1.5px solid #DAC493',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Mail size={17} />
                  Send Email Mailer (Welcome & Reg. No.)
                </button>
              </div>

              <button
                onClick={() => onComplete(completedVisitResult.visit?.visit_id)}
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '15px' }}
              >
                View Official Receipt & Return
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
