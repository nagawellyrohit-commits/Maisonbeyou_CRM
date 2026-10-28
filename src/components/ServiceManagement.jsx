import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit2, Check, X, ShieldAlert, Sparkles,
  Trash2, ToggleLeft, ToggleRight, DollarSign, Layers,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, Zap, Play, Pause, Volume2, VolumeX, Maximize2,
  Film, Image as ImageIcon, ArrowRight, UploadCloud, Upload, Camera, Calendar, Repeat,
  Move, RotateCcw, ZoomIn, ZoomOut
} from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';
import { CATEGORY_ICONS, renderCategoryIcon, CATEGORY_IMAGE_PRESETS } from '../utils/categoryIcons';
import { getServiceMedia } from '../utils/serviceMedia';
import VisitorServiceSpotlightCard from './VisitorServiceSpotlightCard';

export default function ServiceManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Accordion state: open/closed categories
  const [expandedCatIds, setExpandedCatIds] = useState({});

  const toggleCatExpand = (catId) => {
    setExpandedCatIds(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleExpandAll = () => {
    const allOpen = {};
    categories.forEach(c => { allOpen[c.category_id] = true; });
    setExpandedCatIds(allOpen);
  };

  const handleCollapseAll = () => {
    setExpandedCatIds({});
  };

  // Modals & form state
  const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create', data: null });
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', categoryId: null, data: null });
  const [deleteCatConfirmModal, setDeleteCatConfirmModal] = useState({ open: false, category: null, deleting: false });
  const [draggedCatId, setDraggedCatId] = useState(null);
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const draggedCatIdRef = useRef(null);
  const dragOverCatIdRef = useRef(null);
  const latestCategoriesRef = useRef([]);
  latestCategoriesRef.current = categories;

  // Form inputs for Category (Catalog Card fields)
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catActionLabel, setCatActionLabel] = useState('Explore');
  const [catOrder, setCatOrder] = useState(1);
  const [catIcon, setCatIcon] = useState('Sparkles');
  const [catImageUrl, setCatImageUrl] = useState('/services/categories/cat_01_signature_facials.png?v=45');
  const [catImagePosX, setCatImagePosX] = useState(0);
  const [catImagePosY, setCatImagePosY] = useState(0);
  const [catImageScale, setCatImageScale] = useState(1);
  const [isDraggingCatImg, setIsDraggingCatImg] = useState(false);
  const [isResizingCatImg, setIsResizingCatImg] = useState(false);
  const [isCatImgHovered, setIsCatImgHovered] = useState(false);
  const [isCatImgSelected, setIsCatImgSelected] = useState(false);
  const catImgBoxRef = useRef(null);
  const catCardPreviewRef = useRef(null);
  const presetScrollerRef = useRef(null);
  const catDragStartRef = useRef({ startMouseX: 0, startMouseY: 0, startPosX: 0, startPosY: 0 });
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const [catImageUploadError, setCatImageUploadError] = useState('');
  const [catImageTransparentVerified, setCatImageTransparentVerified] = useState(true);
  const [uploadedCatImages, setUploadedCatImages] = useState(() => {
    try {
      const saved = localStorage.getItem('mb_uploaded_cat_pngs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const catImageInputRef = useRef(null);

  // Form inputs for Sub-Service (Spotlight Card fields - Image 2)
  const [servName, setServName] = useState('');
  const [servPrice, setServPrice] = useState('');
  const [servDuration, setServDuration] = useState(20);
  const [servDesc, setServDesc] = useState('');
  const [servOrder, setServOrder] = useState(0);
  const [servSubtitle, setServSubtitle] = useState('');
  const [servDowntime, setServDowntime] = useState('Zero Downtime');
  const [servTag, setServTag] = useState('Quick & Effective');
  const [servVspBadges, setServVspBadges] = useState([]);
  const [servHasSessions, setServHasSessions] = useState(false);
  const [servTotalSessions, setServTotalSessions] = useState(3);
  const [servSessionInterval, setServSessionInterval] = useState(15);
  const [servSessionIntervalUnit, setServSessionIntervalUnit] = useState('days');
  const [servHighlights, setServHighlights] = useState([
    'Advanced cooling sapphire tip for painless comfort',
    'Targeted elimination of coarse hair & ingrown roots',
    'Express 15–20 minute session; zero recovery time'
  ]);
  const [servVideoUrl, setServVideoUrl] = useState('');
  const [servImageUrl, setServImageUrl] = useState('');
  const [servGallery, setServGallery] = useState([
    '/services/thumb_underarms.jpg',
    '/services/laser_hero.jpg',
    'https://images.unsplash.com/photo-1512290903671-17adc8104b5b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
  ]);
  const [servPreviewTab, setServPreviewTab] = useState('video');
  const [isServVideoPlaying, setIsServVideoPlaying] = useState(false);
  const [isServVideoMuted, setIsServVideoMuted] = useState(true);
  const servVideoRef = useRef(null);
  const servVideoInputRef = useRef(null);
  const servHeroInputRef = useRef(null);
  const servGalleryInputRefs = useRef([]);
  const draggedGalleryIdxRef = useRef(null);
  const [dragOverGalleryIdx, setDragOverGalleryIdx] = useState(null);

  const handleReorderGallerySlot = (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    setServGallery(prev => {
      const next = [...prev.slice(0, 4)];
      while (next.length < 4) next.push('');
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setServPreviewTab(toIdx);
  };

  const applyUploadedMediaUrl = (url, type, index = 0) => {
    if (!url) return;
    if (type === 'video') {
      setServVideoUrl(url);
      setServPreviewTab('video');
      setTimeout(() => {
        if (servVideoRef.current) {
          servVideoRef.current.load();
          servVideoRef.current.play().then(() => setIsServVideoPlaying(true)).catch(() => {});
        }
      }, 60);
    } else if (type === 'hero') {
      setServImageUrl(url);
      setServPreviewTab('video');
      if (servVideoRef.current) {
        servVideoRef.current.pause();
        servVideoRef.current.currentTime = 0;
        servVideoRef.current.load();
      }
      setIsServVideoPlaying(false);
    } else if (type === 'gallery') {
      setServGallery(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setServPreviewTab(index);
      if (servVideoRef.current) {
        servVideoRef.current.pause();
      }
      setIsServVideoPlaying(false);
    }
  };

  // Direct media file upload state
  const [uploadingState, setUploadingState] = useState({
    video: false,
    hero: false,
    gallery: [false, false, false, false]
  });

  const uploadFile = async (file, type, index = 0) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      if (type === 'video') setUploadingState(prev => ({ ...prev, video: true }));
      else if (type === 'hero') setUploadingState(prev => ({ ...prev, hero: true }));
      else if (type === 'gallery') {
        setUploadingState(prev => {
          const next = [...prev.gallery];
          next[index] = true;
          return { ...prev, gallery: next };
        });
      }

      const res = await apiRequest('/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (res && res.url) { applyUploadedMediaUrl(res.url, type, index); } else if (false) {
        if (type === 'video') {
          setServVideoUrl(res.url);
          setServPreviewTab('video');
        } else if (type === 'hero') {
          setServImageUrl(res.url);
        } else if (type === 'gallery') {
          setServGallery(prev => {
            const next = [...prev];
            next[index] = res.url;
            return next;
          });
          setServPreviewTab(index);
        }
      }
    } catch (err) {
      console.warn('Upload server fallback to local media URL:', err); const fallbackUrl = URL.createObjectURL(file); applyUploadedMediaUrl(fallbackUrl, type, index);
      // Fallback preview already applied above
    } finally {
      if (type === 'video') setUploadingState(prev => ({ ...prev, video: false }));
      else if (type === 'hero') setUploadingState(prev => ({ ...prev, hero: false }));
      else if (type === 'gallery') {
        setUploadingState(prev => {
          const next = [...prev.gallery];
          next[index] = false;
          return { ...prev, gallery: next };
        });
      }
    }
  };

  const fetchAdminCategories = async () => {
    try {
      setLoading(true);
      setError('');
      try {
        const res = await apiRequest('/admin/categories');
        setCategories(res.categories || []);
        try { localStorage.setItem('mb_catalog_updated_at', String(Date.now())); window.dispatchEvent(new Event('mb_catalog_updated')); if (typeof BroadcastChannel !== 'undefined') { const bc = new BroadcastChannel('mb_catalog_sync'); bc.postMessage({ type: 'catalog_updated', ts: Date.now() }); bc.close(); } } catch (e) {}
        return;
      } catch (adminErr) {
        console.warn('Admin categories endpoint issue, trying fallback to /categories:', adminErr);
        const fallbackRes = await apiRequest('/categories');
        if (fallbackRes.categories) {
          setCategories(fallbackRes.categories);
          return;
        }
        throw adminErr;
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err.message || 'Failed to connect to service catalog database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminCategories();
  }, []);

  // Category Actions
  useEffect(() => {
    if (!categoryModal.open) return;
    const handleOutsideClick = (e) => {
      if (catImgBoxRef.current && catImgBoxRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-cat-img-toolbar="true"]')) return;
      setIsCatImgSelected(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [categoryModal.open]);

  const handleCatImgMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsCatImgSelected(true);
    setIsDraggingCatImg(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = catImagePosX;
    const initialY = catImagePosY;

    const handleWindowMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const newX = Math.round(initialX + dx);
      const newY = Math.round(initialY + dy);
      setCatImagePosX(Math.max(-180, Math.min(180, newX)));
      setCatImagePosY(Math.max(-180, Math.min(180, newY)));
    };

    const handleWindowMouseUp = () => {
      setIsDraggingCatImg(false);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleCatImgTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      e.stopPropagation();
      const touch = e.touches[0];
      setIsCatImgSelected(true);
      setIsDraggingCatImg(true);

      const startX = touch.clientX;
      const startY = touch.clientY;
      const initialX = catImagePosX;
      const initialY = catImagePosY;

      const handleWindowTouchMove = (touchMoveEvent) => {
        if (!touchMoveEvent.touches || !touchMoveEvent.touches[0]) return;
        touchMoveEvent.preventDefault();
        const currentTouch = touchMoveEvent.touches[0];
        const dx = currentTouch.clientX - startX;
        const dy = currentTouch.clientY - startY;
        const newX = Math.round(initialX + dx);
        const newY = Math.round(initialY + dy);
        setCatImagePosX(Math.max(-180, Math.min(180, newX)));
        setCatImagePosY(Math.max(-180, Math.min(180, newY)));
      };

      const handleWindowTouchEnd = () => {
        setIsDraggingCatImg(false);
        window.removeEventListener('touchmove', handleWindowTouchMove);
        window.removeEventListener('touchend', handleWindowTouchEnd);
      };

      window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
      window.addEventListener('touchend', handleWindowTouchEnd);
    }
  };

  const handleCatImgResizeMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsCatImgSelected(true);
    setIsResizingCatImg(true);

    const rect = catImgBoxRef.current
      ? catImgBoxRef.current.getBoundingClientRect()
      : { left: e.clientX - 60, top: e.clientY - 60, width: 120, height: 120 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startDist = Math.max(20, Math.hypot(e.clientX - cx, e.clientY - cy));
    const initialScale = catImageScale || 1;

    const handleWindowMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const curDist = Math.max(10, Math.hypot(moveEvent.clientX - cx, moveEvent.clientY - cy));
      const nextScale = initialScale * (curDist / startDist);
      const clamped = Math.max(0.4, Math.min(2.0, Number(nextScale.toFixed(2))));
      setCatImageScale(clamped);
    };

    const handleWindowMouseUp = () => {
      setIsResizingCatImg(false);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleCatImgResizeTouchStart = (e) => {
    if (!e.touches || !e.touches[0]) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setIsCatImgSelected(true);
    setIsResizingCatImg(true);

    const rect = catImgBoxRef.current
      ? catImgBoxRef.current.getBoundingClientRect()
      : { left: touch.clientX - 60, top: touch.clientY - 60, width: 120, height: 120 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startDist = Math.max(20, Math.hypot(touch.clientX - cx, touch.clientY - cy));
    const initialScale = catImageScale || 1;

    const handleWindowTouchMove = (touchMoveEvent) => {
      if (!touchMoveEvent.touches || !touchMoveEvent.touches[0]) return;
      touchMoveEvent.preventDefault();
      const curTouch = touchMoveEvent.touches[0];
      const curDist = Math.max(10, Math.hypot(curTouch.clientX - cx, curTouch.clientY - cy));
      const nextScale = initialScale * (curDist / startDist);
      const clamped = Math.max(0.4, Math.min(2.0, Number(nextScale.toFixed(2))));
      setCatImageScale(clamped);
    };

    const handleWindowTouchEnd = () => {
      setIsResizingCatImg(false);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
  };

  const handleOpenCatModal = (cat = null) => {
    try {
      if (cat) {
        setCategoryModal({ open: true, mode: 'edit', data: cat });
        setCatName(cat.category_name || '');
        setCatDesc(cat.description || '');
        setCatOrder(cat.display_order || 1);
        setCatIcon(cat.icon || 'Sparkles');
        setCatImageUrl(cat.image_url || (cat.icon && cat.icon.includes('/') ? cat.icon : null) || '/services/categories/cat_01_signature_facials.png?v=45');
        let pos = { x: 0, y: 0, scale: 1 };
        if (cat.image_position) {
          try {
            const parsed = typeof cat.image_position === 'string' ? JSON.parse(cat.image_position) : cat.image_position;
            if (parsed) pos = { x: parsed.x || 0, y: parsed.y || 0, scale: parsed.scale || 1, actionLabel: parsed.actionLabel || 'Explore' };
          } catch (e) { }
        }
        setCatImagePosX(pos.x);
        setCatImagePosY(pos.y);
        setCatImageScale(pos.scale);
        setCatActionLabel(pos.actionLabel || 'Explore');
        setCatImageUploadError('');
        setCatImageTransparentVerified(true);
        setIsCatImgSelected(false);
        setIsCatImgHovered(false);
      } else {
        const nextOrder = (categories && Array.isArray(categories) ? categories.length : 0) + 1;
        setCategoryModal({ open: true, mode: 'create', data: null });
        setCatName('');
        setCatDesc('');
        setCatOrder(nextOrder);
        setCatIcon('Sparkles');
        const defaultPreset = CATEGORY_IMAGE_PRESETS[(nextOrder - 1) % CATEGORY_IMAGE_PRESETS.length]?.url || '/services/categories/cat_01_signature_facials.png?v=45';
        setCatImageUrl(defaultPreset);
        setCatImagePosX(0);
        setCatImagePosY(0);
        setCatImageScale(1);
        setCatActionLabel('Explore');
        setCatImageUploadError('');
        setCatImageTransparentVerified(true);
      }
    } catch (err) {
      console.error('Error opening category modal:', err);
    }
  };

  const validateTransparentPngClient = async (file) => {
    const NOT_PNG_MSG = 'Only transparent PNG images are supported. Please upload a PNG with a removed background.';
    const OPAQUE_MSG = 'Background detected. Please upload a background-free PNG image.';

    if (!file) return { valid: false, error: NOT_PNG_MSG };

    const fileName = (file.name || '').toLowerCase();
    const isPngExt = fileName.endsWith('.png');
    const isPngMime = file.type === 'image/png';
    if (!isPngExt || !isPngMime) {
      return { valid: false, error: NOT_PNG_MSG };
    }

    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, error: 'Image file size exceeds the 20MB maximum limit.' };
    }

    try {
      const headerBuf = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(headerBuf);
      const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      for (let i = 0; i < 8; i++) {
        if (bytes[i] !== pngMagic[i]) {
          return { valid: false, error: NOT_PNG_MSG };
        }
      }
    } catch (err) {
      return { valid: false, error: NOT_PNG_MSG };
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const nw = img.naturalWidth || img.width;
          const nh = img.naturalHeight || img.height;
          if (!nw || !nh) {
            URL.revokeObjectURL(objectUrl);
            resolve({ valid: false, error: NOT_PNG_MSG });
            return;
          }
          if (nw > 8192 || nh > 8192) {
            URL.revokeObjectURL(objectUrl);
            resolve({ valid: false, error: 'Image dimensions must not exceed 8192x8192 pixels.' });
            return;
          }
          const maxInspectDim = 2048;
          const scale = Math.min(1, maxInspectDim / Math.max(nw, nh));
          const cw = Math.max(1, Math.round(nw * scale));
          const ch = Math.max(1, Math.round(nh * scale));
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          const imgData = ctx.getImageData(0, 0, cw, ch).data;
          let hasTransparentPixel = false;
          for (let i = 3; i < imgData.length; i += 4) {
            if (imgData[i] < 255) {
              hasTransparentPixel = true;
              break;
            }
          }
          URL.revokeObjectURL(objectUrl);
          if (!hasTransparentPixel) {
            resolve({ valid: false, error: OPAQUE_MSG });
          } else {
            resolve({ valid: true });
          }
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          resolve({ valid: false, error: NOT_PNG_MSG });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ valid: false, error: NOT_PNG_MSG });
      };
      img.src = objectUrl;
    });
  };

  const handleCatImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setUploadingCatImage(true);
    setCatImageUploadError('');
    try {
      const validation = await validateTransparentPngClient(file);
      if (!validation.valid) {
        setCatImageUploadError(validation.error);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('requireTransparentPng', 'true');

      const res = await apiRequest('/admin/upload?requireTransparentPng=true', {
        method: 'POST',
        body: formData
      });
      if (res.url) {
        setCatImageUrl(res.url);
        setCatImageUploadError('');
        setCatImageTransparentVerified(true);
        setUploadedCatImages(prev => {
          const next = [{ id: `uploaded_${Date.now()}`, url: res.url, name: 'Uploaded Image' }, ...prev.filter(item => item.url !== res.url)];
          try {
            localStorage.setItem('mb_uploaded_cat_pngs', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to upload category image:', err);
      setCatImageUploadError(err.message || 'Only transparent PNG images are supported. Please upload a PNG with a removed background.');
    } finally {
      setUploadingCatImage(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName || !catName.trim()) {
      alert('Category Name is required');
      return;
    }
    const finalImageUrl = catImageUrl || '/services/categories/cat_01_signature_facials.png?v=45';
    const imagePositionStr = JSON.stringify({
      x: Math.round(catImagePosX),
      y: Math.round(catImagePosY),
      scale: parseFloat(Number(catImageScale).toFixed(2)),
      actionLabel: (catActionLabel || '').trim() || 'Explore'
    });

    try {
      if (categoryModal.mode === 'create') {
        await apiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({
            category_name: catName.trim(),
            description: (catDesc || '').trim(),
            icon: catIcon || 'Sparkles',
            image_url: finalImageUrl,
            image_position: imagePositionStr,
            display_order: parseInt(catOrder) || ((categories && categories.length ? categories.length : 0) + 1)
          })
        });
      } else {
        await apiRequest(`/admin/categories/${categoryModal.data.category_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            category_name: catName.trim(),
            description: (catDesc || '').trim(),
            icon: catIcon || 'Sparkles',
            image_url: finalImageUrl,
            image_position: imagePositionStr,
            display_order: parseInt(catOrder) || 1
          })
        });
      }
      setCategoryModal({ open: false, mode: 'create', data: null });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleCatActive = async (cat) => {
    try {
      await apiRequest(`/admin/categories/${cat.category_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: cat.active === 1 ? 0 : 1 })
      });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    const cat = deleteCatConfirmModal.category;
    if (!cat) return;
    setDeleteCatConfirmModal(prev => ({ ...prev, deleting: true }));
    try {
      await apiRequest(`/admin/categories/${cat.category_id}`, {
        method: 'DELETE'
      });
      setDeleteCatConfirmModal({ open: false, category: null, deleting: false });
      fetchAdminCategories();
    } catch (err) {
      setDeleteCatConfirmModal(prev => ({ ...prev, deleting: false }));
      alert(err.message || 'Failed to delete category');
    }
  };

  const commitCategoryReorder = async (fromId, toId) => {
    if (!fromId || !toId || Number(fromId) === Number(toId)) return;
    const currentList = latestCategoriesRef.current || [];
    const fromIndex = currentList.findIndex(c => Number(c.category_id) === Number(fromId));
    const toIndex = currentList.findIndex(c => Number(c.category_id) === Number(toId));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const updated = [...currentList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const resequenced = updated.map((item, i) => ({
      ...item,
      display_order: i + 1
    }));

    latestCategoriesRef.current = resequenced;
    setCategories(resequenced);

    try {
      await Promise.all(
        resequenced.map((catItem, idx) =>
          apiRequest(`/admin/categories/${catItem.category_id}`, {
            method: 'PUT',
            body: JSON.stringify({ display_order: idx + 1 })
          })
        )
      );
    } catch (err) {
      console.error('Failed to persist reordered categories:', err);
    }
  };

  const handleCatCardDragStart = (e, categoryId) => {
    draggedCatIdRef.current = categoryId;
    dragOverCatIdRef.current = null;
    setDraggedCatId(categoryId);
    setDragOverCatId(null);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', String(categoryId));
      } catch {}
    }
  };

  const handleCatCardDragOver = (e, targetCategoryId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const activeDragId = draggedCatIdRef.current;
    if (!activeDragId || Number(activeDragId) === Number(targetCategoryId)) return;
    if (Number(dragOverCatIdRef.current) !== Number(targetCategoryId)) {
      dragOverCatIdRef.current = targetCategoryId;
      setDragOverCatId(targetCategoryId);
    }
  };

  const handleCatCardDrop = (e, targetCategoryId) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = draggedCatIdRef.current || (e.dataTransfer ? Number(e.dataTransfer.getData('text/plain')) : null);
    const toId = targetCategoryId || dragOverCatIdRef.current;
    draggedCatIdRef.current = null;
    dragOverCatIdRef.current = null;
    setDraggedCatId(null);
    setDragOverCatId(null);
    if (fromId && toId && Number(fromId) !== Number(toId)) {
      commitCategoryReorder(fromId, toId);
    }
  };

  const handleCatCardDragEnd = () => {
    const fromId = draggedCatIdRef.current;
    const toId = dragOverCatIdRef.current;
    draggedCatIdRef.current = null;
    dragOverCatIdRef.current = null;
    setDraggedCatId(null);
    setDragOverCatId(null);
    if (fromId && toId && Number(fromId) !== Number(toId)) {
      commitCategoryReorder(fromId, toId);
    }
  };

  // Service Actions
  const handleOpenServModal = (categoryId, serv = null) => {
    const parentCat = categories.find(c => c.category_id === categoryId);
    const catTitle = parentCat?.category_name || '';

    if (serv) {
      const defaults = getServiceMedia(serv, catTitle);

      let initialHighlights = defaults.highlights || [];
      if (serv.highlights) {
        if (Array.isArray(serv.highlights)) initialHighlights = serv.highlights;
        else {
          try {
            const p = JSON.parse(serv.highlights);
            if (Array.isArray(p)) initialHighlights = p;
          } catch (e) {
            initialHighlights = serv.highlights.split('\n').map(s => s.trim()).filter(Boolean);
          }
        }
      }

      let initialGallery = defaults.gallery || [];
      if (serv.gallery) {
        if (Array.isArray(serv.gallery)) initialGallery = serv.gallery;
        else {
          try {
            const p = JSON.parse(serv.gallery);
            if (Array.isArray(p)) initialGallery = p;
          } catch (e) {
            initialGallery = serv.gallery.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
      }

      setServiceModal({ open: true, mode: 'edit', categoryId, data: serv });
      setServName(serv.service_name || '');
      setServPrice(serv.price !== undefined ? serv.price : '');
      setServDuration(serv.duration_mins || 20);
      setServDesc(serv.description || '');
      setServOrder(serv.display_order || 0);
      setServSubtitle(serv.subtitle || defaults.subtitle || '');
      setServDowntime(serv.downtime || defaults.downtime || 'Zero Downtime');
      setServTag(defaults.tag || serv.tag || 'Quick & Effective');
      setServVspBadges(Array.isArray(defaults.vspBadges) ? defaults.vspBadges : []);
      setServHasSessions(serv.has_sessions === 1);
      setServTotalSessions(serv.total_sessions || 3);
      setServSessionInterval(serv.session_interval !== undefined ? serv.session_interval : 15);
      setServSessionIntervalUnit(serv.session_interval_unit || 'days');
      setServHighlights(initialHighlights.length ? initialHighlights : [
        'Advanced cooling sapphire tip for painless comfort',
        'Targeted elimination of coarse hair & ingrown roots',
        'Express 15–20 minute session; zero recovery time'
      ]);
      setServVideoUrl(serv.video_url || defaults.video || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
      setServImageUrl(serv.image_url || defaults.heroImage || defaults.image || '/services/laser_hero.jpg');
      setServGallery(initialGallery.length ? initialGallery : [
        '/services/thumb_underarms.jpg',
        '/services/laser_hero.jpg',
        'https://images.unsplash.com/photo-1512290903671-17adc8104b5b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
      ]);
    } else {
      const nextOrder = (parentCat?.services?.length || 0) + 1;
      const defaults = getServiceMedia(null, catTitle);

      setServiceModal({ open: true, mode: 'create', categoryId, data: null });
      setServName('');
      setServPrice('');
      setServDuration(20);
      setServDesc('');
      setServOrder(nextOrder);
      setServSubtitle('Quick & effective');
      setServDowntime('Zero Downtime');
      setServTag('Quick & Effective');
      setServVspBadges([]);
      setServHasSessions(false);
      setServTotalSessions(3);
      setServSessionInterval(15);
      setServSessionIntervalUnit('days');
      setServHighlights([
        'Advanced cooling sapphire tip for painless comfort',
        'Targeted elimination of coarse hair & ingrown roots',
        'Express 15–20 minute session; zero recovery time'
      ]);
      setServVideoUrl(defaults.video || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4');
      setServImageUrl(defaults.heroImage || defaults.image || '/services/laser_hero.jpg');
      setServGallery(defaults.gallery || [
        '/services/thumb_underarms.jpg',
        '/services/laser_hero.jpg',
        'https://images.unsplash.com/photo-1512290903671-17adc8104b5b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
      ]);
    }
    setServPreviewTab('video');
    setIsServVideoPlaying(false);
  };

  const handleUpdateHighlight = (index, value) => {
    const next = [...servHighlights];
    next[index] = value;
    setServHighlights(next);
  };

  const handleAddHighlight = () => {
    if (servHighlights.length < 5) {
      setServHighlights([...servHighlights, '']);
    }
  };

  const handleRemoveHighlight = (index) => {
    if (servHighlights.length > 1) {
      setServHighlights(servHighlights.filter((_, i) => i !== index));
    }
  };

  const handleAddVspBadge = () => {
    setServVspBadges(prev => [...prev, '']);
  };

  const handleUpdateVspBadge = (index, value) => {
    setServVspBadges(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveVspBadge = (index) => {
    setServVspBadges(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGalleryItem = (index, value) => {
    const next = [...servGallery];
    next[index] = value;
    setServGallery(next);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!servName || !servName.trim()) {
      alert('Service Name is required');
      return;
    }
    if (servPrice === '' || isNaN(parseFloat(servPrice))) {
      alert('Valid Price in INR is required');
      return;
    }
    try {
      const payload = {
        category_id: serviceModal.categoryId || serviceModal.data?.category_id,
        service_name: servName.trim(),
        price: parseFloat(servPrice),
        duration_mins: parseInt(servDuration) || 20,
        description: (servDesc || '').trim(),
        display_order: parseInt(servOrder) || 0,
        subtitle: (servSubtitle || '').trim(),
        tag: servVspBadges.some(b => (b || '').trim())
          ? JSON.stringify({
              tag: (servTag || '').trim(),
              vsp_badges: servVspBadges.map(b => (b || '').trim()).filter(Boolean)
            })
          : (servTag || '').trim(),
        vsp_badges: servVspBadges.map(b => (b || '').trim()).filter(Boolean),
        downtime: (servDowntime || '').trim(),
        highlights: servHighlights.filter(h => (h || '').trim()),
        video_url: (servVideoUrl || '').trim(),
        image_url: (servImageUrl || '').trim(),
        gallery: servGallery.filter(g => (g || '').trim()),
        has_sessions: servHasSessions ? 1 : 0,
        total_sessions: Math.max(1, parseInt(servTotalSessions, 10) || 1),
        session_interval: Math.max(0, parseInt(servSessionInterval, 10) || 0),
        session_interval_unit: servSessionIntervalUnit || 'days'
      };

      if (serviceModal.mode === 'create') {
        await apiRequest('/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest(`/admin/services/${serviceModal.data.service_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }
      setServiceModal({ open: false, mode: 'create', categoryId: null, data: null });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleServActive = async (serv) => {
    try {
      await apiRequest(`/admin/services/${serv.service_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: serv.active === 1 ? 0 : 1 })
      });
      fetchAdminCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '60vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', margin: 0, paddingLeft: '20px' }}>
            Service & Pricing Management
          </h1>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleOpenCatModal();
          }}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '20px' }}
        >
          <Plus size={16} />
          Add New Category
        </button>
      </div>

      {/* Error Alert with Retry Button */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#991B1B' }}>
            <ShieldAlert size={20} color="#DC2626" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>Unable to load Service Catalog</div>
              <div style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '2px' }}>{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAdminCategories}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', background: '#FFFFFF', cursor: 'pointer' }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Categories & Sub-Services Accordion / Cards */}
      {loading ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: '#B88B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading service catalog & pricing...</div>
        </div>
      ) : !error && categories.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Layers size={40} color="#B88B4A" style={{ marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', color: '#1C1917', marginBottom: '6px' }}>No Service Categories Found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 0 18px' }}>
            No service categories were found in the database. Click "+ Add New Category" to initialize your studio menu.
          </p>
          <button
            type="button"
            onClick={() => handleOpenCatModal()}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Plus size={16} />
            Add First Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Top Categories Toolbar with Expand/Collapse All */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '4px 2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExpandAll}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Categories Accordion Cards */}
          {categories.map((cat, idx) => {
            const isExpanded = Boolean(expandedCatIds[cat.category_id]);
            const serviceCount = (cat.services || []).length;

            return (
              <div
                key={cat.category_id}
                onDragEnter={(e) => handleCatCardDragOver(e, cat.category_id)}
                onDragOver={(e) => handleCatCardDragOver(e, cat.category_id)}
                onDrop={(e) => handleCatCardDrop(e, cat.category_id)}
                className="card"
                style={{
                  overflow: 'hidden',
                  border: dragOverCatId === cat.category_id
                    ? '2px solid #B88B4A'
                    : (draggedCatId === cat.category_id ? '1.5px dashed #B88B4A' : (isExpanded ? '1px solid var(--primary-border)' : '1px solid var(--border-color)')),
                  opacity: draggedCatId === cat.category_id ? 0.65 : 1,
                  boxShadow: isExpanded ? '0 10px 30px rgba(184, 139, 74, 0.12)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Category Header Bar (Clickable to Open/Close) */}
                <div
                  role="button"
                  draggable
                  onDragStart={(e) => handleCatCardDragStart(e, cat.category_id)}
                  onDragEnd={handleCatCardDragEnd}
                  tabIndex={0}
                  onClick={() => toggleCatExpand(cat.category_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCatExpand(cat.category_id);
                    }
                  }}
                  style={{
                    padding: '18px 24px',
                    background: cat.active === 1
                      ? (isExpanded ? 'var(--bg-surface)' : '#FFFFFF')
                      : '#F9FAFB',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.15s ease'
                  }}
                  title="Hold and drag up or down to reorder category, or click to open/collapse sub-services"
                >
                  {/* Left: Category Icon, Name, Badges & Subtitle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: cat.active === 1 ? 'var(--primary-subtle)' : '#E5E7EB',
                      color: cat.active === 1 ? '#B88B4A' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      minWidth: '42px',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '1px solid #E8DEC8',
                      background: '#FAF8F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.category_name}
                          draggable={false}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        renderCategoryIcon(cat.icon, 19)
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <h2 style={{ fontSize: '18px', color: '#1C1917', margin: 0, fontWeight: '700' }}>
                          {cat.category_name}
                        </h2>
                        <span className={`badge ${cat.active === 1 ? 'badge-paid' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                          {cat.active === 1 ? 'Active' : 'Disabled'}
                        </span>
                        <span style={{
                          fontSize: '11.5px',
                          color: '#B88B4A',
                          fontWeight: '700',
                          background: 'var(--primary-subtle)',
                          padding: '2px 9px',
                          borderRadius: '12px',
                          border: '1px solid var(--primary-border)'
                        }}>
                          {serviceCount} Treatments
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: '1.4' }}>
                        {cat.description || 'No description provided'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Expand Toggle Button & Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '24px',
                        background: isExpanded ? 'var(--primary-subtle)' : '#FAF8F5',
                        border: '1px solid ' + (isExpanded ? '#B88B4A' : 'var(--border-color)'),
                        color: isExpanded ? '#B88B4A' : '#1C1917',
                        fontWeight: '600',
                        fontSize: '12.5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{isExpanded ? 'Hide Sub-Services' : `Open Sub-Services (${serviceCount})`}</span>
                      {isExpanded ? <ChevronUp size={16} color="#B88B4A" /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Sub-Services Container (Opens when category is clicked) */}
                {isExpanded && (
                  <div className="animate-fade-in" style={{ background: '#FFFFFF' }}>
                    {/* Opened Toolbar: Edit Category, Disable Category & Add Sub-Service */}
                    <div style={{
                      padding: '14px 24px',
                      background: 'var(--bg-card-subtle)',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={15} color="#B88B4A" />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          <strong>Sub-Services in {cat.category_name}:</strong> Click any treatment row below to edit spotlight photos, clinical video & pricing.
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCatActive(cat);
                          }}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#FFFFFF',
                            border: '1px solid var(--border-color)',
                            fontWeight: '600',
                            color: cat.active === 1 ? '#DC2626' : '#166534',
                            cursor: 'pointer'
                          }}
                        >
                          {cat.active === 1 ? 'Disable Category' : 'Enable Category'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCatModal(cat);
                          }}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#FFFFFF',
                            border: '1px solid var(--border-color)',
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                          Edit Category
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCatConfirmModal({ open: true, category: cat, deleting: false });
                          }}
                          title="Delete Category"
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            fontWeight: '600',
                            color: '#DC2626',
                            fontSize: '12.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          Delete Category
                        </button>
                      </div>
                    </div>

                    {/* Sub-services table */}
                    <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 24px', fontWeight: '600' }}>Sub-Service Name</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Price (INR)</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Duration</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                            <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceCount === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <p style={{ margin: '0 0 12px', fontSize: '13px' }}>
                                  No sub-services yet in this category. Click "+ Add Sub-Service" below to add your first treatment.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenServModal(cat.category_id)}
                                  className="btn-primary"
                                  style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Plus size={14} /> Add Sub-Service
                                </button>
                              </td>
                            </tr>
                          ) : (
                            cat.services.map(s => (
                              <tr
                                key={s.service_id}
                                style={{
                                  borderBottom: '1px solid var(--border-light)',
                                  opacity: s.active === 1 ? 1 : 0.6,
                                  transition: 'background 0.15s ease',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleOpenServModal(cat.category_id, s)}
                                title="Click to edit sub-service details and spotlight media"
                              >
                                <td style={{ padding: '14px 24px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '600', color: '#1C1917' }}>{s.service_name}</span>
                                    {s.has_sessions === 1 && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: 'rgba(184, 139, 74, 0.12)',
                                        color: '#B88B4A',
                                        fontWeight: '700',
                                        border: '1px solid rgba(184, 139, 74, 0.25)'
                                      }}>
                                        <Repeat size={11} />
                                        {s.total_sessions} Sessions • Every {s.session_interval} {s.session_interval_unit || 'days'}
                                      </span>
                                    )}
                                  </div>
                                  {s.description && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.description}</div>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: '700', color: '#B88B4A', fontSize: '15px' }}>
                                  {formatCurrency(s.price)}
                                </td>
                                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={13} />
                                    {s.duration_mins || 45} mins
                                  </span>
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  <span className={`badge ${s.active === 1 ? 'badge-paid' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                                    {s.active === 1 ? 'Active' : 'Disabled'}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleServActive(s)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '5px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-color)',
                                        color: s.active === 1 ? '#DC2626' : '#166534',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {s.active === 1 ? 'Disable' : 'Enable'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenServModal(cat.category_id, s)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '5px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: '#FFFFFF',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-main)',
                                        fontWeight: '600',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Edit2 size={12} />
                                      Edit Price / Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                          {serviceCount > 0 && (
                            <tr style={{ background: '#FAF8F5', borderTop: '1px solid var(--border-light)' }}>
                              <td colSpan={5} style={{ padding: '12px 24px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenServModal(cat.category_id)}
                                  className="btn-primary"
                                  style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                >
                                  <Plus size={14} /> Add Sub-Service
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Category Confirmation Popup Modal */}
      {Boolean(deleteCatConfirmModal?.open && deleteCatConfirmModal?.category) && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => !deleteCatConfirmModal.deleting && setDeleteCatConfirmModal({ open: false, category: null, deleting: false })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(28, 25, 23, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card animate-fade-in"
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #FECACA',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#1C1917' }}>
                  Delete Category?
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Are you sure you want to delete <strong>"{deleteCatConfirmModal.category.category_name}"</strong>? This will permanently remove the category and its sub-services.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                disabled={deleteCatConfirmModal.deleting}
                onClick={() => setDeleteCatConfirmModal({ open: false, category: null, deleting: false })}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteCatConfirmModal.deleting}
                onClick={handleConfirmDeleteCategory}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #DC2626',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: deleteCatConfirmModal.deleting ? 'wait' : 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>{deleteCatConfirmModal.deleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Category Modal with Live Catalog Card Preview */}
      {Boolean(categoryModal?.open) && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(28,25,23,0.72)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 99999,
          overflowY: 'auto',
          padding: '24px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div
            className="card animate-fade-in"
            style={{
              maxWidth: '960px',
              width: '100%',
              margin: 'auto',
              background: '#FFFFFF',
              borderRadius: '18px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'min(92vh, 880px)'
            }}
          >
            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', width: '100%', margin: 0, height: '100%', maxHeight: 'inherit', overflow: 'hidden' }}>
              {/* Modal Header */}
              <div style={{
                padding: '18px 28px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface)',
                flexShrink: 0
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B88B4A', fontWeight: '700' }}>
                    Catalog Card Designer
                  </div>
                  <h2 style={{ fontSize: '20px', color: '#1C1917', margin: '2px 0 0' }}>
                    {categoryModal.mode === 'create' ? 'Add New Category' : 'Edit Category'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: 'create', data: null })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '6px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content: 2-Column Responsive Body */}
              <div style={{
                padding: '24px 28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '28px',
                alignItems: 'start',
                overflowY: 'auto',
                flex: 1
              }}>
                {/* Left Column: Form Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', paddingTop: '6px' }}>
                  {/* 1. Category Title / Name */}
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                      <span>Category Title / Name *</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '400' }}>Main title on card</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catName || ''}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Laser Hair Reduction"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* 2. Card Subtitle / Description */}
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                      <span>Card Subtitle / Description</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '400' }}>Subtitle under title</span>
                    </label>
                    <textarea
                      rows={2}
                      value={catDesc || ''}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="e.g. Advanced diode & alexandrite precision laser for smooth, hair-free skin"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* 3. Card Button / Action Label */}
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                      <span>Card Button / Action Text</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '400' }}>e.g. Explore, More</span>
                    </label>
                    <input
                      type="text"
                      value={catActionLabel}
                      onChange={(e) => setCatActionLabel(e.target.value)}
                      placeholder="e.g. Explore, More, View Services"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        fontSize: '13.5px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* 4. Category Imagery & Photography (Upload Steady on Top + Big Scroller Below) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: '#1C1917' }}>
                        Category Card Photography / Visual *
                      </label>
                      <span style={{
                        fontSize: '11px',
                        color: '#B88B4A',
                        fontWeight: '700',
                        background: 'var(--primary-subtle)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid var(--primary-border)'
                      }}>
                        Image Option Enabled
                      </span>
                    </div>

                    {/* Steady Upload Transparent PNG Controls at Top */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          ref={catImageInputRef}
                          accept="image/png,.png"
                          onChange={handleCatImageUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => catImageInputRef.current?.click()}
                          disabled={uploadingCatImage}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #D8BE9B',
                            background: '#FFFFFF',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            color: '#1C1917',
                            cursor: uploadingCatImage ? 'wait' : 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}
                        >
                          <Upload size={14} color="#B88B4A" />
                          <span>{uploadingCatImage ? 'Validating & Uploading...' : 'Upload Transparent PNG'}</span>
                        </button>

                        {catImageTransparentVerified && !catImageUploadError && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#15803D',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '4px 10px',
                            borderRadius: '9999px'
                          }}>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Transparent PNG</span>
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                        Upload a PNG with a transparent background. JPGs and images with solid backgrounds are not supported.
                      </p>

                      {catImageUploadError && (
                        <div
                          role="alert"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#B91C1C',
                            fontSize: '12px',
                            fontWeight: '600',
                            lineHeight: '1.4'
                          }}
                        >
                          <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                          <span>{catImageUploadError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: LIVE VISITOR RITUAL CARD PREVIEW (IMAGE 1 EXACT MIRROR) */}
                <div style={{
                  background: '#FDFBF7',
                  border: '1px solid #E8DEC8',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(184, 139, 74, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0 4px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em'
                    }}>
                      <Sparkles size={14} />
                      <span>Live Visitor Card Mirror (Image 1)</span>
                    </div>
                    <span style={{
                      fontSize: '10.5px',
                      color: '#78716C',
                      fontWeight: '600',
                      background: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid #E8DEC8'
                    }}>
                      Visitor Portal View
                    </span>
                  </div>

                  {/* EXACT CARD AS SEEN BY VISITOR IN IMAGE 1 */}
                  <div
                    ref={catCardPreviewRef}
                    className="ritual-category-card"
                    style={{
                      width: '100%',
                      maxWidth: '380px',
                      minHeight: '215px',
                      position: 'relative',
                      cursor: 'default',
                      background: '#FFFFFF',
                      border: '1px solid #D8BE9B',
                      borderRadius: '22px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(28, 25, 23, 0.08)',
                      userSelect: 'none',
                      touchAction: 'none',
                      transition: 'border 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseDown={(e) => {
                      if (catImgBoxRef.current && !catImgBoxRef.current.contains(e.target) && !(e.target.closest && e.target.closest('[data-cat-img-toolbar="true"]'))) {
                        setIsCatImgSelected(false);
                      }
                    }}
                    onWheel={(e) => {
                      e.preventDefault();
                      setIsCatImgSelected(true);
                      setCatImageScale(sc => Math.max(0.4, Math.min(2.0, Number((sc - e.deltaY * 0.001).toFixed(2)))));
                    }}
                  >
                    <div className="ritual-card-content" style={{ width: '54%', padding: '24px 14px 22px 24px', pointerEvents: 'none' }}>
                      <div>
                        <div className="ritual-card-num">
                          {String(catOrder || 1).padStart(2, '0')}
                        </div>
                        <h2 className="ritual-card-title" style={{ fontSize: '18px', margin: '0 0 8px 0', minHeight: '44px' }}>
                          {(catName || '').trim().toUpperCase() || 'LASER HAIR REDUCTION'}
                        </h2>
                        <p className="ritual-card-desc" style={{ minHeight: '34px' }}>
                          {(catDesc || '').trim() || 'Advanced diode & alexandrite precision laser for smooth, hair-free skin'}
                        </p>
                      </div>

                      <div>
                        <div className="ritual-card-divider" />
                        <div className="ritual-card-action">
                          <span>{(catActionLabel || '').trim() || 'Explore'}</span>
                          <ChevronRight size={15} color="#B88B4A" />
                        </div>
                      </div>
                    </div>

                    <div
                      className="ritual-card-image-wrap"
                      style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        ref={catImgBoxRef}
                        onMouseEnter={() => setIsCatImgHovered(true)}
                        onMouseLeave={() => setIsCatImgHovered(false)}
                        onMouseDown={handleCatImgMouseDown}
                        onTouchStart={handleCatImgTouchStart}
                        style={{
                          position: 'relative',
                          height: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          transform: `translate(${catImagePosX}px, ${catImagePosY}px) scale(${catImageScale})`,
                          transformOrigin: 'right center',
                          transition: (isDraggingCatImg || isResizingCatImg) ? 'none' : 'transform 0.1s ease',
                          pointerEvents: 'auto',
                          cursor: 'move',
                          userSelect: 'none',
                          touchAction: 'none',
                          outline: isCatImgSelected
                            ? '1.5px solid #B88B4A'
                            : (isCatImgHovered ? '1.5px dashed rgba(184, 139, 74, 0.7)' : 'none'),
                          outlineOffset: '-2px',
                          borderRadius: '4px'
                        }}
                      >
                        <img
                          src={catImageUrl || '/services/categories/cat_01_signature_facials.png?v=45'}
                          alt={catName || 'Category Image'}
                          className="ritual-card-img"
                          draggable={false}
                          style={{
                            height: '100%',
                            width: 'auto',
                            objectFit: 'contain',
                            objectPosition: 'right center',
                            userSelect: 'none',
                            pointerEvents: 'none',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.currentTarget.src = '/services/categories/cat_01_signature_facials.png?v=45';
                          }}
                        />

                        {/* Four Small Corner Resize Handles when Selected */}
                        {isCatImgSelected && (
                          <>
                            {[
                              { key: 'nw', top: '2px', left: '2px', cursor: 'nwse-resize' },
                              { key: 'ne', top: '2px', right: '2px', cursor: 'nesw-resize' },
                              { key: 'sw', bottom: '2px', left: '2px', cursor: 'nesw-resize' },
                              { key: 'se', bottom: '2px', right: '2px', cursor: 'nwse-resize' }
                            ].map((handle) => (
                              <div
                                key={handle.key}
                                onMouseDown={handleCatImgResizeMouseDown}
                                onTouchStart={handleCatImgResizeTouchStart}
                                style={{
                                  position: 'absolute',
                                  top: handle.top,
                                  bottom: handle.bottom,
                                  left: handle.left,
                                  right: handle.right,
                                  width: '10px',
                                  height: '10px',
                                  background: '#FAF6EE',
                                  border: '2px solid #B88B4A',
                                  borderRadius: '2.5px',
                                  boxShadow: '0 1px 4px rgba(28, 25, 23, 0.25)',
                                  cursor: handle.cursor,
                                  zIndex: 15,
                                  transform: `scale(${1 / (catImageScale || 1)})`,
                                  pointerEvents: 'auto'
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Floating Toolbar near the selected image (only shown when selected): Zoom % + Reset */}
                    {isCatImgSelected && (
                      <div
                        data-cat-img-toolbar="true"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          zIndex: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(250, 246, 238, 0.96)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid #D8BE9B',
                          borderRadius: '9999px',
                          padding: '4px 10px',
                          boxShadow: '0 4px 14px rgba(28, 25, 23, 0.14)'
                        }}
                      >
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#1C1917',
                          letterSpacing: '0.02em'
                        }}>
                          {Math.round((catImageScale || 1) * 100)}%
                        </span>
                        <span style={{ width: '1px', height: '12px', background: '#E2D3B9' }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCatImagePosX(0);
                            setCatImagePosY(0);
                            setCatImageScale(1);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            padding: '1px 2px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#B88B4A',
                            cursor: 'pointer'
                          }}
                          title="Reset image position and size"
                        >
                          <RotateCcw size={11} />
                          <span>Reset</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Interactive Mirror Guide */}
                  <div style={{
                    fontSize: '11.5px',
                    color: '#6B6661',
                    lineHeight: '1.45',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E8DEC8',
                    width: '100%',
                    maxWidth: '380px',
                    boxSizing: 'border-box'
                  }}>
                    💡 <strong>How to Adjust Image in Card:</strong> Click &amp; hold the image to drag and position it anywhere inside the card. Click the image and drag any of the <strong>4 corner handles</strong> (or scroll) to resize it, or click <strong>Reset</strong> to restore default framing.
                  </div>
                </div>

                {/* Full-Width Bottom Horizontal Image Scroller (Images & Uploaded Images Only, No Background Box or Bottom Heading) */}
                <div style={{
                  gridColumn: '1 / -1',
                  marginTop: '6px',
                  paddingTop: '12px'
                }}>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '4px 0'
                  }}>
                    {/* Left Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => {
                        if (presetScrollerRef.current) {
                          presetScrollerRef.current.scrollBy({ left: -420, behavior: 'smooth' });
                        }
                      }}
                      title="Scroll left"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: '#B58E4A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ChevronLeft size={22} strokeWidth={2.2} />
                    </button>

                    {/* Horizontal Scroller Container */}
                    <div
                      ref={presetScrollerRef}
                      style={{
                        display: 'flex',
                        gap: '18px',
                        overflowX: 'auto',
                        scrollBehavior: 'smooth',
                        padding: '6px 4px',
                        flex: 1,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {[
                        ...(catImageUrl &&
                        !CATEGORY_IMAGE_PRESETS.some(p => p.url === catImageUrl) &&
                        !uploadedCatImages.some(u => u.url === catImageUrl)
                          ? [{ id: 'current_uploaded', url: catImageUrl, name: 'Uploaded Image' }]
                          : []),
                        ...uploadedCatImages.filter(u => !CATEGORY_IMAGE_PRESETS.some(p => p.url === u.url)),
                        ...CATEGORY_IMAGE_PRESETS
                      ].map(preset => {
                        const isSelected = catImageUrl === preset.url;
                        return (
                          <button
                            key={preset.id || preset.url}
                            type="button"
                            onClick={() => {
                              setCatImageUploadError('');
                              setCatImageTransparentVerified(true);
                              setCatImageUrl(preset.url);
                            }}
                            style={{
                              position: 'relative',
                              minWidth: '165px',
                              maxWidth: '165px',
                              height: '122px',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              border: isSelected ? '2px solid #B58E4A' : '1px solid #EAE3D9',
                              padding: 0,
                              cursor: 'pointer',
                              background: '#FAF6F0',
                              boxShadow: isSelected
                                ? '0 8px 20px rgba(181, 142, 74, 0.22), 0 0 0 2px rgba(181, 142, 74, 0.14)'
                                : '0 4px 12px rgba(26, 22, 19, 0.04)',
                              transition: 'all 0.18s ease',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center'
                            }}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name || 'Category Image'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'bottom center',
                                display: 'block'
                              }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#B58E4A',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                              }}>
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => {
                        if (presetScrollerRef.current) {
                          presetScrollerRef.current.scrollBy({ left: 420, behavior: 'smooth' });
                        }
                      }}
                      title="Scroll right"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        color: '#B58E4A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ChevronRight size={22} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div style={{
                padding: '16px 28px',
                borderTop: '1px solid var(--border-color)',
                background: '#FFFFFF',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: 'create', data: null })}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '13px' }}
                >
                  {categoryModal.mode === 'create' ? 'Save & Publish Category' : 'Save Category Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-Service Modal: Full Spotlight & Clinical Card Editor (Matching Image 2) */}
      {Boolean(serviceModal.open) && typeof document !== 'undefined' && createPortal(
        (() => {
          const parentCatForModal = categories.find(c => c.category_id === (serviceModal.categoryId || serviceModal.data?.category_id));
          const modalCategoryName = parentCatForModal?.category_name || 'Laser Hair Reduction';

          return (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflowY: 'auto',
              zIndex: 99999,
              padding: '24px 16px',
              boxSizing: 'border-box'
            }}>
              <div className="card animate-fade-in" style={{
                maxWidth: '1240px',
                width: '100%',
                margin: 'auto',
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 25px 70px rgba(28, 25, 23, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                maxHeight: 'min(92vh, 920px)'
              }}>
                <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', margin: 0, height: '100%', maxHeight: 'inherit', overflow: 'hidden' }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '20px 28px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    background: '#FFFFFF',
                    flexShrink: 0
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: '#B88B4A',
                          fontWeight: '800'
                        }}>
                          {modalCategoryName}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>•</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {serviceModal.mode === 'create' ? 'Add New Treatment' : 'Edit Treatment'}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '20px', color: '#1C1917', margin: 0, fontWeight: '700' }}>
                        {serviceModal.mode === 'create' ? 'Add New Sub-Service' : 'Edit Sub-Service & Spotlight Card'}
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Configure service details, pricing, badges, clinical highlights, video, and image gallery as seen by clients.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setServiceModal({ open: false, mode: 'create', categoryId: null, data: null })}
                      style={{
                        border: 'none',
                        background: 'var(--bg-surface)',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body: 2 Columns */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(440px, 55fr) minmax(380px, 45fr)',
                    gap: '32px',
                    padding: '28px 32px',
                    gap: '24px',
                    padding: '24px 28px',
                    background: '#FCFBF9',
                    overflowY: 'auto',
                    maxHeight: 'calc(85vh - 120px)'
                  }}>
                    {/* Left Column: Form Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #ECE6DC', padding: '14px 28px 28px 28px' }}>
                      {/* 1. Core Service Title & Pricing */}
                      <div style={{
                        background: '#FFFFFF',
                        padding: '20px 0',
                        borderRadius: '14px',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '24px 0 28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 700, marginRight: '8px', fontSize: '11px' }}>01</span>
                          <span style={{ color: '#292524', fontWeight: 700 }}>Core Service &amp; Pricing</span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                            Sub-Service Title / Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={servName}
                            onChange={(e) => setServName(e.target.value)}
                            placeholder="e.g. Underarms Laser"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              outline: 'none',
                              fontSize: '13.5px'
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '14px', marginTop: '6px', paddingBottom: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                              Price (₹) *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="1"
                              value={servPrice}
                              onChange={(e) => setServPrice(e.target.value)}
                              placeholder="1500"
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '13.5px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                              Duration (Mins)
                            </label>
                            <input
                              type="number"
                              min="5"
                              step="5"
                              value={servDuration}
                              onChange={(e) => setServDuration(parseInt(e.target.value) || 20)}
                              placeholder="20"
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '13.5px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                              Order #
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={servOrder}
                              onChange={(e) => setServOrder(parseInt(e.target.value) || 0)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '13.5px'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Service Session Planning & Protocol */}
                      <div style={{
                        background: '#FFFFFF',
                        padding: '20px 0',
                        borderRadius: '14px',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                        transition: 'all 0.2s ease',
                        boxShadow: 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#B88B4A', fontWeight: 700, fontSize: '11px', marginRight: '2px' }}>02</span>
                              <span style={{ color: '#292524', fontWeight: 700 }}>Service Session Planning &amp; Protocol</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 4px 0', lineHeight: 1.5 }}>
                              Enable multi-session treatment plans with automatic session sequence & due date calculation.
                            </p>
                          </div>

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: servHasSessions ? '#B88B4A' : 'var(--text-muted)' }}>
                              {servHasSessions ? 'Enabled' : 'Disabled'}
                            </span>
                            <input
                              type="checkbox"
                              checked={servHasSessions}
                              onChange={(e) => setServHasSessions(e.target.checked)}
                              style={{ display: 'none' }}
                            />
                            <div style={{
                              width: '42px',
                              height: '24px',
                              borderRadius: '12px',
                              background: servHasSessions ? '#B88B4A' : '#E5E7EB',
                              position: 'relative',
                              transition: 'background 0.2s ease'
                            }}>
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                position: 'absolute',
                                top: '3px',
                                left: servHasSessions ? '21px' : '3px',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                          </label>
                        </div>

                        {servHasSessions && (
                          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                  Total Planned Sessions *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  required={servHasSessions}
                                  value={servTotalSessions}
                                  onChange={(e) => setServTotalSessions(Math.max(1, parseInt(e.target.value) || 1))}
                                  placeholder="3"
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    outline: 'none',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                  Interval Value *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  required={servHasSessions}
                                  value={servSessionInterval}
                                  onChange={(e) => setServSessionInterval(Math.max(0, parseInt(e.target.value) || 0))}
                                  placeholder="15"
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    outline: 'none',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                  Interval Unit
                                </label>
                                <select
                                  value={servSessionIntervalUnit}
                                  onChange={(e) => setServSessionIntervalUnit(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    outline: 'none',
                                    fontSize: '13px',
                                    background: '#FFFFFF',
                                    fontWeight: '600'
                                  }}
                                >
                                  <option value="days">Days</option>
                                  <option value="weeks">Weeks</option>
                                </select>
                              </div>
                            </div>

                            <div style={{
                              padding: '10px 14px',
                              background: 'var(--primary-subtle)',
                              borderRadius: '10px',
                              border: '1px solid var(--primary-border)',
                              fontSize: '12px',
                              color: '#8A6D3B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <Sparkles size={14} style={{ flexShrink: 0 }} />
                              <span>
                                <strong>Protocol Preview:</strong> Treatment plan consists of <strong>{servTotalSessions} sessions</strong> spaced <strong>{servSessionInterval} {servSessionIntervalUnit}</strong> apart. Client bookings will automatically track <em>"Session 1 of {servTotalSessions}"</em>, <em>"Session 2 of {servTotalSessions}"</em>, etc., with due dates scheduled automatically upon completion.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{
                        padding: '28px 0',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '24px 0 28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', marginBottom: '2px' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 700, marginRight: '8px', fontSize: '11px' }}>03</span>
                          <span style={{ color: '#292524', fontWeight: 700 }}>Spotlight Badges &amp; Subtitle</span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                            Subtitle / Tagline (under pills)
                          </label>
                          <input
                            type="text"
                            value={servSubtitle}
                            onChange={(e) => setServSubtitle(e.target.value)}
                            placeholder="e.g. Quick & effective"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              outline: 'none',
                              fontSize: '13px'
                            }}
                          />
                        </div>

                        {/* VSP Badges Section */}
                        <div style={{ marginTop: '4px', paddingBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: servVspBadges.length > 0 ? '12px' : '0' }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#292524', margin: 0 }}>
                              VSP Badges
                            </label>
                            <button
                              type="button"
                              onClick={handleAddVspBadge}
                              style={{
                                fontSize: '11px',
                                color: '#B88B4A',
                                background: 'var(--primary-subtle)',
                                border: '1px solid var(--primary-border)',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              + Add VSP Badge
                            </button>
                          </div>

                          {servVspBadges.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {servVspBadges.map((badgeText, bIdx) => (
                                <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="text"
                                    value={badgeText}
                                    onChange={(e) => handleUpdateVspBadge(bIdx, e.target.value)}
                                    placeholder={`e.g. VSP Badge #${bIdx + 1}`}
                                    style={{
                                      flex: 1,
                                      padding: '9px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-color)',
                                      outline: 'none',
                                      fontSize: '13px'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVspBadge(bIdx)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#DC2626',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Remove VSP badge"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {false && (
                      <div style={{
                        background: '#FFFFFF',
                        padding: '20px 0',
                        borderRadius: '14px',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '24px 0 28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A' }}>
                          <span style={{ color: '#B88B4A', fontWeight: 700, marginRight: '8px', fontSize: '11px' }}>03</span>
                          <span style={{ color: '#292524', fontWeight: 700 }}>Spotlight Badges &amp; Subtitle</span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                            Subtitle / Tagline (under pills)
                          </label>
                          <input
                            type="text"
                            value={servSubtitle}
                            onChange={(e) => setServSubtitle(e.target.value)}
                            placeholder="e.g. Quick & effective"
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              outline: 'none',
                              fontSize: '13px'
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                              Downtime Badge
                            </label>
                            <input
                              type="text"
                              value={servDowntime}
                              onChange={(e) => setServDowntime(e.target.value)}
                              placeholder="e.g. Zero Downtime"
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '13px'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '8px' }}>
                              Key Benefit Badge
                            </label>
                            <input
                              type="text"
                              value={servTag}
                              onChange={(e) => setServTag(e.target.value)}
                              placeholder="e.g. Quick & Effective"
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '13px'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      )}
                      <div style={{
                        background: '#FFFFFF',
                        padding: '20px 0',
                        borderRadius: '14px',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '24px 0 28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A' }}>
                            <span style={{ color: '#B88B4A', fontWeight: 700, marginRight: '8px', fontSize: '11px' }}>04</span>
                            <span style={{ color: '#292524', fontWeight: 700 }}>Clinical Highlights &amp; Benefits</span>
                          </div>
                          {servHighlights.length < 5 && (
                            <button
                              type="button"
                              onClick={handleAddHighlight}
                              style={{
                                fontSize: '11px',
                                color: '#B88B4A',
                                background: 'var(--primary-subtle)',
                                border: '1px solid var(--primary-border)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              + Add Bullet
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px', paddingBottom: '8px' }}>
                          {servHighlights.map((hl, hIdx) => (
                            <div key={hIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#B88B4A', minWidth: '16px' }}>
                                ✓
                              </span>
                              <input
                                type="text"
                                value={hl}
                                onChange={(e) => handleUpdateHighlight(hIdx, e.target.value)}
                                placeholder={`Highlight #${hIdx + 1} e.g. Advanced cooling sapphire tip`}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                  outline: 'none',
                                  fontSize: '12.5px'
                                }}
                              />
                              {servHighlights.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHighlight(hIdx)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Remove bullet point"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. Direct Media & Video File Uploads (No links needed!) */}
                      <div style={{
                        background: '#FFFFFF',
                        padding: '20px 0',
                        borderRadius: '14px',
                        border: 'none',
                        borderBottom: '1px solid #EFEAE1',
                        borderRadius: '0',
                        padding: '24px 0 28px 0',
                        gap: '18px',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '22px',
                        paddingTop: '28px',
                        paddingBottom: '12px',
                        borderBottom: 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A' }}>
                            <span style={{ color: '#B88B4A', fontWeight: 700, marginRight: '8px', fontSize: '11px' }}>05</span>
                            <span style={{ color: '#292524', fontWeight: 700 }}>Video &amp; Image Gallery</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#78716C', fontWeight: '600', background: '#FAF6EE', border: '1px solid #E8DFD1', padding: '2px 8px', borderRadius: '6px' }}>
                            Direct File Upload
                          </span>
                        </div>

                        {/* A. Procedure Demo Video Upload */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', marginTop: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', margin: 0 }}>


                            </label>
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#292524', marginRight: 'auto' }}>Procedure Demo Video *</span> {servVideoUrl && (
                              <span style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '600' }}>
                                ✓ Active in demo player
                              </span>
                            )}
                          </div>

                          <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                            borderRadius: '12px',
                            border: servVideoUrl ? '1px solid #E6E0D6' : '1px dashed #D6C7B2',
                            background: servVideoUrl ? '#FAF7F2' : '#FFFFFF',
                            cursor: uploadingState.video ? 'wait' : 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <input
                              type="file"
                              ref={servVideoInputRef}
                              onClick={(e) => e.stopPropagation()}
                              accept="video/mp4,video/webm,video/quicktime,video/*"
                              disabled={uploadingState.video}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) uploadFile(file, 'video');
                              }}
                              style={{ display: 'none' }}
                            />

                            {uploadingState.video ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#B88B4A', padding: '12px' }}>
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  border: '3px solid #EADBCC',
                                  borderTopColor: '#B88B4A',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                <span style={{ fontSize: '12.5px', fontWeight: '700' }}>Uploading Video File to Studio Server...</span>
                              </div>
                            ) : servVideoUrl ? (
                              <div
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!uploadingState.video) servVideoInputRef.current?.click();
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, textAlign: 'left' }}>
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '8px',
                                    background: '#1C1917',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#B88B4A',
                                    flexShrink: 0
                                  }}>
                                    <Play size={18} fill="#B88B4A" style={{ marginLeft: '2px' }} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {servVideoUrl.split('/').pop()}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      HD Procedure Video Loaded. Click to upload new video.
                                    </div>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: '11.5px',
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  background: '#B88B4A',
                                  color: '#FFFFFF',
                                  fontWeight: '700',
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
                                  <Upload size={13} />
                                  <span>Replace Video</span>
                                </span>
                              </div>
                            ) : (
                              <div style={{ padding: '8px' }}>
                                <div style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '50%',
                                  background: 'var(--primary-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#B88B4A',
                                  margin: '0 auto 8px auto'
                                }}>
                                  <UploadCloud size={22} />
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                                  Click to Upload Procedure Video Directly
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Select any MP4, WebM, or MOV video file (up to 150MB)
                                </div>
                              </div>
                            )}
                          </label>
                        </div>

                        {/* B. Primary Poster / Hero Image Upload */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', marginTop: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', margin: 0 }}>


                            </label>
                            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#292524', marginRight: 'auto' }}>Primary Poster / Hero Image</span> {servImageUrl && (
                              <span style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '600' }}>
                                ✓ Hero Loaded
                              </span>
                            )}
                          </div>

                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: servImageUrl ? '1px solid #E6E0D6' : '1px dashed #D6C7B2',
                            background: servImageUrl ? '#FAF7F2' : '#FFFFFF',
                            cursor: uploadingState.hero ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            gap: '18px'
                          }}>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/*"
                              ref={servHeroInputRef}
                              onClick={(e) => e.stopPropagation()}
                              disabled={uploadingState.hero}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) uploadFile(file, 'hero');
                              }}
                              style={{ display: 'none' }}
                            />

                            {uploadingState.hero ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B88B4A', padding: '8px' }}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  border: '2.5px solid #EADBCC',
                                  borderTopColor: '#B88B4A',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                <span style={{ fontSize: '12px', fontWeight: '700' }}>Uploading Hero Image...</span>
                              </div>
                            ) : servImageUrl ? (
                              <>
                                <img
                                  key={servImageUrl}
                                  src={servImageUrl}
                                  alt=""
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    border: '1.5px solid #DAC493',
                                    flexShrink: 0
                                  }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {servImageUrl.split('/').pop()}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Shown as video poster banner. Click to change.
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '5px 12px',
                                  borderRadius: '7px',
                                  background: 'var(--primary-subtle)',
                                  color: '#B88B4A',
                                  border: '1px solid var(--primary-border)',
                                  fontWeight: '700',
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Upload size={12} />
                                  <span
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!uploadingState.hero) servHeroInputRef.current?.click();
                                    }}
                                  >Replace</span>
                                </span>
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: 'var(--primary-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#B88B4A'
                                }}>
                                  <Camera size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>Click to Upload Hero / Poster Image</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPG, PNG, or WebP photo</div>
                                </div>
                              </div>
                            )}
                          </label>
                        </div>

                        {/* C. Clinical Photo Gallery (4 Direct Upload Slots) */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', marginTop: '4px' }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', margin: 0 }}>
                              Clinical Photo Gallery (4 Upload Slots):
                            </label>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Click to upload • Drag &amp; drop to reorder #1–#4
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {servGallery.slice(0, 4).map((imgUrl, gIdx) => {
                              const isSlotUploading = uploadingState.gallery[gIdx];
                              return (
                                <label
                                  key={gIdx}
                                  style={{
                                    position: 'relative',
                                    height: '92px',
                                    borderRadius: '10px',
                                    border: imgUrl ? '1px solid #E6E0D6' : '1px dashed #D6C7B2',
                                    background: imgUrl ? '#1C1917' : '#FAF7F2',
                                    overflow: 'hidden',
                                    cursor: isSlotUploading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                  }}
                                  title={`Click to upload photo #${gIdx + 1} (or drag to reorder)`}
                                  draggable={!isSlotUploading}
                                  onDragStart={(e) => {
                                    draggedGalleryIdxRef.current = gIdx;
                                    if (e.dataTransfer) {
                                      e.dataTransfer.effectAllowed = 'move';
                                      try { e.dataTransfer.setData('text/plain', String(gIdx)); } catch {}
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (dragOverGalleryIdx !== gIdx) setDragOverGalleryIdx(gIdx);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const fromIdx = draggedGalleryIdxRef.current !== null
                                      ? draggedGalleryIdxRef.current
                                      : parseInt(e.dataTransfer?.getData('text/plain'), 10);
                                    draggedGalleryIdxRef.current = null;
                                    setDragOverGalleryIdx(null);
                                    if (!isNaN(fromIdx) && fromIdx !== gIdx) {
                                      handleReorderGallerySlot(fromIdx, gIdx);
                                    }
                                  }}
                                  onDragEnd={() => {
                                    draggedGalleryIdxRef.current = null;
                                    setDragOverGalleryIdx(null);
                                  }}
                                  onClick={(e) => {
                                    if (e.target !== servGalleryInputRefs.current[gIdx]) {
                                      e.preventDefault();
                                      if (!isSlotUploading) servGalleryInputRefs.current[gIdx]?.click();
                                    }
                                  }}
                                >
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/*"
                                    ref={(el) => { servGalleryInputRefs.current[gIdx] = el; }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isSlotUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      e.target.value = '';
                                      if (file) uploadFile(file, 'gallery', gIdx);
                                    }}
                                    style={{ display: 'none' }}
                                  />

                                  {isSlotUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#B88B4A' }}>
                                      <div style={{
                                        width: '18px',
                                        height: '18px',
                                        border: '2px solid #EADBCC',
                                        borderTopColor: '#B88B4A',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                      }} />
                                      <span style={{ fontSize: '9px', fontWeight: '700' }}>Uploading</span>
                                    </div>
                                  ) : imgUrl ? (
                                    <>
                                      <img
                                        key={imgUrl}
                                        src={imgUrl}
                                        draggable={false}
                                        alt=""
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                      {/* Number badge */}
                                      <div style={{
                                        position: 'absolute',
                                        top: '4px',
                                        left: '4px',
                                        background: 'rgba(28, 25, 23, 0.85)',
                                        color: '#FFFFFF',
                                        fontSize: '9px',
                                        fontWeight: '800',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        zIndex: 2
                                      }}>
                                        #{gIdx + 1}
                                      </div>
                                      {/* Change action overlay */}
                                      <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'rgba(28, 25, 23, 0.8)',
                                        backdropFilter: 'blur(4px)',
                                        color: '#FFFFFF',
                                        fontSize: '9.5px',
                                        fontWeight: '700',
                                        padding: '3px 0',
                                        textAlign: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px',
                                        zIndex: 2
                                      }}>
                                        <Upload size={10} />
                                        <span>Upload Photo</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#9E7437' }}>
                                      <Camera size={20} />
                                      <span style={{ fontSize: '10px', fontWeight: '700' }}>Photo #{gIdx + 1}</span>
                                      <span style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>+ Upload</span>
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: LIVE EXACT SPOTLIGHT CARD PREVIEW (IMAGE 2) */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#B88B4A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em'
                      }}>

                        <span>Live Spotlight Preview</span>
                      </div>

                      <VisitorServiceSpotlightCard
                        compact={true}
                        categoryName={modalCategoryName}
                        serviceName={(servName || '').trim() || 'Underarms Laser'}
                        durationMins={servDuration || 20}
                        price={servPrice !== '' ? servPrice : 1200}
                        subtitle={(servSubtitle || '').trim()}
                        tag=""
                        downtime=""
                        vspBadges={servVspBadges}
                        sessionPlanText={
                          servHasSessions
                            ? `${servTotalSessions} Sessions (${servSessionInterval} ${servSessionIntervalUnit})`
                            : ''
                        }
                        videoUrl={servVideoUrl}
                        heroImage={servImageUrl}
                        gallery={servGallery.slice(0, 4)}
                        highlights={servHighlights}
                        activeMediaTab={servPreviewTab}
                        onSelectMediaTab={setServPreviewTab}
                        videoRef={servVideoRef}
                        isVideoPlaying={isServVideoPlaying}
                        setIsVideoPlaying={setIsServVideoPlaying}
                        isVideoMuted={isServVideoMuted}
                        setIsVideoMuted={setIsServVideoMuted}
                        maxGalleryThumbnails={4}
                      />
                      {false && (
                      <div
                        className="card"
                        style={{
                          padding: '0',
                          overflow: 'hidden',
                          borderRadius: '20px',
                          border: '1.5px solid rgba(220, 205, 185, 0.6)',
                          boxShadow: '0 8px 24px rgba(184, 139, 74, 0.08)',
                          background: '#FFFFFF'
                        }}
                      >
                        <div className="spotlight-featured-grid" style={{ alignItems: 'stretch' }}>
                          {/* Media Section: Square Media Display + Vertical Thumbnails */}
                          <div className="spotlight-media-col" style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'stretch',
                            gap: '18px',
                            boxSizing: 'border-box'
                          }}>
                            {/* Main Media Box */}
                            <div className="spotlight-media-main" style={{
                              position: 'relative',
                              flex: '1 1 auto',
                              minWidth: 0,
                              aspectRatio: '1 / 1',
                              maxHeight: '340px',
                              borderRadius: '16px',
                              overflow: 'hidden',
                              background: '#1C1917',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.14)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {servPreviewTab === 'video' ? (
                                <>
                                  <video
                                    ref={servVideoRef}
                                    key={`prev_vid_${servVideoUrl}`}
                                    src={servVideoUrl}
                                    poster={servImageUrl}
                                    autoPlay
                                    muted={isServVideoMuted}
                                    loop
                                    playsInline
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      display: 'block'
                                    }}
                                    onPlay={() => setIsServVideoPlaying(true)}
                                    onPause={() => setIsServVideoPlaying(false)}
                                  />

                                  {/* Top Badge Overlay */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    right: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    pointerEvents: 'none',
                                    zIndex: 2
                                  }}>
                                    <div style={{
                                      background: 'rgba(28, 25, 23, 0.75)',
                                      backdropFilter: 'blur(6px)',
                                      color: '#FFFFFF',
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      letterSpacing: '0.06em',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <span>▶</span>
                                      <span>PROCEDURE DEMO • HD</span>
                                    </div>

                                    <div style={{
                                      background: 'rgba(28, 25, 23, 0.75)',
                                      backdropFilter: 'blur(6px)',
                                      color: '#FFFFFF',
                                      fontSize: '9px',
                                      fontWeight: '600',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <Clock size={10} color="#EADBCC" />
                                      <span>{servDuration || 20} mins</span>
                                    </div>
                                  </div>

                                  {/* Floating Play / Pause Overlay Button in Center */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (servVideoRef.current) {
                                        if (servVideoRef.current.paused) {
                                          servVideoRef.current.play().catch(() => { });
                                          setIsServVideoPlaying(true);
                                        } else {
                                          servVideoRef.current.pause();
                                          setIsServVideoPlaying(false);
                                        }
                                      }
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '50%',
                                      background: 'rgba(28, 25, 23, 0.75)',
                                      backdropFilter: 'blur(8px)',
                                      border: '1.5px solid rgba(255, 255, 255, 0.3)',
                                      color: '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      zIndex: 3
                                    }}
                                    title={isServVideoPlaying ? 'Pause Demo Video' : 'Play Demo Video'}
                                  >
                                    {isServVideoPlaying ? (
                                      <Pause size={16} fill="#FFFFFF" color="#FFFFFF" />
                                    ) : (
                                      <Play size={16} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '2px' }} />
                                    )}
                                  </button>

                                  {/* Bottom Controls */}
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    left: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    zIndex: 2
                                  }}>
                                    <button
                                      type="button"
                                      onClick={() => setIsServVideoMuted(!isServVideoMuted)}
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '6px',
                                        background: 'rgba(28, 25, 23, 0.65)',
                                        backdropFilter: 'blur(6px)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {isServVideoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <img
                                    src={servGallery[servPreviewTab] || servImageUrl}
                                    alt=""
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    right: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    zIndex: 2
                                  }}>
                                    <div style={{
                                      background: 'rgba(28, 25, 23, 0.75)',
                                      backdropFilter: 'blur(6px)',
                                      color: '#FFFFFF',
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      letterSpacing: '0.06em'
                                    }}>
                                      📷 CLINICAL PHOTO • {servPreviewTab + 1} OF 4
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setServPreviewTab('video')}
                                      style={{
                                        background: 'rgba(184, 139, 74, 0.95)',
                                        color: '#FFFFFF',
                                        padding: '3px 9px',
                                        borderRadius: '9999px',
                                        fontSize: '9px',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Play size={8} fill="#FFFFFF" />
                                      <span>Watch Video</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 5 Thumbnails Stacked Vertically */}
                            <div className="spotlight-thumbnails-vertical" style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '6px',
                              width: '62px',
                              flexShrink: 0
                            }}>
                              {/* Thumbnail 1: Video Tab */}
                              <button
                                type="button"
                                onClick={() => setServPreviewTab('video')}
                                style={{
                                  position: 'relative',
                                  width: '100%',
                                  height: '56px',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  padding: 0,
                                  margin: 0,
                                  border: servPreviewTab === 'video' ? '2.5px solid #B88B4A' : '1.5px solid #DAC493',
                                  background: '#1C1917',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px'
                                }}
                              >
                                <img
                                  src={servImageUrl || servGallery[0]}
                                  alt=""
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: 0.55
                                  }}
                                />
                                <div style={{
                                  position: 'relative',
                                  zIndex: 1,
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: '#B88B4A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Play size={8} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '1px' }} />
                                </div>
                                <span style={{ position: 'relative', zIndex: 1, fontSize: '7.5px', fontWeight: '800', color: '#FFFFFF' }}>
                                  VIDEO
                                </span>
                              </button>

                              {/* Thumbnails 2-5: 4 Images */}
                              {servGallery.slice(0, 4).map((imgUrl, gIdx) => {
                                const isSelected = servPreviewTab === gIdx;
                                return (
                                  <button
                                    key={gIdx}
                                    type="button"
                                    onClick={() => setServPreviewTab(gIdx)}
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '56px',
                                      borderRadius: '10px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      padding: 0,
                                      margin: 0,
                                      border: isSelected ? '2.5px solid #B88B4A' : '1.5px solid #DAC493',
                                      background: 'linear-gradient(135deg, #FAF6EE 0%, #EDE4D8 100%)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <img
                                      src={imgUrl}
                                      alt=""
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '2px',
                                      right: '3px',
                                      background: 'rgba(28, 25, 23, 0.75)',
                                      color: '#FFFFFF',
                                      fontSize: '8px',
                                      fontWeight: '800',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      lineHeight: 1.2
                                    }}>
                                      {gIdx + 1}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Details & Actions Section (Right Side of Image 2) */}
                          <div className="spotlight-details-col" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            background: '#FFFFFF',
                            boxSizing: 'border-box'
                          }}>
                            <div>
                              {/* Category Breadcrumb */}
                              <div style={{ marginBottom: '4px' }}>
                                <span style={{
                                  fontSize: '10.5px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.14em',
                                  color: '#9E7437',
                                  fontWeight: '800'
                                }}>
                                  {modalCategoryName.toUpperCase()}
                                </span>
                              </div>

                              {/* Service Title */}
                              <h2 style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '22px',
                                color: '#2B231D',
                                lineHeight: 1.2,
                                margin: '0 0 8px 0',
                                fontWeight: '700'
                              }}>
                                {(servName || '').trim() || 'Underarms Laser'}
                              </h2>

                              {/* Badges / Specs Pill Row */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  background: '#FAF6EE',
                                  color: '#785A35',
                                  border: '1px solid #EADBCC',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Clock size={11} color="#9E7437" />
                                  {servDuration || 20} Mins Session
                                </span>

                                {servHasSessions && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '3px 9px',
                                    borderRadius: '8px',
                                    background: 'rgba(184, 139, 74, 0.15)',
                                    color: '#B88B4A',
                                    border: '1px solid rgba(184, 139, 74, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <Repeat size={11} color="#B88B4A" />
                                    {servTotalSessions} Sessions Plan ({servSessionInterval} {servSessionIntervalUnit})
                                  </span>
                                )}

                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  background: '#FAF6EE',
                                  color: '#785A35',
                                  border: '1px solid #EADBCC',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Zap size={11} color="#9E7437" />
                                  {servDowntime || 'Zero Downtime'}
                                </span>

                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  background: '#FAF6EE',
                                  color: '#785A35',
                                  border: '1px solid #EADBCC',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Sparkles size={11} color="#9E7437" />
                                  {servTag || 'Quick & Effective'}
                                </span>
                              </div>

                              {/* Subtitle Under Pills */}
                              <div style={{
                                fontSize: '12px',
                                color: '#78716C',
                                margin: '4px 0 10px 0',
                                fontWeight: '500'
                              }}>
                                {(servSubtitle || '').trim() || 'Quick & effective'}
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
                                {/* Botanical Leaf Watermark SVG */}
                                <div style={{
                                  position: 'absolute',
                                  right: '10px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  opacity: 0.35,
                                  pointerEvents: 'none'
                                }}>
                                  <svg width="34" height="42" viewBox="0 0 60 75" fill="none" stroke="#CBB18E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M30 70 C30 50 30 25 30 10" />
                                    <path d="M30 55 C20 48 12 50 10 40 C18 38 26 44 30 48" />
                                    <path d="M30 42 C40 35 48 37 50 27 C42 25 34 31 30 35" />
                                    <path d="M30 28 C22 22 16 25 15 17 C22 15 28 20 30 23" />
                                    <path d="M30 15 C38 10 42 12 43 6 C37 5 32 9 30 12" />
                                  </svg>
                                </div>

                                <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#785A35', marginBottom: '6px' }}>
                                  Clinical Highlights & Benefits
                                </div>

                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {servHighlights.filter(Boolean).map((h, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '11.5px', color: '#44403C', lineHeight: 1.35 }}>
                                      <span style={{ color: '#9E7437', fontWeight: '800', fontSize: '11px', lineHeight: 1.2 }}>✓</span>
                                      <span>{h}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Price & Select Service Button matching Visitor Reference */}
                            <div style={{
                              paddingTop: '12px',
                              borderTop: '1px solid #F0EAE1',
                              marginTop: 'auto'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                                <span style={{
                                  fontSize: '28px',
                                  fontFamily: 'var(--font-sans)',
                                  fontWeight: '500',
                                  color: '#8A6D3B',
                                  lineHeight: 1,
                                  letterSpacing: '0.01em'
                                }}>
                                  ₹ {servPrice ? Number(servPrice).toLocaleString('en-IN') : '1,200'}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  color: '#B35E44',
                                  background: '#FAF0EB',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600'
                                }}>
                                  (plus taxes)
                                </span>
                              </div>

                              <button
                                type="button"
                                style={{
                                  padding: '11px 34px',
                                  borderRadius: '9999px',
                                  background: '#BA8758',
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
                                  justifyContent: 'center'
                                }}
                              >
                                SELECT SERVICE
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      )}
                      <div style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        lineHeight: '1.45',
                        textAlign: 'center',
                        background: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-light)'
                      }}>
                        ✨ <strong>Interactive Mirror:</strong> Any changes to Title, Pricing, Timing, Badges, Highlights, or Media will immediately reflect in this preview and in the client catalog.
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    flexShrink: 0
                  }}>
                    <button
                      type="button"
                      onClick={() => setServiceModal({ open: false, mode: 'create', categoryId: null, data: null })}
                      className="btn-secondary"
                      style={{ padding: '9px 18px', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '9px 24px', fontSize: '13px' }}
                    >
                      {serviceModal.mode === 'create' ? 'Save & Publish Treatment' : 'Save Treatment Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
