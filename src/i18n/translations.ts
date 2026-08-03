export type LangCode = 'en' | 'tr' | 'fr' | 'ar' | 'de' | 'ru';

export interface ServiceCopy {
  name: string;
  description: string;
}

/** A labelled set of preset answers rendered as selectable chips. */
export interface ChoiceGroup {
  label: string;
  options: string[];
}

export interface ContactCopy {
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
  optional: string;
  multiHint: string;
  /** Intro above the direct e-mail address. */
  mailLabel: string;
  /** Intro above the social profile buttons. */
  socialLabel: string;
  /** Options for this one come from `services.items`, so they stay in sync. */
  servicesLabel: string;
  deliverables: ChoiceGroup;
  budget: ChoiceGroup;
  timeline: ChoiceGroup;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  successTitle: string;
  successBody: string;
  errorText: string;
  close: string;
}

export interface Translation {
  /** BCP-47 tag written to <html lang>. Drives locale-aware text-transform. */
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  nav: { about: string; price: string; projects: string; contact: string };
  /**
   * Optical size correction for the headline. Arabic glyphs are far taller
   * than Latin ones at the same font-size, so the script needs its own factor
   * to avoid overrunning the navbar and the portrait.
   */
  heroScale?: number;
  hero: { title: string; tagline: string };
  buttons: { contact: string; liveProject: string };
  about: { title: string; body: string };
  services: { title: string; items: ServiceCopy[] };
  projects: { title: string };
  contact: ContactCopy;
}

export const LANGUAGES: { code: LangCode; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'tr', label: 'Türkçe', short: 'TR' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'ru', label: 'Русский', short: 'RU' },
];

export const DEFAULT_LANG: LangCode = 'en';

export const translations: Record<LangCode, Translation> = {
  en: {
    htmlLang: 'en',
    dir: 'ltr',
    nav: { about: 'About', price: 'Price', projects: 'Projects', contact: 'Contact' },
    hero: {
      title: "Hi, i'm ipek",
      tagline: 'a 3d creator driven by crafting striking and unforgettable projects',
    },
    buttons: { contact: 'Contact Me', liveProject: 'Live Project' },
    about: {
      title: 'About me',
      body: 'With a passion for 3D design, Unreal Engine environments, architectural visualization, and game development, I create immersive worlds and visually engaging experiences that combine creativity, functionality, and attention to detail. I enjoy transforming ideas into detailed environments, game ready scenes, and presentation quality visuals. Let’s bring your vision to life and create something remarkable together!',
    },
    services: {
      title: 'Services',
      items: [
        {
          name: 'Unreal Engine Environment Design',
          description:
            'Creation of immersive, detailed, and performance-conscious environments for games, simulations, presentations, and interactive experiences.',
        },
        {
          name: 'Game Development',
          description:
            'Development of gameplay systems, mechanics, interactions, and prototypes using Unreal Engine Blueprints, with a focus on functionality and player experience.',
        },
        {
          name: 'Architectural Visualization',
          description:
            'High-quality interior and exterior visualizations that present architectural concepts through realistic lighting, materials, composition, and atmosphere.',
        },
        {
          name: '3D Modeling & Visualization',
          description:
            'Creation and presentation of custom 3D assets, objects, environments, and architectural elements tailored to the visual and technical needs of each project.',
        },
        {
          name: 'Level Design & World Building',
          description:
            'Design of engaging levels, structured environments, and believable digital worlds that combine visual storytelling, gameplay flow, and functional space planning.',
        },
        {
          name: 'Interior & Exterior Scene Creation',
          description:
            'Development of detailed interior and exterior scenes for architectural projects, real estate presentations, virtual experiences, and promotional content.',
        },
        {
          name: 'Game Design & Documentation',
          description:
            'Creation of game concepts, mechanics, level ideas, system descriptions, and clear documentation that helps transform an initial idea into a structured project.',
        },
        {
          name: 'Presentation Visuals & Graphic Design',
          description:
            'Production of presentation-ready renders, concept visuals, layouts, and graphic design materials using Adobe Photoshop and Illustrator.',
        },
      ],
    },
    projects: { title: 'Project' },
    contact: {
      title: "Let's work together",
      subtitle: 'A few quick questions so I can send you an accurate quote.',
      nameLabel: 'Your name',
      namePlaceholder: 'Jane Doe',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      companyLabel: 'Company / studio',
      companyPlaceholder: 'Studio name',
      optional: 'optional',
      multiHint: 'select all that apply',
      mailLabel: 'Mail me at',
      socialLabel: 'Or find me on',
      servicesLabel: 'What do you need?',
      deliverables: {
        label: 'Expected deliverables',
        options: [
          'Still renders / images',
          'Animation / video',
          'Game-ready files (FBX, UE project)',
          'Interactive / real-time build',
          'Not sure yet',
        ],
      },
      budget: {
        label: 'Budget range (USD)',
        options: ['< $500', '$500 – $1,500', '$1,500 – $5,000', '$5,000+', 'Not sure yet'],
      },
      timeline: {
        label: 'Timeline',
        options: ['ASAP (1–2 weeks)', 'Within 1 month', '1–3 months', 'Flexible'],
      },
      messageLabel: 'Tell me about the project',
      messagePlaceholder:
        'Scope, visual references, engine / software, target platform…',
      submit: 'Send request',
      sending: 'Sending…',
      successTitle: 'Request received!',
      successBody: "Thank you — I'll get back to you by email within 1–2 business days.",
      errorText: 'Something went wrong. Please try again in a moment.',
      close: 'Close',
    },
  },

  tr: {
    htmlLang: 'tr',
    dir: 'ltr',
    nav: { about: 'Hakkımda', price: 'Fiyat', projects: 'Projeler', contact: 'İletişim' },
    hero: {
      title: 'Merhaba, ben ipek',
      tagline: 'çarpıcı ve unutulmaz projeler üreten bir 3d tasarımcı',
    },
    buttons: { contact: 'İletişime Geç', liveProject: 'Projeyi Gör' },
    about: {
      title: 'Hakkımda',
      body: '3D tasarım, Unreal Engine ortamları, mimari görselleştirme ve oyun geliştirmeye olan tutkumla; yaratıcılığı, işlevselliği ve detaya gösterilen özeni bir araya getiren sürükleyici dünyalar ve görsel açıdan etkileyici deneyimler yaratıyorum. Fikirleri detaylı ortamlara, oyuna hazır sahnelere ve sunum kalitesinde görsellere dönüştürmekten keyif alıyorum. Vizyonunuzu hayata geçirelim ve birlikte kayda değer bir şey yaratalım!',
    },
    services: {
      title: 'Hizmetler',
      items: [
        {
          name: 'Unreal Engine Ortam Tasarımı',
          description:
            'Oyunlar, simülasyonlar, sunumlar ve etkileşimli deneyimler için sürükleyici, detaylı ve performans odaklı ortamlar oluşturma.',
        },
        {
          name: 'Oyun Geliştirme',
          description:
            'Unreal Engine Blueprint ile oynanış sistemleri, mekanikler, etkileşimler ve prototipler geliştirme; işlevsellik ve oyuncu deneyimine odaklanma.',
        },
        {
          name: 'Mimari Görselleştirme',
          description:
            'Mimari konseptleri gerçekçi ışık, materyal, kompozisyon ve atmosferle sunan yüksek kaliteli iç ve dış mekân görselleştirmeleri.',
        },
        {
          name: '3D Modelleme ve Görselleştirme',
          description:
            'Her projenin görsel ve teknik ihtiyaçlarına göre özel 3D varlıklar, nesneler, ortamlar ve mimari öğeler oluşturma ve sunma.',
        },
        {
          name: 'Level Tasarımı ve Dünya Kurgusu',
          description:
            'Görsel anlatım, oynanış akışı ve işlevsel mekân planlamasını birleştiren ilgi çekici bölümler, yapılandırılmış ortamlar ve inandırıcı dijital dünyalar tasarlama.',
        },
        {
          name: 'İç ve Dış Mekân Sahne Oluşturma',
          description:
            'Mimari projeler, gayrimenkul sunumları, sanal deneyimler ve tanıtım içerikleri için detaylı iç ve dış mekân sahneleri geliştirme.',
        },
        {
          name: 'Oyun Tasarımı ve Dokümantasyon',
          description:
            'Oyun konseptleri, mekanikler, bölüm fikirleri, sistem açıklamaları ve bir fikri yapılandırılmış bir projeye dönüştüren net dokümantasyon oluşturma.',
        },
        {
          name: 'Sunum Görselleri ve Grafik Tasarım',
          description:
            'Adobe Photoshop ve Illustrator kullanarak sunuma hazır render’lar, konsept görseller, yerleşimler ve grafik tasarım materyalleri üretme.',
        },
      ],
    },
    projects: { title: 'Proje' },
    contact: {
      title: 'Birlikte çalışalım',
      subtitle: 'Size net bir teklif iletebilmem için birkaç kısa soru.',
      nameLabel: 'Adınız',
      namePlaceholder: 'Ayşe Yılmaz',
      emailLabel: 'E-posta',
      emailPlaceholder: 'ornek@eposta.com',
      companyLabel: 'Şirket / stüdyo',
      companyPlaceholder: 'Stüdyo adı',
      optional: 'isteğe bağlı',
      multiHint: 'birden fazla seçebilirsiniz',
      mailLabel: 'E-posta ile ulaşın',
      socialLabel: 'Ya da beni burada bulun',
      servicesLabel: 'Neye ihtiyacınız var?',
      deliverables: {
        label: 'Beklenen teslimat',
        options: [
          'Render görselleri',
          'Animasyon / video',
          'Oyuna hazır dosyalar (FBX, UE projesi)',
          'Etkileşimli / gerçek zamanlı build',
          'Henüz emin değilim',
        ],
      },
      budget: {
        label: 'Bütçe aralığı (USD)',
        options: ['500 $ altı', '500 – 1.500 $', '1.500 – 5.000 $', '5.000 $ ve üzeri', 'Henüz emin değilim'],
      },
      timeline: {
        label: 'Zaman planı',
        options: ['Acil (1–2 hafta)', '1 ay içinde', '1–3 ay', 'Esnek'],
      },
      messageLabel: 'Projeden bahsedin',
      messagePlaceholder:
        'Kapsam, referans görseller, kullanılacak yazılım / motor, hedef platform…',
      submit: 'Talebi gönder',
      sending: 'Gönderiliyor…',
      successTitle: 'Talebiniz alındı!',
      successBody: 'Teşekkürler — 1–2 iş günü içinde e-posta ile dönüş yapacağım.',
      errorText: 'Bir şeyler ters gitti. Lütfen birazdan tekrar deneyin.',
      close: 'Kapat',
    },
  },

  fr: {
    htmlLang: 'fr',
    dir: 'ltr',
    nav: { about: 'À propos', price: 'Tarifs', projects: 'Projets', contact: 'Contact' },
    hero: {
      title: 'Salut, je suis ipek',
      tagline: 'une créatrice 3d qui façonne des projets marquants et inoubliables',
    },
    buttons: { contact: 'Me Contacter', liveProject: 'Voir le Projet' },
    about: {
      title: 'À propos',
      body: 'Passionnée par le design 3D, les environnements Unreal Engine, la visualisation architecturale et le développement de jeux, je crée des mondes immersifs et des expériences visuellement captivantes qui allient créativité, fonctionnalité et souci du détail. J’aime transformer des idées en environnements détaillés, en scènes prêtes pour le jeu et en visuels de qualité présentation. Donnons vie à votre vision et créons ensemble quelque chose de remarquable !',
    },
    services: {
      title: 'Services',
      items: [
        {
          name: 'Conception d’Environnements Unreal Engine',
          description:
            'Création d’environnements immersifs, détaillés et optimisés pour les jeux, les simulations, les présentations et les expériences interactives.',
        },
        {
          name: 'Développement de Jeux',
          description:
            'Développement de systèmes de gameplay, de mécaniques, d’interactions et de prototypes avec les Blueprints d’Unreal Engine, axé sur la fonctionnalité et l’expérience du joueur.',
        },
        {
          name: 'Visualisation Architecturale',
          description:
            'Visualisations intérieures et extérieures de haute qualité qui présentent les concepts architecturaux par un éclairage, des matériaux, une composition et une atmosphère réalistes.',
        },
        {
          name: 'Modélisation et Visualisation 3D',
          description:
            'Création et présentation d’assets 3D sur mesure, d’objets, d’environnements et d’éléments architecturaux adaptés aux besoins visuels et techniques de chaque projet.',
        },
        {
          name: 'Level Design et Création de Mondes',
          description:
            'Conception de niveaux captivants, d’environnements structurés et de mondes numériques crédibles alliant narration visuelle, fluidité du gameplay et aménagement fonctionnel de l’espace.',
        },
        {
          name: 'Création de Scènes Intérieures et Extérieures',
          description:
            'Développement de scènes intérieures et extérieures détaillées pour les projets architecturaux, les présentations immobilières, les expériences virtuelles et les contenus promotionnels.',
        },
        {
          name: 'Game Design et Documentation',
          description:
            'Création de concepts de jeu, de mécaniques, d’idées de niveaux, de descriptions de systèmes et d’une documentation claire qui transforme une idée initiale en projet structuré.',
        },
        {
          name: 'Visuels de Présentation et Design Graphique',
          description:
            'Production de rendus prêts à présenter, de visuels conceptuels, de mises en page et de supports graphiques avec Adobe Photoshop et Illustrator.',
        },
      ],
    },
    projects: { title: 'Projet' },
    contact: {
      title: 'Travaillons ensemble',
      subtitle: 'Quelques questions rapides pour vous envoyer un devis précis.',
      nameLabel: 'Votre nom',
      namePlaceholder: 'Jean Dupont',
      emailLabel: 'E-mail',
      emailPlaceholder: 'vous@exemple.com',
      companyLabel: 'Entreprise / studio',
      companyPlaceholder: 'Nom du studio',
      optional: 'facultatif',
      multiHint: 'plusieurs choix possibles',
      mailLabel: 'Écrivez-moi à',
      socialLabel: 'Ou retrouvez-moi sur',
      servicesLabel: 'De quoi avez-vous besoin ?',
      deliverables: {
        label: 'Livrables attendus',
        options: [
          'Rendus / images fixes',
          'Animation / vidéo',
          'Fichiers prêts pour le jeu (FBX, projet UE)',
          'Build interactif / temps réel',
          'Pas encore sûr',
        ],
      },
      budget: {
        label: 'Budget (USD)',
        options: ['< 500 $', '500 – 1 500 $', '1 500 – 5 000 $', '5 000 $ +', 'Pas encore sûr'],
      },
      timeline: {
        label: 'Délais',
        options: ['Urgent (1–2 semaines)', 'Sous 1 mois', '1–3 mois', 'Flexible'],
      },
      messageLabel: 'Parlez-moi du projet',
      messagePlaceholder:
        'Périmètre, références visuelles, moteur / logiciel, plateforme cible…',
      submit: 'Envoyer la demande',
      sending: 'Envoi…',
      successTitle: 'Demande reçue !',
      successBody: 'Merci — je vous réponds par e-mail sous 1 à 2 jours ouvrés.',
      errorText: 'Une erreur est survenue. Veuillez réessayer dans un instant.',
      close: 'Fermer',
    },
  },

  ar: {
    htmlLang: 'ar',
    dir: 'rtl',
    nav: { about: 'نبذة عني', price: 'الأسعار', projects: 'المشاريع', contact: 'تواصل' },
    heroScale: 0.62,
    hero: {
      title: 'مرحبًا، أنا ايبك',
      tagline: 'مصممة ثلاثية الأبعاد تصنع مشاريع مميزة لا تُنسى',
    },
    buttons: { contact: 'تواصل معي', liveProject: 'عرض المشروع' },
    about: {
      title: 'نبذة عني',
      body: 'بشغفٍ لتصميم ثلاثي الأبعاد وبيئات أنريل إنجن والتصور المعماري وتطوير الألعاب، أصنع عوالم غامرة وتجارب بصرية جذابة تجمع بين الإبداع والوظيفية والاهتمام بالتفاصيل. أستمتع بتحويل الأفكار إلى بيئات مفصّلة ومشاهد جاهزة للألعاب ومرئيات بجودة العرض. لنُحيِ رؤيتك ونصنع معًا شيئًا استثنائيًا!',
    },
    services: {
      title: 'الخدمات',
      items: [
        {
          name: 'تصميم البيئات في أنريل إنجن',
          description:
            'إنشاء بيئات غامرة ومفصّلة ومراعية للأداء للألعاب والمحاكاة والعروض التقديمية والتجارب التفاعلية.',
        },
        {
          name: 'تطوير الألعاب',
          description:
            'تطوير أنظمة اللعب والميكانيكيات والتفاعلات والنماذج الأولية باستخدام Blueprints في أنريل إنجن، مع التركيز على الوظيفية وتجربة اللاعب.',
        },
        {
          name: 'التصور المعماري',
          description:
            'تصورات داخلية وخارجية عالية الجودة تقدّم المفاهيم المعمارية عبر إضاءة وخامات وتكوين وأجواء واقعية.',
        },
        {
          name: 'النمذجة والتصور ثلاثي الأبعاد',
          description:
            'إنشاء وعرض أصول ثلاثية الأبعاد وأجسام وبيئات وعناصر معمارية مخصّصة تلائم الاحتياجات البصرية والتقنية لكل مشروع.',
        },
        {
          name: 'تصميم المراحل وبناء العوالم',
          description:
            'تصميم مراحل جذابة وبيئات منظّمة وعوالم رقمية مقنعة تجمع بين السرد البصري وانسيابية اللعب وتخطيط المساحات الوظيفي.',
        },
        {
          name: 'إنشاء المشاهد الداخلية والخارجية',
          description:
            'تطوير مشاهد داخلية وخارجية مفصّلة للمشاريع المعمارية وعروض العقارات والتجارب الافتراضية والمحتوى الترويجي.',
        },
        {
          name: 'تصميم الألعاب والتوثيق',
          description:
            'إنشاء مفاهيم الألعاب والميكانيكيات وأفكار المراحل ووصف الأنظمة وتوثيق واضح يحوّل الفكرة الأولية إلى مشروع منظّم.',
        },
        {
          name: 'مرئيات العرض والتصميم الجرافيكي',
          description:
            'إنتاج تصييرات جاهزة للعرض ومرئيات مفاهيمية وتخطيطات ومواد تصميم جرافيكي باستخدام أدوبي فوتوشوب وإليستريتور.',
        },
      ],
    },
    projects: { title: 'مشروع' },
    contact: {
      title: 'لنعمل معًا',
      subtitle: 'بضعة أسئلة سريعة حتى أتمكن من إرسال عرض سعر دقيق.',
      nameLabel: 'اسمك',
      namePlaceholder: 'الاسم الكامل',
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'you@example.com',
      companyLabel: 'الشركة / الاستوديو',
      companyPlaceholder: 'اسم الاستوديو',
      optional: 'اختياري',
      multiHint: 'يمكن اختيار أكثر من خيار',
      mailLabel: 'راسلني على',
      socialLabel: 'أو تابعني على',
      servicesLabel: 'ما الذي تحتاجه؟',
      deliverables: {
        label: 'المخرجات المتوقعة',
        options: [
          'صور ثابتة / تصييرات',
          'أنيميشن / فيديو',
          'ملفات جاهزة للألعاب (FBX، مشروع UE)',
          'تجربة تفاعلية / بناء لحظي',
          'لست متأكدًا بعد',
        ],
      },
      budget: {
        label: 'نطاق الميزانية (دولار)',
        options: ['أقل من 500 $', '500 – 1,500 $', '1,500 – 5,000 $', '5,000 $ فأكثر', 'لست متأكدًا بعد'],
      },
      timeline: {
        label: 'الجدول الزمني',
        options: ['عاجل (1–2 أسبوع)', 'خلال شهر', '1–3 أشهر', 'مرن'],
      },
      messageLabel: 'أخبرني عن المشروع',
      messagePlaceholder: 'النطاق، مراجع بصرية، المحرك / البرنامج، المنصة المستهدفة…',
      submit: 'إرسال الطلب',
      sending: 'جارٍ الإرسال…',
      successTitle: 'تم استلام طلبك!',
      successBody: 'شكرًا لك — سأرد عليك عبر البريد خلال يوم إلى يومَي عمل.',
      errorText: 'حدث خطأ ما. يرجى المحاولة مرة أخرى بعد قليل.',
      close: 'إغلاق',
    },
  },

  de: {
    htmlLang: 'de',
    dir: 'ltr',
    nav: { about: 'Über mich', price: 'Preise', projects: 'Projekte', contact: 'Kontakt' },
    hero: {
      title: 'Hallo, ich bin ipek',
      tagline: 'eine 3d-kreative, die eindrucksvolle und unvergessliche projekte gestaltet',
    },
    buttons: { contact: 'Kontaktiere Mich', liveProject: 'Projekt Ansehen' },
    about: {
      title: 'Über mich',
      body: 'Mit einer Leidenschaft für 3D-Design, Unreal-Engine-Umgebungen, Architekturvisualisierung und Spieleentwicklung erschaffe ich immersive Welten und visuell fesselnde Erlebnisse, die Kreativität, Funktionalität und Liebe zum Detail vereinen. Ich verwandle Ideen mit Freude in detaillierte Umgebungen, spielfertige Szenen und Visuals in Präsentationsqualität. Lassen Sie uns Ihre Vision zum Leben erwecken und gemeinsam etwas Bemerkenswertes schaffen!',
    },
    services: {
      title: 'Leistungen',
      items: [
        {
          name: 'Unreal Engine Umgebungsdesign',
          description:
            'Erstellung immersiver, detaillierter und performanceorientierter Umgebungen für Spiele, Simulationen, Präsentationen und interaktive Erlebnisse.',
        },
        {
          name: 'Spieleentwicklung',
          description:
            'Entwicklung von Gameplay-Systemen, Mechaniken, Interaktionen und Prototypen mit Unreal Engine Blueprints, mit Fokus auf Funktionalität und Spielerlebnis.',
        },
        {
          name: 'Architekturvisualisierung',
          description:
            'Hochwertige Innen- und Außenvisualisierungen, die architektonische Konzepte durch realistische Beleuchtung, Materialien, Komposition und Atmosphäre präsentieren.',
        },
        {
          name: '3D-Modellierung & Visualisierung',
          description:
            'Erstellung und Präsentation individueller 3D-Assets, Objekte, Umgebungen und architektonischer Elemente, abgestimmt auf die visuellen und technischen Anforderungen jedes Projekts.',
        },
        {
          name: 'Level Design & World Building',
          description:
            'Gestaltung fesselnder Level, strukturierter Umgebungen und glaubwürdiger digitaler Welten, die visuelles Storytelling, Gameplay-Fluss und funktionale Raumplanung verbinden.',
        },
        {
          name: 'Innen- & Außenszenen',
          description:
            'Entwicklung detaillierter Innen- und Außenszenen für Architekturprojekte, Immobilienpräsentationen, virtuelle Erlebnisse und Werbeinhalte.',
        },
        {
          name: 'Game Design & Dokumentation',
          description:
            'Erstellung von Spielkonzepten, Mechaniken, Level-Ideen, Systembeschreibungen und klarer Dokumentation, die aus einer Idee ein strukturiertes Projekt macht.',
        },
        {
          name: 'Präsentationsvisuals & Grafikdesign',
          description:
            'Produktion präsentationsfertiger Renderings, Konzeptvisuals, Layouts und Grafikdesign-Materialien mit Adobe Photoshop und Illustrator.',
        },
      ],
    },
    projects: { title: 'Projekt' },
    contact: {
      title: 'Lass uns zusammenarbeiten',
      subtitle: 'Ein paar kurze Fragen, damit ich dir ein passendes Angebot schicken kann.',
      nameLabel: 'Dein Name',
      namePlaceholder: 'Max Mustermann',
      emailLabel: 'E-Mail',
      emailPlaceholder: 'du@beispiel.de',
      companyLabel: 'Firma / Studio',
      companyPlaceholder: 'Studioname',
      optional: 'optional',
      multiHint: 'Mehrfachauswahl möglich',
      mailLabel: 'Schreib mir an',
      socialLabel: 'Oder finde mich auf',
      servicesLabel: 'Was brauchst du?',
      deliverables: {
        label: 'Erwartete Ergebnisse',
        options: [
          'Standbilder / Renderings',
          'Animation / Video',
          'Game-ready Dateien (FBX, UE-Projekt)',
          'Interaktiver / Echtzeit-Build',
          'Noch unklar',
        ],
      },
      budget: {
        label: 'Budgetrahmen (USD)',
        options: ['< 500 $', '500 – 1.500 $', '1.500 – 5.000 $', '5.000 $ +', 'Noch unklar'],
      },
      timeline: {
        label: 'Zeitrahmen',
        options: ['Dringend (1–2 Wochen)', 'Innerhalb eines Monats', '1–3 Monate', 'Flexibel'],
      },
      messageLabel: 'Erzähl mir vom Projekt',
      messagePlaceholder: 'Umfang, visuelle Referenzen, Engine / Software, Zielplattform…',
      submit: 'Anfrage senden',
      sending: 'Wird gesendet…',
      successTitle: 'Anfrage erhalten!',
      successBody: 'Danke — ich melde mich innerhalb von 1–2 Werktagen per E-Mail.',
      errorText: 'Etwas ist schiefgelaufen. Bitte versuche es gleich noch einmal.',
      close: 'Schließen',
    },
  },

  ru: {
    htmlLang: 'ru',
    dir: 'ltr',
    nav: { about: 'Обо мне', price: 'Цены', projects: 'Проекты', contact: 'Контакты' },
    hero: {
      title: 'Привет, я ипек',
      tagline: '3d-художник, создающий яркие и незабываемые проекты',
    },
    buttons: { contact: 'Связаться', liveProject: 'Смотреть Проект' },
    about: {
      title: 'Обо мне',
      body: 'Увлечённая 3D-дизайном, окружениями на Unreal Engine, архитектурной визуализацией и разработкой игр, я создаю захватывающие миры и визуально яркие впечатления, сочетающие креативность, функциональность и внимание к деталям. Мне нравится превращать идеи в детализированные окружения, готовые к игре сцены и визуал презентационного качества. Давайте воплотим ваше видение в жизнь и создадим вместе что-то выдающееся!',
    },
    services: {
      title: 'Услуги',
      items: [
        {
          name: 'Дизайн окружений в Unreal Engine',
          description:
            'Создание захватывающих, детализированных и оптимизированных окружений для игр, симуляций, презентаций и интерактивных проектов.',
        },
        {
          name: 'Разработка игр',
          description:
            'Разработка игровых систем, механик, взаимодействий и прототипов на Blueprints в Unreal Engine с упором на функциональность и опыт игрока.',
        },
        {
          name: 'Архитектурная визуализация',
          description:
            'Качественные интерьерные и экстерьерные визуализации, раскрывающие архитектурные концепции через реалистичный свет, материалы, композицию и атмосферу.',
        },
        {
          name: '3D-моделирование и визуализация',
          description:
            'Создание и подача индивидуальных 3D-ассетов, объектов, окружений и архитектурных элементов под визуальные и технические задачи проекта.',
        },
        {
          name: 'Дизайн уровней и создание миров',
          description:
            'Проектирование увлекательных уровней, структурированных окружений и убедительных цифровых миров, сочетающих визуальное повествование, игровой поток и функциональную планировку пространства.',
        },
        {
          name: 'Интерьерные и экстерьерные сцены',
          description:
            'Создание детализированных интерьерных и экстерьерных сцен для архитектурных проектов, презентаций недвижимости, виртуальных проектов и рекламных материалов.',
        },
        {
          name: 'Гейм-дизайн и документация',
          description:
            'Разработка игровых концепций, механик, идей уровней, описаний систем и понятной документации, превращающей идею в структурированный проект.',
        },
        {
          name: 'Презентационные визуалы и графический дизайн',
          description:
            'Подготовка рендеров для презентаций, концепт-визуалов, макетов и графических материалов в Adobe Photoshop и Illustrator.',
        },
      ],
    },
    projects: { title: 'Проект' },
    contact: {
      title: 'Давайте поработаем вместе',
      subtitle: 'Несколько коротких вопросов, чтобы я могла подготовить точную смету.',
      nameLabel: 'Ваше имя',
      namePlaceholder: 'Иван Иванов',
      emailLabel: 'E-mail',
      emailPlaceholder: 'you@example.com',
      companyLabel: 'Компания / студия',
      companyPlaceholder: 'Название студии',
      optional: 'необязательно',
      multiHint: 'можно выбрать несколько',
      mailLabel: 'Напишите мне на',
      socialLabel: 'Или найдите меня здесь',
      servicesLabel: 'Что вам нужно?',
      deliverables: {
        label: 'Ожидаемый результат',
        options: [
          'Статичные рендеры / изображения',
          'Анимация / видео',
          'Файлы для игры (FBX, проект UE)',
          'Интерактивный / реалтайм-билд',
          'Пока не знаю',
        ],
      },
      budget: {
        label: 'Бюджет (USD)',
        options: ['< 500 $', '500 – 1 500 $', '1 500 – 5 000 $', '5 000 $ +', 'Пока не знаю'],
      },
      timeline: {
        label: 'Сроки',
        options: ['Срочно (1–2 недели)', 'В течение месяца', '1–3 месяца', 'Гибкие'],
      },
      messageLabel: 'Расскажите о проекте',
      messagePlaceholder: 'Объём, референсы, движок / софт, целевая платформа…',
      submit: 'Отправить заявку',
      sending: 'Отправка…',
      successTitle: 'Заявка получена!',
      successBody: 'Спасибо — отвечу по электронной почте в течение 1–2 рабочих дней.',
      errorText: 'Что-то пошло не так. Пожалуйста, попробуйте ещё раз.',
      close: 'Закрыть',
    },
  },
};
