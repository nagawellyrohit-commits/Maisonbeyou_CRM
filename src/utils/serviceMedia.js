// src/utils/serviceMedia.js
// Curated aesthetic imagery, video previews, clinical specs, and highlights for Maison BeYou services

const MEDIA_CATALOG = {
  // Laser Hair Reduction
  'half legs laser': {
    image: '/services/thumb_half_legs.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Chilled Diode Contact',
    tag: 'Smooth Calves & Shins',
    subtitle: 'Calves or thighs',
    highlights: [
      'Targeted lower legs or upper thigh zone',
      'Gentle on sensitive skin with cold protection',
      'Noticeably softer and sparser regrowth'
    ]
  },
  'full legs laser': {
    image: '/services/thumb_full_legs.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'In-Motion Rapid Scanner',
    tag: 'Full Leg Silky Perfection',
    subtitle: 'Complete leg area',
    highlights: [
      'Thighs, knees, calves, and feet comprehensive sweep',
      'Eliminates strawberry skin and razor irritation',
      'High-speed chilled scanner for uniform coverage'
    ]
  },
  'underarms laser': {
    image: '/services/thumb_underarms.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Diode 808nm Triple Wave',
    tag: 'Quick & Effective',
    subtitle: 'Quick & effective',
    highlights: [
      'Advanced cooling sapphire tip for painless comfort',
      'Targeted elimination of coarse hair & ingrown roots',
      'Express 15–20 minute session; zero recovery time'
    ]
  },
  'back & shoulders': {
    image: '/services/thumb_back_shoulders.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Deep Penetration Diode',
    tag: 'For Smoother Skin',
    subtitle: 'For smoother skin',
    highlights: [
      'Wide-spot applicator for efficient full-back coverage',
      'Effectively targets dense, stubborn root follicles',
      'Prevents workout-induced folliculitis and sweat bumps'
    ]
  },
  'face laser': {
    image: '/services/thumb_face.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Precision Facial Diode',
    tag: 'Upper Lip & Chin',
    subtitle: 'Upper lip, chin & sideburns',
    highlights: [
      'Gentle precision targeting for sensitive facial areas',
      'Reduces dark shadow and peach fuzz effortlessly',
      'Promotes refined, luminous skin texture'
    ]
  },
  'bikini line laser': {
    image: '/services/thumb_bikini.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Medical Chilled Diode',
    tag: 'Hygienic & Long-Lasting',
    subtitle: 'Hygienic & long-lasting',
    highlights: [
      'Clean, comfortable bikini contour definition',
      'Stops painful ingrown hairs and bumps permanently',
      'Conducted with highest clinical privacy standards'
    ]
  },
  'bikini laser': {
    image: '/services/thumb_bikini.jpg',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Medical Chilled Diode',
    tag: 'Hygienic & Long-Lasting',
    subtitle: 'Hygienic & long-lasting',
    highlights: [
      'Clean, comfortable bikini contour definition',
      'Stops painful ingrown hairs and bumps permanently',
      'Conducted with highest clinical privacy standards'
    ]
  },
  'full arms laser': {
    image: 'https://images.unsplash.com/photo-1512290903672-0056637b51e0?w=800&auto=format&fit=crop&q=80',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Diode & Alexandrite Blend',
    tag: 'Complete Arm Elegance',
    subtitle: 'Full length from shoulder to wrist',
    highlights: [
      'Full coverage from shoulders down to fingertips',
      'Smoothes skin texture and clears dark follicle shadows',
      'Safe and effective on all Indian skin tones'
    ]
  },
  'half arms laser': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Precision Diode Protocol',
    tag: 'Targeted Comfort',
    subtitle: 'Forearm or upper arm zone',
    highlights: [
      'Targeted upper or lower forearm reduction',
      'Chilled glide applicator prevents surface redness',
      'Permanent follicle reduction within 4–6 visits'
    ]
  },
  'full body laser': {
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'VIP Full-Body Suite Protocol',
    tag: 'Ultimate Luxury Transformation',
    subtitle: 'Head-to-toe comprehensive care',
    highlights: [
      'Comprehensive head-to-toe laser package in one visit',
      'Dual wavelength optimization tailored to each body zone',
      'Long-lasting baby-soft skin with permanent follicle clearance'
    ]
  },
  'chest & stomach': {
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Chilled Glide Diode',
    tag: 'Torso Contour Clean',
    subtitle: 'Chest and abdominal zone',
    highlights: [
      'Contoured reduction of chest and abdominal hair',
      'Even energy delivery prevents patchy regrowth',
      'Painless thermal management on delicate skin'
    ]
  },
  'feet & toes': {
    image: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&auto=format&fit=crop&q=80',
    heroImage: '/services/laser_hero.jpg',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Micro-Tip Precision',
    tag: 'Delicate Detail',
    subtitle: 'Instep and toe contours',
    highlights: [
      'Specialized micro-spot tip for digits and arches',
      'Quick 10-minute treatment add-on',
      'Polished, clean aesthetic for open footwear'
    ]
  },

  // Facials & Medi-Facials
  'beu hydration facial': {
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Immediate Glow',
    protocol: 'Hyaluronic Acid & Cryo Cold Hammer',
    tag: 'Glass Skin Radiance',
    highlights: [
      'Multi-molecular Hyaluronic Acid dermal infusion',
      'Cryo cold hammer seals pores and locks moisture',
      'Restores skin dewiness and barrier strength for 72+ hours'
    ]
  },
  'beu clear skin therapy': {
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Ultrasonic Extraction + Blue LED',
    tag: 'Blemish Clearance',
    highlights: [
      'Deeply cleanses and purifies congested skin',
      'Helps control excess oil and sebum',
      'Targets acne and recurring breakouts',
      'Calms inflammation and visible redness',
      'Unclogs pores and removes impurities',
      'Promotes a clearer, healthier complexion'
    ]
  },
  '24k gold radiance facial': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Event Ready',
    protocol: '24K Gold Leaf & Lymphatic Drainage',
    tag: 'Red-Carpet Luxury',
    highlights: [
      'Pure 24K biological gold leaf compression ritual',
      'Firming lymphatic drainage face & neck contour massage',
      'Illuminates complexion with unmistakable warm radiance'
    ]
  },
  'oxygeneo super facial': {
    image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: '3-in-1 Oxygenation & Bohr Effect',
    tag: 'Cellular Renewal',
    highlights: [
      'Triggers the Bohr Effect for deep internal oxygenation',
      'Gentle non-abrasive exfoliation clears dull surface cells',
      'Deep active nutrient ultrasound serum penetration'
    ]
  },
  'carbon laser hollywood peel': {
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Instant Radiance',
    protocol: 'Q-Switched Nd:YAG Laser & Liquid Carbon',
    tag: 'Hollywood Porcelain Glow',
    highlights: [
      'Liquid carbon mask binds directly into congested pores',
      'Precision laser vaporizes carbon, shrinking pore diameter',
      'Immediate porcelain matte finish loved by celebrities'
    ]
  },
  'vitamin c brightening facial': {
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Stabilized L-Ascorbic Infusion',
    tag: 'Brightening Powerhouse',
    highlights: [
      'High-potency 20% stabilized Vitamin C antioxidant booster',
      'Visibly reduces sun spots, tanning, and hyperpigmentation',
      'Recharges cellular elasticity and defends against UV damage'
    ]
  },

  // Skin Aesthetics & Peels
  'salicylic acne peel': {
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: '1–2 Days Mild Flaking',
    protocol: 'Beta-Hydroxy Acid 20%',
    tag: 'Clarifying Treatment',
    highlights: [
      'Lipophilic salicylic acid penetrates deep into sebaceous glands',
      'Dissolves trapped comedones and calms inflamed breakouts',
      'Refines oily texture and reduces post-acne blemishes'
    ]
  },
  'glycolic rejuvenation peel': {
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Mild 24h Care',
    protocol: 'AHA Sugar Cane Peeling 35%',
    tag: 'Texture Smoothing',
    highlights: [
      'Micro-molecular AHA accelerates cellular regeneration',
      'Softens fine surface lines and evens rough texture',
      'Reveals remarkably silky, fresh baby skin beneath'
    ]
  },
  'dermapen microneedling': {
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: '24–48 Hours',
    protocol: 'Medical Dermapen 4 + HA Matrix',
    tag: 'Collagen Induction',
    highlights: [
      'Thousands of micro-channels trigger neocollagenesis',
      'Visibly softens acne scars, ice-pick marks, and pores',
      'Combines with pure hyaluronic acid for deep dermal plump'
    ]
  },
  'glutathione glow infusion': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Master Antioxidant Meso-Infusion',
    tag: 'Ultimate Luminosity',
    highlights: [
      'Inhibits tyrosinase for overall tone evening and brightness',
      'Potent cellular detox neutralizes oxidative stress',
      'Produces a healthy, youthful, naturally illuminated glow'
    ]
  },
  'vampire facial prp': {
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: '24–36 Hours',
    protocol: 'Autologous PRP + Micro-Channeling',
    tag: 'Cellular Regeneration',
    highlights: [
      'Enriched growth factors harvested from client’s own plasma',
      'Stimulates fibroblasts, elastic fibers, and vascular renewal',
      'Gold standard in holistic cellular anti-aging rejuvenation'
    ]
  },
  'pigmentation correction peel': {
    image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: '2 Days Flaking',
    protocol: 'Mandelic-Lactic Complex + Kojic',
    tag: 'Melasma Eraser',
    highlights: [
      'Gentle large-molecule acids safe for high-melanin skin',
      'Selectively breaks down hyperpigmented sun spots',
      'Restores balanced, uniform skin tone without rebound hyperpigmentation'
    ]
  },

  // Body Sculpting & Contouring
  'cryolipolysis fat freeze (1 area)': {
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Controlled Cryo Cooling -9°C',
    tag: 'Targeted Fat Reduction',
    highlights: [
      'Clinically freezes stubborn subcutaneous fat cells without surgery',
      'Eliminated cells flush out naturally through the lymphatic system',
      'Up to 20–25% localized fat layer reduction per treated zone'
    ]
  },
  'ems high-intensity muscle sculpt': {
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'High-Intensity Focused Electromagnetic',
    tag: 'Muscle Tone & Lift',
    highlights: [
      'Induces 20,000 supramaximal muscle contractions in 30 minutes',
      'Builds deep abdominal core definition and firms glutes',
      'Burns visceral calories while toning core muscle fibers'
    ]
  },
  'cellulite reduction therapy': {
    image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Multipolar RF + Vacuum Suction',
    tag: 'Smooth & Firm',
    highlights: [
      'Radiofrequency heats subdermal collagen bands',
      'Breaks down stubborn fibrous cellulite dimpling',
      'Leaves thighs and buttocks noticeably firmer and smoother'
    ]
  },
  'lymphatic drainage contouring': {
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Pneumatic Pressotherapy System',
    tag: 'Full Body Detox',
    highlights: [
      'Sequential wave compression boots accelerate venous return',
      'Relieves heavy legs, water retention, and post-flight swelling',
      'Boosts systemic immune drainage and leaves body feeling feather-light'
    ]
  },

  // Hair & Scalp Therapy
  'maison luxury hair spa': {
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Instant Silk Finish',
    protocol: 'Botanical Steam Infusion & Acupressure',
    tag: 'Restorative Hair Sanctuary',
    highlights: [
      'Nutritive lipid hair cuticle conditioning mask',
      'Warm ultrasonic micro-mist steam opens follicle pores',
      'Deep acupressure scalp massage relieves stress and improves flow'
    ]
  },
  'scalp detox & micro-exfoliation': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Salicylic Scalp Peel + High Frequency',
    tag: 'Root Purification',
    highlights: [
      'Gently dissolves product buildup, sebum plugs, and dead flakes',
      'High-frequency ozone wand stimulates dormant hair roots',
      'Balances scalp microbiome for healthy, oxygenated hair growth'
    ]
  },
  'hair prp growth therapy': {
    image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: '24 Hours Gentle Care',
    protocol: 'Platelet-Rich Plasma Micro-Injections',
    tag: 'Density Revival',
    highlights: [
      'Concentrated autologous growth factors injected into thinning zones',
      'Re-energizes miniaturized follicles and halts telogen shedding',
      'Clinically proven to boost hair shaft thickness and density'
    ]
  },
  'keratin & moisture infusion': {
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Immediate Results',
    protocol: 'Hydrolyzed Keratin Thermal Seal',
    tag: 'Frizz-Free Glass Hair',
    highlights: [
      'Infuses essential keratin protein into porous damaged strands',
      'Locks in mirror-like shine and protects from environmental humidity',
      'Tames frizz without harsh formaldehydes or flattening natural volume'
    ]
  },
  'anti-dandruff scalp clarifying': {
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Antifungal Botanical Scrub & Peppermint Tonic',
    tag: 'Instant Flake Relief',
    highlights: [
      'Targeted zinc pyrithione and tea tree clarifying scrub',
      'Calms persistent itchiness and regulates fungal overgrowth',
      'Leaves scalp refreshed, cool, and flake-free from day one'
    ]
  },

  // Brows & Semi-Permanent
  'microblading feather brows': {
    image: 'https://images.unsplash.com/photo-1583001809873-a128495da465?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: '5–7 Days Healing Care',
    protocol: 'Nano-Blade Hair-Stroke Emulation',
    tag: 'Hyper-Realistic Brows',
    highlights: [
      'Ultra-fine manual hair strokes tailored to facial bone structure',
      'Hypoallergenic mineral pigments matched to natural hair color',
      'Creates fuller, natural brows that stay perfect for 12–18 months'
    ]
  },
  'ombre powder brows': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: '5 Days Soft Healing',
    protocol: 'Digital Rotary Shading Machine',
    tag: 'Soft Powder Gradient',
    highlights: [
      'Delicate misty airbrushed makeup powder gradient finish',
      'Lighter at the bulb, softly deepening toward the tail arch',
      'Ideal for oily and combination skin types seeking defined elegance'
    ]
  },
  'velvet lip blush tint': {
    image: 'https://images.unsplash.com/photo-1512290903672-0056637b51e0?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: '3–4 Days Gentle Care',
    protocol: 'Aquarelle Lip Shading & Neutralization',
    tag: 'Lush Lip Contour',
    highlights: [
      'Imparts a natural youthful flush and symmetrical border definition',
      'Corrects cool or dark lip tones with specialized pigment blending',
      'Smudge-proof, waterproof tinted elegance lasting up to 2 years'
    ]
  },
  'keratin lash lift & tint': {
    image: 'https://images.unsplash.com/photo-1583001809873-a128495da465?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Keratin Perm Rod + Deep Noir Dye',
    tag: 'Wide-Eyed Doll Effect',
    highlights: [
      'Gently lifts natural lashes from the root for maximum open length',
      'Deep noir tinting gives the appearance of designer mascara',
      'Zero maintenance, swim-proof and mascara-free for 6–8 weeks'
    ]
  },
  'brow lamination & tint': {
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Keratin Permeation & Hybrid Tint',
    tag: 'Fluffy Runway Brow',
    highlights: [
      'Re-aligns brow hairs upward for a full, feathered, sculpted look',
      'Tames unruly or downward-growing brow strands into sleek symmetry',
      'Includes custom color stain to define the arch and fill sparse gaps'
    ]
  },
  'bb glow meso foundation': {
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Meso-Nano Infusion + Mineral Pigments',
    tag: 'Semi-Permanent Foundation',
    highlights: [
      'Micro-infuses peptide serums with organic mineral foundation pigments',
      'Evens out skin tone, covers mild redness, and illuminates complexion',
      'Provides a natural semi-matte tinted glow without clogging pores'
    ]
  }
};

// Category level fallback details
const CATEGORY_DEFAULTS = {
  'laser hair reduction': {
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Diode Triple-Wavelength 808nm',
    tag: 'Precision Laser Care',
    highlights: [
      'Painless sapphire cooling contact for maximum comfort',
      'Safe and effective on all Indian skin tones',
      'Permanent reduction of unwanted hair and ingrowns'
    ]
  },
  'facials & medi-facials': {
    image: 'https://images.unsplash.com/photo-1512290903672-0056637b51e0?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Instant Radiance',
    protocol: 'Clinical Derm Medi-Facial',
    tag: 'Cellular Glass Glow',
    highlights: [
      'Deep ultrasonic pore vacuum extraction',
      'Clinical-grade antioxidant and hyaluronic acid infusion',
      'Leaves skin dewy, smooth, and event-ready'
    ]
  },
  'skin aesthetics & peels': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: '1–2 Days Flaking',
    protocol: 'Dermatological Resurfacing',
    tag: 'Skin Resurfacing',
    highlights: [
      'Accelerates cellular turnover and clears dead skin layers',
      'Stimulates collagen production to soften fine lines and scars',
      'Restores balanced, uniform clarity and luminous glow'
    ]
  },
  'body sculpting & contouring': {
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Targeted Non-Invasive Body Suite',
    tag: 'Contour & Firm',
    highlights: [
      'Clinically targets localized stubborn fat and tone muscle',
      'Accelerates lymphatic drainage and tightens loose skin',
      'No incisions, no pain, and no recovery downtime'
    ]
  },
  'hair & scalp therapy': {
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    downtime: 'Zero Downtime',
    protocol: 'Trichology Scalp Ritual',
    tag: 'Follicle Therapy',
    highlights: [
      'Deep steam therapy and botanical cuticle repair',
      'Purifies scalp pores from product buildup and excess sebum',
      'Nourishes hair roots to stimulate healthy, denser growth'
    ]
  },
  'brows & semi-permanent': {
    image: 'https://images.unsplash.com/photo-1583001809873-a128495da465?w=800&auto=format&fit=crop&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    downtime: '3–5 Days Healing Care',
    protocol: 'Cosmetic Micro-Pigmentation',
    tag: 'Precision Artistry',
    highlights: [
      'Precision hair-stroke emulation tailored to facial symmetry',
      'Natural mineral pigments matched to skin and hair tones',
      'Long-lasting waterproof beauty that saves daily makeup time'
    ]
  }
};

const CATEGORY_GALLERIES = {
  'laser hair reduction': [
    '/services/laser_hero.jpg',
    '/services/thumb_underarms.jpg',
    '/services/thumb_half_legs.jpg',
    '/services/thumb_back_shoulders.jpg'
  ],
  'facials & medi-facials': [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80'
  ],
  'skin aesthetics & peels': [
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80'
  ],
  'body sculpting & contouring': [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80'
  ],
  'hair & scalp therapy': [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80'
  ],
  'brows & semi-permanent': [
    'https://images.unsplash.com/photo-1583001809873-a128495da465?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
  ]
};

export function getServiceMedia(service, categoryName = '') {
  const cKey = (categoryName || '').toLowerCase().trim();

  const resolveGallery = (val) => {
    if (val.gallery && Array.isArray(val.gallery) && val.gallery.length === 4) {
      return val.gallery;
    }
    const catG = CATEGORY_GALLERIES[cKey] || CATEGORY_GALLERIES['laser hair reduction'];
    const candidates = [val.image, val.heroImage, ...catG].filter(Boolean);
    const unique = Array.from(new Set(candidates));
    while (unique.length < 4) {
      unique.push(catG[unique.length % catG.length]);
    }
    return unique.slice(0, 4);
  };

  // Determine base catalog match
  let base = null;
  const sKey = (service?.service_name || '').toLowerCase().trim();

  if (sKey && MEDIA_CATALOG[sKey]) {
    base = MEDIA_CATALOG[sKey];
  } else if (sKey) {
    for (const [key, val] of Object.entries(MEDIA_CATALOG)) {
      if (sKey.includes(key) || key.includes(sKey)) {
        base = val;
        break;
      }
    }
  }

  if (!base && CATEGORY_DEFAULTS[cKey]) {
    base = CATEGORY_DEFAULTS[cKey];
  } else if (!base && cKey) {
    for (const [key, val] of Object.entries(CATEGORY_DEFAULTS)) {
      if (cKey.includes(key) || key.includes(cKey)) {
        base = val;
        break;
      }
    }
  }

  if (!base) {
    base = {
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
      video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      downtime: 'Zero Downtime',
      protocol: 'Clinical Aesthetic Protocol',
      tag: 'Studio Treatment',
      subtitle: 'Clinical aesthetic protocol',
      highlights: [
        'Tailored consultation & assessment prior to session',
        'Clinical aesthetic protocol with maximum comfort',
        'Immediate post-treatment care and guidance'
      ]
    };
  }

  // Parse custom highlights if provided
  let customHighlights = null;
  if (service?.highlights) {
    if (Array.isArray(service.highlights)) {
      customHighlights = service.highlights.filter(Boolean);
    } else if (typeof service.highlights === 'string') {
      try {
        const parsed = JSON.parse(service.highlights);
        if (Array.isArray(parsed)) customHighlights = parsed.filter(Boolean);
      } catch (e) {
        customHighlights = service.highlights.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  // Parse custom gallery if provided
  let customGallery = null;
  if (service?.gallery) {
    if (Array.isArray(service.gallery)) {
      customGallery = service.gallery.filter(Boolean);
    } else if (typeof service.gallery === 'string') {
      try {
        const parsed = JSON.parse(service.gallery);
        if (Array.isArray(parsed)) customGallery = parsed.filter(Boolean);
      } catch (e) {
        customGallery = service.gallery.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  const baseGallery = resolveGallery(base);
  let resolvedTag = service?.tag !== undefined && service?.tag !== null ? service.tag : (base.tag || 'Quick & Effective');
  let resolvedVspBadges = [];
  if (typeof resolvedTag === 'string' && resolvedTag.trim().startsWith('{')) {
    try {
      const parsedTagObj = JSON.parse(resolvedTag);
      if (parsedTagObj && typeof parsedTagObj === 'object') {
        resolvedTag = parsedTagObj.tag !== undefined ? parsedTagObj.tag : (base.tag || 'Quick & Effective');
        if (Array.isArray(parsedTagObj.vsp_badges)) {
          resolvedVspBadges = parsedTagObj.vsp_badges.map(b => String(b || '').trim()).filter(Boolean);
        }
      }
    } catch (e) {}
  }
  if (service?.vsp_badges) {
    if (Array.isArray(service.vsp_badges)) {
      resolvedVspBadges = service.vsp_badges.map(b => String(b || '').trim()).filter(Boolean);
    } else if (typeof service.vsp_badges === 'string') {
      try {
        const parsedVsp = JSON.parse(service.vsp_badges);
        if (Array.isArray(parsedVsp)) {
          resolvedVspBadges = parsedVsp.map(b => String(b || '').trim()).filter(Boolean);
        }
      } catch (e) {
        resolvedVspBadges = service.vsp_badges.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  const finalGallery = (customGallery && customGallery.length > 0)
    ? [...customGallery, ...baseGallery].slice(0, 4)
    : baseGallery;

  return {
    ...base,
    video: service?.video_url || service?.video || base.video,
    image: service?.image_url || service?.image || base.image,
    heroImage: service?.image_url || service?.heroImage || base.heroImage,
    downtime: service?.downtime || base.downtime || 'Zero Downtime',
    tag: resolvedTag,
    vspBadges: resolvedVspBadges,
    subtitle: service?.subtitle || service?.description || base.subtitle || 'Quick & effective',
    highlights: (customHighlights && customHighlights.length > 0) ? customHighlights : base.highlights,
    gallery: finalGallery
  };
}
