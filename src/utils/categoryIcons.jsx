import React from 'react';
import {
  Sparkles,
  Smile,
  Feather,
  Flame,
  Crown,
  Eye,
  Heart,
  Droplet,
  Award,
  Scissors,
  ShieldCheck,
  Zap,
  Layers,
  Sun,
  Star
} from 'lucide-react';

export const CATEGORY_ICONS = [
  { id: 'Sparkles', name: 'Sparkles', desc: 'Laser & Radiance', Icon: Sparkles },
  { id: 'Smile', name: 'Smile', desc: 'Facials & Glow', Icon: Smile },
  { id: 'Feather', name: 'Feather', desc: 'Peels & Resurfacing', Icon: Feather },
  { id: 'Flame', name: 'Flame', desc: 'Contour & Energy', Icon: Flame },
  { id: 'Crown', name: 'Crown', desc: 'VIP & Signature Care', Icon: Crown },
  { id: 'Eye', name: 'Eye', desc: 'Eyes, Brows & Lashes', Icon: Eye },
  { id: 'Heart', name: 'Heart', desc: 'Wellness & Care', Icon: Heart },
  { id: 'Droplet', name: 'Droplet', desc: 'Hydra & Infusions', Icon: Droplet },
  { id: 'Award', name: 'Award', desc: 'Clinical Excellence', Icon: Award },
  { id: 'Scissors', name: 'Scissors', desc: 'Hair & Styling', Icon: Scissors },
  { id: 'ShieldCheck', name: 'Shield', desc: 'Clinical Safety', Icon: ShieldCheck },
  { id: 'Zap', name: 'Zap', desc: 'High-Tech Precision', Icon: Zap },
  { id: 'Layers', name: 'Layers', desc: 'Sculpting & Body', Icon: Layers },
  { id: 'Sun', name: 'Sun', desc: 'Brightening Therapy', Icon: Sun },
  { id: 'Star', name: 'Star', desc: 'Luxury Specials', Icon: Star }
];

export const renderCategoryIcon = (iconName, size = 22, color = undefined) => {
  const found = CATEGORY_ICONS.find(i => i.id === iconName);
  const IconComponent = found ? found.Icon : Sparkles;
  return <IconComponent size={size} color={color} />;
};

export const CATEGORY_IMAGE_PRESETS = [
  {
    id: 'signature_facials',
    name: 'Signature Facials',
    num: '01',
    url: '/services/categories/cat_01_signature_facials.png?v=44',
    tag: 'Visitor Card 01'
  },
  {
    id: 'skin_treatments',
    name: 'Skin Treatments',
    num: '02',
    url: '/services/categories/cat_02_skin_treatments.png?v=42',
    tag: 'Visitor Card 02'
  },
  {
    id: 'laser_treatments',
    name: 'Laser Treatments',
    num: '03',
    url: '/services/categories/cat_03_laser_treatments.png',
    tag: 'Visitor Card 03'
  },
  {
    id: 'hair_rituals',
    name: 'Hair Rituals',
    num: '04',
    url: '/services/categories/cat_04_hair_rituals.png',
    tag: 'Visitor Card 04'
  },
  {
    id: 'body_sculpting',
    name: 'Body Sculpting',
    num: '05',
    url: '/services/categories/cat_05_body_sculpting.png?v=2',
    tag: 'Visitor Card 05'
  },
  {
    id: 'salon_services',
    name: 'Salon Services',
    num: '06',
    url: '/services/categories/cat_06_salon_services.png?v=3',
    tag: 'Visitor Card 06'
  },
  {
    id: 'laser_precision',
    name: 'Laser Precision',
    num: '07',
    url: '/services/thumb_underarms.jpg',
    tag: 'Clinical Aesthetic'
  },
  {
    id: 'glow_rejuvenation',
    name: 'Glow Rejuvenation',
    num: '08',
    url: '/services/laser_hero.jpg',
    tag: 'Laser Glow'
  },
  {
    id: 'nails_hand_couture',
    name: 'Nails & Hands',
    num: '09',
    url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80',
    tag: 'Manicure & Art'
  },
  {
    id: 'brows_lashes',
    name: 'Brows & Lashes',
    num: '10',
    url: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=800&auto=format&fit=crop&q=80',
    tag: 'Eye Architecture'
  },
  {
    id: 'spa_wellness',
    name: 'Holistic Spa',
    num: '11',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
    tag: 'Therapeutic Spa'
  },
  {
    id: 'dermal_aesthetics',
    name: 'Dermal Aesthetics',
    num: '12',
    url: 'https://images.unsplash.com/photo-1512290903671-17adc8104b5b?w=800&auto=format&fit=crop&q=80',
    tag: 'Advanced Care'
  }
];
