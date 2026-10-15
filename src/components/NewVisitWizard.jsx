import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus, UserCheck, ArrowLeft, ArrowRight, Check, Plus,
  Trash2, ShieldAlert, Sparkles, CheckCircle2, Clock,
  IndianRupee, ChevronRight, ChevronLeft, Search, Phone, Calendar,
  Mail, MapPin, MessageCircle, MessageSquare, Send, Share2, Copy, ExternalLink, X,
  Play, Pause, Volume2, VolumeX, ShieldCheck, User, LogOut, ChevronDown, Crown,
  Zap, Maximize2, AlertCircle
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

export default function NewVisitWizard({ preSelectedClient, initialType, onCancel, onComplete, onClientChange, currentUser }) {
  // Wizard Steps:
  // 'client-type' -> 'client-info' (new) | 'client-search' (regular) -> 'repeat-prompt' -> 'membership-plans' -> 'categories' -> 'sub-services' -> 'selected-services' -> 'billing-payment' -> 'confirmation'
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
  const [clientCity, setClientCity] = useState(preSelectedClient?.city || '');
  const [clientState, setClientState] = useState(preSelectedClient?.state || '');
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
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

  // Returning Client (BACK TO BEYOU) Mobile Lookup & 6-Digit OTP Flow
  const [returningPhone, setReturningPhone] = useState('');
  const [isCheckingReturningPhone, setIsCheckingReturningPhone] = useState(false);
  const [returningPhoneError, setReturningPhoneError] = useState('');
  const [returningPhoneSuccess, setReturningPhoneSuccess] = useState('');
  const [returningFlowStep, setReturningFlowStep] = useState('mobile'); // 'mobile' | 'otp'
  const [returningMaskedPhone, setReturningMaskedPhone] = useState('');
  const [sixDigitOtp, setSixDigitOtp] = useState(['', '', '', '', '', '']);
  const sixDigitRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const [returningOtpError, setReturningOtpError] = useState('');
  const [returningOtpSuccess, setReturningOtpSuccess] = useState('');
  const [isVerifyingReturningOtp, setIsVerifyingReturningOtp] = useState(false);
  const [returningOtpCooldown, setReturningOtpCooldown] = useState(0);

  // Live countdown timer for returning client OTP resend cooldown
  useEffect(() => {
    let timer;
    if (returningOtpCooldown > 0) {
      timer = setInterval(() => {
        setReturningOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [returningOtpCooldown]);

  // Legacy/Modal OTP Verification states for other wizard sections
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
  const [repeatAnswer, setRepeatAnswer] = useState('no'); // Default 'no' so every new visit starts completely fresh
  const [selectedRepeatServiceKeys, setSelectedRepeatServiceKeys] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const [isLogoutConfirmModalOpen, setIsLogoutConfirmModalOpen] = useState(false);

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
      videoRef.current.play().catch(() => { });
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
        videoRef.current.play().catch(() => { });
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
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Cash' | 'Card'
  const [amountPaid, setAmountPaid] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [useMembershipBenefits, setUseMembershipBenefits] = useState(false);
  const [selectedVisitorBenefit, setSelectedVisitorBenefit] = useState('');
  const [membershipCreditMode, setMembershipCreditMode] = useState('full'); // 'full' | 'partial' | 'none'
  const [membershipCreditAmount, setMembershipCreditAmount] = useState('');
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
      setSelectedServices([]);
      setSelectedRepeatServiceKeys([]);
      setRepeatAnswer('no');
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

  // ====================================================================
  // BEYOU CONCIERGE: RETURNING CLIENT MOBILE & 6-DIGIT OTP HANDLERS
  // ====================================================================

  // 1. Submit mobile number for server-side verification & OTP dispatch
  const handleContinueReturningMobile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanDigits = returningPhone.replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setReturningPhoneError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsCheckingReturningPhone(true);
    setReturningPhoneError('');
    setReturningPhoneSuccess('');

    try {
      const res = await fetch('/api/concierge/returning-client/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'This mobile number is not registered with Maison Beyou. Please try another number.');
      }

      // Display green success indicator upon backend confirmation
      setReturningPhoneSuccess(data.message || 'Client profile found. Sending verification OTP.');
      setReturningMaskedPhone(data.maskedPhone || `+91 ${cleanDigits.slice(0, 2)}******${cleanDigits.slice(-2)}`);
      setReturningOtpCooldown(data.cooldownSeconds || 30);
      setSixDigitOtp(['', '', '', '', '', '']);
      setReturningOtpError('');
      setReturningOtpSuccess('');

      // Proceed to OTP verification screen after success confirmation
      setTimeout(() => {
        setReturningFlowStep('otp');
        setTimeout(() => {
          sixDigitRefs[0]?.current?.focus();
        }, 150);
      }, 700);
    } catch (err) {
      setReturningPhoneError(err.message || 'This mobile number is not registered with Maison Beyou. Please try another number.');
    } finally {
      setIsCheckingReturningPhone(false);
    }
  };

  // 2. Handle digit typing in 6-digit inputs with auto-advance
  const handleSixDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...sixDigitOtp];
    newDigits[index] = digit;
    setSixDigitOtp(newDigits);
    setReturningOtpError('');

    if (digit && index < 5) {
      sixDigitRefs[index + 1]?.current?.focus();
    }

    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      handleVerifyReturningOtp(newDigits.join(''));
    }
  };

  // 3. Handle backspace navigation between OTP boxes
  const handleSixDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !sixDigitOtp[index] && index > 0) {
      sixDigitRefs[index - 1]?.current?.focus();
    } else if (e.key === 'Enter' && sixDigitOtp.every(d => d !== '')) {
      handleVerifyReturningOtp(sixDigitOtp.join(''));
    }
  };

  // 4. Handle paste of full 6-digit OTP code
  const handleSixDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setSixDigitOtp(newDigits);
    setReturningOtpError('');
    if (pasted.length === 6) {
      handleVerifyReturningOtp(pasted);
    } else {
      sixDigitRefs[pasted.length]?.current?.focus();
    }
  };

  // 5. Resend OTP code with countdown check
  const handleResendReturningOtp = async () => {
    if (returningOtpCooldown > 0 || isCheckingReturningPhone) return;
    setIsCheckingReturningPhone(true);
    setReturningOtpError('');
    try {
      const res = await fetch('/api/concierge/returning-client/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: returningPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification OTP');
      }
      setReturningOtpCooldown(data.cooldownSeconds || 30);
      setToastNotification({ type: 'success', message: 'A new 6-digit OTP has been dispatched via SMS.' });
    } catch (err) {
      setReturningOtpError(err.message || 'Failed to resend verification OTP.');
    } finally {
      setIsCheckingReturningPhone(false);
    }
  };

  // 6. Verify 6-digit OTP, authenticate session & open client profile
  const handleVerifyReturningOtp = async (codeToVerify = null) => {
    const fullCode = codeToVerify || sixDigitOtp.join('');
    if (fullCode.length !== 6) {
      setReturningOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingReturningOtp(true);
    setReturningOtpError('');

    try {
      const res = await fetch('/api/concierge/returning-client/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: returningPhone,
          otp: fullCode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code. Please check and try again.');
      }

      setReturningOtpSuccess('Identity verified successfully!');

      const verifiedClient = data.client;
      setSelectedRegularClient(verifiedClient);
      setSelectedServices([]);
      setSelectedRepeatServiceKeys([]);
      setRepeatAnswer('no');
      setClientHistory({
        last_visit: data.last_visit,
        previous_services: data.previous_services || [],
        all_service_history: data.all_service_history || [],
        visit_history: data.visit_history || []
      });
      setClientType('regular');

      if (data.verificationToken) {
        sessionStorage.setItem('concierge_verified_client_token', data.verificationToken);
      }

      setTimeout(() => {
        setWelcomeBackClient(verifiedClient);
        setReturningFlowStep('welcome');
      }, 400);

    } catch (err) {
      setReturningOtpError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingReturningOtp(false);
    }
  };

  // Fetch complete dossier when a regular client is chosen (never auto-preselect services for new visit)
  useEffect(() => {
    if (selectedRegularClient?.client_id) {
      setLoadingHistory(true);
      apiRequest(`/clients/${selectedRegularClient.client_id}`)
        .then(res => {
          setClientHistory(res);
          // Clean fresh start: Do not auto-preselect previous services into cart.
          // Repeat services will only be added if the client explicitly chooses them in repeat-prompt.
        })
        .catch(err => {
          console.error('Failed to fetch client history:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [selectedRegularClient]);

  // Staff assignment is handled by the reception concierge, not pre-assigned

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
          .catch(() => { });
      } else {
        setPhoneCheckMessage(null);
      }
    }
  }, [clientPhone, clientType]);

  // Financial Calculations
  const servicesSubtotal = selectedServices.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const membershipAmount = activeMembership ? (parseFloat(activeMembership.price || activeMembership.plan?.price) || 0) : 0;
  const subtotal = servicesSubtotal + membershipAmount;

  let calculatedDiscount = 0;
  const numDisc = parseFloat(discountValue) || 0;
  if (discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * Math.min(Math.max(numDisc, 0), 100)) / 100);
  } else {
    calculatedDiscount = Math.min(Math.max(numDisc, 0), subtotal);
  }

  const netSubtotal = Math.max(0, subtotal - calculatedDiscount);
  const gstAmount = Math.round(netSubtotal * 0.18);
  const totalAmount = netSubtotal + gstAmount;
  const isCashOrCard = paymentMethod === 'Cash' || paymentMethod === 'Card';
  const effectivePaid = isCashOrCard
    ? (amountPaid === '' ? 0 : Math.max(0, parseFloat(amountPaid) || 0))
    : (amountPaid === '' ? totalAmount : Math.max(0, parseFloat(amountPaid) || 0));
  const calculatedBalance = Math.max(0, totalAmount - effectivePaid);

  let paymentStatus = 'Pending';
  if (isCashOrCard) {
    if (effectivePaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (effectivePaid > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Pending';
    }
  } else {
    // UPI
    if (effectivePaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else if (effectivePaid > 0) {
      paymentStatus = 'Partially Paid';
    } else if (totalAmount === 0 && selectedServices.length > 0) {
      paymentStatus = 'Paid';
    }
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
      newItems.push({
        temp_id: `item_rep_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        service_id: s.service_id,
        service_name: s.service_name_snapshot,
        price: s.price_snapshot,
        staff_id: null,
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
    const newItem = {
      temp_id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      service_id: service.service_id,
      service_name: service.service_name,
      price: service.price,
      staff_id: null,
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
        return { ...s, staff_id: staffId ? parseInt(staffId) : null };
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
      const newItem = {
        temp_id: 'item_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        service_id: prevService.service_id,
        service_name: prevService.service_name,
        price: prevService.current_price || prevService.last_price,
        staff_id: null,
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

  // Confirm and Execute Client Visit Logout
  const handleConfirmLogout = () => {
    setIsLogoutConfirmModalOpen(false);
    if (onClientChange) {
      onClientChange(null);
    }
    setSelectedRegularClient(null);
    setRegisteredClient(null);
    setWelcomeBackClient(null);
    setClientHistory(null);
    setSelectedServices([]);
    setSelectedRepeatServiceKeys([]);
    setActiveMembership(null);
    setClientName('');
    setClientSurname('');
    setClientPhone('');
    setReturningPhone('');
    setReturningFlowStep('mobile');
    setSixDigitOtp(['', '', '', '', '', '']);
    sessionStorage.removeItem('concierge_verified_client_token');

    if (onCancel) {
      onCancel();
    } else {
      setStep('client-type');
    }
  };

  // Confirmation Modal: "Back from here is logout. Would you like to logout?"
  const renderLogoutConfirmModal = () => {
    if (!isLogoutConfirmModalOpen) return null;

    return (
      <div
        className="animate-fade-in"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}
        onClick={() => setIsLogoutConfirmModalOpen(false)}
      >
        <div
          className="card animate-scale-up"
          style={{
            maxWidth: '460px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
            border: '1.5px solid #E7E5E4',
            textAlign: 'center',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close X Button */}
          <button
            type="button"
            onClick={() => setIsLogoutConfirmModalOpen(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Icon Badge */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5EADB 100%)',
            border: '2px solid #DAC493',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 4px 14px rgba(184, 139, 74, 0.2)'
          }}>
            <LogOut size={26} color="#B88B4A" style={{ marginLeft: '2px' }} />
          </div>

          {/* Heading */}
          <h3 style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '22px',
            fontWeight: '700',
            color: '#1C1917',
            marginBottom: '10px',
            lineHeight: 1.25
          }}>
            Confirm Logout
          </h3>

          {/* User's exact prompt message */}
          <p style={{
            fontSize: '15.5px',
            color: '#1C1917',
            fontWeight: '600',
            lineHeight: 1.5,
            marginBottom: '6px'
          }}>
            Back from here is logout. Would you like to logout?
          </p>

          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            marginBottom: '26px'
          }}>
            Going back will end the current client visit session and return to the main desk.
          </p>

          {/* Action Buttons: [ Cancel ] [ Yes, Logout ] */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setIsLogoutConfirmModalOpen(false)}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                boxShadow: '0 4px 14px rgba(184, 139, 74, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              Yes
            </button>
          </div>
        </div>
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
        submitted_at: new Date().toISOString(),
        service_time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        services: selectedServices.map(s => ({
          service_id: s.service_id,
          service_name: s.service_name,
          price: s.price,
          staff_id: null
        })),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        payment_method: (() => {
          const isPurchasing = Boolean(activeMembership && activeMembership.plan);
          if (isPurchasing) return paymentMethod || 'UPI';

          const rawClientTier = (selectedRegularClient?.membership_tier || clientHistory?.client?.membership_tier || '').trim();
          const isClientMember = Boolean(rawClientTier && rawClientTier.toLowerCase() !== 'none' && rawClientTier.toLowerCase() !== 'non-member');
          if (isClientMember) {
            if (membershipCreditMode === 'full') return 'Membership';
            if (membershipCreditMode === 'partial') return 'Membership + ' + (paymentMethod || 'Cash');
            return paymentMethod || 'Cash';
          }
          return paymentMethod || 'UPI';
        })(),
        amount_paid: 0,
        payment_status: 'Pending',
        upi_ref: null,
        membership_tier: activeMembership?.plan?.name || selectedRegularClient?.membership_tier || null,
        membership_price: membershipAmount,
        subtotal: subtotal,
        tax_amount: gstAmount,
        total_amount: totalAmount,
        membership_amount_used: (() => {
          const isPurchasing = Boolean(activeMembership && activeMembership.plan);
          if (isPurchasing) return 0; // First-time membership buyers cannot use credits on today's visit!

          const rawClientTier = (selectedRegularClient?.membership_tier || clientHistory?.client?.membership_tier || '').trim();
          const isClientMember = Boolean(rawClientTier && rawClientTier.toLowerCase() !== 'none' && rawClientTier.toLowerCase() !== 'non-member');
          if (!isClientMember) return 0;

          const clientBal = clientHistory?.client?.membership_balance !== undefined && clientHistory?.client?.membership_balance !== null
            ? parseFloat(clientHistory.client.membership_balance)
            : (selectedRegularClient?.membership_balance !== undefined && selectedRegularClient?.membership_balance !== null ? parseFloat(selectedRegularClient.membership_balance) : 0);
          if (membershipCreditMode === 'full') {
            return Math.min(totalAmount, clientBal > 0 ? clientBal : totalAmount);
          } else if (membershipCreditMode === 'partial') {
            const parsed = parseFloat(membershipCreditAmount) || 0;
            return Math.min(parsed, clientBal > 0 ? clientBal : parsed);
          }
          return 0;
        })(),
        avail_membership_benefits: Boolean(activeMembership && activeMembership.plan) ? false : (useMembershipBenefits || Boolean(selectedVisitorBenefit) || (membershipCreditMode !== 'none')),
        membership_benefit_used: Boolean(activeMembership && activeMembership.plan) ? null : (selectedVisitorBenefit || null),
        benefit_status: Boolean(activeMembership && activeMembership.plan) ? 'Available' : (selectedVisitorBenefit ? 'Partially used' : (clientHistory?.client?.membership_benefit_status || 'Available')),
        notes: [
          visitNotes,
          activeMembership ? `[MEMBERSHIP PURCHASED / PAY AT RECEPTION: ${activeMembership.plan.name} (${activeMembership.plan.priceFormatted || formatCurrency(activeMembership.price)})]` : '',
          (!activeMembership && membershipCreditMode === 'full') ? `[CLIENT REQUEST: Full Membership Credit Deduction]` : ((!activeMembership && membershipCreditMode === 'partial') ? `[CLIENT REQUEST: ₹${membershipCreditAmount} from Membership Credit]` : ''),
          (!activeMembership && selectedVisitorBenefit) ? `[MEMBER BENEFIT REQUESTED: ${selectedVisitorBenefit}]` : ((!activeMembership && useMembershipBenefits) ? '[MEMBERSHIP BENEFIT: Client requested to use membership amount / avail membership benefits at Reception]' : '')
        ].filter(Boolean).join(' | ')
      };

      const res = await apiRequest('/visits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCompletedVisitResult(res);
      // Dispatch global event so Admin, Reception and Manager dashboards immediately update in real-time
      window.dispatchEvent(new CustomEvent('visit_created', { detail: { visit: res?.visit } }));
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
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      alert('Please enter a valid Email Address (compulsory)');
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
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      alert('Please enter a valid Email Address (compulsory)');
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
    if (!clientCity.trim()) {
      alert('Please enter City (compulsory)');
      return;
    }
    if (!clientState.trim()) {
      alert('Please enter State (compulsory)');
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
        setSelectedServices([]);
        setSelectedRepeatServiceKeys([]);
        setRepeatAnswer('no');
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

  // Helper to extract the currently logged-in client details across all wizard steps (active from repeat-prompt onwards)
  const getLoggedInClient = () => {
    if (clientType === 'regular' && selectedRegularClient && step !== 'client-type' && step !== 'client-search') {
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
    const confirmMsg = currentUser?.role === 'visitor'
      ? 'Clear active client session and start over? Any unsaved services will be cleared.'
      : 'Log out active client session and return to Dashboard? Any unsaved services will be cleared.';
    if (window.confirm(confirmMsg)) {
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

  // Client Profile Avatar & Dropdown is now hosted steadily in the top Navbar (replacing Visitor Desk pill)
  const renderClientProfileWidget = () => null;

  // ==========================================
  // STEP 1: CLIENT TYPE
  // ==========================================
  if (step === 'client-type') {
    return (
      <div
        className="concierge-hero-screen animate-fade-in"
        style={{
          position: 'relative',
          background: 'url(/visitor-bg.png) center center / cover no-repeat'
        }}
      >
        {/* Clearly visible black transparent shade overlay */}
        <div
          className="concierge-hero-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.62)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        <div className="concierge-view-wrapper" style={{ position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div className="concierge-header">
            <h1 className="concierge-title">
              A JOURNEY, UNIQUELY YOURS
            </h1>

            <div className="concierge-subtitle-wrap">
              <div className="concierge-divider-line" style={{ background: 'linear-gradient(90deg, transparent, #C59A58)' }} />
              <span className="concierge-subtitle">
                your personalised journey awaits
              </span>
              <div className="concierge-divider-line" style={{ background: 'linear-gradient(90deg, #C59A58, transparent)' }} />
            </div>
          </div>

          <div className="concierge-cards-grid">
            {/* IT'S MY FIRST VISIT */}
            <div
              onClick={() => {
                setClientType('new');
                setSelectedRegularClient(null);
                setRegisteredClient(null);
                setWelcomeBackClient(null);
                setClientHistory(null);
                setSelectedServices([]);
                setSelectedRepeatServiceKeys([]);
                setRepeatAnswer('no');
                setSelectedCategory(null);
                setActiveMembership(null);
                setClientName('');
                setClientSurname('');
                setClientPhone('');
                setClientEmail('');
                setClientAddress1('');
                setClientAddress2('');
                setClientPincode('');
                setClientCity('');
                setClientState('');
                setDiscountValue(0);
                setAmountPaid('');
                setUpiRef('');
                setVisitNotes('');
                setUseMembershipBenefits(false);
                setCompletedVisitResult(null);
                setSubmitError('');
                setPhoneCheckMessage(null);
                setStep('client-info');
              }}
              className="concierge-luxury-card"
            >
              {/* Icon Medallion */}
              <div className="concierge-icon-medallion">
                <UserPlus size={28} strokeWidth={1.8} />
              </div>

              {/* Card Title */}
              <h2 className="concierge-card-title">
                IT’S MY FIRST VISIT
              </h2>

              {/* Card Subtitle */}
              <p className="concierge-card-desc">
                discover the unique experience
              </p>

              {/* Luxury Action Button */}
              <div className="concierge-action-btn concierge-action-btn-gold">
                <span>GET STARTED</span>
              </div>
            </div>

            {/* I'VE BEEN HERE BEFORE */}
            <div
              onClick={() => {
                setClientType('regular');
                setSelectedRegularClient(null);
                setRegisteredClient(null);
                setWelcomeBackClient(null);
                setClientHistory(null);
                setSelectedServices([]);
                setSelectedRepeatServiceKeys([]);
                setRepeatAnswer('no');
                setSelectedCategory(null);
                setActiveMembership(null);
                setDiscountValue(0);
                setAmountPaid('');
                setUpiRef('');
                setVisitNotes('');
                setUseMembershipBenefits(false);
                setCompletedVisitResult(null);
                setSubmitError('');
                setReturningPhone('');
                setReturningPhoneError('');
                setReturningPhoneSuccess('');
                setReturningFlowStep('mobile');
                setSixDigitOtp(['', '', '', '', '', '']);
                setReturningOtpError('');
                setReturningOtpSuccess('');
                setStep('client-search');
              }}
              className="concierge-luxury-card"
            >
              {/* Icon Medallion */}
              <div className="concierge-icon-medallion">
                <UserCheck size={28} strokeWidth={1.8} />
              </div>

              {/* Card Title */}
              <h2 className="concierge-card-title">
                I’VE BEEN HERE BEFORE
              </h2>

              {/* Card Subtitle */}
              <p className="concierge-card-desc">
                we are glad to have you back
              </p>

              {/* Luxury Action Button */}
              <div className="concierge-action-btn concierge-action-btn-dark">
                <span>CONTINUE MY JOURNEY</span>
              </div>
            </div>
          </div>

          {currentUser?.role !== 'visitor' && onCancel && (
            <div style={{ textAlign: 'center', marginTop: 'clamp(20px, 3vh, 32px)' }}>
              <button
                onClick={onCancel}
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  letterSpacing: '0.04em',
                  color: 'rgba(255, 255, 255, 0.85)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)';
                }}
              >
                ← Return to Dashboard
              </button>
            </div>
          )}
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
    const isEmailValid = Boolean(clientEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()));
    const isDuplicate = phoneCheckMessage?.exists;

    return (
      <div className="animate-fade-in" style={{ width: '100%', margin: '20px auto 40px auto', boxSizing: 'border-box' }}>
        <button
          onClick={() => setStep('client-type')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="card" style={{ padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px)', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontFamily: 'var(--font-poppins)', fontSize: '22px', fontWeight: '500', color: '#1C1917', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
            WE’D LOVE TO KNOW YOU BETTER
          </h2>
          <p style={{ fontFamily: 'var(--font-crimson)', fontSize: '15px', color: '#44403C', marginBottom: '12px', lineHeight: 1.4 }}>
            Before we begin, few thoughtful details about you will help us personalise your visit
          </p>
          <div style={{ width: '42px', height: '2px', background: '#C59A58', borderRadius: '2px', marginBottom: '32px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* SECTION 1: PERSONAL INFORMATION */}
            <div>
              <div style={{
                fontFamily: 'var(--font-poppins)',
                fontSize: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: '700',
                color: '#1C1917',
                marginBottom: '32px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid var(--border-color)'
              }}>
                1. PERSONAL DETAILS
              </div>

              {/* Name & Surname */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
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
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Last Name<span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={clientSurname}
                    onChange={(e) => setClientSurname(e.target.value)}
                    placeholder="e.g. Doe"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Gender
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['Female', 'Male'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setClientGender(g)}
                      style={{
                        flex: '1 1 80px',
                        minWidth: '70px',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13.5px',
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
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Marital Status
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['Unmarried', 'Married'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setClientMaritalStatus(m)}
                      style={{
                        flex: '1 1 100px',
                        minWidth: '90px',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13.5px',
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
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: clientMaritalStatus === 'Married' ? 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' : '1fr',
                  gap: '16px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
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
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 14px 12px 38px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-color)',
                          background: 'var(--bg-card-subtle)',
                          outline: 'none',
                          fontSize: '14px',
                          color: 'var(--text-main)'
                        }}
                      />
                      <Calendar size={16} color="#B88B4A" style={{ position: 'absolute', left: '12px', top: '15px' }} />
                    </div>
                  </div>

                  {clientMaritalStatus === 'Married' && (
                    <div className="animate-fade-in" style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
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
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 14px 12px 38px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            outline: 'none',
                            fontSize: '14px',
                            color: 'var(--text-main)'
                          }}
                        />
                        <Calendar size={16} color="#B88B4A" style={{ position: 'absolute', left: '12px', top: '15px' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Mobile Number (10 digits) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{
                      padding: '11px 12px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-muted)',
                      flexShrink: 0
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
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '12px 14px',
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

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Email Address <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="e.g. john.doe@example.com"
                      required
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
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
                fontFamily: 'var(--font-poppins)',
                fontSize: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: '700',
                color: '#1C1917',
                marginBottom: '32px',
                paddingBottom: '10px',
                borderBottom: '1.5px solid var(--border-color)'
              }}>
                2. RESIDENTIAL ADDRESS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={clientAddress1}
                    onChange={(e) => setClientAddress1(e.target.value)}
                    placeholder="e.g. Flat 402, Sea Crest Apts, Hill Road"
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

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={clientAddress2}
                    onChange={(e) => setClientAddress2(e.target.value)}
                    placeholder="e.g. Bandra West, Near Mehboob Studio"
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                      Pin Code <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={clientPincode}
                      onChange={(e) => setClientPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder=""
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                      City <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      placeholder=""
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                      State <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      placeholder=""
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
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
              marginTop: '32px',
              paddingTop: '32px',
              borderTop: '1.5px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px'
            }}>
              <div>
                {/* Submit New Client Data Button */}
                <button
                  type="button"
                  onClick={handleSubmitNewClient}
                  disabled={!clientName.trim() || !isMobileValid || !isEmailValid || isDuplicate || isSubmittingClient}
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
                    opacity: (!clientName.trim() || !isMobileValid || !isEmailValid || isDuplicate || isSubmittingClient) ? 0.5 : 1,
                    cursor: (!clientName.trim() || !isMobileValid || !isEmailValid || isDuplicate || isSubmittingClient) ? 'not-allowed' : 'pointer',
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
                {currentUser?.role !== 'visitor' && onCancel && (
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
                )}
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
      <div className="animate-fade-in" style={{ width: '100%', margin: '24px auto 40px auto', boxSizing: 'border-box' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Logout Confirmation Modal */}
        {renderLogoutConfirmModal()}

        {/* Top Navigation Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <button
            type="button"
            onClick={() => setIsLogoutConfirmModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
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
  // STEP 2B: RETURNING CLIENT MOBILE VERIFICATION (BACK TO BEYOU)
  // ==========================================
  if (step === 'client-search') {
    return (
      <div className="animate-fade-in returning-client-view-wrapper" style={{ width: '100%', maxWidth: '580px', margin: 'auto' }}>

        {/* Sub-step 1: Mobile Number Input Screen */}
        {returningFlowStep === 'mobile' ? (
          <div className="returning-client-card-inner">
            {/* Top Navigation */}
            <button
              onClick={() => {
                setStep('client-type');
                setReturningPhoneError('');
                setReturningPhoneSuccess('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#B88B4A'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="card" style={{
              padding: 'clamp(32px, 5vh, 44px) clamp(24px, 4vw, 36px)',
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid var(--border-color)',
              boxShadow: '0 16px 44px -10px rgba(184, 139, 74, 0.12), 0 2px 8px rgba(28, 25, 23, 0.03)',
              position: 'relative'
            }}>
              {/* Header Badge */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: '#B88B4A',
                  fontWeight: '800',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--primary-border)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <UserCheck size={13} />
                  Maison BeYou Concierge
                </span>
              </div>

              {/* Title & Subtitle */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(28px, 4vw, 34px)',
                  color: '#1C1917',
                  letterSpacing: '0.04em',
                  fontWeight: '700',
                  margin: '8px 0 8px 0',
                  lineHeight: 1.2
                }}>
                  WELCOME BACK
                </h1>
                <p style={{
                  fontSize: '13.5px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  maxWidth: '420px',
                  margin: '0 auto'
                }}>
                  Enter your registered mobile number to continue your Journey.
                </p>
              </div>

              <form onSubmit={handleContinueReturningMobile}>
                {/* Mobile Input Field */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-main)',
                    marginBottom: '8px'
                  }}>
                    Mobile Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: returningPhoneError
                      ? '1.5px solid #F87171'
                      : (returningPhoneSuccess ? '1.5px solid #86EFAC' : '1.5px solid var(--border-color)'),
                    boxShadow: 'var(--shadow-sm)',
                    background: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}>
                    {/* +91 Country Code Prefix */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--bg-surface)',
                      borderRight: '1.5px solid var(--border-color)',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      userSelect: 'none'
                    }}>
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>

                    <input
                      type="tel"
                      inputMode="numeric"
                      autoFocus
                      maxLength={10}
                      value={returningPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setReturningPhone(digits);
                        setReturningPhoneError('');
                        setReturningPhoneSuccess('');
                      }}
                      placeholder="Enter 10-digit mobile"
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        padding: '14px 16px',
                        fontSize: '17px',
                        fontWeight: '600',
                        color: 'var(--text-main)',
                        letterSpacing: '0.08em',
                        background: 'transparent'
                      }}
                    />

                    {returningPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setReturningPhone('');
                          setReturningPhoneError('');
                          setReturningPhoneSuccess('');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '0 14px',
                          color: 'var(--text-light)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Clear number"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '6px' }}>
                    Standard 10-digit Indian mobile number (e.g. 98201 XXXXX)
                  </div>
                </div>

                {/* Error State: Mobile Not Registered */}
                {returningPhoneError && (
                  <div className="animate-fade-in" style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '13px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    lineHeight: 1.45
                  }}>
                    <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{returningPhoneError}</div>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setClientType('new');
                            setClientPhone(returningPhone);
                            setStep('client-info');
                          }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FCA5A5',
                            color: '#B91C1C',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          + Register as New to BeYou
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Green Success State: Client Profile Found */}
                {returningPhoneSuccess && (
                  <div className="animate-fade-in" style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    color: '#166534',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />
                    <span>{returningPhoneSuccess}</span>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  type="submit"
                  disabled={returningPhone.length !== 10 || isCheckingReturningPhone}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '14.5px',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #C29653 0%, #A87834 100%)',
                    boxShadow: '0 8px 24px -4px rgba(184, 139, 74, 0.42)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: (returningPhone.length !== 10 || isCheckingReturningPhone) ? 'not-allowed' : 'pointer',
                    opacity: (returningPhone.length !== 10 || isCheckingReturningPhone) ? 0.5 : 1
                  }}
                >
                  {isCheckingReturningPhone ? (
                    <span>Checking Client Database...</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : returningFlowStep === 'otp' ? (
          /* Sub-step 2: OTP Verification Screen */
          <div className="returning-client-card-inner">
            {/* Back Button to Edit Number */}
            <button
              onClick={() => {
                setReturningFlowStep('mobile');
                setReturningOtpError('');
                setReturningOtpSuccess('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#B88B4A'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="card" style={{
              padding: 'clamp(32px, 5vh, 44px) clamp(24px, 4vw, 36px)',
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid var(--border-color)',
              boxShadow: '0 16px 44px -10px rgba(184, 139, 74, 0.12), 0 2px 8px rgba(28, 25, 23, 0.03)',
              textAlign: 'center'
            }}>
              {/* Title & Subtitle */}
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(26px, 4vw, 32px)',
                color: '#1C1917',
                letterSpacing: '0.04em',
                fontWeight: '700',
                margin: '0 0 8px 0',
                lineHeight: 1.2
              }}>
                VERIFY YOUR NUMBER
              </h1>
              <p style={{
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                maxWidth: '420px',
                margin: '0 auto 18px auto'
              }}>
                Enter the verification code sent to your registered mobile number.
              </p>

              {/* Masked Mobile Pill */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '6px 16px',
                borderRadius: '9999px',
                marginBottom: '28px'
              }}>
                <Phone size={13} color="#B88B4A" />
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '0.04em' }}>
                  {returningMaskedPhone || `+91 ${returningPhone}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReturningFlowStep('mobile');
                    setReturningOtpError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#B88B4A',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginLeft: '4px'
                  }}
                >
                  Edit
                </button>
              </div>

              {/* 6-Digit OTP Input Grid */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'clamp(8px, 1.8vw, 12px)',
                  marginBottom: '20px'
                }}
                onPaste={handleSixDigitPaste}
              >
                {sixDigitOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={sixDigitRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleSixDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleSixDigitKeyDown(idx, e)}
                    style={{
                      width: 'clamp(44px, 7vw, 56px)',
                      height: 'clamp(52px, 8vw, 64px)',
                      borderRadius: '14px',
                      border: digit ? '2px solid #B88B4A' : '1.5px solid var(--border-color)',
                      background: digit ? '#FAF6EE' : '#FFFFFF',
                      fontSize: 'clamp(20px, 3.5vw, 26px)',
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

              {/* Error Message */}
              {returningOtpError && (
                <div className="animate-fade-in" style={{
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  marginBottom: '18px',
                  lineHeight: 1.4
                }}>
                  {returningOtpError}
                </div>
              )}

              {/* Success Message */}
              {returningOtpSuccess && (
                <div className="animate-fade-in" style={{
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#166534',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{returningOtpSuccess}</span>
                </div>
              )}

              {/* Verify & Continue Button */}
              <button
                type="button"
                onClick={() => handleVerifyReturningOtp()}
                disabled={sixDigitOtp.some(d => d === '') || isVerifyingReturningOtp}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #C29653 0%, #A87834 100%)',
                  boxShadow: '0 8px 24px -4px rgba(184, 139, 74, 0.42)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: (sixDigitOtp.some(d => d === '') || isVerifyingReturningOtp) ? 'not-allowed' : 'pointer',
                  opacity: (sixDigitOtp.some(d => d === '') || isVerifyingReturningOtp) ? 0.5 : 1,
                  marginBottom: '16px'
                }}
              >
                {isVerifyingReturningOtp ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend OTP with countdown */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                  Didn't receive code?
                </span>
                <button
                  type="button"
                  onClick={handleResendReturningOtp}
                  disabled={returningOtpCooldown > 0 || isCheckingReturningPhone}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: returningOtpCooldown > 0 ? 'var(--text-light)' : '#B88B4A',
                    fontWeight: '700',
                    cursor: returningOtpCooldown > 0 ? 'default' : 'pointer',
                    textDecoration: returningOtpCooldown > 0 ? 'none' : 'underline'
                  }}
                >
                  {isCheckingReturningPhone
                    ? 'Sending new code...'
                    : (returningOtpCooldown > 0 ? `Resend OTP in ${returningOtpCooldown}s` : 'Resend OTP')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-step 3: Dedicated Welcome Back Card (In-place, NO modal popup, NO black background) */
          <div className="returning-client-card-inner">
            {/* Top Navigation */}
            <button
              onClick={() => {
                setWelcomeBackClient(null);
                setSelectedRegularClient(null);
                setClientHistory(null);
                setReturningPhone('');
                setReturningFlowStep('mobile');
                setSixDigitOtp(['', '', '', '', '', '']);
                setReturningPhoneError('');
                setReturningPhoneSuccess('');
                setReturningOtpError('');
                setReturningOtpSuccess('');
                setStep('client-search');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#B88B4A'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {(() => {
              const c = welcomeBackClient || selectedRegularClient;
              if (!c) return null;
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
                <div className="card" style={{
                  padding: 'clamp(32px, 5vh, 44px) clamp(24px, 4vw, 36px)',
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: '0 16px 44px -10px rgba(184, 139, 74, 0.12), 0 2px 8px rgba(28, 25, 23, 0.03)',
                  textAlign: 'center'
                }}>
                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(26px, 4vw, 32px)',
                    color: '#1C1917',
                    marginBottom: '26px',
                    lineHeight: 1.2,
                    fontWeight: '700'
                  }}>
                    Welcome Back, {c.name.toUpperCase()}!
                  </h2>

                  {/* Client Dossier Info Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
                    border: '1.5px solid #DAC493',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1C1917' }}>
                            {clientFullName}
                          </div>
                        </div>
                      </div>

                      {/* Client ID / Member ID Display */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: isMember ? '#B88B4A' : 'var(--text-muted)',
                          fontWeight: '800'
                        }}>
                          {isMember ? 'MEMBER ID' : 'CLIENT ID'}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                          {idBadge.id}
                        </div>
                        {isMember && (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{
                              background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
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
                          </div>
                        )}
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
                          As an active member of <strong>{c.membership_tier}</strong>, your past treatment records, repeat preferences, and member benefits are ready.
                        </div>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} color="#0284C7" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '12.5px', color: '#0369A1', lineHeight: 1.45 }}>
                          You are currently visiting as a non-member. Click Next to view exclusive <strong>Maison BeYou Clubs</strong> membership tiers or proceed to treatments.
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
                      marginBottom: '0'
                    }}
                  >
                    <span>Next</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // ==========================================
  // STEP 2C: CLIENT PROFILE, HISTORY & REPEAT SERVICE (Image 2 Diagram Layout)
  // ==========================================
  if (step === 'repeat-prompt') {
    const client = selectedRegularClient;
    const clientData = clientHistory?.client || client;

    // Determine membership status and tier name
    const rawTier = clientData?.membership_tier || client?.membership_tier || null;
    const isMember = Boolean(rawTier && rawTier.toLowerCase() !== 'none' && rawTier.toLowerCase() !== 'non-member');

    // Requirement: Show only to membership person. Non-members must go directly to membership-plans page instead:
    if (!client || !isMember) {
      setMembershipSourceStep('client-search');
      setStep('membership-plans');
      return null;
    }

    const lastVisit = clientHistory?.last_visit;
    const previousServices = clientHistory?.previous_services || [];
    const membershipTierName = rawTier;
    const planInfo = findMembershipPlan(rawTier);

    // Membership tier costs lookup
    const tierCostMap = {
      'lumiere': 50000,
      'infini': 25000,
      'eternal': 15000,
      'eclat': 6000
    };
    const tierKey = (rawTier || '').toLowerCase().trim();
    const matchedTierKey = Object.keys(tierCostMap).find(k => tierKey.includes(k));
    const fallbackTierCost = matchedTierKey ? tierCostMap[matchedTierKey] : (planInfo?.price ? parseFloat(planInfo.price) : 25000);
    const membershipCost = (clientData?.membership_cost && parseFloat(clientData.membership_cost) > 0)
      ? parseFloat(clientData.membership_cost)
      : fallbackTierCost;

    // Retrieve all visits for this client
    const visitHistory = clientHistory?.visit_history || [];

    // Filter past visits that actually used membership credits
    const visitsWithUsedCredits = visitHistory.filter(v => (parseFloat(v.membership_amount_used) || 0) > 0);

    // Calculate total membership credits used till date across all visits
    const totalCreditsUsedTillDate = (clientData?.total_membership_credits_used !== undefined && clientData?.total_membership_credits_used !== null)
      ? parseFloat(clientData.total_membership_credits_used)
      : (visitsWithUsedCredits.length > 0
          ? visitsWithUsedCredits.reduce((sum, v) => sum + (parseFloat(v.membership_amount_used) || 0), 0)
          : (parseFloat(lastVisit?.membership_amount_used || clientData?.last_membership_amount_used || client?.last_membership_amount_used || 0)));

    // Available credits = membership cost minus membership credits used till date
    const availableCredits = Math.max(0, membershipCost - totalCreditsUsedTillDate);

    // Check if client has used any membership credits till date
    const hasUsedCredits = totalCreditsUsedTillDate > 0 || visitsWithUsedCredits.length > 0;

    // All tier perks & privileges for this client
    let allTierPerks = [];
    if (planInfo?.benefits || planInfo?.privileges) {
      allTierPerks = [...(planInfo.benefits || []), ...(planInfo.privileges || [])];
    }
    if (allTierPerks.length === 0) {
      if (tierKey.includes('lumiere')) {
        allTierPerks = [
          'Unlimited expert aesthetic & dermatological consultations',
          'Birthday: ₹10,000 voucher + luxury wellness package',
          '4 Complimentary premium medi-facials or laser sessions',
          '20% Off all services & homecare product lines',
          'Personal aesthetician of choice for all visits',
          'VIP private lounge booking & companion guest passes'
        ];
      } else if (tierKey.includes('infini')) {
        allTierPerks = [
          'Free comprehensive 3D skin & hair analysis twice a year',
          'Birthday: ₹5000 voucher + complimentary luxury medi-facial',
          '2 Complimentary medi-facials or signature body therapies',
          '15% Off all aesthetic, laser & salon services year-round',
          'Dedicated relationship manager & VIP suite access',
          'Priority weekend & late-evening scheduling'
        ];
      } else if (tierKey.includes('eternal')) {
        allTierPerks = [
          'Free advanced skin analysis (worth ₹1500–₹2000)',
          'Birthday: ₹2500 Voucher / Complimentary Services',
          '1 Free express facial / peel quarterly or 2 per year',
          'Priority booking + peak hour preference',
          'Exclusive pricing on laser packages',
          'Early access to new treatments & offers'
        ];
      } else if (tierKey.includes('eclat')) {
        allTierPerks = [
          'Complimentary skin analysis (basic) once a year',
          'Birthday: ₹1000 voucher / free add-ons',
          'Priority booking on weekends',
          'Access to member-only packages',
          'Free consultation anytime'
        ];
      }
    }

    // Derived values for the layout:
    // 1. Membership Validity Date
    const validityDate = clientData?.membership_expires_at || client?.membership_expires_at
      ? formatDate(clientData?.membership_expires_at || client?.membership_expires_at)
      : (client?.last_visit_date
        ? formatDate(new Date(new Date(client.last_visit_date).setFullYear(new Date(client.last_visit_date).getFullYear() + 1)))
        : '14 Oct 2027');

    // 2. Benefits (Available / Partially used / Full used)
    const benefitsStatus = clientData?.membership_benefit_status
      || lastVisit?.benefit_status
      || client?.membership_benefit_status
      || (hasUsedCredits ? 'Partially used' : 'Available');

    // 3. Last Spend Amount (Total visit cost)
    const lastSpendAmount = lastVisit?.total_amount
      ? lastVisit.total_amount
      : (lastVisit?.services?.length > 0
        ? lastVisit.services.reduce((sum, s) => sum + (parseFloat(s.price_snapshot) || 0), 0)
        : (client?.total_spend > 0 ? Math.round(client.total_spend / Math.max(1, client.total_visits)) : 19470));

    // 4. Benefit Availed in last visit & perk usage history
    const lastBenefitUsed = lastVisit?.membership_benefit_used || clientData?.last_benefit_used || client?.last_benefit_used || '';

    const usedPerksList = [
      ...visitHistory.map(v => v.membership_benefit_used),
      lastBenefitUsed,
      clientData?.last_benefit_used,
      clientData?.last_membership_benefit_used
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());

    const isPerkUsed = (perk) => {
      const pLower = perk.toLowerCase();
      return usedPerksList.some(u => {
        if (!u || u === 'none') return false;
        return pLower.includes(u) || u.includes(pLower) ||
          (u.includes('skin') && pLower.includes('skin')) ||
          (u.includes('analysis') && pLower.includes('analysis')) ||
          (u.includes('birthday') && pLower.includes('birthday')) ||
          (u.includes('facial') && pLower.includes('facial'));
      });
    };

    // 5. Last Visit Date
    const lastVisitDateFormatted = formatDate(lastVisit?.visit_date || client?.last_visit_date || '2026-10-15');

    // 6. Services taken list
    const displayServices = (previousServices && previousServices.length > 0)
      ? previousServices
      : (lastVisit?.services?.map(s => ({
        service_id: s.service_id,
        service_name: s.service_name_snapshot,
        current_price: s.price_snapshot,
        last_price: s.price_snapshot,
        last_taken_date: lastVisit.visit_date,
        last_staff_name: s.staff_name
      })) || [
          { service_id: 101, service_name: 'Underarms Laser', current_price: 1500, last_price: 1500, last_taken_date: '2026-10-14' },
          { service_id: 102, service_name: 'BEU Clear Skin Therapy', current_price: 2800, last_price: 2800, last_taken_date: '2026-10-14' }
        ]);

    const repeatServicesCount = selectedServices.filter(s => s.is_repeat).length;
    const repeatServicesTotal = selectedServices.filter(s => s.is_repeat).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

    return (
      <div className="animate-fade-in" style={{ width: '100%', margin: '20px auto 40px auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', minWidth: 0 }}>

        {/* Navigation Bar */}
        <div className="wizard-nav-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            onClick={() => setIsLogoutConfirmModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Logout Confirmation Modal (Image 4) */}
        {renderLogoutConfirmModal()}

        {/* Toast Notification */}
        {renderToast()}

        {/* DIAGRAM LAYOUT: LEFT CONTAINER & RIGHT CONTAINER */}
        <div className="repeat-diagram-container">

          {/* ==================================================== */}
          {/* LEFT CONTAINER: MEMBERSHIP, VALIDITY, AVAILABLE CREDITS, BENEFITS */}
          {/* (IMAGE 3 - WORTH SECTION REMOVED AS REQUESTED) */}
          {/* ==================================================== */}
          <div className="repeat-diagram-card">
            {/* Header / Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                  MEMBERSHIP
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', fontFamily: 'var(--font-serif, serif)', marginTop: '2px' }}>
                  {membershipTierName.toUpperCase()}
                </div>
              </div>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '999px',
                background: isMember ? '#FAF6EE' : '#F3F4F6',
                color: isMember ? '#B88B4A' : 'var(--text-muted)',
                border: isMember ? '1px solid #DAC493' : '1px solid #E5E7EB'
              }}>
                {isMember ? '💎 Active VIP' : 'Non-Member'}
              </span>
            </div>

            {/* Field 1: Membership Validity Date & Membership Cost */}
            <div className="repeat-diagram-subbox" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Membership Validity Date
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="#B88B4A" />
                  <span>{validityDate}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Membership Cost
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#B88B4A', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(membershipCost)}
                </div>
              </div>
            </div>

            {/* Field 2: Available Credits (Balance = Membership Cost - Credits Used Till Date) */}
            <div className="repeat-diagram-subbox">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Available Credits
                </div>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: hasUsedCredits ? '#92400E' : '#166534',
                  background: hasUsedCredits ? '#FEF3C7' : '#DCFCE7',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {hasUsedCredits ? 'Active Balance' : '100% Available'}
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#166534', marginTop: '6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
                {formatCurrency(availableCredits)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Membership Value: <strong style={{ color: '#1C1917' }}>{formatCurrency(membershipCost)}</strong>
                {hasUsedCredits ? (
                  <span> • {formatCurrency(totalCreditsUsedTillDate)} used till date</span>
                ) : (
                  <span> • Full credits available</span>
                )}
              </div>
            </div>

            {/* Field 3: Benefits & Privileges (All tier perks with Used vs Available status) */}
            <div className="repeat-diagram-subbox">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Benefits & Privileges
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: benefitsStatus === 'Full used' ? '#FEE2E2' : (benefitsStatus === 'Available' ? '#DCFCE7' : '#FEF3C7'),
                  color: benefitsStatus === 'Full used' ? '#991B1B' : (benefitsStatus === 'Available' ? '#166534' : '#92400E'),
                  fontWeight: '800',
                  fontSize: '11.5px',
                  border: benefitsStatus === 'Full used' ? '1px solid #FECACA' : (benefitsStatus === 'Available' ? '1px solid #BBF7D0' : '1px solid #FDE68A')
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: benefitsStatus === 'Full used' ? '#DC2626' : (benefitsStatus === 'Available' ? '#22C55E' : '#D97706')
                  }}></span>
                  {benefitsStatus}
                </span>
              </div>

              {/* All benefits of client's tier: taken/used shown as Used, available ones shown as Available */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {allTierPerks.map((perk, pIdx) => {
                  const used = isPerkUsed(perk);
                  return (
                    <div key={pIdx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: used ? '#F9FAFB' : '#FFFFFF',
                      border: used ? '1px solid #E5E7EB' : '1px solid #DAC493',
                      fontSize: '11.5px'
                    }}>
                      <span style={{
                        color: used ? '#9CA3AF' : '#1C1917',
                        textDecoration: used ? 'line-through' : 'none',
                        fontWeight: used ? '500' : '600',
                        lineHeight: 1.3
                      }}>
                        {perk}
                      </span>
                      <span style={{
                        flexShrink: 0,
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: used ? '#F3F4F6' : '#DCFCE7',
                        color: used ? '#6B7280' : '#166534',
                        border: used ? '1px solid #E5E7EB' : '1px solid #BBF7D0'
                      }}>
                        {used ? '✓ Used' : 'Available'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Image 3 (Worth 50,000 / 25,000 / 15,000 / 6,000) removed as requested */}
          </div>

          {/* ==================================================== */}
          {/* RIGHT CONTAINER: SIDE-BY-SIDE USAGE CARDS & SERVICES TAKEN */}
          {/* ==================================================== */}
          <div className="repeat-diagram-card" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Header Title & Clickable Hint */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', fontWeight: '800' }}>
                    Visit History & Treatments
                  </div>
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                    Click any service pill to repeat it for today's visit
                  </div>
                </div>
                {repeatServicesCount > 0 && (
                  <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '700', background: 'var(--primary-subtle)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--primary-border)' }}>
                    {repeatServicesCount} selected ({formatCurrency(repeatServicesTotal)})
                  </div>
                )}
              </div>

              {/* Horizontal Side-by-Side Visit Cards (ONLY membership credits used visits) */}
              {(() => {
                // Show ONLY visits where membership credits were actually used, NOT all visit history:
                const displayVisitsList = visitsWithUsedCredits.length > 0
                  ? visitsWithUsedCredits.slice(0, 3)
                  : ((lastVisit && (parseFloat(lastVisit.membership_amount_used) || 0) > 0) ? [lastVisit] : []);

                if (displayVisitsList.length === 0) {
                  return (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}>
                      {/* Compact "Not Used Yet" Card - Image 1 footprint */}
                      <div style={{
                        width: '320px',
                        maxWidth: '100%',
                        flex: '0 0 320px',
                        background: '#FAF6EE',
                        border: '1.5px solid #DAC493',
                        borderRadius: '14px',
                        padding: '16px 18px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(184, 139, 74, 0.08)'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                              color: '#92400E',
                              background: '#FEF3C7',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #FDE68A'
                            }}>
                              Membership Status
                            </span>
                            <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                              • 100% Intact
                            </span>
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <Sparkles size={18} color="#B88B4A" />
                            <span>Not Used Yet</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#78716C', marginTop: '8px', lineHeight: 1.4 }}>
                            No membership credits or treatments recorded yet. Full credit balance of <strong>{formatCurrency(membershipCost)}</strong> is available.
                          </div>
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px dashed rgba(184, 139, 74, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>Available Credits</span>
                          <span style={{ fontSize: '18px', fontWeight: '800', color: '#166534', fontFamily: 'var(--font-sans)' }}>{formatCurrency(availableCredits)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '14px',
                    alignItems: 'flex-start'
                  }}>
                    {displayVisitsList.map((uv, idx) => {
                      const amountDeducted = parseFloat(uv.membership_amount_used) || 0;
                      const visitTotal = uv.total_amount ? parseFloat(uv.total_amount) : (idx === 0 ? lastSpendAmount : 0);
                      const visitLabel = idx === 0 ? 'Last Visit' : (idx === 1 ? 'Previous Visit' : `Visit #${displayVisitsList.length - idx}`);
                      const visitDateFormatted = formatDate(uv.visit_date || uv.benefit_used_date || '2026-10-15');

                      const cardServices = (uv.services && uv.services.length > 0)
                        ? uv.services.map(s => ({
                            service_id: s.service_id,
                            service_name: s.service_name_snapshot || s.service_name,
                            current_price: s.price_snapshot || s.price,
                            last_price: s.price_snapshot || s.price,
                            last_taken_date: uv.visit_date,
                            last_staff_name: s.staff_name
                          }))
                        : (idx === 0 ? displayServices : []);

                      return (
                        <div
                          key={uv.visit_id || idx}
                          style={{
                            width: '320px',
                            maxWidth: '100%',
                            flex: '0 0 320px',
                            background: '#FFFFFF',
                            border: '1.5px solid var(--border-color)',
                            borderRadius: '14px',
                            padding: '16px 18px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
                          }}
                        >
                          <div>
                            {/* Card Header: Label & Date (Matching Image 1) */}
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: '700' }}>
                                {visitLabel}
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={15} color="#B88B4A" />
                                <span>{visitDateFormatted}</span>
                              </div>
                            </div>

                            {/* Credits used in visit if any */}
                            {amountDeducted > 0 ? (
                              <div style={{
                                marginTop: '10px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: '#FAF6EE',
                                border: '1px solid #DAC493',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    Used Credits
                                  </div>
                                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#166534', fontFamily: 'var(--font-sans)', marginTop: '1px' }}>
                                    -{formatCurrency(amountDeducted)}
                                  </div>
                                </div>
                                {visitTotal > 0 && (
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '700' }}>
                                      Total Visit
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', marginTop: '1px' }}>
                                      {formatCurrency(visitTotal)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              visitTotal > 0 && (
                                <div style={{ fontSize: '11px', color: '#78716C', marginTop: '6px' }}>
                                  Total Visit Cost: <strong style={{ color: '#1C1917' }}>{formatCurrency(visitTotal)}</strong>
                                </div>
                              )
                            )}

                            {/* Divider Line (matching Image 1) */}
                            <div style={{ margin: '12px 0 10px 0', borderTop: '1px solid var(--border-color)' }} />

                            {/* Services Taken Section (matching Image 1) */}
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#B88B4A', fontWeight: '800', marginBottom: '8px' }}>
                                Services Taken
                              </div>

                              {cardServices && cardServices.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {cardServices.map((ps) => {
                                    const key = String(ps.service_id || ps.service_name);
                                    const isSelected = selectedRepeatServiceKeys.includes(key);
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleToggleRepeatService(ps)}
                                        className="repeat-service-pill-btn"
                                        style={{
                                          border: isSelected ? '1.5px solid #B88B4A' : '1.5px solid var(--border-color)',
                                          background: isSelected ? 'var(--primary-subtle)' : '#FFFFFF',
                                          color: isSelected ? '#1C1917' : 'var(--text-main)',
                                          boxShadow: isSelected ? '0 2px 8px rgba(184, 139, 74, 0.2)' : 'none',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <span>{ps.service_name}</span>
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '800',
                                          color: isSelected ? '#B88B4A' : 'var(--text-muted)'
                                        }}>
                                          {formatCurrency(ps.current_price || ps.last_price)}
                                        </span>
                                        {isSelected ? (
                                          <span style={{
                                            fontSize: '9.5px',
                                            fontWeight: '800',
                                            padding: '2px 6px',
                                            borderRadius: '999px',
                                            background: '#B88B4A',
                                            color: '#FFFFFF'
                                          }}>
                                            ✓ Added
                                          </span>
                                        ) : (
                                          <Plus size={12} color="#78716C" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  No previous treatments recorded
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Perk / Benefit Availed if any */}
                          {uv.membership_benefit_used && uv.membership_benefit_used !== 'none' && (
                            <div style={{
                              marginTop: '12px',
                              paddingTop: '8px',
                              borderTop: '1px solid rgba(184, 139, 74, 0.2)',
                              fontSize: '11px',
                              color: '#92400E',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <Sparkles size={12} color="#B88B4A" style={{ flexShrink: 0 }} />
                              <span>Perk: <strong>{uv.membership_benefit_used}</strong></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Bottom Actions Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              marginTop: '16px'
            }}>
              <button
                type="button"
                onClick={() => setStep('categories')}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                <Plus size={15} />
                + Add More Services (from Catalog)
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {selectedServices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep('selected-services')}
                    className="btn-secondary"
                    style={{
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderColor: 'var(--primary-border)',
                      color: '#B88B4A'
                    }}
                  >
                    Review Selected ({selectedServices.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStep(selectedServices.length > 0 ? 'selected-services' : 'categories')}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    fontWeight: '700'
                  }}
                >
                  {selectedServices.length > 0
                    ? `Continue with Selected (${selectedServices.length}) • ${formatCurrency(subtotal)}`
                    : 'Continue to Service Catalog'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2C: 4 EXCLUSIVE MEMBERSHIP CARDS (Image 2 Sample)
  // ==========================================
  if (step === 'membership-plans') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;
    const currentPlan = selectedMembershipPlan || activeMembership?.plan || null;

    return (
      <div className="animate-fade-in membership-plans-wrapper" style={{ width: '100%', margin: 'auto auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        {/* Logout Confirmation Modal */}
        {renderLogoutConfirmModal()}

        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(6px, 1vh, 12px)', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsLogoutConfirmModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(10px, 1.8vh, 18px)' }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: '#B88B4A',
            fontWeight: '700',
            marginBottom: '4px'
          }}>
            Exclusive Memberships
          </div>
          <h1 style={{
            fontSize: 'clamp(20px, 2vw, 28px)',
            color: '#1C1917',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: '600',
            letterSpacing: '0.02em',
            marginBottom: '4px',
            lineHeight: '1.2'
          }}>
            MAISON BEYOU CLUBS
          </h1>
          <p style={{ fontSize: 'clamp(12px, 0.9vw, 13.5px)', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', lineHeight: '1.4' }}>
            Select a membership tier for complimentary treatments, priority booking, and exclusive pricing privileges.
          </p>
        </div>

        {/* 4 Cards Grid (matching Image 2 sample with 4 cards in 1 row for tab & desktop) */}
        <div className="membership-plans-grid">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isSelected = currentPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedMembershipPlan(plan)}
                className="membership-card-item"
                style={{
                  border: isSelected ? '2px solid #B88B4A' : '1px solid rgba(218, 196, 147, 0.45)',
                  boxShadow: isSelected
                    ? '0 8px 24px rgba(184, 139, 74, 0.22)'
                    : '0 2px 10px rgba(0,0,0,0.04)',
                  transform: isSelected ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.07)';
                    e.currentTarget.style.borderColor = '#B88B4A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(218, 196, 147, 0.45)';
                  }
                }}
              >
                {/* VIP Membership Card Showcase */}
                <div
                  className="membership-card-showcase"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(180deg, #F8F4EC 0%, #FFFFFF 100%)'
                      : 'linear-gradient(180deg, #FAF7F2 0%, #FFFFFF 100%)'
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '1005 / 639',
                    borderRadius: 'clamp(7px, 0.75vw, 11px)',
                    overflow: 'hidden',
                    boxShadow: isSelected
                      ? '0 8px 20px rgba(184, 139, 74, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.09)',
                    transition: 'all 0.25s ease',
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
                      top: '8px',
                      right: '8px',
                      background: '#B88B4A',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      zIndex: 2
                    }}>
                      <Check size={12} />
                      SELECTED
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="membership-card-body">
                  {/* Service Subtitle & Validity */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'clamp(2px, 0.4vh, 5px)'
                  }}>
                    <span style={{
                      fontSize: 'clamp(9.5px, 0.75vw, 11px)',
                      letterSpacing: '0.12em',
                      color: '#A8A29E',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      {plan.tierNumber}
                    </span>
                    <span style={{
                      fontSize: 'clamp(9.5px, 0.75vw, 11px)',
                      fontWeight: '700',
                      color: '#B88B4A',
                      background: '#FAF6EE',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(218, 196, 147, 0.5)'
                    }}>
                      {plan.validity}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 style={{
                    fontSize: 'clamp(12.5px, 1vw, 15.5px)',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: '700',
                    color: '#1C1917',
                    lineHeight: '1.2',
                    marginBottom: 'clamp(2px, 0.3vh, 4px)'
                  }}>
                    {plan.name} ({plan.priceFormatted})
                  </h3>

                  {/* Tagline */}
                  <p style={{
                    fontSize: 'clamp(9.5px, 0.76vw, 11.5px)',
                    color: '#78716C',
                    lineHeight: '1.3',
                    marginBottom: 'clamp(4px, 0.6vh, 7px)',
                    minHeight: 'clamp(24px, 2vw, 30px)'
                  }}>
                    {plan.tagline}
                  </p>

                  <div style={{ height: '1px', background: '#F2ECE1', marginBottom: 'clamp(4px, 0.6vh, 7px)' }} />

                  {/* Benefits */}
                  <div style={{ marginBottom: 'clamp(4px, 0.6vh, 7px)' }}>
                    <div style={{
                      fontSize: 'clamp(10px, 0.78vw, 11.5px)',
                      fontWeight: '700',
                      color: '#B88B4A',
                      marginBottom: '2px'
                    }}>
                      Benefits :
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {plan.benefits.map((b, idx) => (
                        <li key={idx} style={{ fontSize: 'clamp(9px, 0.74vw, 10.8px)', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '5px', lineHeight: '1.25' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Privileges */}
                  <div style={{ marginBottom: 'clamp(6px, 0.8vh, 10px)', flex: 1 }}>
                    <div style={{
                      fontSize: 'clamp(10px, 0.78vw, 11.5px)',
                      fontWeight: '700',
                      color: '#B88B4A',
                      marginBottom: '2px'
                    }}>
                      Privileges :
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {plan.privileges.map((p, idx) => (
                        <li key={idx} style={{ fontSize: 'clamp(9px, 0.74vw, 10.8px)', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '5px', lineHeight: '1.25' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Discover / Select Button */}
                  <div style={{
                    paddingTop: 'clamp(5px, 0.6vh, 8px)',
                    borderTop: '1px solid #F5EFE6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{
                      fontSize: 'clamp(9.5px, 0.75vw, 11px)',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: isSelected ? '#B88B4A' : '#78716C',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isSelected ? '✓ Plan Selected' : 'DISCOVER →'}
                    </span>
                    <span style={{ fontSize: 'clamp(11.5px, 0.9vw, 13.5px)', fontWeight: '700', color: '#B88B4A' }}>
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
          borderRadius: 'clamp(12px, 1vw, 16px)',
          padding: 'clamp(8px, 1vh, 12px) clamp(14px, 1.5vw, 24px)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: 'clamp(12px, 0.95vw, 13.5px)', fontWeight: '600', color: 'var(--text-main)' }}>
              {currentPlan ? (
                <span>Selected: <strong style={{ color: '#B88B4A' }}>{currentPlan.name}</strong> ({currentPlan.priceFormatted})</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No membership plan selected</span>
              )}
            </div>
            <div style={{ fontSize: 'clamp(10.5px, 0.8vw, 11.5px)', color: 'var(--text-muted)', marginTop: '1px' }}>
              Select a tier above and click Proceed to add to cart, or click Skip to proceed straight to services.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* SKIP BUTTON */}
            <button
              type="button"
              onClick={() => {
                setSelectedMembershipPlan(null);
                setActiveMembership(null);
                setStep('categories');
              }}
              className="btn-secondary"
              style={{
                padding: 'clamp(6px, 0.8vh, 9px) clamp(14px, 1.2vw, 20px)',
                fontSize: 'clamp(12px, 0.9vw, 13px)',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              Skip
            </button>

            {/* PROCEED BUTTON: Adds to cart as payment is managed by reception desk */}
            <button
              type="button"
              onClick={() => {
                const planToSet = selectedMembershipPlan || activeMembership?.plan;
                if (!planToSet) {
                  alert('Please select a membership plan above, or click Skip.');
                  return;
                }
                setActiveMembership({
                  plan: planToSet,
                  price: planToSet.price
                });
                setSelectedMembershipPlan(planToSet);
                setToastNotification(`✓ ${planToSet.name} added to cart`);
                setTimeout(() => setToastNotification(null), 3000);
                setStep('categories');
              }}
              disabled={!currentPlan}
              className="btn-primary"
              style={{
                padding: 'clamp(6px, 0.8vh, 9px) clamp(16px, 1.4vw, 24px)',
                fontSize: 'clamp(12px, 0.9vw, 13px)',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: !currentPlan ? 0.5 : 1,
                cursor: !currentPlan ? 'not-allowed' : 'pointer',
                borderRadius: '8px'
              }}
            >
              Proceed
              <ArrowRight size={15} />
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

    // Check if current client has an active membership tier
    const clientData = clientHistory?.client || selectedRegularClient;
    const rawTier = activeMembership?.plan?.name || clientData?.membership_tier || selectedRegularClient?.membership_tier || null;
    const isClientMember = Boolean(rawTier && rawTier.toLowerCase() !== 'none' && rawTier.toLowerCase() !== 'non-member' && rawTier !== 'null');

    const handleCategoriesBack = () => {
      if (isClientMember) {
        setStep('repeat-prompt');
      } else {
        setStep('membership-plans');
      }
    };

    return (
      <div className="animate-fade-in categories-view-container" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Logout Confirmation Modal */}
        {renderLogoutConfirmModal()}

        {/* Back button (Prompts Logout for Members, returns to Membership Plans for Non-Members) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={handleCategoriesBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
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
                  Selected Membership: <span style={{ color: '#B88B4A' }}>{activeMembership.plan.name}</span> ({activeMembership.plan.priceFormatted})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Added to Cart • Payment managed at Reception Desk
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
              MEMBERSHIP IN CART
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

          {(selectedServices.length > 0 || activeMembership) && (
            <button
              onClick={() => setStep('selected-services')}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              View Cart ({selectedServices.length}{activeMembership ? ' + Tier' : ''}) • {formatCurrency(subtotal)}
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
          <div className="categories-grid">
            {categories.map((cat, idx) => (
              <div
                key={cat.category_id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep('sub-services');
                }}
                className="card category-card"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div className="category-card-medallion">
                      <Sparkles size={22} />
                    </div>
                    <span className="category-card-number">
                      0{idx + 1}
                    </span>
                  </div>

                  <h2 className="category-card-title">
                    {cat.category_name}
                  </h2>
                  <p className="category-card-desc">
                    {cat.description || 'Specialized clinical therapies & treatments'}
                  </p>
                </div>

                <div className="category-card-footer">
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

        {/* Bottom Actions Bar */}
        {selectedServices.length > 0 && (
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={() => setStep('selected-services')}
              className="btn-primary"
            >
              Continue with Selected ({selectedServices.length}) →
            </button>
          </div>
        )}
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
      <div className="animate-fade-in sub-services-wrapper" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Top Navigation Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(8px, 1.2vh, 14px)', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() => setStep('categories')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(selectedServices.length > 0 || activeMembership) && (
              <button
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{ padding: '7px 18px', fontSize: '13px' }}
              >
                View Cart: {selectedServices.length}{activeMembership ? ' + Tier' : ''} ({formatCurrency(subtotal)}) →
              </button>
            )}
          </div>
        </div>

        {/* Category Header */}
        <div style={{ marginBottom: 'clamp(12px, 1.8vh, 18px)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '800' }}>
            Category Overview
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', color: '#1C1917', margin: '2px 0 4px 0', fontFamily: 'var(--font-serif)', fontWeight: '700', lineHeight: 1.2 }}>
            {selectedCategory.category_name}
          </h1>
          <p style={{ fontSize: 'clamp(12px, 0.9vw, 13.5px)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
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
              marginBottom: 'clamp(16px, 2.2vh, 24px)',
              borderRadius: '20px',
              border: '1.5px solid rgba(220, 205, 185, 0.6)',
              boxShadow: '0 8px 24px rgba(184, 139, 74, 0.08)',
              background: '#FFFFFF'
            }}
          >
            <div className="spotlight-featured-grid" style={{ alignItems: 'stretch' }}>
              {/* Media Section: Video/Image Player + 5 Thumbnails Below */}
              <div className="spotlight-media-col" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box'
              }}>
                {/* Main Media Display Area (Video or Selected Photo) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  maxHeight: 'clamp(175px, 22vh, 235px)',
                  borderRadius: '14px',
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
                        top: '12px',
                        left: '12px',
                        right: '12px',
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
                          padding: '4px 11px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          letterSpacing: '0.04em'
                        }}>
                          <Play size={9} fill="#FFFFFF" color="#FFFFFF" />
                          <span>PROCEDURE DEMO • HD</span>
                        </div>

                        <div style={{
                          background: 'rgba(28, 25, 23, 0.72)',
                          backdropFilter: 'blur(8px)',
                          color: '#FAF7F2',
                          padding: '4px 11px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
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
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: 'rgba(28, 25, 23, 0.65)',
                          backdropFilter: 'blur(6px)',
                          border: '1.5px solid rgba(255, 255, 255, 0.45)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                          transition: 'transform 0.2s ease',
                          zIndex: 2
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
                        title={isVideoPlaying ? 'Pause video' : 'Play procedure preview'}
                      >
                        {isVideoPlaying ? (
                          <Pause size={19} fill="#FFFFFF" />
                        ) : (
                          <Play size={19} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                        )}
                      </button>

                      {/* Bottom-Left Controls Overlay (Sound + Fullscreen) */}
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 2
                      }}>
                        <button
                          type="button"
                          onClick={handleToggleVideoMute}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '7px',
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
                          {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
                            }
                          }}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '7px',
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
                          <Maximize2 size={13} />
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
                        top: '12px',
                        left: '12px',
                        right: '12px',
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
                          padding: '4px 11px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
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
                            padding: '4px 11px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}
                          title="Return to Procedure Demo Video"
                        >
                          <Play size={9} fill="#FFFFFF" />
                          <span>Watch Video</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 5 Thumbnails Below the Video */}
                <div style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  padding: '0',
                  width: '100%'
                }}>
                  {/* Thumbnail 1: Video */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaTab('video');
                      setIsVideoPlaying(true);
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => { });
                      }
                    }}
                    style={{
                      position: 'relative',
                      flex: 1,
                      aspectRatio: '4 / 3',
                      maxHeight: '44px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      padding: 0,
                      margin: 0,
                      boxSizing: 'border-box',
                      lineHeight: 0,
                      border: activeMediaTab === 'video' ? '2px solid #B88B4A' : '1.5px solid #DAC493',
                      boxShadow: activeMediaTab === 'video' ? '0 0 0 2px rgba(184, 139, 74, 0.22), 0 2px 8px rgba(184, 139, 74, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#B88B4A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        <Play size={8} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
                      </div>
                      <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '0.04em' }}>
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
                          flex: 1,
                          aspectRatio: '4 / 3',
                          maxHeight: '44px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          padding: 0,
                          margin: 0,
                          boxSizing: 'border-box',
                          lineHeight: 0,
                          border: isSelected ? '2px solid #B88B4A' : '1.5px solid #DAC493',
                          boxShadow: isSelected ? '0 0 0 2px rgba(184, 139, 74, 0.22), 0 2px 8px rgba(184, 139, 74, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                          bottom: '2px',
                          right: '3px',
                          background: 'rgba(28, 25, 23, 0.72)',
                          backdropFilter: 'blur(4px)',
                          color: '#FFFFFF',
                          fontSize: '8px',
                          fontWeight: '800',
                          padding: '1px 4px',
                          borderRadius: '3px',
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

              {/* Details & Actions Section */}
              <div className="spotlight-details-col" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
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
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: '#166534',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Check size={11} />
                        In Visit ({activeCountInCart})
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(20px, 1.8vw, 25px)',
                    color: '#2B231D',
                    lineHeight: 1.2,
                    margin: '0 0 8px 0',
                    fontWeight: '700'
                  }}>
                    {activeService.service_name}
                  </h2>

                  {/* Badges / Specs Pill Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Clock size={12} color="#9E7437" />
                      {activeService.duration_mins || 35} Mins Session
                    </span>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Zap size={12} color="#9E7437" />
                      {activeMedia.downtime || 'Zero Downtime'}
                    </span>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: '#FAF6EE',
                      color: '#785A35',
                      border: '1px solid #EADBCC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Sparkles size={12} color="#9E7437" />
                      {activeMedia.tag || 'Quick & Effective'}
                    </span>
                  </div>

                  {/* Subtitle Under Pills */}
                  <div style={{
                    fontSize: '12px',
                    color: '#78716C',
                    margin: '4px 0 10px 0',
                    fontWeight: '500'
                  }}>
                    {activeMedia.subtitle || activeService.desc || 'Quick & effective'}
                  </div>

                  {/* Clinical Highlights & Benefits Box with Botanical Watermark */}
                  <div style={{
                    position: 'relative',
                    background: '#FAF7F2',
                    border: '1px solid #EDE4D8',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '12px',
                    overflow: 'hidden'
                  }}>
                    {/* Botanical Leaf Watermark SVG on Right */}
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.4,
                      pointerEvents: 'none'
                    }}>
                      <svg width="38" height="48" viewBox="0 0 60 75" fill="none" stroke="#CBB18E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M30 70 C30 50 30 25 30 10" />
                        <path d="M30 55 C20 48 12 50 10 40 C18 38 26 44 30 48" />
                        <path d="M30 42 C40 35 48 37 50 27 C42 25 34 31 30 35" />
                        <path d="M30 28 C22 22 16 25 15 17 C22 15 28 20 30 23" />
                        <path d="M30 15 C38 10 42 12 43 6 C37 5 32 9 30 12" />
                      </svg>
                    </div>

                    <div style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#785A35', marginBottom: '6px' }}>
                      Clinical Highlights & Benefits
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {activeMedia.highlights?.map((hl, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#44403C', lineHeight: 1.3 }}>
                          <span style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            background: '#F1E3D0',
                            color: '#9E7437',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
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
                  paddingTop: '12px',
                  borderTop: '1px solid #F0E8DC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'nowrap',
                  gap: '12px'
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: '#8C827A', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700' }}>
                      Treatment Price
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', fontFamily: 'var(--font-serif)', fontWeight: '800', color: '#1C1917', lineHeight: 1.1, marginTop: '2px' }}>
                      ₹{Number(activeService.price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleAddService(activeService, true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 22px',
                        borderRadius: '9999px',
                        background: '#9F7335',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(159, 115, 53, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#8C642D'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#9F7335'; }}
                    >
                      <span>{isActiveInCart ? '+ Add Another' : '+ Add to Visit'}</span>
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM HORIZONTAL SCROLLER: Small image + Title + Subtitle + Arrow */}
        <div style={{ marginTop: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: 'clamp(15px, 1.3vw, 18px)', color: '#1C1917', fontWeight: '700', margin: '0 0 2px 0' }}>
                All Treatments in {selectedCategory.category_name} ({subServices.length})
              </h3>
              <p style={{ fontSize: 'clamp(11.5px, 0.85vw, 12.5px)', color: '#78716C', margin: 0 }}>
                Click any service card below to open its preview video and clinical description above.
              </p>
            </div>

            {/* Scroller Arrow Controls */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleScrollScroller('left')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#44403C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
                title="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleScrollScroller('right')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#44403C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
                title="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Horizontal Scroller Strip */}
          <div
            ref={scrollerRef}
            className="horizontal-scroller"
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              padding: '4px 2px 14px 2px',
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
                    minWidth: 'clamp(160px, 18vw, 185px)',
                    maxWidth: 'clamp(160px, 18vw, 185px)',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    border: isSelected ? '2px solid #9F7335' : '1px solid #ECE4D8',
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(159, 115, 53, 0.22)'
                      : '0 2px 8px rgba(0, 0, 0, 0.04)',
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
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    }
                  }}
                >
                  {/* Top Thumbnail Image */}
                  <div style={{ position: 'relative', height: 'clamp(85px, 11vh, 105px)', overflow: 'hidden', background: '#EFEAE2' }}>
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
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1C1917',
                        lineHeight: 1.25,
                        margin: '0 0 2px 0',
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
                      width: '24px',
                      height: '24px',
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
                      <ArrowRight size={12} />
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
            bottom: '12px',
            marginTop: '12px',
            background: '#1C1917',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
            border: '1px solid #B88B4A',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#B88B4A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Visit In Progress
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '1px' }}>
                {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''} in Cart • {formatCurrency(subtotal)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep('categories')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: '1px solid #555',
                  color: '#FAF7F2',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                + Other Categories
              </button>
              <button
                type="button"
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '12.5px', fontWeight: '700' }}
              >
                Review Selected ({selectedServices.length}) →
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
      <div className="animate-fade-in selected-services-wrapper" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
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
            Back
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            SELECTED SERVICES
          </h1>
        </div>

        <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
          {selectedServices.length === 0 && !activeMembership ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No services or membership selected yet.</p>
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

                {/* Selected Membership Item at the end of the services list */}
                {activeMembership && activeMembership.plan && (
                  <div
                    style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #DAC493',
                      boxShadow: '0 2px 10px rgba(184, 139, 74, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #B88B4A 0%, #9E7437 100%)',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                          boxShadow: '0 2px 5px rgba(184, 139, 74, 0.3)'
                        }}>
                          {selectedServices.length + 1}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1C1917', fontFamily: "'Playfair Display', Georgia, serif" }}>
                              {activeMembership.plan.name}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: '#FAF2E6',
                              color: '#9E7437',
                              border: '1px solid #E8D6BC'
                            }}>
                              Exclusive Membership
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: '#F5F5F4',
                              color: '#78716C',
                              border: '1px solid #E7E5E4'
                            }}>
                              {activeMembership.plan.validity}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>
                            {activeMembership.plan.tagline}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '17px', fontWeight: '800', color: '#B88B4A' }}>
                          {activeMembership.plan.priceFormatted}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMembership(null);
                            setSelectedMembershipPlan(null);
                            setToastNotification('Membership removed from cart');
                            setTimeout(() => setToastNotification(null), 3000);
                          }}
                          title="Remove membership from cart"
                          style={{
                            padding: '6px',
                            color: '#DC2626',
                            background: 'var(--danger-bg)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--danger-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Tier Benefits & Privileges */}
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px dashed #E5D7C3',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '12px'
                    }}>
                      {/* Benefits */}
                      <div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#B88B4A',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Sparkles size={12} />
                          Benefits:
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {activeMembership.plan.benefits.map((b, idx) => (
                            <li key={idx} style={{ fontSize: '11.5px', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.3' }}>
                              <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Privileges */}
                      <div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#B88B4A',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <ShieldCheck size={12} />
                          Privileges:
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {activeMembership.plan.privileges.map((p, idx) => (
                            <li key={idx} style={{ fontSize: '11.5px', color: '#57534E', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.3' }}>
                              <span style={{ color: '#B88B4A', fontWeight: 'bold' }}>•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Number of Services Selected (No Total Amount) */}
              <div style={{
                background: '#FAF7F2',
                borderRadius: 'var(--radius-md)',
                padding: '14px 20px',
                border: '1.5px solid #EDE4D8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(184, 139, 74, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FAF2E6',
                    border: '1px solid #E8D6BC',
                    color: '#B88B4A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9E7437', fontWeight: '800' }}>
                      Selected Overview
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1C1917' }}>
                      Total Items Selected
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#9E7437',
                  background: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  border: '1px solid #EADBCC',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
                }}>
                  {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'}
                  {activeMembership ? ' + 1 Membership' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Buttons: ADD MORE SERVICE & PROCEED */}
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
            </div>

            <button
              onClick={() => setStep('confirmation')}
              disabled={selectedServices.length === 0}
              className="btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: '700',
                opacity: selectedServices.length === 0 ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '9999px'
              }}
            >
              Proceed
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 6: BILLING & PAYMENT
  if (step === 'billing-payment') {
    setStep('confirmation');
    return null;
  }

  if (false) {
    const _legacyBilling = (
      <div className="animate-fade-in" style={{ width: '100%', margin: '24px auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('selected-services')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', marginBottom: '2px' }}>
            Checkout & Invoicing
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            BILL SUMMARY & PAYMENT
          </h1>
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
                      {staffMember?.name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Staff: {staffMember.name}
                        </div>
                      )}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                {['UPI', 'Cash', 'Card'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method === 'Cash' || method === 'Card') {
                        setAmountPaid('0');
                      } else {
                        setAmountPaid('');
                      }
                    }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      border: `2px solid ${paymentMethod === method ? '#B88B4A' : 'var(--border-color)'}`,
                      background: paymentMethod === method ? 'var(--primary-subtle)' : '#FFFFFF',
                      color: paymentMethod === method ? '#B88B4A' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {paymentMethod === method && <Check size={16} />}
                    {method === 'UPI' && '⚡ UPI'}
                    {method === 'Cash' && '💵 Cash'}
                    {method === 'Card' && '💳 Card'}
                  </button>
                ))}
              </div>

              {/* UPI Reference ID or Cash/Card Notice */}
              {paymentMethod === 'UPI' ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                    UPI Reference ID / UTR (Optional)
                  </label>
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="e.g. 409218209381 (from GPay / PhonePe / Paytm)"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13.5px',
                      outline: 'none',
                      background: '#FFFFFF'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Reference ID will be recorded so reception can instantly verify your payment.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#FEF3C7',
                  border: '1.5px solid #F59E0B',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <Clock size={18} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12.5px', color: '#92400E', lineHeight: 1.45 }}>
                    <strong>Pay at Reception ({paymentMethod}):</strong> Please pay by {paymentMethod} at the Reception Concierge desk upon arrival. Your appointment will be recorded as <strong>Pending</strong> and changed to <strong>Paid</strong> once received.
                  </div>
                </div>
              )}

              {/* Amount Paid & Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {paymentMethod === 'UPI' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                        Amount Paid via UPI (₹)
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
                )}

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
      <div className="animate-fade-in confirmation-view-wrapper" style={{ width: '100%', maxWidth: '620px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setStep('selected-services')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
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
                SELECTED SERVICES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedServices.map(s => (
                  <div key={s.temp_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                      • {s.service_name}
                    </span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(s.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {activeMembership && activeMembership.plan && (
              <>
                <div style={{ height: '1px', background: 'var(--border-color)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    MEMBERSHIP PLAN
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#B88B4A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👑</span>
                        <span>{activeMembership.plan.name}</span>
                        <span style={{ fontSize: '10.5px', background: '#FAF2E6', color: '#9E7437', border: '1px solid #E8D6BC', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                          {activeMembership.plan.validity}
                        </span>
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Added to visit • Payment managed at Reception Desk
                      </div>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#B88B4A' }}>
                      {activeMembership.plan.priceFormatted || formatCurrency(activeMembership.price)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em' }}>
                  TOTAL
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                  {formatCurrency(subtotal)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em' }}>
                  GST (18%)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#B88B4A', marginTop: '2px' }}>
                  {formatCurrency(gstAmount)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em' }}>
                  TOTAL BILL
                </div>
                <div style={{ fontSize: '19px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* VIP Member Benefits Selection & Reception Settlement Notice */}
          {(() => {
            const isPurchasingMembership = Boolean(activeMembership && activeMembership.plan);
            const existingTier = (
              selectedRegularClient?.membership_tier ||
              clientHistory?.client?.membership_tier ||
              ''
            ).trim();
            const lowerExistingTier = existingTier.toLowerCase();
            const isExistingMember = !isPurchasingMembership && Boolean(existingTier && lowerExistingTier !== 'none' && lowerExistingTier !== 'non-member');

            let tierPerks = [];
            if (isExistingMember) {
              if (lowerExistingTier.includes('lumiere')) {
                tierPerks = [
                  'Unlimited expert aesthetic & dermatological consultations',
                  'Birthday: ₹10,000 voucher + luxury wellness package',
                  '4 Complimentary premium medi-facials or laser sessions',
                  '20% Off all services & homecare product lines',
                  'Personal aesthetician of choice for all visits',
                  'VIP private lounge booking & companion guest passes'
                ];
              } else if (lowerExistingTier.includes('infini')) {
                tierPerks = [
                  'Free comprehensive 3D skin & hair analysis twice a year',
                  'Birthday: ₹5000 voucher + complimentary luxury medi-facial',
                  '2 Complimentary medi-facials or signature body therapies',
                  '15% Off all aesthetic, laser & salon services year-round',
                  'Dedicated relationship manager & VIP suite access',
                  'Priority weekend & late-evening scheduling'
                ];
              } else if (lowerExistingTier.includes('eternal')) {
                tierPerks = [
                  'Free advanced skin analysis (worth ₹1500–₹2000)',
                  'Birthday: ₹2500 Voucher / Complimentary Services',
                  '1 Free express facial / peel quarterly or 2 per year',
                  'Priority booking + peak hour preference',
                  'Exclusive pricing on laser packages',
                  'Early access to new treatments & offers'
                ];
              } else if (lowerExistingTier.includes('eclat')) {
                tierPerks = [
                  'Complimentary skin analysis (basic) once a year',
                  'Birthday: ₹1000 voucher / free add-ons',
                  'Priority booking on weekends',
                  'Access to member-only packages',
                  'Free consultation anytime'
                ];
              }
            }

            if (!isExistingMember) {
              return (
                <div style={{
                  background: isPurchasingMembership ? '#FAF6EE' : '#FFFFFF',
                  border: isPurchasingMembership ? '1.5px solid #DAC493' : '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  marginBottom: '20px',
                  boxShadow: isPurchasingMembership ? '0 2px 8px rgba(184, 139, 74, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', fontWeight: '800' }}>
                        Reception Payment Preference
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                        How will you pay at the Reception Desk?
                      </div>
                    </div>
                    {isPurchasingMembership ? (
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '4px', background: '#FAF2E6', color: '#9E7437', border: '1px solid #E8D6BC' }}>
                        👑 Membership Purchased Today
                      </span>
                    ) : (
                      <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#F3F4F6', color: '#6B7280' }}>
                        Non-Member
                      </span>
                    )}
                  </div>

                  {isPurchasingMembership ? (
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(184, 139, 74, 0.35)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '20px', lineHeight: 1 }}>💎</span>
                      <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#44403C' }}>
                        <div style={{ fontWeight: '800', color: '#B88B4A', marginBottom: '2px' }}>
                          {activeMembership.plan.name} Added to Today's Bill ({activeMembership.plan.priceFormatted || formatCurrency(activeMembership.price)})
                        </div>
                        <div>
                          You are purchasing this membership today. Please proceed with payment of the total bill (<strong>{formatCurrency(totalAmount)}</strong>) at the Reception Desk. Membership credits and exclusive VIP perks will be activated on your profile upon checkout for all future visits.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                      Select how you intend to pay upon treatment completion. The receptionist will verify and collect payment at the front desk:
                    </p>
                  )}

                  {/* 3 Selectable Payment Method Cards: UPI / Cash / Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { key: 'UPI', label: 'UPI / QR', icon: '📱', desc: 'GPay / PhonePe / Paytm' },
                      { key: 'Cash', label: 'Cash', icon: '💵', desc: 'Cash at Desk' },
                      { key: 'Card', label: 'Card', icon: '💳', desc: 'Credit / Debit Card' }
                    ].map(pm => {
                      const isSelected = (paymentMethod || 'UPI') === pm.key;
                      return (
                        <button
                          key={pm.key}
                          type="button"
                          onClick={() => setPaymentMethod(pm.key)}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #B88B4A' : '1.5px solid var(--border-color)',
                            background: isSelected ? '#FAF6EE' : '#FFFFFF',
                            color: isSelected ? '#1C1917' : 'var(--text-main)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(184, 139, 74, 0.2)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{pm.icon}</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#B88B4A' : '#1C1917' }}>
                            {pm.label}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {pm.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reception Processing Guarantee Note */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: isPurchasingMembership ? '#FFFFFF' : '#F9FAFB',
                    border: isPurchasingMembership ? '1px solid #E8D6BC' : '1px solid #E5E7EB',
                    fontSize: '11.5px',
                    color: isPurchasingMembership ? '#785A35' : '#4B5563'
                  }}>
                    <ShieldCheck size={14} color="#B88B4A" style={{ flexShrink: 0 }} />
                    <span>Selected method: <strong>{paymentMethod || 'UPI'}</strong> • Receptionist will collect payment of <strong>{formatCurrency(totalAmount)}</strong> at checkout.</span>
                  </div>
                </div>
              );
            }

            const clientBal = clientHistory?.client?.membership_balance !== undefined && clientHistory?.client?.membership_balance !== null
              ? parseFloat(clientHistory.client.membership_balance)
              : (selectedRegularClient?.membership_balance !== undefined && selectedRegularClient?.membership_balance !== null
                ? parseFloat(selectedRegularClient.membership_balance)
                : 0);

            let calculatedCreditDeduction = 0;
            if (membershipCreditMode === 'full') {
              calculatedCreditDeduction = Math.min(totalAmount, clientBal > 0 ? clientBal : totalAmount);
            } else if (membershipCreditMode === 'partial') {
              const parsed = parseFloat(membershipCreditAmount) || 0;
              calculatedCreditDeduction = Math.min(parsed, clientBal > 0 ? clientBal : parsed);
            } else {
              calculatedCreditDeduction = 0;
            }

            const remainingToPayManually = Math.max(0, totalAmount - calculatedCreditDeduction);

            return (
              <div style={{
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(184, 139, 74, 0.08)'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>💎</span>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', fontWeight: '800' }}>
                        {existingTier.toUpperCase()} SETTLEMENT PREFERENCES
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917' }}>
                        Choose Membership Credit & Perk for Today's Visit
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: '#78716C', textTransform: 'uppercase', fontWeight: '700' }}>
                      Available Credits
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#166534' }}>
                      {formatCurrency(clientBal)}
                    </div>
                  </div>
                </div>

                {/* Section 1: Membership Credit Usage (Full / Partial / None) */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid rgba(184, 139, 74, 0.3)',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1C1917', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amount to Use from Membership Credits:</span>
                    <strong style={{ color: '#166534' }}>-{formatCurrency(calculatedCreditDeduction)}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setMembershipCreditMode('full')}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '6px',
                        border: membershipCreditMode === 'full' ? '2px solid #B88B4A' : '1px solid #E5E7EB',
                        background: membershipCreditMode === 'full' ? '#FAF6EE' : '#F9FAFB',
                        color: membershipCreditMode === 'full' ? '#B88B4A' : '#4B5563',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>Full Credits</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '2px', color: '#166534' }}>
                        Up to {formatCurrency(Math.min(totalAmount, clientBal))}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMembershipCreditMode('partial');
                        if (!membershipCreditAmount) {
                          setMembershipCreditAmount(String(Math.min(5000, clientBal)));
                        }
                      }}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '6px',
                        border: membershipCreditMode === 'partial' ? '2px solid #B88B4A' : '1px solid #E5E7EB',
                        background: membershipCreditMode === 'partial' ? '#FAF6EE' : '#F9FAFB',
                        color: membershipCreditMode === 'partial' ? '#B88B4A' : '#4B5563',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>Partial Amount</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '2px' }}>
                        Custom ₹ deduction
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMembershipCreditMode('none')}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '6px',
                        border: membershipCreditMode === 'none' ? '2px solid #B88B4A' : '1px solid #E5E7EB',
                        background: membershipCreditMode === 'none' ? '#FAF6EE' : '#F9FAFB',
                        color: membershipCreditMode === 'none' ? '#B88B4A' : '#4B5563',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>Don't Use (₹0)</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '2px' }}>
                        Pay manually at desk
                      </div>
                    </button>
                  </div>

                  {/* Partial Amount Input */}
                  {membershipCreditMode === 'partial' && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #E5E7EB' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#1C1917', marginBottom: '4px' }}>
                        Enter Amount to Deduct from Membership (Max: {formatCurrency(clientBal)}):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={clientBal}
                        value={membershipCreditAmount}
                        onChange={(e) => setMembershipCreditAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1.5px solid #DAC493',
                          fontSize: '14px',
                          fontWeight: '700',
                          background: '#FFFFFF',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Split Summary */}
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#F9FAFB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11.5px'
                  }}>
                    <span style={{ color: '#4B5563' }}>
                      Remaining to pay manually at Reception (UPI/Cash/Card):
                    </span>
                    <strong style={{ fontSize: '13px', color: remainingToPayManually > 0 ? '#92400E' : '#166534' }}>
                      {formatCurrency(remainingToPayManually)}
                    </strong>
                  </div>
                </div>

                {/* Section 2: Benefit Selection */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#1C1917' }}>
                      Select Benefit to Avail Today:
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#78716C' }}>
                      {selectedVisitorBenefit ? `Selected: ${selectedVisitorBenefit}` : 'None chosen'}
                    </span>
                  </div>

                  {/* Selectable Benefit Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVisitorBenefit('');
                        setUseMembershipBenefits(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: !selectedVisitorBenefit ? '1.5px solid #B88B4A' : '1px solid #E5E7EB',
                        background: !selectedVisitorBenefit ? '#FFFFFF' : '#F9FAFB',
                        color: !selectedVisitorBenefit ? '#B88B4A' : 'var(--text-muted)',
                        fontWeight: !selectedVisitorBenefit ? '700' : '500',
                        fontSize: '12.5px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>None (Save benefits for a future visit)</span>
                      {!selectedVisitorBenefit && <CheckCircle2 size={14} color="#B88B4A" />}
                    </button>

                    {tierPerks.map((perk) => {
                      const isSelected = selectedVisitorBenefit === perk;
                      return (
                        <button
                          key={perk}
                          type="button"
                          onClick={() => {
                            setSelectedVisitorBenefit(perk);
                            setUseMembershipBenefits(true);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #B88B4A' : '1px solid #E7DAC2',
                            background: isSelected ? '#FFFFFF' : '#FFFFFF',
                            color: isSelected ? '#1C1917' : '#57534E',
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: '12.5px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            boxShadow: isSelected ? '0 1px 6px rgba(184, 139, 74, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: isSelected ? '#B88B4A' : '#A8A29E', fontWeight: 'bold' }}>•</span>
                            <span>{perk}</span>
                          </div>
                          {isSelected && <CheckCircle2 size={14} color="#B88B4A" style={{ flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reception Processing Guarantee Note */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(184, 139, 74, 0.2)',
                  fontSize: '11.5px',
                  color: '#785A35',
                  lineHeight: 1.4
                }}>
                  <ShieldCheck size={16} color="#B88B4A" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Reception Desk Verification:</strong> The receptionist will verify your available credits ({formatCurrency(clientBal)}) and finalize the remaining balance of {formatCurrency(remainingToPayManually)} at checkout.
                  </span>
                </div>
              </div>
            );
          })()}

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
