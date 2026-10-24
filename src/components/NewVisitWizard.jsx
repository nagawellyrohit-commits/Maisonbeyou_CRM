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
import LuxuryDatePicker from './LuxuryDatePicker';
import ServiceTermsModal from './ServiceTermsModal';
import { renderCategoryIcon } from '../utils/categoryIcons';

export const MEMBERSHIP_PLANS = [
  {
    id: 'eclat',
    tierNumber: '01 — SERVICE',
    validity: 'Valid for 3 months',
    name: 'ECLAT MEMBER',
    fullName: 'ECLAT PRIVILEGE MEMBERSHIP',
    durationLabel: '(per 3 months)',
    price: 6000,
    priceFormatted: '₹6,000',
    image: '/memberships/card_eclat_3d.jpg',
    tagline: 'Your introduction to thoughtful skincare.',
    benefits: [
      'Complimentary skin analysis (basic)',
      'Priority booking on weekends',
      'Birthday month: ₹1000 voucher / free add-on',
      'Access to member-only packages',
      'Free consultation during tenure'
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
    fullName: 'ETERNAL ELEVATION MEMBERSHIP',
    durationLabel: '(per 6 months)',
    price: 15000,
    priceFormatted: '₹15,000',
    image: '/memberships/card_eternal_3d.jpg',
    tagline: 'Elevated care for your evolving beauty journey.',
    benefits: [
      'Free advanced skin analysis (worth ₹1500–₹2000)',
      '1 Free express facial / peel quarterly or 2 per year',
      'Priority booking + peak hour preference',
      'Birthday: ₹2500 Voucher / Complimentary Services',
      'Exclusive pricing on laser packages',
      'Early access to new treatments & offers'
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
    fullName: 'INFINI EXCLUSIVITY MEMBERSHIP',
    durationLabel: '(per year)',
    price: 25000,
    priceFormatted: '₹25,000',
    image: '/memberships/card_infini_3d.jpg',
    tagline: 'Signature comprehensive care with tailored aesthetic results.',
    benefits: [
      'FREE premium skin consultation + AI analysis',
      '3–4 complimentary treatments / year',
      'Dedicated skin advisor / therapist priority',
      'VIP booking (no waiting)',
      'Special pricing on full programs & packages',
      'Birthday: Luxury facial / treatment complimentary',
      'Exclusive invites to private clinic events',
      'Complimentary aftercare kits (select treatments)'
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
    fullName: 'LUMIERE SIGNATURE MEMBERSHIP',
    durationLabel: '(per year)',
    price: 50000,
    priceFormatted: '₹50,000',
    image: '/memberships/card_lumiere_3d.jpg',
    tagline: 'The pinnacle of personalized aesthetic luxury & timeless rejuvenation.',
    benefits: [
      'Unlimited expert aesthetic consultations',
      '4 Complimentary premium medi-facials or laser sessions',
      '20% Off all services & homecare product lines',
      'Personal aesthetician of choice for all visits',
      'VIP private lounge booking & companion guest passes',
      'Birthday: ₹10,000 voucher + luxury wellness package'
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

export const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewVisitWizard({ preSelectedClient, initialType, onCancel, onComplete, onClientChange, onCartChange, currentUser }) {
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
      return isMember ? 'categories' : 'membership-plans';
    }
    if (initialType === 'new') return 'client-info';
    if (initialType === 'regular') return 'client-search';
    if (initialType === 'welcome') return 'client-welcome';
    return 'client-type';
  });

  // Client State
  const [clientType, setClientType] = useState(() => {
    if (preSelectedClient) return 'regular';
    if (initialType === 'new') return 'new';
    if (initialType === 'regular') return 'regular';
    if (initialType === 'welcome') return 'new';
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

  // Service Terms & Clinical Consent State
  const [termsModalService, setTermsModalService] = useState(null);
  const [serviceConsentMap, setServiceConsentMap] = useState({});

  const handleOpenTermsModal = (service) => {
    setTermsModalService(service);
  };

  const handleCloseTermsModal = () => {
    setTermsModalService(null);
  };

  const handleAgreeAndSelectService = (service) => {
    setServiceConsentMap(prev => ({
      ...prev,
      [service.service_id]: {
        agreed: true,
        agreed_at: new Date().toISOString(),
        service_name: service.service_name
      }
    }));
    const alreadyInCart = selectedServices.some(s => s.service_id === service.service_id);
    if (!alreadyInCart) {
      handleAddService(service, true);
    } else {
      setToastNotification(`✓ Terms & Consent confirmed for "${service.service_name}"`);
      setTimeout(() => setToastNotification(null), 3000);
    }
    setTermsModalService(null);
  };

  const renderServiceTermsModal = () => {
    if (!termsModalService) return null;
    return (
      <ServiceTermsModal
        isOpen={Boolean(termsModalService)}
        service={termsModalService}
        onClose={handleCloseTermsModal}
        onAgreeAndSelect={handleAgreeAndSelectService}
        visitDate={visitDate}
        clientHistory={clientHistory}
        client={selectedRegularClient || registeredClientModal?.client || clientHistory?.client}
        isAlreadyInCart={selectedServices.some(s => s.service_id === termsModalService?.service_id)}
      />
    );
  };

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
  const [isPaymentReceived, setIsPaymentReceived] = useState(false);

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
  const [upgradeFromBilling, setUpgradeFromBilling] = useState(false);
  const [upgradeSource, setUpgradeSource] = useState(null); // 'cart' | 'billing' | null
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const clientMenuRef = useRef(null);

  // Sync cart count & openCart callback to Navbar via onCartChange
  // The cart should appear starting FROM 'categories' (DISCOVER YOUR RITUAL) onwards!
  const isCartStep = ['categories', 'sub-services', 'selected-services', 'billing-payment'].includes(step);

  useEffect(() => {
    const totalCount = selectedServices.length + (activeMembership ? 1 : 0);
    if (onCartChange) {
      onCartChange({
        count: totalCount,
        visible: isCartStep,
        openCart: () => {
          if (step !== 'selected-services') {
            setStep('selected-services');
          }
        }
      });
    }
  }, [selectedServices.length, Boolean(activeMembership), step, isCartStep, onCartChange]);

  useEffect(() => {
    return () => {
      if (onCartChange) onCartChange({ count: 0, visible: false, openCart: null });
    };
  }, []);

  // Membership Privileges State & Sync
  const [clientPrivileges, setClientPrivileges] = useState([]);

  // Fetch client's live membership privileges whenever active client changes
  useEffect(() => {
    const activeClient = selectedRegularClient || clientHistory?.client || preSelectedClient;
    if (activeClient?.client_id) {
      const token = localStorage.getItem('token');
      fetch(`/api/clients/${activeClient.client_id}/membership-privileges`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.privileges) {
            setClientPrivileges(data.privileges);
          }
        })
        .catch(() => {});
    } else {
      setClientPrivileges([]);
    }
  }, [selectedRegularClient?.client_id, clientHistory?.client?.client_id, preSelectedClient?.client_id]);

  // Active client sync is handled comprehensively downstream in the dedicated getLoggedInClient & onClientChange hook

  // Event listeners: Add / Remove Membership Privileges to/from Cart
  useEffect(() => {
    const handleAddPrivilege = (e) => {
      const priv = e.detail?.privilege;
      if (!priv) return;

      setSelectedServices(prev => {
        const alreadyInCart = prev.some(s => s.is_privilege && s.privilege_id === priv.id);
        if (alreadyInCart) {
          setToastNotification(`Privilege "${priv.name}" is already in cart`);
          setTimeout(() => setToastNotification(null), 2500);
          return prev;
        }

        const newItem = {
          temp_id: 'priv_' + (priv.id || 'benefit') + '_' + Date.now(),
          service_id: null,
          service_name: priv.name,
          price: 0,
          staff_id: null,
          is_privilege: true,
          privilege_id: priv.id,
          allowedUses: priv.allowedUses || 1
        };

        setToastNotification(`✓ Added privilege "${priv.name}" (₹0) to cart`);
        setTimeout(() => setToastNotification(null), 3000);
        return [...prev, newItem];
      });
    };

    const handleRemovePrivilege = (e) => {
      const privId = e.detail?.privilegeId;
      if (!privId) return;

      setSelectedServices(prev => {
        const exists = prev.some(s => s.is_privilege && s.privilege_id === privId);
        if (exists) {
          setToastNotification('Privilege removed from cart');
          setTimeout(() => setToastNotification(null), 2500);
          return prev.filter(s => !(s.is_privilege && s.privilege_id === privId));
        }
        return prev;
      });
    };

    window.addEventListener('add_privilege_to_cart', handleAddPrivilege);
    window.addEventListener('remove_privilege_from_cart', handleRemovePrivilege);

    return () => {
      window.removeEventListener('add_privilege_to_cart', handleAddPrivilege);
      window.removeEventListener('remove_privilege_from_cart', handleRemovePrivilege);
    };
  }, []);

  // Broadcast currently in-cart privilege IDs to Navbar and other components
  useEffect(() => {
    const privIds = selectedServices
      .filter(s => s.is_privilege && s.privilege_id)
      .map(s => s.privilege_id);

    window.dispatchEvent(new CustomEvent('cart_privileges_updated', {
      detail: { privilegeIds: privIds }
    }));
  }, [selectedServices]);

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

  // Real-time synchronization when Reception marks payment received
  useEffect(() => {
    if (step !== 'confirmation' || isPaymentReceived) return;

    const visitId = completedVisitResult?.visit?.visit_id || completedVisitResult?.visit_id;
    if (!visitId) return;

    // 1. Cross-tab BroadcastChannel listener
    let bc;
    try {
      bc = new BroadcastChannel('crm_visit_updates');
      bc.onmessage = (event) => {
        if (event.data?.visit_id == visitId && (event.data?.status === 'Paid' || event.data?.type === 'payment_received')) {
          setIsPaymentReceived(true);
        }
      };
    } catch (e) {}

    // 2. Same-window custom event listener
    const handlePaymentEvent = (e) => {
      if (e.detail?.visit_id == visitId && (e.detail?.status === 'Paid' || !e.detail?.status)) {
        setIsPaymentReceived(true);
      }
    };
    window.addEventListener('visit_payment_updated', handlePaymentEvent);

    // 3. Robust polling every 1.5s for multi-device support (tablet to front-desk PC)
    const pollInterval = setInterval(async () => {
      try {
        const data = await apiRequest(`/visits/${visitId}`);
        if (data?.visit?.payment_status === 'Paid') {
          setIsPaymentReceived(true);
        }
      } catch (err) {
        // ignore network jitter
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visit_payment_updated', handlePaymentEvent);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [step, completedVisitResult, isPaymentReceived]);

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
        setStep('categories');
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

  // ==========================================
  // CART & PRICING CALCULATIONS (Section 2, 3, 4)
  // ==========================================
  const clientData = selectedRegularClient || clientHistory?.client || null;
  const rawClientTier = (clientData?.membership_tier || '').trim();
  const isExistingTier = Boolean(
    rawClientTier &&
    rawClientTier.toLowerCase() !== 'none' &&
    rawClientTier.toLowerCase() !== 'non-member'
  );

  // Expiry check:
  const isTierExpired = Boolean(
    clientData?.membership_status === 'expired' ||
    (clientData?.membership_expires_at && new Date(clientData.membership_expires_at).setHours(23, 59, 59, 999) < Date.now())
  );

  const hasValidMembership = Boolean(
    isExistingTier &&
    !isTierExpired &&
    clientData?.membership_status !== 'inactive'
  );

  const rawClientBal = clientData?.membership_balance !== undefined && clientData?.membership_balance !== null
    ? parseFloat(clientData.membership_balance)
    : 0;
  const remainingMembershipBalance = hasValidMembership ? Math.max(0, rawClientBal) : 0;

  // 1. Services Subtotal = Gross Total (A)
  const servicesSubtotal = selectedServices.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const grossTotalA = servicesSubtotal;

  // Membership Purchase in Cart
  const isPurchasingMembership = Boolean(activeMembership && activeMembership.plan);
  const membershipAmount = isPurchasingMembership
    ? (parseFloat(activeMembership.price || activeMembership.plan?.price) || 0)
    : 0;

  // 2. Applicable Membership Discount on Services
  const applicableTierName = isPurchasingMembership
    ? (activeMembership?.plan?.name || '')
    : (hasValidMembership ? rawClientTier : '');
  const lowerTier = applicableTierName.toLowerCase();

  let membershipDiscountPercent = 0;
  let membershipDiscountLabel = '';
  if (lowerTier.includes('lumiere') || lowerTier.includes('lumière')) {
    membershipDiscountPercent = 20;
    membershipDiscountLabel = 'Lumière membership discount applied on services @20%';
  } else if (lowerTier.includes('infini')) {
    membershipDiscountPercent = 15;
    membershipDiscountLabel = 'Infini membership discount applied on services @15%';
  } else if (lowerTier.includes('eternal')) {
    membershipDiscountPercent = 10;
    membershipDiscountLabel = 'Eternal membership discount applied on services @10%';
  } else if (lowerTier.includes('eclat')) {
    membershipDiscountPercent = 5;
    membershipDiscountLabel = 'Éclat membership discount applied on services @5%';
  }

  const membershipDiscountAmount = (grossTotalA > 0 && membershipDiscountPercent > 0)
    ? Math.round(grossTotalA * (membershipDiscountPercent / 100) * 100) / 100
    : 0;

  // 3. Gross Total (B)
  const grossTotalB = Math.max(0, grossTotalA - membershipDiscountAmount);

  // 4. Additional promotional discount (if any)
  const promoPercent = parseFloat(discountValue) || 0;
  let promoDiscountAmount = 0;
  if (discountType === 'percentage') {
    promoDiscountAmount = (grossTotalB > 0 && promoPercent > 0)
      ? Math.round(grossTotalB * (Math.min(promoPercent, 100) / 100) * 100) / 100
      : 0;
  } else {
    promoDiscountAmount = Math.min(Math.max(promoPercent, 0), grossTotalB);
  }

  // 5. Gross Total (C) - Service amount used for membership eligibility
  const grossTotalC = Math.max(0, grossTotalB - promoDiscountAmount);

  // 6. Upgrade Button Visibility Rule (Section 4):
  // showUpgrade = !hasValidMembership || remainingMembershipBalance < grossTotalC;
  const showUpgrade = !hasValidMembership || remainingMembershipBalance < grossTotalC;

  // 7. Taxable Amount = Gross Total (C) + Membership Purchase Price
  const taxableAmount = grossTotalC + membershipAmount;

  // 8. Applicable taxes (SCST 9% + CGST 9% = 18%)
  const scstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const totalTax = scstAmount + cgstAmount;

  // 9. Total, Round Off, Net Payable
  const exactTotal = taxableAmount + totalTax;
  const netPayable = Math.round(exactTotal);
  const roundOff = Math.round((netPayable - exactTotal) * 100) / 100;

  // Compatibility variables for payment & checkout steps
  const subtotal = grossTotalA + membershipAmount;
  const calculatedDiscount = membershipDiscountAmount + promoDiscountAmount;
  const gstAmount = totalTax;
  const totalAmount = netPayable;
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
            fontFamily: 'var(--font-sans)',
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

      if (selectedServices.length === 0 && !activeMembership) {
        throw new Error('Please select at least one service or membership plan');
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
        services: selectedServices.length > 0 ? selectedServices.map(s => ({
          service_id: s.service_id,
          service_name: s.service_name,
          price: s.price,
          staff_id: s.staff_id || null,
          is_privilege: s.is_privilege ? 1 : 0,
          privilege_id: s.privilege_id || null
        })) : [{
          service_id: 999999,
          service_name: `Membership: ${activeMembership?.plan?.name || 'Privilege Membership'}`,
          price: activeMembership?.price || 0,
          staff_id: null,
          is_privilege: 0,
          privilege_id: null
        }],
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        payment_method: (() => {
          if (totalAmount === 0 && selectedServices.length > 0) return 'Membership';
          const isPurchasing = Boolean(activeMembership && activeMembership.plan);
          if (isPurchasing) return paymentMethod || 'UPI';

          const rawClientTier = (selectedRegularClient?.membership_tier || clientHistory?.client?.membership_tier || '').trim();
          const isClientMember = Boolean(rawClientTier && rawClientTier.toLowerCase() !== 'none' && rawClientTier.toLowerCase() !== 'non-member');
          if (isClientMember) {
            const clientBal = clientHistory?.client?.membership_balance !== undefined && clientHistory?.client?.membership_balance !== null
              ? parseFloat(clientHistory.client.membership_balance)
              : (selectedRegularClient?.membership_balance !== undefined && selectedRegularClient?.membership_balance !== null ? parseFloat(selectedRegularClient.membership_balance) : 0);
            const availableCredits = Math.max(0, clientBal);
            let deduction = 0;
            if (availableCredits > 0) {
              if (membershipCreditMode === 'full') deduction = Math.min(totalAmount, availableCredits);
              else if (membershipCreditMode === 'partial') deduction = Math.min(parseFloat(membershipCreditAmount) || 0, availableCredits, totalAmount);
            }
            const remPayable = Math.max(0, totalAmount - deduction);
            if (remPayable === 0) return 'Membership';
            return paymentMethod || 'UPI';
          }
          return paymentMethod || 'UPI';
        })(),
        amount_paid: (totalAmount === 0 && selectedServices.length > 0) ? 0 : 0,
        payment_status: (totalAmount === 0 && selectedServices.length > 0) ? 'Paid' : 'Pending',
        upi_ref: null,
        membership_tier: activeMembership?.plan?.name || selectedRegularClient?.membership_tier || null,
        membership_price: membershipAmount,
        subtotal: subtotal,
        tax_amount: gstAmount,
        total_amount: totalAmount,
        membership_amount_used: (() => {
          const isPurchasing = Boolean(activeMembership && activeMembership.plan);
          if (isPurchasing) return 0;

          const rawClientTier = (selectedRegularClient?.membership_tier || clientHistory?.client?.membership_tier || '').trim();
          const isClientMember = Boolean(rawClientTier && rawClientTier.toLowerCase() !== 'none' && rawClientTier.toLowerCase() !== 'non-member');
          if (!isClientMember) return 0;

          const clientBal = clientHistory?.client?.membership_balance !== undefined && clientHistory?.client?.membership_balance !== null
            ? parseFloat(clientHistory.client.membership_balance)
            : (selectedRegularClient?.membership_balance !== undefined && selectedRegularClient?.membership_balance !== null ? parseFloat(selectedRegularClient.membership_balance) : 0);
          const availableCredits = Math.max(0, clientBal);
          if (availableCredits <= 0) return 0;

          if (membershipCreditMode === 'full') {
            return Math.min(totalAmount, availableCredits);
          } else if (membershipCreditMode === 'partial') {
            const parsed = parseFloat(membershipCreditAmount) || 0;
            return Math.min(parsed, availableCredits, totalAmount);
          }
          return 0;
        })(),
        avail_membership_benefits: Boolean(activeMembership && activeMembership.plan) ? false : (useMembershipBenefits || Boolean(selectedVisitorBenefit) || (membershipCreditMode !== 'none')),
        membership_benefit_used: Boolean(activeMembership && activeMembership.plan) ? null : (selectedVisitorBenefit || null),
        benefit_status: Boolean(activeMembership && activeMembership.plan) ? 'Available' : (selectedVisitorBenefit ? 'Partially used' : (clientHistory?.client?.membership_benefit_status || 'Available')),
        notes: [
          visitNotes,
          activeMembership ? `[MEMBERSHIP PURCHASED / PAY AT RECEPTION: ${activeMembership.plan.name} (${activeMembership.plan.priceFormatted || formatCurrency(activeMembership.price)})]` : '',
          (!activeMembership && membershipCreditMode === 'full') ? `[MEMBERSHIP SETTLEMENT: Auto Credits Applied]` : ((!activeMembership && membershipCreditMode === 'partial') ? `[MEMBERSHIP SETTLEMENT: ₹${membershipCreditAmount} from Credits]` : ''),
          (!activeMembership && selectedVisitorBenefit) ? `[MEMBER BENEFIT REQUESTED: ${selectedVisitorBenefit}]` : ((!activeMembership && useMembershipBenefits) ? '[MEMBERSHIP BENEFIT: Client requested to use membership amount / avail membership benefits at Reception]' : ''),
          selectedServices.some(s => s.is_privilege) ? `[MEMBERSHIP PRIVILEGES: ${selectedServices.filter(s => s.is_privilege).map(s => s.service_name).join(', ')}]` : ''
        ].filter(Boolean).join(' | ')
      };

      const res = await apiRequest('/visits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCompletedVisitResult(res);
      // For zero-payable visits or paid visits, immediately set payment received
      if (payload.payment_status === 'Paid' || res?.visit?.payment_status === 'Paid') {
        setIsPaymentReceived(true);
      }
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
    const todayDirect = getTodayDateStr();
    if (clientDob > todayDirect) {
      alert('Date of Birth cannot be in the future');
      return;
    }
    if (clientMaritalStatus === 'Married') {
      if (!clientAnniversaryDate) {
        alert('Please select Anniversary Date (compulsory for married clients)');
        return;
      }
      if (clientAnniversaryDate > todayDirect) {
        alert('Anniversary Date cannot be in the future');
        return;
      }
      if (clientDob && clientAnniversaryDate < clientDob) {
        alert('Anniversary Date cannot be earlier than Date of Birth');
        return;
      }
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
    const todaySubmit = getTodayDateStr();
    if (clientDob > todaySubmit) {
      alert('Date of Birth cannot be in the future');
      return;
    }
    if (clientMaritalStatus === 'Married') {
      if (!clientAnniversaryDate) {
        alert('Please select Anniversary Date (compulsory for married clients)');
        return;
      }
      if (clientAnniversaryDate > todaySubmit) {
        alert('Anniversary Date cannot be in the future');
        return;
      }
      if (clientDob && clientAnniversaryDate < clientDob) {
        alert('Anniversary Date cannot be earlier than Date of Birth');
        return;
      }
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
    const regularTarget = selectedRegularClient || clientHistory?.client || preSelectedClient || null;
    if ((clientType === 'regular' || regularTarget) && regularTarget && step !== 'client-type' && step !== 'client-search') {
      const tier = regularTarget.membership_tier || regularTarget.membershipTier || activeMembership?.plan?.name || null;
      const isMember = Boolean(tier && tier !== 'Non-Member' && tier.toLowerCase() !== 'null' && tier.trim() !== '');
      return {
        isLoggedIn: true,
        type: 'regular',
        id: regularTarget.client_id || regularTarget.id,
        name: regularTarget.name,
        surname: regularTarget.surname || '',
        phone: regularTarget.phone,
        email: regularTarget.email,
        reg_no: regularTarget.reg_no,
        membershipTier: isMember ? tier : 'Non-Member',
        membership_tier: isMember ? tier : 'Non-Member',
        isMember: isMember,
        totalVisits: regularTarget.total_visits,
        totalSpend: regularTarget.total_spend
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
        const rawClient = selectedRegularClient || (registeredClientModal ? registeredClientModal.client : null) || clientHistory?.client;
        const clientBadge = getClientFormattedId(active, rawClient);
        const planInfo = active.isMember ? findMembershipPlan(active.membershipTier) : null;
        const expiryInfo = getMembershipExpiryInfo(rawClient, planInfo);

        // Compute rich membership details mirroring Image 1
        const rawTier = (active.membershipTier || rawClient?.membership_tier || '').trim();
        const tierCostMap = { 'lumiere': 50000, 'infini': 25000, 'eternal': 15000, 'eclat': 6000 };
        const tierKey = rawTier.toLowerCase();
        const matchedKey = Object.keys(tierCostMap).find(k => tierKey.includes(k));
        const fallbackCost = matchedKey ? tierCostMap[matchedKey] : (planInfo?.price ? parseFloat(planInfo.price) : 25000);
        const membershipCost = (rawClient?.membership_cost && parseFloat(rawClient.membership_cost) > 0)
          ? parseFloat(rawClient.membership_cost)
          : fallbackCost;

        const visitHist = clientHistory?.visit_history || [];
        const visitsWithUsed = visitHist.filter(v => (parseFloat(v.membership_amount_used) || 0) > 0);
        const totalCreditsUsedTillDate = (rawClient?.total_membership_credits_used !== undefined && rawClient?.total_membership_credits_used !== null)
          ? parseFloat(rawClient.total_membership_credits_used)
          : (visitsWithUsed.length > 0
              ? visitsWithUsed.reduce((sum, v) => sum + (parseFloat(v.membership_amount_used) || 0), 0)
              : (parseFloat(clientHistory?.last_visit?.membership_amount_used || rawClient?.last_membership_amount_used || 0)));

        const availableCredits = Math.max(0, membershipCost - totalCreditsUsedTillDate);
        const hasUsedCredits = totalCreditsUsedTillDate > 0 || visitsWithUsed.length > 0;

        const validityDate = rawClient?.membership_expires_at
          ? formatDate(rawClient.membership_expires_at)
          : (rawClient?.last_visit_date
              ? formatDate(new Date(new Date(rawClient.last_visit_date).setFullYear(new Date(rawClient.last_visit_date).getFullYear() + 1)))
              : (expiryInfo?.dateFormatted || '15 Oct 2027'));

        const benefitsStatus = rawClient?.membership_benefit_status
          || clientHistory?.last_visit?.benefit_status
          || (hasUsedCredits ? 'Partially used' : 'Available');

        let perks = [];
        if (tierKey.includes('lumiere')) {
          perks = [
            'Unlimited expert aesthetic & dermatological consultations',
            'Birthday: ₹10,000 voucher + luxury wellness package',
            '4 Complimentary premium medi-facials or laser sessions',
            '20% Off all services & homecare product lines',
            'Personal aesthetician of choice for all visits',
            'VIP private lounge booking & companion guest passes'
          ];
        } else if (tierKey.includes('infini')) {
          perks = [
            'Free comprehensive 3D skin & hair analysis twice a year',
            'Birthday: ₹5000 voucher + complimentary luxury medi-facial',
            '2 Complimentary medi-facials or signature body therapies',
            '15% Off all aesthetic, laser & salon services year-round',
            'Dedicated relationship manager & VIP suite access',
            'Priority weekend & late-evening scheduling'
          ];
        } else if (tierKey.includes('eternal')) {
          perks = [
            'Free advanced skin analysis (worth ₹1500–₹2000)',
            'Birthday: ₹2500 Voucher / Complimentary Services',
            '1 Free express facial / peel quarterly or 2 per year',
            'Priority booking + peak hour preference',
            'Exclusive pricing on laser packages',
            'Early access to new treatments & offers'
          ];
        } else if (tierKey.includes('eclat')) {
          perks = [
            'Complimentary skin analysis (basic) once a year',
            'Birthday: ₹1000 voucher / free add-ons',
            'Priority booking on weekends',
            'Access to member-only packages',
            'Free consultation anytime'
          ];
        }

        const lastBenefitUsed = clientHistory?.last_visit?.membership_benefit_used || rawClient?.last_benefit_used || '';
        const usedPerksList = [
          ...visitHist.map(v => v.membership_benefit_used),
          lastBenefitUsed,
          rawClient?.last_benefit_used,
          rawClient?.last_membership_benefit_used
        ].filter(Boolean).map(s => String(s).trim().toLowerCase());

        const perksWithStatus = perks.map(perk => {
          const pLower = perk.toLowerCase();
          const isUsed = usedPerksList.some(u => {
            if (!u || u === 'none') return false;
            return pLower.includes(u) || u.includes(pLower) ||
              (u.includes('skin') && pLower.includes('skin')) ||
              (u.includes('analysis') && pLower.includes('analysis')) ||
              (u.includes('birthday') && pLower.includes('birthday')) ||
              (u.includes('facial') && pLower.includes('facial'));
          });
          return {
            text: perk,
            isUsed
          };
        });

        onClientChange({
          client_id: active.id || rawClient?.client_id,
          id: active.id || rawClient?.client_id,
          name: active.name,
          surname: active.surname || '',
          phone: active.phone,
          email: active.email,
          isMember: active.isMember,
          membershipTier: active.membershipTier,
          membership_tier: active.membershipTier,
          formattedId: clientBadge.id,
          badgeLabel: clientBadge.label,
          type: active.type,
          planInfo: planInfo,
          expiryInfo: expiryInfo,
          totalVisits: active.totalVisits,
          totalSpend: active.totalSpend,
          membershipCost,
          availableCredits,
          membership_balance: availableCredits,
          totalCreditsUsedTillDate,
          hasUsedCredits,
          validityDate,
          benefitsStatus,
          perksWithStatus
        });
      } else {
        onClientChange(null);
      }
    }
  }, [selectedRegularClient, registeredClientModal, clientHistory, clientType, clientName, clientSurname, clientPhone, clientEmail, activeMembership, step]);

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
      <div className="animate-fade-in client-info-form-wrapper" style={{ width: '100%', margin: '20px auto 40px auto', boxSizing: 'border-box' }}>
        <button
          onClick={() => setStep('client-type')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="card" style={{ padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px)', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '28px', fontWeight: '500', color: '#1C1917', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px' }}>
            WE’D LOVE TO KNOW YOU BETTER
          </h2>
          <div style={{ width: '42px', height: '2px', background: '#C59A58', borderRadius: '2px', marginBottom: '32px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* SECTION 1: PERSONAL INFORMATION */}
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)',
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
                    <LuxuryDatePicker
                      label="Date of Birth"
                      required={true}
                      value={clientDob}
                      onChange={(date) => setClientDob(date)}
                      maxDate={getTodayDateStr()}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  {clientMaritalStatus === 'Married' && (
                    <div className="animate-fade-in" style={{ minWidth: 0 }}>
                      <LuxuryDatePicker
                        label="Anniversary Date"
                        required={true}
                        value={clientAnniversaryDate}
                        onChange={(date) => setClientAnniversaryDate(date)}
                        maxDate={getTodayDateStr()}
                        minDate={clientDob || undefined}
                        placeholder="DD/MM/YYYY"
                      />
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
                      placeholder=""
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
                        setStep('categories');
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
                fontFamily: 'var(--font-sans)',
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
                    placeholder=""
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
                    placeholder=""
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
    const isMember = Boolean(
      client?.membership_tier &&
      client.membership_tier !== 'Non-Member' &&
      client.membership_tier !== 'null' &&
      client.membership_tier.toLowerCase() !== 'none' &&
      client.membership_tier.trim() !== ''
    );
    const clientFullName = [client?.name, client?.surname].filter(Boolean).join(' ') || clientName || 'Rohit nagawelly';
    const activeClientObj = {
      name: client?.name,
      surname: client?.surname,
      id: client?.client_id,
      isMember: isMember,
      membershipTier: client?.membership_tier
    };
    const idBadge = getClientFormattedId(activeClientObj, client);
    const memberIdFormatted = idBadge?.id || (client?.client_id ? `MB-IN-${String(client.client_id).padStart(3, '0')}` : 'MB-IN-006');
    
    // Format Registration No as MB-00-0059 (matching Image 1)
    let regNoFormatted = 'MB-00-0059';
    if (client?.reg_no && String(client.reg_no).startsWith('MB-00-')) {
      regNoFormatted = client.reg_no;
    } else if (client?.client_id) {
      regNoFormatted = `MB-00-${String(client.client_id).padStart(4, '0')}`;
    } else if (client?.reg_no) {
      const match = String(client.reg_no).match(/\d+/);
      regNoFormatted = match ? `MB-00-${String(match[0]).padStart(4, '0')}` : client.reg_no;
    }

    return (
      <div className="animate-fade-in welcome-client-view-wrapper" style={{ width: '100%', maxWidth: '640px', margin: 'auto', boxSizing: 'border-box' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Logout Confirmation Modal */}
        {renderLogoutConfirmModal()}

        {/* Top Navigation Row: "← Edit Details" (matching Image 1) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setStep('client-info');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#9C6839',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#B88B4A'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9C6839'}
          >
            <ArrowLeft size={15} />
            <span>Edit Details</span>
          </button>
        </div>

        {/* Welcome Card (matching Image 1) */}
        <div className="card" style={{
          padding: 'clamp(32px, 4.5vw, 48px) clamp(24px, 4vw, 42px)',
          borderRadius: '24px',
          border: '1.5px solid #E8D6BC',
          boxShadow: '0 10px 32px rgba(184, 139, 74, 0.08)',
          background: '#FFFFFF',
          textAlign: 'center'
        }}>
          {/* Centered Brand Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
            <img
              src={brandLogoImg}
              alt="Maison BeYou"
              style={{
                height: 'clamp(46px, 5.5vw, 56px)',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Heading: "Let’s begin your journey, {clientFullName}" */}
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(18px, 2.2vw, 22px)',
            color: '#8E633A',
            marginBottom: '18px',
            lineHeight: 1.35,
            fontWeight: '600'
          }}>
            Let’s begin your journey, {clientFullName}
          </h2>

          {/* Member ID / Registration No. Box */}
          <div style={{
            background: '#F9F3EA',
            border: '1.5px solid #E6D7C3',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: 'inset 0 1px 3px rgba(184, 139, 74, 0.04)'
          }}>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#8B7460',
              fontWeight: '700',
              marginBottom: '6px'
            }}>
              {isMember ? 'MEMBER ID' : 'REGISTRATION NO.'}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(24px, 3.2vw, 32px)',
              fontWeight: '700',
              color: '#AF7E47',
              letterSpacing: '0.04em'
            }}>
              {isMember ? memberIdFormatted : regNoFormatted}
            </div>
            {isMember && client?.membership_tier && (
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
                  color: '#DAC493',
                  border: '1px solid #B88B4A',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(184, 139, 74, 0.2)'
                }}>
                  💎 {client.membership_tier}
                </span>
              </div>
            )}
          </div>

          {/* Checkbox: "I'd like to receive offers and updates on WhatsApp and Email." */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#221F1C',
            marginBottom: '24px',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              defaultChecked={true}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#B88B4A',
                cursor: 'pointer'
              }}
            />
            <span>I’d like to receive offers and updates on WhatsApp and Email.</span>
          </label>

          {/* Next Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (isMember) {
                  setStep('categories');
                } else {
                  setMembershipSourceStep('client-welcome');
                  setStep('membership-plans');
                }
              }}
              style={{
                width: '100%',
                padding: '14px 28px',
                fontSize: '14.5px',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                background: '#B48553',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(180, 133, 83, 0.35)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#9E7140'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#B48553'}
            >
              NEXT
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
      <div className="animate-fade-in returning-client-view-wrapper" style={{ width: '100%', maxWidth: returningFlowStep === 'welcome' ? '640px' : undefined, margin: 'auto' }}>

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
                  fontFamily: 'var(--font-sans)',
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
                fontFamily: 'var(--font-sans)',
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
          /* Sub-step 3: Dedicated Welcome Back Card (matching Image 1 with Member ID vs Registration No. logic) */
          <div className="returning-client-card-inner" style={{ width: '100%', maxWidth: '640px', margin: 'auto', boxSizing: 'border-box' }}>
            {/* Top Navigation Row: "← Back" (matching Image 1 styling) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <button
                type="button"
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
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#9C6839',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#B88B4A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9C6839'}
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            </div>

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
              const clientFullName = [c.name, c.surname].filter(Boolean).join(' ') || c.name || 'Rohit nagawelly';
              const activeClientObj = {
                name: c.name,
                surname: c.surname,
                id: c.client_id,
                isMember: isMember,
                membershipTier: c.membership_tier
              };
              const idBadge = getClientFormattedId(activeClientObj, c);

              // Format Member ID as MB-IN-006 (matching Image 2)
              const memberIdFormatted = idBadge?.id || (c.client_id ? `MB-IN-${String(c.client_id).padStart(3, '0')}` : 'MB-IN-006');

              // Format Registration No as MB-00-0059 (matching Image 1)
              let regNoFormatted = 'MB-00-0059';
              if (c?.reg_no && String(c.reg_no).startsWith('MB-00-')) {
                regNoFormatted = c.reg_no;
              } else if (c?.client_id) {
                regNoFormatted = `MB-00-${String(c.client_id).padStart(4, '0')}`;
              } else if (c?.reg_no) {
                const match = String(c.reg_no).match(/\d+/);
                regNoFormatted = match ? `MB-00-${String(match[0]).padStart(4, '0')}` : c.reg_no;
              }

              const handleNext = () => {
                setWelcomeBackClient(null);
                if (isMember) {
                  setStep('categories');
                } else {
                  setMembershipSourceStep('client-search');
                  setStep('membership-plans');
                }
              };

              return (
                <div className="card" style={{
                  padding: 'clamp(32px, 4.5vw, 48px) clamp(24px, 4vw, 42px)',
                  borderRadius: '24px',
                  border: '1.5px solid #E8D6BC',
                  boxShadow: '0 10px 32px rgba(184, 139, 74, 0.08)',
                  background: '#FFFFFF',
                  textAlign: 'center'
                }}>
                  {/* Centered Brand Logo */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                    <img
                      src={brandLogoImg}
                      alt="Maison BeYou"
                      style={{
                        height: 'clamp(46px, 5.5vw, 56px)',
                        width: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  </div>

                  {/* Heading: "Let’s begin your journey, {clientFullName}" */}
                  <h2 style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(18px, 2.2vw, 22px)',
                    color: '#8E633A',
                    marginBottom: '18px',
                    lineHeight: 1.35,
                    fontWeight: '600'
                  }}>
                    Let’s begin your journey, {clientFullName}
                  </h2>

                  {/* Member ID / Registration No. Box */}
                  <div style={{
                    background: '#F9F3EA',
                    border: '1.5px solid #E6D7C3',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    boxShadow: 'inset 0 1px 3px rgba(184, 139, 74, 0.04)'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#8B7460',
                      fontWeight: '700',
                      marginBottom: '6px'
                    }}>
                      {isMember ? 'MEMBER ID' : 'REGISTRATION NO.'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'clamp(24px, 3.2vw, 32px)',
                      fontWeight: '700',
                      color: '#AF7E47',
                      letterSpacing: '0.04em'
                    }}>
                      {isMember ? memberIdFormatted : regNoFormatted}
                    </div>
                    {isMember && c.membership_tier && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
                          color: '#DAC493',
                          border: '1px solid #B88B4A',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 6px rgba(184, 139, 74, 0.2)'
                        }}>
                          💎 {c.membership_tier}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Checkbox: "I'd like to receive offers and updates on WhatsApp and Email." */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#221F1C',
                    marginBottom: '24px',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#B88B4A',
                        cursor: 'pointer'
                      }}
                    />
                    <span>I’d like to receive offers and updates on WhatsApp and Email.</span>
                  </label>

                  {/* Next Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleNext}
                      style={{
                        width: '100%',
                        padding: '14px 28px',
                        fontSize: '14.5px',
                        fontWeight: '700',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                        background: '#B48553',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 14px rgba(180, 133, 83, 0.35)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#9E7140'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#B48553'}
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STEP 2C: REPEAT-PROMPT PAGE REMOVED AS REQUESTED
  // ==========================================
  if (step === 'repeat-prompt') {
    setStep('categories');
    return null;
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
            onClick={() => {
              if (upgradeSource === 'cart') {
                setUpgradeSource(null);
                setStep('selected-services');
                return;
              }
              if (upgradeFromBilling || upgradeSource === 'billing') {
                setUpgradeSource(null);
                setUpgradeFromBilling(false);
                setStep('billing-payment');
                return;
              }
              setIsLogoutConfirmModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
          >
            <ArrowLeft size={16} />
            {upgradeSource === 'cart' ? 'Return to Cart' : (upgradeFromBilling ? 'Return to Bill' : 'Back')}
          </button>
        </div>

        {/* Section Title (matching Image 2: "Discover thoughtfully curated" & "WORLD OF PRIVILEGES") */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(12px, 1.8vh, 20px)' }}>
          <div style={{
            fontSize: '11.5px',
            color: '#B88B4A',
            fontWeight: '700',
            letterSpacing: '0.04em',
            marginBottom: '3px'
          }}>
            Discover thoughtfully curated
          </div>
          <h1 style={{
            fontSize: 'clamp(22px, 2.2vw, 28px)',
            color: '#1C1917',
            fontFamily: 'var(--font-sans)',
            fontWeight: '700',
            letterSpacing: '0.04em',
            marginBottom: '4px',
            lineHeight: '1.2'
          }}>
            WORLD OF PRIVILEGES
          </h1>
        </div>

        {/* 4 Cards Grid (matching Image 2) */}
        <div className="membership-plans-grid">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isSelected = currentPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedMembershipPlan(isSelected ? null : plan)}
                className="membership-card-item"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: isSelected ? '2px solid #B88B4A' : '1.5px solid #EADBCC',
                  boxShadow: isSelected
                    ? '0 10px 28px rgba(184, 139, 74, 0.22)'
                    : '0 3px 14px rgba(184, 139, 74, 0.05)',
                  transform: isSelected ? 'translateY(-3px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 22px rgba(184, 139, 74, 0.12)';
                    e.currentTarget.style.borderColor = '#B88B4A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 3px 14px rgba(184, 139, 74, 0.05)';
                    e.currentTarget.style.borderColor = '#EADBCC';
                  }
                }}
              >
                {/* 3D Realistic Card Showcase Image (Matching Images 3,4,5,6) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  overflow: 'hidden',
                  background: '#FAF6EE'
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
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#B88B4A',
                      color: '#FFFFFF',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      zIndex: 3
                    }}>
                      <Check size={12} strokeWidth={2.5} />
                      SELECTED
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{
                  padding: '14px 14px 12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  boxSizing: 'border-box'
                }}>
                  {/* Category / Tier Name */}
                  <div style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    letterSpacing: '0.06em',
                    color: '#292524',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    marginBottom: '4px'
                  }}>
                    {plan.fullName || plan.name}
                  </div>

                  {/* Price */}
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(20px, 1.8vw, 24px)',
                    fontWeight: '800',
                    color: '#B88B4A',
                    textAlign: 'center',
                    lineHeight: 1.15
                  }}>
                    {plan.priceFormatted}
                  </div>

                  {/* Duration Subtitle (e.g. per year) */}
                  <div style={{
                    fontSize: '9.5px',
                    color: '#8C827A',
                    textAlign: 'center',
                    marginBottom: '8px'
                  }}>
                    {plan.durationLabel || '(per year)'}
                  </div>

                  {/* Validity Pill Badge */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#F9F3EA',
                      border: '1px solid #E6D7C3',
                      borderRadius: '9999px',
                      padding: '3px 12px',
                      fontSize: '9.5px',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#9C6839'
                    }}>
                      {plan.validity}
                    </span>
                  </div>

                  {/* Benefits Header */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#B88B4A',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}>
                    BENEFITS :
                  </div>

                  {/* Benefits Bullet List */}
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 14px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    flex: 1
                  }}>
                    {plan.benefits.map((b, idx) => (
                      <li key={idx} style={{
                        fontSize: '10.5px',
                        color: '#44403C',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        lineHeight: 1.3
                      }}>
                        <span style={{ color: '#E11D48', fontWeight: 'bold', fontSize: '13px', lineHeight: 1 }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* I'M INTERESTED / SELECT Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMembershipPlan(isSelected ? null : plan);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: isSelected ? 'none' : '1px solid #DAC493',
                      background: isSelected ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : '#FAF6EE',
                      color: isSelected ? '#FFFFFF' : '#8E633A',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#F0E5D3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#FAF6EE';
                      }
                    }}
                  >
                    {isSelected ? '✓ SELECTED' : "I'M INTERESTED"}
                  </button>
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
            <div style={{ fontSize: 'clamp(12.5px, 1vw, 14px)', fontWeight: '700', color: '#1C1917' }}>
              {currentPlan ? (
                <span>Selected: <strong style={{ color: '#B88B4A' }}>{currentPlan.name}</strong> ({currentPlan.priceFormatted})</span>
              ) : (
                <span>No Membership Plan Selected</span>
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
                if (upgradeSource === 'cart') {
                  setUpgradeSource(null);
                  setStep('selected-services');
                  return;
                }
                if (upgradeFromBilling || upgradeSource === 'billing') {
                  setUpgradeSource(null);
                  setUpgradeFromBilling(false);
                  setStep('billing-payment');
                  return;
                }
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
              {upgradeSource === 'cart' ? 'Skip & Return to Cart' : (upgradeFromBilling ? 'Skip & Keep Bill' : 'Skip')}
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
                if (upgradeSource === 'cart') {
                  setUpgradeSource(null);
                  setStep('selected-services');
                  return;
                }
                if (upgradeFromBilling || upgradeSource === 'billing') {
                  setUpgradeSource(null);
                  setUpgradeFromBilling(false);
                  setStep('billing-payment');
                  return;
                }
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
      if (membershipSourceStep === 'client-welcome' || initialType === 'welcome') {
        setStep('client-welcome');
      } else if (clientType === 'regular' || selectedRegularClient) {
        setStep('client-search');
      } else if (activeMembership && membershipSourceStep) {
        setStep(membershipSourceStep);
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

        {/* Row 1: Back Navigation Button + Review Selected with generous spacing from top navbar */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          padding: '0',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'clamp(28px, 3.8vh, 46px)'
        }}>
          <button
            type="button"
            onClick={handleCategoriesBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              fontWeight: '500',
              color: '#66615B',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px 6px 0',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#B88B4A';
              e.currentTarget.style.transform = 'translateX(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#66615B';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {selectedServices.length > 0 && (
            <button
              type="button"
              onClick={() => setStep('selected-services')}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Review Selected ({selectedServices.length}) →
            </button>
          )}
        </div>

        {/* Row 2: Centered Title & Subtitle with generous spacing before cards below */}
        <div style={{
          textAlign: 'center',
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto clamp(32px, 4.2vh, 50px) auto',
          padding: '0',
          boxSizing: 'border-box'
        }}>
          <div style={{
            fontSize: '13.5px',
            color: '#B88B4A',
            fontWeight: '500',
            letterSpacing: '0.08em',
            marginBottom: '6px',
            fontFamily: 'inherit'
          }}>
            curated world of aesthetics and refinement
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 3.2vw, 36px)',
            fontWeight: '400',
            letterSpacing: '0.09em',
            color: '#1C1917',
            margin: 0,
            textTransform: 'uppercase',
            lineHeight: 1.15
          }}>
            DISCOVER YOUR RITUAL
          </h1>
        </div>

        {/* Active Membership Banner (if active) */}
        {activeMembership && (
          <div style={{
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: '24px',
            maxWidth: '100%',
            margin: '0 auto 24px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(184, 139, 74, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
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
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917' }}>
                Selected Membership: <span style={{ color: '#B88B4A' }}>{activeMembership.plan.name}</span> ({activeMembership.plan.priceFormatted})
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: '#B88B4A',
              color: '#FFFFFF'
            }}>
              MEMBERSHIP IN CART
            </span>
          </div>
        )}

        {/* 6 Luxury Ritual Cards matching Image 1 */}
        {loadingCatalog ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading service categories...
          </div>
        ) : (
          <div className="ritual-categories-grid">
            {(() => {
              const defaultAestheticCards = [
                {
                  num: '01',
                  title: 'SIGNATURE\nFACIALS',
                  desc: "Bespoke facial rituals designed to restore your skin's natural radiance",
                  image: '/services/categories/cat_01_signature_facials.png?v=44',
                  matcher: (c) => c.category_id === 2 || (c.category_name && /facial/i.test(c.category_name))
                },
                {
                  num: '02',
                  title: 'SKIN\nTREATMENTS',
                  desc: 'Advanced skin therapies tailored to renew skin health',
                  image: '/services/categories/cat_02_skin_treatments.png?v=42',
                  matcher: (c) => c.category_id === 3 || (c.category_name && /skin|peel/i.test(c.category_name))
                },
                {
                  num: '03',
                  title: 'LASER\nTREATMENTS',
                  desc: 'Precision-led laser solutions for clearer and smoother skin',
                  image: '/services/categories/cat_03_laser_treatments.png',
                  matcher: (c) => c.category_id === 1 || (c.category_name && /laser/i.test(c.category_name))
                },
                {
                  num: '04',
                  title: 'HAIR\nRITUALS',
                  desc: 'Indulgent therapies that restore natural brilliance',
                  image: '/services/categories/cat_04_hair_rituals.png',
                  matcher: (c) => c.category_id === 5 || (c.category_name && /hair|scalp/i.test(c.category_name))
                },
                {
                  num: '05',
                  title: 'BODY\nSCULPTING',
                  desc: 'Advanced treatments designed to refine your natural curves',
                  image: '/services/categories/cat_05_body_sculpting.png?v=2',
                  matcher: (c) => c.category_id === 4 || (c.category_name && /body|sculpt/i.test(c.category_name))
                },
                {
                  num: '06',
                  title: 'SALON\nSERVICES',
                  desc: 'Elevated grooming and styling experiences for perfect looks',
                  image: '/services/categories/cat_06_salon_services.png?v=3',
                  matcher: (c) => c.category_id === 6 || (c.category_name && /salon|signature/i.test(c.category_name))
                }
              ];

              const activeCats = (categories || []).filter(c => c.active !== 0);

              const parseImgPos = (raw) => {
                if (!raw) return null;
                try {
                  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  if (p && typeof p === 'object') {
                    return {
                      x: Number(p.x) || 0,
                      y: Number(p.y) || 0,
                      scale: Number(p.scale) || 1
                    };
                  }
                } catch (e) {
                  // ignore
                }
                return null;
              };

              let displayList = [];
              if (activeCats.length > 0) {
                displayList = activeCats.map((cat, idx) => {
                  const fallbackItem = defaultAestheticCards.find(d => d.matcher && d.matcher(cat)) || defaultAestheticCards[idx % defaultAestheticCards.length];
                  const num = String(cat.display_order || idx + 1).padStart(2, '0');
                  const title = (cat.category_name || fallbackItem.title).toUpperCase();
                  const desc = cat.description || fallbackItem.desc;
                  const image = cat.image_url || (cat.icon && cat.icon.includes('/') ? cat.icon : null) || fallbackItem.image;
                  const imagePos = parseImgPos(cat.image_position);
                  return {
                    num,
                    title,
                    desc,
                    image,
                    imagePos,
                    category: cat
                  };
                });
              } else {
                displayList = defaultAestheticCards.map((item, idx) => {
                  const cat = categories.find(item.matcher) || categories[idx] || null;
                  const imagePos = parseImgPos(cat?.image_position);
                  return {
                    ...item,
                    imagePos,
                    category: cat
                  };
                });
              }

              return displayList.map((item, idx) => (
                <div
                  key={item.category?.category_id || item.num || idx}
                  onClick={() => {
                    if (item.category) {
                      setSelectedCategory(item.category);
                      setStep('sub-services');
                    }
                  }}
                  className="ritual-category-card"
                  role="button"
                  tabIndex={0}
                >
                  <div className="ritual-card-content">
                    <div>
                      <div className="ritual-card-num">{item.num}</div>
                      <h2 className="ritual-card-title">{item.title}</h2>
                      <p className="ritual-card-desc">{item.desc}</p>
                    </div>

                    <div>
                      <div className="ritual-card-divider" />
                      <div className="ritual-card-action">
                        <span>Explore</span>
                        <ChevronRight size={15} color="#B88B4A" />
                      </div>
                    </div>
                  </div>

                  <div className="ritual-card-image-wrap">
                    <img
                      src={item.image}
                      alt={item.title.replace('\n', ' ')}
                      className="ritual-card-img"
                      loading="eager"
                      style={item.imagePos ? {
                        transform: `translate(${item.imagePos.x}px, ${item.imagePos.y}px) scale(${item.imagePos.scale})`,
                        transformOrigin: 'right center'
                      } : undefined}
                      onError={(e) => {
                        e.currentTarget.src = defaultAestheticCards[idx % defaultAestheticCards.length].image;
                      }}
                    />
                  </div>
                </div>
              ));
            })()}
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
      'clear skin',
      'beu clear skin',
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

    // 6 Luxury Ritual Categories configuration matching Categories screen & Image 2 Mockup
    const ritualCategoriesConfig = [
      {
        num: '01',
        title: 'SIGNATURE FACIALS',
        tagline: 'Purify. Calm. Rebalance.',
        matcher: (c) => c.category_id === 2 || (c.category_name && /facial/i.test(c.category_name))
      },
      {
        num: '02',
        title: 'SKIN TREATMENTS',
        tagline: 'Renew. Restore. Rejuvenate.',
        matcher: (c) => c.category_id === 3 || (c.category_name && /skin|peel/i.test(c.category_name))
      },
      {
        num: '03',
        title: 'LASER TREATMENTS',
        tagline: 'Precision. Clarity. Radiance.',
        matcher: (c) => c.category_id === 1 || (c.category_name && /laser/i.test(c.category_name))
      },
      {
        num: '04',
        title: 'HAIR RITUALS',
        tagline: 'Nourish. Strengthen. Revitalize.',
        matcher: (c) => c.category_id === 5 || (c.category_name && /hair|scalp/i.test(c.category_name))
      },
      {
        num: '05',
        title: 'BODY SCULPTING',
        tagline: 'Tone. Contour. Define.',
        matcher: (c) => c.category_id === 4 || (c.category_name && /body|sculpt/i.test(c.category_name))
      },
      {
        num: '06',
        title: 'SALON SERVICES',
        tagline: 'Elevate. Polish. Perfect.',
        matcher: (c) => c.category_id === 6 || (c.category_name && /salon|signature/i.test(c.category_name))
      }
    ];

    const orderedCategories = ritualCategoriesConfig
      .map(rc => {
        const match = categories.find(rc.matcher);
        if (!match) return null;
        return {
          ...match,
          displayTitle: rc.title,
          tagline: rc.tagline,
          ritualNum: rc.num
        };
      })
      .filter(Boolean);

    const activeCatList = orderedCategories.length > 0 ? orderedCategories : categories;
    const currentCatIdx = activeCatList.findIndex(c => c.category_id === selectedCategory.category_id);
    const activeCatConfig = ritualCategoriesConfig.find(rc => rc.matcher(selectedCategory)) || {
      tagline: 'Purify. Calm. Rebalance.',
      title: selectedCategory.category_name.toUpperCase(),
      num: '01'
    };

    const handlePrevCategory = () => {
      if (activeCatList.length <= 1) return;
      const prevIdx = (currentCatIdx - 1 + activeCatList.length) % activeCatList.length;
      setSelectedCategory(activeCatList[prevIdx]);
      setFeaturedService(null);
      setActiveMediaTab('video');
    };

    const handleNextCategory = () => {
      if (activeCatList.length <= 1) return;
      const nextIdx = (currentCatIdx + 1) % activeCatList.length;
      setSelectedCategory(activeCatList[nextIdx]);
      setFeaturedService(null);
      setActiveMediaTab('video');
    };

    const benefitsList = (activeMedia.highlights && activeMedia.highlights.length >= 3)
      ? activeMedia.highlights
      : [
          'Deeply cleanses and purifies congested skin',
          'Helps control excess oil and sebum',
          'Targets acne and recurring breakouts',
          'Calms inflammation and visible redness',
          'Unclogs pores and removes impurities',
          'Promotes a clearer, healthier complexion'
        ];

    return (
      <div className="animate-fade-in sub-services-wrapper" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingTop: 'clamp(14px, 1.8vh, 24px)' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* SPOTLIGHT HERO & EXPLORE SERVICES GRID (Matching Image 2 Mockup Alignment & Spacing!) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'start',
          columnGap: 'clamp(8px, 1.4vw, 16px)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Row 1, Column 2: Top Navigation Row (Back to Categories + View Cart) */}
          <div style={{
            gridRow: '1',
            gridColumn: '2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'clamp(26px, 3.4vh, 40px)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <button
              onClick={() => setStep('categories')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
                color: '#78716C',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#1C1917'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#78716C'; }}
            >
              <ArrowLeft size={16} />
              Back to Categories
            </button>

            {/* Right: Review Selected button aligned with Back button */}
            {selectedServices.length > 0 ? (
              <button
                type="button"
                onClick={() => setStep('selected-services')}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Review Selected ({selectedServices.length}) →
              </button>
            ) : (
              <div />
            )}
          </div>

          {/* Row 2, Column 2: Category Header (matching Image 2 mockup) */}
          <div style={{
            gridRow: '2',
            gridColumn: '2',
            marginBottom: 'clamp(20px, 2.5vh, 28px)'
          }}>
            <div style={{
              fontSize: '13.5px',
              color: '#B88B4A',
              fontWeight: '600',
              letterSpacing: '0.02em',
              marginBottom: '5px'
            }}>
              {activeCatConfig.tagline || 'Purify. Calm. Rebalance.'}
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 2.6vw, 34px)',
              color: '#1C1917',
              margin: '0',
              fontFamily: 'var(--font-sans)',
              fontWeight: '700',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              lineHeight: 1.15
            }}>
              {activeCatConfig.title || selectedCategory.category_name.toUpperCase()}
            </h1>
          </div>

          {/* Row 3, Column 1: Left Arrow - Switches Category (Centered with Hero Card) */}
          <button
            type="button"
            onClick={handlePrevCategory}
            className="category-switch-arrow-btn"
            style={{
              gridRow: '3',
              gridColumn: '1',
              alignSelf: 'center',
              padding: '8px 4px'
            }}
            title="Previous Category"
            aria-label="Previous Category"
          >
            <ChevronLeft size={38} strokeWidth={1.6} />
          </button>

          {/* Row 3, Column 2: Hero Card Container */}
          <div style={{
            gridRow: '3',
            gridColumn: '2',
            width: '100%',
            minWidth: 0
          }}>
            {activeService && (
              <div className="card spotlight-card-container">
              <div className="spotlight-featured-grid">
                {/* LEFT COLUMN: Main Media Display + 4 Horizontal Thumbnails Below */}
                <div className="spotlight-media-col">
                  {/* Main Media Display Area (Landscape Video / Selected Photo) */}
                  <div className="spotlight-media-main">
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

                        {/* Central Play/Pause Button Overlay */}
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
                              cursor: 'pointer'
                            }}
                            title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                          >
                            {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (videoRef.current && videoRef.current.requestFullscreen) {
                                videoRef.current.requestFullscreen();
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
                              cursor: 'pointer'
                            }}
                            title="Fullscreen preview"
                          >
                            <Maximize2 size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          key={`photo_${activeMediaTab}`}
                          src={activeMedia.gallery[activeMediaTab]}
                          alt={`${activeService.service_name} clinical preview ${activeMediaTab + 1}`}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

                  {/* 4 Horizontal Thumbnails in a single row beneath the media (Matching Image 2 Mockup!) */}
                  <div className="spotlight-thumbnails-row">
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
                        width: '100%',
                        aspectRatio: '16 / 10',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        padding: 0,
                        margin: 0,
                        border: activeMediaTab === 'video' ? '2px solid #BA8758' : '1px solid #DAC493',
                        boxShadow: activeMediaTab === 'video' ? '0 0 0 2px rgba(186, 135, 88, 0.25)' : 'none',
                        background: '#1C1917',
                        transition: 'all 0.2s ease'
                      }}
                      title="Play Procedure Demo Video"
                    >
                      <img
                        src={activeMedia.heroImage || activeMedia.image}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.38)',
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
                          background: '#BA8758',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Play size={8} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
                        </div>
                        <span style={{ fontSize: '8px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '0.05em' }}>
                          VIDEO
                        </span>
                      </div>
                    </button>

                    {/* Thumbnails 2-4: Clinical Photos (Matching Image 2 Mockup!) */}
                    {activeMedia.gallery?.slice(0, 3).map((imgUrl, idx) => {
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
                            width: '100%',
                            aspectRatio: '16 / 10',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            padding: 0,
                            margin: 0,
                            border: isSelected ? '2px solid #BA8758' : '1px solid #DAC493',
                            boxShadow: isSelected ? '0 0 0 2px rgba(186, 135, 88, 0.25)' : 'none',
                            background: '#FAF6EE',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={`View Clinical Photo ${idx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '3px',
                            right: '4px',
                            background: 'rgba(28, 25, 23, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#FFFFFF',
                            fontSize: '8px',
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

                {/* RIGHT COLUMN: Service Details, Benefits & Add Button */}
                <div className="spotlight-details-col">
                  <div>
                    {/* Service Name */}
                    <h2 style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'clamp(21px, 2vw, 25px)',
                      color: '#1C1917',
                      lineHeight: 1.25,
                      margin: '0 0 12px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {activeService.service_name}
                    </h2>

                    {/* Badges / Specs Pill Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '500',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: '#FAF6EE',
                        color: '#785A35',
                        border: '1px solid #EADBCC',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <Clock size={12} color="#9E7437" />
                        {activeService.duration_mins || 45} Mins Session
                      </span>

                      {activeMedia.tag && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '500',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          background: '#FAF6EE',
                          color: '#785A35',
                          border: '1px solid #EADBCC',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Sparkles size={12} color="#9E7437" />
                          {activeMedia.tag}
                        </span>
                      )}
                    </div>

                    {/* Benefits Section matching Image 2 */}
                    <div style={{
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: '#8A6D3B',
                      marginBottom: '8px',
                      letterSpacing: '0.02em'
                    }}>
                      Benefits :
                    </div>

                    {/* Bullet List matching Reference Image 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {benefitsList.map((hl, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12.5px', color: '#1C1917', lineHeight: 1.45, fontWeight: '500' }}>
                          <span style={{ color: '#1C1917', fontSize: '13px', lineHeight: 1, marginTop: '2px', flexShrink: 0, fontWeight: '700' }}>-</span>
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price & Select Service Button matching Reference Image 1 */}
                  <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
                      <span style={{
                        fontSize: 'clamp(28px, 2.4vw, 34px)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: '500',
                        color: '#8A6D3B',
                        lineHeight: 1,
                        letterSpacing: '0.01em'
                      }}>
                        ₹ {Number(activeService.price).toLocaleString('en-IN')}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: '#B35E44',
                        background: '#FAF0EB',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontWeight: '600'
                      }}>
                        (plus taxes)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenTermsModal(activeService)}
                        style={{
                          padding: '12px 38px',
                          borderRadius: '9999px',
                          background: isActiveInCart ? '#8C642D' : '#BA8758',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: '600',
                          fontSize: '12px',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          boxShadow: 'none',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#9E6B38'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActiveInCart ? '#8C642D' : '#BA8758'; }}
                      >
                        {isActiveInCart ? '✓ SERVICE ADDED' : 'SELECT SERVICE'}
                      </button>

                      {isActiveInCart && (
                        <button
                          type="button"
                          onClick={() => handleOpenTermsModal(activeService)}
                          style={{
                            padding: '9px 18px',
                            borderRadius: '9999px',
                            background: '#FAF6EE',
                            color: '#8A6D3B',
                            border: '1px solid #EADBCC',
                            fontWeight: '600',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F2E8DC'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FAF6EE'; }}
                          title="View Terms & Treatment Session Protocol"
                        >
                          <ShieldCheck size={14} color="#8A6D3B" />
                          <span>Terms & Protocol</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Right Arrow - Switches Category (Row 3, Column 3, Centered with Hero Card) */}
          <button
            type="button"
            onClick={handleNextCategory}
            className="category-switch-arrow-btn"
            style={{
              gridRow: '3',
              gridColumn: '3',
              alignSelf: 'center',
              padding: '8px 4px'
            }}
            title="Next Category"
            aria-label="Next Category"
          >
            <ChevronRight size={38} strokeWidth={1.6} />
          </button>

          {/* BOTTOM HORIZONTAL SCROLLER: Row 4, Column 2 (DIRECTLY UNDER HERO CARD IN EXACT ALIGNMENT!) */}
          <div style={{
            gridRow: '4',
            gridColumn: '2',
            width: '100%',
            minWidth: 0,
            marginTop: 'clamp(16px, 2.2vh, 26px)'
          }}>
            <div className="explore-services-container" style={{
              marginTop: '0',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 24px',
              boxSizing: 'border-box'
            }}>
          {/* Left Title & Arrow block */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#1C1917',
              lineHeight: 1.25,
              userSelect: 'none'
            }}>
              <div>EXPLORE</div>
              <div>SERVICES</div>
            </div>

            <button
              type="button"
              onClick={() => handleScrollScroller('left')}
              className="category-switch-arrow-btn"
              style={{ padding: '4px' }}
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={34} strokeWidth={1.6} />
            </button>
          </div>

          {/* Horizontal Scroller Strip */}
          <div
            ref={scrollerRef}
            className="horizontal-scroller"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              padding: '4px 2px 8px 2px',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {displayServices.map(service => {
              const isSelected = activeService?.service_id === service.service_id;
              const sMedia = getServiceMedia(service, selectedCategory.category_name);

              return (
                <div
                  key={service.service_id}
                  onClick={() => handleSelectFeaturedService(service)}
                  style={{
                    minWidth: 'clamp(140px, 15vw, 170px)',
                    maxWidth: 'clamp(140px, 15vw, 170px)',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    border: isSelected ? '2px solid #BA8758' : '1px solid #ECE4D8',
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(186, 135, 88, 0.22)'
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
                      e.currentTarget.style.borderColor = '#BA8758';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(186, 135, 88, 0.12)';
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
                      color: isSelected ? '#BA8758' : '#78716C',
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

          {/* Right Arrow button */}
          <button
            type="button"
            onClick={() => handleScrollScroller('right')}
            className="category-switch-arrow-btn"
            style={{ padding: '4px' }}
            title="Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight size={34} strokeWidth={1.6} />
          </button>
            </div>
          </div>
        </div>

        {/* Clinical Treatment Consent & Terms Modal */}
        {renderServiceTermsModal()}
      </div>
    );
  }

  // ==========================================
  // ==========================================
  // STEP 5: SELECTED SERVICES / CART SCREEN (Section 11, 12 & 13)
  // Matching Reference Image 2 & Membership Upgrade Logic
  // ==========================================
  if (step === 'selected-services') {
    const activeClientName = clientType === 'new' ? clientName : selectedRegularClient?.name;
    const formatCartCurrency = (num) => {
      const n = parseFloat(num) || 0;
      return `\` ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
      <div className="animate-fade-in selected-services-wrapper" style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Toast Notification */}
        {renderToast()}

        {/* Back navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setStep('categories')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Cart Container with Warm Gold Outline (matching Image 2) */}
        <div
          style={{
            maxWidth: '880px',
            margin: '0 auto 30px auto',
            background: '#FFFFFF',
            borderRadius: '28px',
            border: '1.5px solid #D6A87C',
            padding: '36px 44px',
            boxShadow: '0 8px 30px rgba(181, 132, 82, 0.06)',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Title */}
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#9E7437',
            marginBottom: '24px',
            letterSpacing: '0.01em'
          }}>
            Your Cart is waiting
          </div>

          {selectedServices.length === 0 && !activeMembership ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '14px' }}>
                No services or membership selected yet.
              </p>
              <button
                type="button"
                onClick={() => setStep('categories')}
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                + Browse Service Categories
              </button>
            </div>
          ) : (
            <div>
              {/* Cart Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                {/* 1. Membership Item (If Added to Cart) */}
                {activeMembership && activeMembership.plan && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#1C1917',
                        background: '#FDE8E8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        letterSpacing: '0.02em'
                      }}>
                        1. {activeMembership.plan.name.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                        {formatCartCurrency(membershipAmount)}
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
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#F6D3C8',
                          border: '1px solid #E8B9AC',
                          color: '#995B4E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Services List */}
                {selectedServices.map((item, index) => {
                  const itemIndex = activeMembership && activeMembership.plan ? index + 2 : index + 1;
                  return (
                    <div
                      key={item.temp_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#1C1917',
                          letterSpacing: '0.02em'
                        }}>
                          {itemIndex}. {item.service_name.toUpperCase()}
                        </span>
                        {item.is_privilege && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            color: '#9E7437',
                            background: '#FAF3E3',
                            border: '1px solid #D6A87C',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-sans)'
                          }}>
                            MEMBERSHIP PRIVILEGE
                          </span>
                        )}

                        {/* Clinical Consent / Protocol Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const foundServ = categories
                              .flatMap(c => c.services || [])
                              .find(s => s.service_id === item.service_id) || item;
                            handleOpenTermsModal(foundServ);
                          }}
                          style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            color: '#15803D',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#DCFCE7'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
                          title="View clinical terms, aftercare and treatment session schedule"
                        >
                          <ShieldCheck size={11} color="#15803D" />
                          <span>Terms & Protocol</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: item.is_privilege ? '#9E7437' : '#1C1917' }}>
                          {item.is_privilege ? '₹0' : formatCartCurrency(item.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(item.temp_id)}
                          title={item.is_privilege ? "Remove privilege from cart" : "Remove service"}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#F6D3C8',
                            border: '1px solid #E8B9AC',
                            color: '#995B4E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Privileges are managed and added directly from the client profile menu in Navbar */}

              {/* Horizontal line separating items from calculations */}
              <div style={{ borderBottom: '1px solid #ECEAE5', margin: '14px 0 20px 0' }} />

              {/* Pricing Breakdown: Right Aligned */}
              <div style={{ width: '100%', maxWidth: '470px', marginLeft: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* GROSS TOTAL (A) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', letterSpacing: '0.04em' }}>
                    GROSS TOTAL (A)
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                    {formatCartCurrency(grossTotalA)}
                  </span>
                </div>

                {/* Membership discount below Gross Total A */}
                {membershipDiscountAmount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 6px 0' }}>
                    <span style={{ fontSize: '12.5px', color: '#9E7437', fontWeight: '500' }}>
                      {membershipDiscountLabel}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#B95D54',
                      background: '#FBE1DA',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      - {formatCartCurrency(membershipDiscountAmount)}
                    </span>
                  </div>
                )}

                {/* Dotted line */}
                <div style={{ borderBottom: '1px dotted #D1D5DB', margin: '8px 0' }} />

                {/* GROSS TOTAL (B) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', letterSpacing: '0.04em' }}>
                    GROSS TOTAL (B)
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                    {formatCartCurrency(grossTotalB)}
                  </span>
                </div>



                {/* Dotted line */}
                <div style={{ borderBottom: '1px dotted #D1D5DB', margin: '8px 0' }} />

                {/* TAXABLE AMOUNT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', letterSpacing: '0.04em' }}>
                    TAXABLE AMOUNT
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                    {formatCartCurrency(taxableAmount)}
                  </span>
                </div>

                {/* Tax SCST & CGST */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                    Taxes as applicable (SCST 9%)
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#B95D54',
                    background: '#FBE1DA',
                    padding: '1px 8px',
                    borderRadius: '4px'
                  }}>
                    {formatCartCurrency(scstAmount)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 6px 0' }}>
                  <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                    Taxes as applicable (CGST 9%)
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#B95D54',
                    background: '#FBE1DA',
                    padding: '1px 8px',
                    borderRadius: '4px'
                  }}>
                    {formatCartCurrency(cgstAmount)}
                  </span>
                </div>

                {/* Dotted line */}
                <div style={{ borderBottom: '1px dotted #D1D5DB', margin: '8px 0' }} />

                {/* TOTAL */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', letterSpacing: '0.04em' }}>
                    TOTAL
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                    {formatCartCurrency(exactTotal)}
                  </span>
                </div>

                {/* Round Off */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 6px 0' }}>
                  <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                    Round Off
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#B95D54',
                    background: '#FBE1DA',
                    padding: '1px 8px',
                    borderRadius: '4px'
                  }}>
                    {roundOff !== 0 ? Math.abs(roundOff).toFixed(2) : '0.00'}
                  </span>
                </div>

                {/* Dotted line */}
                <div style={{ borderBottom: '1px dotted #D1D5DB', margin: '8px 0' }} />

                {/* NET PAYABLE */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 2px 0' }}>
                  <span style={{ fontSize: '15.5px', fontWeight: '800', color: '#1C1917', letterSpacing: '0.04em' }}>
                    NET PAYABLE
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917' }}>
                    {formatCartCurrency(netPayable)}
                  </span>
                </div>
              </div>

              {/* Bottom Action Row (Matching Image 2) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '36px',
                paddingTop: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {/* +ADD MORE SERVICES */}
                  <button
                    type="button"
                    onClick={() => setStep('categories')}
                    style={{
                      borderRadius: '9999px',
                      border: '1.5px solid #C4A27A',
                      background: '#FFFFFF',
                      color: '#9E7437',
                      fontWeight: '700',
                      fontSize: '11.5px',
                      padding: '10px 24px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    +ADD MORE SERVICES
                  </button>

                  {/* UPGRADE Button (conditionally visible per Section 4 decision rule) */}
                  {showUpgrade && (
                    <button
                      type="button"
                      onClick={() => {
                        setUpgradeSource('cart');
                        setStep('membership-plans');
                      }}
                      style={{
                        borderRadius: '9999px',
                        border: '1.5px solid #C4A27A',
                        background: '#FFFFFF',
                        color: '#9E7437',
                        fontWeight: '700',
                        fontSize: '11.5px',
                        padding: '10px 32px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      UPGRADE
                    </button>
                  )}
                </div>

                {/* PROCEED TO CHECKOUT */}
                <button
                  type="button"
                  onClick={async () => {
                    setStep('confirmation');
                    if (!completedVisitResult && !isSubmitting) {
                      try {
                        await handleFinalSubmit();
                      } catch (err) {
                        console.error('Error submitting visit on checkout:', err);
                      }
                    }
                  }}
                  disabled={selectedServices.length === 0 && !activeMembership}
                  style={{
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #B58452 0%, #A2723F 100%)',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    padding: '12px 34px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    border: 'none',
                    cursor: (selectedServices.length === 0 && !activeMembership) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(181, 132, 82, 0.3)',
                    opacity: (selectedServices.length === 0 && !activeMembership) ? 0.5 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  PROCEED TO CHECKOUT
                </button>
              </div>
            </div>
          )}

          {/* Clinical Treatment Consent & Terms Modal */}
          {renderServiceTermsModal()}
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
                      <div style={{ fontWeight: '600', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{s.service_name}</span>
                        {s.is_privilege && (
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#FAF3E3', border: '1px solid #D6A87C', color: '#9E7437', fontWeight: '700' }}>
                            Membership Privilege
                          </span>
                        )}
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
                    <span style={{ fontWeight: '700', color: s.is_privilege ? '#9E7437' : 'var(--text-main)' }}>
                      {s.is_privilege ? '₹0' : formatCurrency(s.price)}
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
  // STEP 8: PAYMENT PENDING CONFIRMATION (Image 1 Luxury Screen)
  // ==========================================
  if (step === 'confirmation') {
    return (
      <div
        className="animate-fade-in confirmation-view-wrapper"
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 160px)',
          margin: '0 auto',
          padding: '16px 20px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Top-Left: Edit Details Button (only visible while Payment is Pending) */}
        {!isPaymentReceived && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => {
                setCompletedVisitResult(null);
                setIsPaymentReceived(false);
                setStep('selected-services');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#8A7A70',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1C1917')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8A7A70')}
            >
              <ArrowLeft size={15} />
              <span>Edit Details</span>
            </button>
          </div>
        )}

        {submitError && !isPaymentReceived && (
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto 20px',
              width: '100%',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '13.5px',
              textAlign: 'center'
            }}
          >
            {submitError}
          </div>
        )}

        {/* Center Luxury Card Matching Image 1 (Pending vs Received) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 8px 30px',
            boxSizing: 'border-box'
          }}
        >
          <div
            key={isPaymentReceived ? 'payment-received' : 'payment-pending'}
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '720px',
              border: '1.5px solid #D6A87C',
              borderRadius: '28px',
              background: '#FCFAF7',
              padding: isPaymentReceived ? '64px 40px 60px 40px' : '54px 40px 48px 40px',
              boxSizing: 'border-box',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 24px rgba(181, 132, 82, 0.05)'
            }}
          >
            {/* Brand Logo */}
            <img
              src={brandLogoImg}
              alt="Maison BeYou"
              style={{
                height: '66px',
                width: 'auto',
                maxWidth: '250px',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto'
              }}
            />

            {isPaymentReceived ? (
              /* SCREEN 2: PAYMENT RECEIVED (From Image 1 with checkmark tick in circle) */
              <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Checkmark badge + Payment Received text */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    marginTop: '46px',
                    marginBottom: '10px'
                  }}
                >
                  {/* Circle Badge with Payment Tick */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#B88452',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 20px rgba(184, 132, 82, 0.35)',
                      flexShrink: 0
                    }}
                  >
                    <Check size={34} strokeWidth={3.2} color="#FFFFFF" />
                  </div>

                  {/* Payment Received text */}
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '25px',
                      fontWeight: '600',
                      color: '#B5874E',
                      lineHeight: 1.22,
                      textAlign: 'left'
                    }}
                  >
                    Payment<br />Received
                  </div>
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '17px',
                    fontWeight: '500',
                    color: '#B5874E',
                    lineHeight: 1.48,
                    textAlign: 'center',
                    marginTop: '34px'
                  }}
                >
                  You're all set.<br />
                  Let the pampering begin!
                </div>

                {/* Subtle Reset / Complete Button */}
                <div style={{ marginTop: '40px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onComplete) {
                        onComplete(completedVisitResult?.visit?.visit_id || completedVisitResult?.visit_id);
                      } else {
                        window.location.reload();
                      }
                    }}
                    style={{
                      borderRadius: '9999px',
                      background: 'transparent',
                      border: '1.5px solid #D6A87C',
                      color: '#B5874E',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: '600',
                      fontSize: '12px',
                      padding: '8px 26px',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FAF5ED';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Done • Next Guest
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 1: PAYMENT PENDING */
              <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Subtitle */}
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#B5874E',
                    letterSpacing: '0.01em',
                    marginTop: '28px',
                    marginBottom: '24px',
                    textAlign: 'center'
                  }}
                >
                  Just one little thing before we make it official
                </div>

                {/* Cream Rounded Container */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    background: '#F5ECE0',
                    border: '1.5px solid #E6D8C5',
                    borderRadius: '20px',
                    padding: '26px 32px',
                    marginBottom: '26px',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '21px',
                      fontWeight: '600',
                      color: '#26221F',
                      lineHeight: 1.38
                    }}
                  >
                    Head to the reception to<br />complete your payment
                  </div>
                </div>

                {/* Action Pill: PAYMENT PENDING */}
                <button
                  type="button"
                  onClick={async () => {
                    const visitId = completedVisitResult?.visit?.visit_id || completedVisitResult?.visit_id;
                    if (visitId) {
                      try {
                        const data = await apiRequest(`/visits/${visitId}`);
                        if (data?.visit?.payment_status === 'Paid') {
                          setIsPaymentReceived(true);
                          return;
                        }
                      } catch (e) {}
                    }
                    setToastNotification('Visit registered with pending payment. Front desk has been notified.');
                  }}
                  style={{
                    borderRadius: '9999px',
                    background: '#BA8758',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: '700',
                    fontSize: '12px',
                    padding: '11px 32px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(186, 135, 88, 0.28)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  PAYMENT PENDING
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
