import {
  useEffect,
  useRef,
  useState,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useInView,
  animate,
} from "framer-motion";
import {
  ArrowUpRight,
  ArrowDown,
  Github,
  Mail,
  Copy,
  Check,
  MapPin,
  Gauge,
  Cpu,
  Database,
  Hash,
  Binary,
  Code2,
  Palette,
  Layers,
  Zap,
  ScanText,
  MemoryStick,
  Gamepad2,
  Lock,
  Search,
  Menu,
  X,
  ClipboardList,
  Link2,
  Image as ImageIcon,
  Award,
  BadgeCheck,
  Calendar,
  BrainCircuit,
  Network,
  Wrench,
  Languages,
  FileText,
  Linkedin,
  Sparkles,
  Star,
  FolderGit2,
  Users,
  Globe,
  Bot,
  Boxes,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ================================================================== */
/*  KİMLİK — dilden bağımsız bilgiler (linkler, e-posta vb.)           */
/* ================================================================== */
const IDENTITY = {
  name: "Samet Kaşmer",
  handle: "Layellie",
  githubUser: "Layellie",
  email: "sametkasmer16@gmail.com",
  github: "https://github.com/Layellie",
  linkedin: "https://www.linkedin.com/in/samet-ka%C5%9Fmer-0118b13b1/",
  // GitHub API erişilemezse kullanılacak yedek değerler
  statsFallback: { repos: 2, stars: 3, followers: 1 },
};

/* ================================================================== */
/*  İÇERİK — iki dilli. Siteyi güncellemek için bu nesneyi düzenle.    */
/*  Yapısal alanlar (icon, span, stack, file, github, date, code)      */
/*  iki dilde aynı tutulmalıdır.                                       */
/* ================================================================== */
const CONTENT = {
  tr: {
    nav: {
      about: "Hakkımda",
      skills: "Yetenekler",
      certificates: "Sertifikalar",
      projects: "Projeler",
      contact: "İletişim",
      mail: "Mail at",
    },
    hero: {
      available: "Yeni projelere açığım",
      location: "Bursa, Türkiye",
      role: "Full-Stack Developer & Sistem Geliştirici",
      tagline:
        "Sistem seviyesindeki optimizasyondan ölçeklenebilir web mimarilerine kadar; performansı ölçülebilir biçimde artıran, temiz ve sürdürülebilir yazılımlar tasarlıyorum.",
      ctaProjects: "Projelerim",
      ctaContact: "İletişim",
    },
    marquee: [
      "C#",
      "C++",
      "SQL",
      "HTML5",
      "CSS3",
      "Laravel",
      "Node.js",
      "Sistem Optimizasyonu",
      "Donanım Geliştirme",
      "WPF",
      ".NET 10",
      "WinRT",
      "PHP",
      "MySQL",
      "Yapay Zeka",
    ],
    about: {
      index: "01",
      title: "Hakkımda",
      kicker: "Yazılım & sistem geliştirme üzerine",
      statement: [
        "Kodun yalnızca çalışması değil; ",
        "hızlı, verimli ve donanımla uyumlu",
        " çalışması beni heyecanlandırıyor.",
      ],
      paragraphs: [
        "Kütahya Teknik Bilimler Meslek Yüksekokulu'nda Bilgisayar Programcılığı eğitimi alıyorum. Yazılım dünyasına olan tutkum; bir uygulamanın yalnızca arayüzüyle değil, arka planda sistemle nasıl konuştuğu, belleği nasıl yönettiği ve her milisaniyeyi nasıl kazandığıyla ilgilenmemle şekillendi. Bir problemi kökünden anlayıp çözümü mümkün olan en verimli yoldan kurmak benim için her zaman önceliklidir.",
        "C# ve C++ ile masaüstü uygulamaları; Laravel ve Node.js ile web tarafında çözümler geliştiriyorum. Özellikle C++ ve C# ile uygulama geliştirmeyi, sıfırdan bir mimari kurup onu adım adım optimize etmeyi çok seviyorum. Açık kaynak araçlar üreterek performans, optimizasyon ve donanım seviyesindeki problemlere pratik ve ölçülebilir çözümler bulmak beni motive ediyor.",
        "Sürekli öğrenmeyi bir disiplin olarak benimsedim. BTK Akademi'de tamamladığım eğitimlerle C#, C++, veri tabanı, nesne yönelimli programlama ve üretken yapay zekâ alanlarında doğrulanmış sertifikalar aldım; Bilgisayar Programcılığı bölümünden 3.09 genel not ortalamasıyla mezun olmaya hazırlanıyorum.",
      ],
      facts: [
        { label: "Eğitim", value: "Bilgisayar Programcılığı" },
        { label: "Okul", value: "Kütahya Teknik Bilimler MYO" },
        { label: "Genel Ortalama", value: "3.09 / 4.00" },
        { label: "Sertifika", value: "8 · BTK Akademi" },
        { label: "Konum", value: "Bursa, Türkiye" },
        { label: "Odak", value: "Full-Stack Developer" },
      ],
    },
    skills: {
      index: "02",
      title: "Yetenekler",
      kicker: "Diller, çatılar ve uzmanlık alanları",
      moreLabel: "Daha Fazla",
      focus: [
        {
          icon: "Gauge",
          title: "Sistem Optimizasyonu",
          desc: "RAM yönetimi, Standby list temizliği ve 0.5 ms timer çözünürlüğü ile düşük gecikmeli, akıcı bir sistem deneyimi.",
          tags: ["RAM Purge", "0.5ms Timer", "Game Mode"],
        },
        {
          icon: "Cpu",
          title: "Donanım Seviyesi Geliştirme",
          desc: "Win32 P/Invoke, kernel çağrıları ve yerel C++ modülleri ile donanıma yakın, yüksek performanslı geliştirme.",
          tags: ["Win32 P/Invoke", "C++ Native", "Kernel API"],
        },
      ],
      languages: [
        { name: "C#", icon: "Hash", note: "WPF · .NET 10 · MVVM", span: "lg:col-span-2", certified: true },
        { name: "C++", icon: "Binary", note: "C++20 · WinRT · DLL", certified: true },
        { name: "SQL", icon: "Database", note: "Veri modelleme · Sorgu", certified: true },
        { name: "HTML5", icon: "Code2", note: "Semantik · Erişilebilir" },
        { name: "CSS3", icon: "Palette", note: "Responsive · Modern UI" },
        { name: "Laravel", icon: "Layers", note: "PHP · MVC · Eloquent" },
        { name: "Node.js", icon: "Network", note: "Express · API · Runtime" },
      ],
      more: [
        {
          group: "Diller & Veritabanı",
          icon: "Database",
          items: [{ name: "PHP" }, { name: "MS SQL Server" }, { name: "MySQL" }],
        },
        {
          group: "Araçlar & IDE'ler",
          icon: "Wrench",
          items: [
            { name: "Visual Studio 2022" },
            { name: "Visual Studio 2026 Insiders" },
            { name: "VS Code" },
            { name: "CLion" },
            { name: "Antigravity" },
          ],
        },
        {
          group: "Uzmanlık & Eğitim",
          icon: "BrainCircuit",
          items: [
            { name: "Yapay Zeka & Algoritmalar", certified: true },
            { name: "Bilgi Teknolojileri Temelleri", certified: true },
            { name: "Üretken Yapay Zekâ", certified: true },
            { name: "Anthropic Claude", certified: true },
            { name: "Nesne Yönelimli Programlama (OOP)", certified: true },
          ],
        },
        {
          group: "Yabancı Dil",
          icon: "Languages",
          items: [{ name: "İngilizce" }],
        },
      ],
    },
    certificates: {
      index: "03",
      title: "Sertifikalar",
      kicker: "BTK Akademi · doğrulanmış eğitimler ve eşleşen yetenekler",
      verified: "Doğrulandı",
      validates: "Doğruladığı yetenek",
      view: "Görüntüle",
      prev: "Önceki",
      next: "Sonraki",
      items: [
        {
          title: "C# Programlama",
          issuer: "BTK Akademi",
          date: "23.05.2026",
          code: "pKmhqJKXKY",
          skill: "C#",
          icon: "Hash",
          file: "/sertifikalar/csharp-programlama.pdf",
        },
        {
          title: "Yapay Zeka ve Algoritmalarına Giriş",
          issuer: "BTK Akademi",
          date: "24.05.2026",
          code: "Yx1h8D8laD",
          skill: "Yapay Zeka & Algoritmalar",
          icon: "BrainCircuit",
          file: "/sertifikalar/yapay-zeka-algoritmalar.pdf",
        },
        {
          title: "Bilgi Teknolojilerine Giriş",
          issuer: "BTK Akademi",
          date: "29.05.2026",
          code: "BozfxjD1Bz",
          skill: "BT Temelleri",
          icon: "Network",
          file: "/sertifikalar/bilgi-teknolojilerine-giris.pdf",
        },
        {
          title: "C++ ile Programlamaya Giriş",
          issuer: "BTK Akademi",
          date: "13.06.2026",
          code: "mKEhkMNx8r",
          skill: "C++",
          icon: "Binary",
          file: "/sertifikalar/cpp-programlamaya-giris.pdf",
        },
        {
          title: "Anthropic Claude",
          issuer: "BTK Akademi",
          date: "18.06.2026",
          code: "JoNf2NxGKO",
          skill: "Yapay Zekâ · LLM",
          icon: "Bot",
          file: "/sertifikalar/anthropic-claude.pdf",
        },
        {
          title: "Üretken Yapay Zekâya Giriş",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "WJ1SkP7J9V",
          skill: "Üretken Yapay Zekâ",
          icon: "Sparkles",
          file: "/sertifikalar/uretken-yapay-zeka.pdf",
        },
        {
          title: "Uygulamalarla Nesne Yönelimli Programlama",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "xr4tN6bV46",
          skill: "OOP",
          icon: "Boxes",
          file: "/sertifikalar/nesne-yonelimli-programlama.pdf",
        },
        {
          title: "Veri Tabanına Giriş",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "Yx1h8DOjld",
          skill: "Veritabanı",
          icon: "Database",
          file: "/sertifikalar/veri-tabanina-giris.pdf",
        },
      ],
    },
    projects: {
      index: "04",
      title: "Projeler",
      kicker: "Açık kaynak masaüstü & sistem araçları",
      view: "GitHub'da İncele",
      stats: { repos: "Depo", stars: "Yıldız", followers: "Takipçi" },
      contributions: "Katkı grafiği",
      more: {
        title: "GitHub'da daha fazlası",
        subtitle: "Profilimden otomatik çekilen diğer açık kaynak repolar",
        noDesc: "Açıklama eklenmemiş.",
        viewAll: "Tüm repoları GitHub'da gör",
      },
      items: [
        {
          id: "clipboard",
          name: "AIO-Hybrid-Clipboard",
          type: "Açık Kaynak · Masaüstü",
          year: "2026",
          license: "MIT",
          github: "https://github.com/Layellie/AIO-Hybrid-Clipboard",
          description:
            "C# ve C++'ı birleştiren, dahili OCR ve tersine görsel-metin aramasına sahip yıldırım hızında hibrit bir pano yöneticisi.",
          features: [
            "Hibrit mimari: C# WPF arayüz + C++20 yerel motor",
            "Akıllı OCR: WinRT ile görsellerden metin çıkarma",
            "Tersine OCR araması: görseller içinde metin bulma",
            "Hızlı yapıştırma kısayolları (ALT+1 / 2 / 3)",
            "Oturum kalıcılığı ve sürükle-bırak desteği",
            "Sistem tepsisi entegrasyonu · TR / EN arayüz",
          ],
          stack: ["C# 12", ".NET 10", "WPF", "C++20", "WinRT", "P/Invoke"],
        },
        {
          id: "standby",
          name: "StandbyAndTimer",
          type: "Açık Kaynak · Sistem Aracı",
          year: "2026",
          license: "MIT",
          github: "https://github.com/Layellie/StandbyAndTimer",
          description:
            "Gelişmiş RAM temizliği ve 0.5 ms sistem timer çözünürlüğü ile giriş gecikmesini düşüren; oyuncular ve ileri kullanıcılar için bir optimizasyon aracı.",
          features: [
            "0.5 ms timer çözünürlüğü kilidi (NtSetTimerResolution)",
            "Standby bellek temizliği: manuel ve otomatik",
            "Oyun Modu: yüksek CPU önceliği ve tam affinity",
            "Sistem tepsisi + Windows başlangıç desteği",
            "Çift tema (açık / koyu) · TR / EN yerelleştirme",
            "Yerleşik güncelleme denetleyici (GitHub Release)",
          ],
          stack: ["C#", "WPF", ".NET 10", "MVVM", "Win32 P/Invoke", "Inno Setup"],
        },
      ],
    },
    contact: {
      index: "06",
      label: "İletişim",
      big: ["Birlikte", "Çalışalım"],
      blurb:
        "Bir proje fikri, iş birliği ya da yalnızca merhaba demek için — bana bir mesaj bırak. En kısa sürede dönüş yaparım.",
    },
    terminal: {
      index: "05",
      title: "Terminal",
      kicker: "Komut yazarak hakkımda daha fazlasını keşfet",
      user: "ziyaretci",
      host: "layellie",
      welcome: "Layellie portföy terminaline hoş geldin.",
      hint: "Başlamak için 'help' yaz · geçmiş için ↑ ↓ tuşları",
      helpTitle: "Kullanılabilir komutlar",
      notFound: "komut bulunamadı",
      tryHelp: "'help' yazarak tüm komutları görebilirsin.",
      labels: {
        langs: "Diller & Çatılar",
        focus: "Odak Alanları",
        certCount: "doğrulanmış sertifika",
        sudo: "ziyaretci sudoers dosyasında yok. Bu olay bildirilecek. 😏",
      },
      cmds: {
        help: "bu menüyü gösterir",
        whoami: "kim olduğumu gösterir",
        about: "kısa künye & bilgiler",
        skills: "yeteneklerimi listeler",
        projects: "açık kaynak projelerim",
        certs: "sertifikalarım",
        contact: "iletişim bilgilerim",
        social: "sosyal medya hesaplarım",
        date: "bugünün tarihi",
        clear: "ekranı temizler",
      },
    },
    footer: { backToTop: "Başa dön ↑" },
    cmd: {
      placeholder: "Komut ara veya bir bölüme git…",
      empty: "Sonuç yok",
      goto: "Bölüm",
      lang: "Dil",
      copyEmail: "Kopyala",
      open: "Aç",
      toTop: "Başa dön",
    },
    mock: {
      search: "Pano geçmişinde ara…",
      ocrCaption: "görselden çıkarılan metin",
      ocrEngine: "OCR Motoru · C++20 / WinRT",
      reverse: "Tersine Arama",
      admin: "Yönetici",
      timerRes: "Timer Çözünürlüğü",
      locked: "Kilitli",
      standbyMem: "Standby Bellek",
      cleared: "temizlendi",
      gameMode: "Oyun Modu",
      on: "Açık",
      affinity: "Yüksek öncelik · Tam affinity",
    },
  },

  en: {
    nav: {
      about: "About",
      skills: "Skills",
      certificates: "Certificates",
      projects: "Projects",
      contact: "Contact",
      mail: "Email me",
    },
    hero: {
      available: "Open to new projects",
      location: "Bursa, Turkey",
      role: "Full-Stack Developer & Systems Engineer",
      tagline:
        "From system-level optimization to scalable web architectures — I design clean, maintainable software that improves performance in measurable ways.",
      ctaProjects: "My Work",
      ctaContact: "Contact",
    },
    marquee: [
      "C#",
      "C++",
      "SQL",
      "HTML5",
      "CSS3",
      "Laravel",
      "Node.js",
      "System Optimization",
      "Hardware Dev",
      "WPF",
      ".NET 10",
      "WinRT",
      "PHP",
      "MySQL",
      "AI",
    ],
    about: {
      index: "01",
      title: "About",
      kicker: "On software & systems development",
      statement: [
        "What excites me isn't just code that works — it's code that runs ",
        "fast, efficiently and in tune with the hardware",
        ".",
      ],
      paragraphs: [
        "I'm studying Computer Programming at Kütahya Vocational School of Technical Sciences. My passion for software grew from caring about more than a UI — how a program talks to the system underneath, manages memory and squeezes out every millisecond. Understanding a problem at its root and building the solution in the most efficient way possible is always my priority.",
        "I build desktop applications with C# and C++, and web solutions with Laravel and Node.js. I especially love developing applications with C++ and C# — designing an architecture from scratch and optimizing it step by step. Shipping open-source tools that solve performance, optimization and hardware-level problems in practical, measurable ways is what truly drives me.",
        "I treat learning as an ongoing discipline: through BTK Akademi I've earned verified certificates in C#, C++, databases, object-oriented programming and generative AI. I'm on track to graduate from the Computer Programming program with a 3.09 GPA.",
      ],
      facts: [
        { label: "Education", value: "Computer Programming" },
        { label: "School", value: "Kütahya Vocational School" },
        { label: "GPA", value: "3.09 / 4.00" },
        { label: "Certificates", value: "8 · BTK Akademi" },
        { label: "Location", value: "Bursa, Turkey" },
        { label: "Focus", value: "Full-Stack Developer" },
      ],
    },
    skills: {
      index: "02",
      title: "Skills",
      kicker: "Languages, frameworks and areas of expertise",
      moreLabel: "More",
      focus: [
        {
          icon: "Gauge",
          title: "System Optimization",
          desc: "A low-latency, smooth system experience through RAM management, Standby list purging and 0.5 ms timer resolution.",
          tags: ["RAM Purge", "0.5ms Timer", "Game Mode"],
        },
        {
          icon: "Cpu",
          title: "Hardware-Level Development",
          desc: "High-performance, close-to-the-metal development with Win32 P/Invoke, kernel calls and native C++ modules.",
          tags: ["Win32 P/Invoke", "C++ Native", "Kernel API"],
        },
      ],
      languages: [
        { name: "C#", icon: "Hash", note: "WPF · .NET 10 · MVVM", span: "lg:col-span-2", certified: true },
        { name: "C++", icon: "Binary", note: "C++20 · WinRT · DLL", certified: true },
        { name: "SQL", icon: "Database", note: "Data modeling · Queries", certified: true },
        { name: "HTML5", icon: "Code2", note: "Semantic · Accessible" },
        { name: "CSS3", icon: "Palette", note: "Responsive · Modern UI" },
        { name: "Laravel", icon: "Layers", note: "PHP · MVC · Eloquent" },
        { name: "Node.js", icon: "Network", note: "Express · API · Runtime" },
      ],
      more: [
        {
          group: "Languages & Database",
          icon: "Database",
          items: [{ name: "PHP" }, { name: "MS SQL Server" }, { name: "MySQL" }],
        },
        {
          group: "Tools & IDEs",
          icon: "Wrench",
          items: [
            { name: "Visual Studio 2022" },
            { name: "Visual Studio 2026 Insiders" },
            { name: "VS Code" },
            { name: "CLion" },
            { name: "Antigravity" },
          ],
        },
        {
          group: "Expertise & Training",
          icon: "BrainCircuit",
          items: [
            { name: "AI & Algorithms", certified: true },
            { name: "IT Fundamentals", certified: true },
            { name: "Generative AI", certified: true },
            { name: "Anthropic Claude", certified: true },
            { name: "Object-Oriented Programming (OOP)", certified: true },
          ],
        },
        {
          group: "Language",
          icon: "Languages",
          items: [{ name: "English" }],
        },
      ],
    },
    certificates: {
      index: "03",
      title: "Certificates",
      kicker: "BTK Akademi · verified training mapped to skills",
      verified: "Verified",
      validates: "Validates",
      view: "View",
      prev: "Previous",
      next: "Next",
      items: [
        {
          title: "C# Programming",
          issuer: "BTK Akademi",
          date: "23.05.2026",
          code: "pKmhqJKXKY",
          skill: "C#",
          icon: "Hash",
          file: "/sertifikalar/csharp-programlama.pdf",
        },
        {
          title: "Introduction to AI and Algorithms",
          issuer: "BTK Akademi",
          date: "24.05.2026",
          code: "Yx1h8D8laD",
          skill: "AI & Algorithms",
          icon: "BrainCircuit",
          file: "/sertifikalar/yapay-zeka-algoritmalar.pdf",
        },
        {
          title: "Introduction to Information Technologies",
          issuer: "BTK Akademi",
          date: "29.05.2026",
          code: "BozfxjD1Bz",
          skill: "IT Fundamentals",
          icon: "Network",
          file: "/sertifikalar/bilgi-teknolojilerine-giris.pdf",
        },
        {
          title: "Introduction to Programming with C++",
          issuer: "BTK Akademi",
          date: "13.06.2026",
          code: "mKEhkMNx8r",
          skill: "C++",
          icon: "Binary",
          file: "/sertifikalar/cpp-programlamaya-giris.pdf",
        },
        {
          title: "Anthropic Claude",
          issuer: "BTK Akademi",
          date: "18.06.2026",
          code: "JoNf2NxGKO",
          skill: "AI · LLM",
          icon: "Bot",
          file: "/sertifikalar/anthropic-claude.pdf",
        },
        {
          title: "Introduction to Generative AI",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "WJ1SkP7J9V",
          skill: "Generative AI",
          icon: "Sparkles",
          file: "/sertifikalar/uretken-yapay-zeka.pdf",
        },
        {
          title: "Object-Oriented Programming with Applications",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "xr4tN6bV46",
          skill: "OOP",
          icon: "Boxes",
          file: "/sertifikalar/nesne-yonelimli-programlama.pdf",
        },
        {
          title: "Introduction to Databases",
          issuer: "BTK Akademi",
          date: "23.06.2026",
          code: "Yx1h8DOjld",
          skill: "Databases",
          icon: "Database",
          file: "/sertifikalar/veri-tabanina-giris.pdf",
        },
      ],
    },
    projects: {
      index: "04",
      title: "Projects",
      kicker: "Open-source desktop & system tools",
      view: "View on GitHub",
      stats: { repos: "Repos", stars: "Stars", followers: "Followers" },
      contributions: "Contribution graph",
      more: {
        title: "More on GitHub",
        subtitle: "Other open-source repos pulled automatically from my profile",
        noDesc: "No description provided.",
        viewAll: "View all repos on GitHub",
      },
      items: [
        {
          id: "clipboard",
          name: "AIO-Hybrid-Clipboard",
          type: "Open Source · Desktop",
          year: "2026",
          license: "MIT",
          github: "https://github.com/Layellie/AIO-Hybrid-Clipboard",
          description:
            "A blazing-fast hybrid clipboard manager that fuses C# and C++, with built-in OCR and reverse image-text search.",
          features: [
            "Hybrid architecture: C# WPF UI + C++20 native engine",
            "Smart OCR: text extraction from images via WinRT",
            "Reverse OCR search: find text inside images",
            "Quick-paste hotkeys (ALT+1 / 2 / 3)",
            "Session persistence and drag & drop",
            "System tray integration · TR / EN UI",
          ],
          stack: ["C# 12", ".NET 10", "WPF", "C++20", "WinRT", "P/Invoke"],
        },
        {
          id: "standby",
          name: "StandbyAndTimer",
          type: "Open Source · System Tool",
          year: "2026",
          license: "MIT",
          github: "https://github.com/Layellie/StandbyAndTimer",
          description:
            "An optimization tool for gamers and power users that cuts input latency with advanced RAM purging and 0.5 ms system timer resolution.",
          features: [
            "0.5 ms timer resolution lock (NtSetTimerResolution)",
            "Standby memory purge: manual and automatic",
            "Game Mode: high CPU priority and full affinity",
            "System tray + Windows startup support",
            "Dual themes (light / dark) · TR / EN localization",
            "Built-in update checker (GitHub Release)",
          ],
          stack: ["C#", "WPF", ".NET 10", "MVVM", "Win32 P/Invoke", "Inno Setup"],
        },
      ],
    },
    contact: {
      index: "06",
      label: "Contact",
      big: ["Let's", "Talk."],
      blurb:
        "Got a project idea, a collaboration, or just want to say hi? Drop me a message — I'll get back to you soon.",
    },
    terminal: {
      index: "05",
      title: "Terminal",
      kicker: "Type commands to explore more about me",
      user: "visitor",
      host: "layellie",
      welcome: "Welcome to the Layellie portfolio terminal.",
      hint: "Type 'help' to start · use ↑ ↓ for history",
      helpTitle: "Available commands",
      notFound: "command not found",
      tryHelp: "Type 'help' to see all commands.",
      labels: {
        langs: "Languages & Frameworks",
        focus: "Focus Areas",
        certCount: "verified certificates",
        sudo: "visitor is not in the sudoers file. This incident will be reported. 😏",
      },
      cmds: {
        help: "show this menu",
        whoami: "who I am",
        about: "short profile & facts",
        skills: "list my skills",
        projects: "my open-source projects",
        certs: "my certificates",
        contact: "my contact details",
        social: "my social accounts",
        date: "today's date",
        clear: "clear the screen",
      },
    },
    footer: { backToTop: "Back to top ↑" },
    cmd: {
      placeholder: "Search a command or jump to a section…",
      empty: "No results",
      goto: "Section",
      lang: "Language",
      copyEmail: "Copy",
      open: "Open",
      toTop: "Back to top",
    },
    mock: {
      search: "Search clipboard history…",
      ocrCaption: "text extracted from image",
      ocrEngine: "OCR Engine · C++20 / WinRT",
      reverse: "Reverse Search",
      admin: "Admin",
      timerRes: "Timer Resolution",
      locked: "Locked",
      standbyMem: "Standby Memory",
      cleared: "cleared",
      gameMode: "Game Mode",
      on: "On",
      affinity: "High priority · Full affinity",
    },
  },
};

const SECTION_IDS = ["hakkimda", "yetenekler", "sertifikalar", "projeler", "iletisim"];
const NAV_KEYS = [
  { key: "about", href: "#hakkimda" },
  { key: "skills", href: "#yetenekler" },
  { key: "certificates", href: "#sertifikalar" },
  { key: "projects", href: "#projeler" },
  { key: "contact", href: "#iletisim" },
];

const ICONS = {
  Hash,
  Binary,
  Database,
  Code2,
  Palette,
  Layers,
  Zap,
  Gauge,
  Cpu,
  BrainCircuit,
  Network,
  Wrench,
  Languages,
  Award,
  Sparkles,
  Bot,
  Boxes,
};

const EASE = [0.16, 1, 0.3, 1];
const WRAP = "mx-auto w-full max-w-[1380px] px-6 md:px-10";

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ================================================================== */
/*  Dil yönetimi (context)                                             */
/* ================================================================== */
const LangCtx = createContext(null);
const useLang = () => useContext(LangCtx);

/* ================================================================== */
/*  Yardımcı bileşenler ve hook'lar                                    */
/* ================================================================== */
function Reveal({ children, className = "", delay = 0, y = 28, x = 0, once = false }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 1.4, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ index, title, kicker }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-sm text-accent">({index})</span>
        <h2 className="font-display text-[clamp(2rem,5.5vw,3.75rem)] font-semibold leading-none tracking-tight">
          {title}
        </h2>
      </div>
      {kicker && (
        <span className="hidden max-w-[22ch] text-right text-sm leading-snug text-muted sm:block">
          {kicker}
        </span>
      )}
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[80] h-[2px] origin-left bg-accent"
    />
  );
}

// Scroll-spy: görünürdeki bölümün id'sini döndürür
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

// GitHub canlı verisi: istatistikler + repo listesi (tek fetch ile paylaşılır)
function useGithub(user, fallback) {
  const [data, setData] = useState({ stats: fallback, repos: [] });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [reposRes, userRes] = await Promise.all([
          fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`),
          fetch(`https://api.github.com/users/${user}`),
        ]);
        if (!reposRes.ok || !userRes.ok) return;
        const repos = await reposRes.json();
        const u = await userRes.json();
        const list = Array.isArray(repos) ? repos : [];
        const stars = list.reduce((s, r) => s + (r.stargazers_count || 0), 0);
        if (active) {
          setData({
            stats: {
              repos: u.public_repos ?? fallback.repos,
              stars: list.length ? stars : fallback.stars,
              followers: u.followers ?? fallback.followers,
            },
            repos: list,
          });
        }
      } catch {
        /* ağ hatası → yedek değerlerde kal */
      }
    })();
    return () => {
      active = false;
    };
  }, [user, fallback]);
  return data;
}

/* ================================================================== */
/*  Navigasyon + dil değiştirici + mobil menü                          */
/* ================================================================== */
function LangSwitch({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      aria-label="Dil değiştir / Switch language"
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface ${className}`}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === "tr" ? "EN" : "TR"}
    </button>
  );
}

function Navbar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useScrollSpy(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-canvas/90 backdrop-blur-sm"
          : "border-b border-transparent"
      }`}
    >
      <nav className={`${WRAP} flex h-16 items-center justify-between md:h-20`}>
        <a href="#top" className="inline-flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-display text-base font-medium tracking-tight">
            Laye77ie
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_KEYS.map((n) => {
            const isActive = active === n.href.slice(1);
            return (
              <a
                key={n.href}
                href={n.href}
                className={`relative text-sm transition-colors ${
                  isActive ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t.nav[n.key]}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -bottom-1.5 left-0 right-0 mx-auto h-1 w-1 rounded-full bg-accent"
                  />
                )}
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-cmdk"))}
            aria-label={t.cmd.placeholder}
            className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface lg:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono text-[10px] tracking-wide">
              {META_LABEL} K
            </kbd>
          </button>
          <LangSwitch />
          <a
            href={`mailto:${IDENTITY.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
          >
            <Mail className="h-3.5 w-3.5" /> {t.nav.mail}
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LangSwitch />
          <button
            onClick={() => setOpen(true)}
            aria-label="Menü"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[70] flex flex-col bg-canvas md:hidden"
          >
            <div className={`${WRAP} flex h-16 items-center justify-between`}>
              <span className="font-display font-medium">Laye77ie</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={`${WRAP} flex flex-1 flex-col justify-center gap-2`}>
              {NAV_KEYS.map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, ease: EASE, duration: 0.5 }}
                  className="font-display text-4xl tracking-tight text-ink/90 transition-colors hover:text-accent"
                >
                  {t.nav[n.key]}
                </motion.a>
              ))}
              <motion.a
                href={`mailto:${IDENTITY.email}`}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1 + NAV_KEYS.length * 0.06,
                  ease: EASE,
                  duration: 0.5,
                }}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-base text-canvas"
              >
                <Mail className="h-4 w-4" /> {IDENTITY.email}
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ================================================================== */
/*  HERO                                                               */
/* ================================================================== */
const headlineParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
};
const charChild = {
  hidden: { y: "120%", opacity: 0, filter: "blur(14px)" },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 1.4, ease: EASE },
  },
};

// İsmi harf harf, maskeli yükselme efektiyle render eder.
function AnimatedWord({ text }) {
  return text.split("").map((ch, i) => (
    <motion.span key={i} variants={charChild} className="inline-block">
      {ch}
    </motion.span>
  ));
}

function Hero() {
  const { t } = useLang();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      id="top"
      ref={ref}
      className={`${WRAP} relative flex min-h-screen flex-col justify-center pb-16 pt-28`}
    >
      <motion.div style={{ y, opacity }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.15, ease: EASE }}
          className="mb-8 flex flex-wrap items-center gap-3 text-sm"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-muted">{t.hero.available}</span>
          <span className="text-faint">/</span>
          <span className="inline-flex items-center gap-1 text-muted">
            <MapPin className="h-3.5 w-3.5" /> {t.hero.location}
          </span>
        </motion.div>

        <div className="relative">
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.15, ease: EASE }}
            className="pointer-events-none absolute -left-[6%] top-1/2 -z-10 h-[130%] w-[55%] -translate-y-1/2 rounded-full opacity-[0.16] blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
            }}
          />
          <motion.h1
            variants={headlineParent}
            initial="hidden"
            animate="show"
            aria-label={`${IDENTITY.name}.`}
            className="relative font-display text-[clamp(3.25rem,14vw,12.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]"
          >
            <span aria-hidden className="block overflow-hidden pb-[0.08em]">
              <span className="block">
                <AnimatedWord text="Samet" />
              </span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.08em]">
              <span className="block">
                <AnimatedWord text="Kaşmer" />
                <motion.span variants={charChild} className="inline-block text-accent">
                  <motion.span
                    className="inline-block"
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.15, 1] }}
                    transition={{
                      duration: 2.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.7,
                    }}
                  >
                    .
                  </motion.span>
                </motion.span>
              </span>
            </span>
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 1.3, ease: EASE }}
          className="mt-12 flex flex-col gap-8 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-xl">
            <p className="font-display text-xl tracking-tight md:text-2xl">
              {t.hero.role}
            </p>
            <p className="mt-3 leading-relaxed text-muted md:text-lg">
              {t.hero.tagline}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#projeler"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-90"
            >
              {t.hero.ctaProjects}
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </a>
            <a
              href="#iletisim"
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium transition hover:bg-surface"
            >
              {t.hero.ctaContact}
            </a>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ================================================================== */
/*  Kayan şerit                                                        */
/* ================================================================== */
function Marquee() {
  const { t } = useLang();
  const row = [...t.marquee, ...t.marquee];
  return (
    <div className="relative overflow-hidden border-y border-line py-5">
      <div className="flex w-max animate-marquee items-center gap-10 will-change-transform">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-lg uppercase tracking-wide text-muted">
              {item}
            </span>
            <span className="text-accent">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  HAKKIMDA                                                           */
/* ================================================================== */
function About() {
  const { t } = useLang();
  const a = t.about;
  return (
    <section id="hakkimda" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={a.index} title={a.title} kicker={a.kicker} />
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Reveal>
            <p className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.15] tracking-tight">
              {a.statement[0]}
              <span className="text-muted">{a.statement[1]}</span>
              {a.statement[2]}
            </p>
          </Reveal>

          <div className="mt-10 max-w-2xl space-y-5 leading-relaxed text-muted md:text-lg">
            {a.paragraphs.map((p, i) => (
              <Reveal key={i} delay={0.05 + i * 0.05}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <Reveal delay={0.1} y={0} x={70}>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {a.facts.map((f) => (
                <div key={f.label} className="bg-surface p-6">
                  <div className="text-xs uppercase tracking-wider text-faint">
                    {f.label}
                  </div>
                  <div className="mt-2 font-display text-lg leading-snug">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  YETENEKLER                                                         */
/* ================================================================== */
function FeatureCard({ item }) {
  const Icon = ICONS[item.icon];
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface/50 p-8 transition-colors duration-500 hover:border-[#34343c]">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-accent transition-transform duration-500 group-hover:-rotate-6">
          <Icon className="h-6 w-6" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <h3 className="mt-8 font-display text-2xl tracking-tight">{item.title}</h3>
      <p className="mt-3 leading-relaxed text-muted">{item.desc}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillTile({ item, certifiedLabel }) {
  const Icon = ICONS[item.icon];
  return (
    <div className="group h-full rounded-2xl border border-line bg-surface/40 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#34343c] hover:bg-surface">
      <div className="flex items-start justify-between">
        <Icon className="h-7 w-7 text-muted transition-colors group-hover:text-accent" />
        {item.certified && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            <BadgeCheck className="h-3 w-3" /> {certifiedLabel}
          </span>
        )}
      </div>
      <div className="mt-8 font-display text-2xl tracking-tight md:text-3xl">
        {item.name}
      </div>
      <div className="mt-1.5 text-sm text-faint">{item.note}</div>
    </div>
  );
}

function Skills() {
  const { t } = useLang();
  const s = t.skills;
  const certifiedLabel = t.certificates.verified;
  return (
    <section id="yetenekler" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={s.index} title={s.title} kicker={s.kicker} />
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
        {s.focus.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06} y={0} x={i % 2 === 0 ? -80 : 80}>
            <FeatureCard item={f} />
          </Reveal>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {s.languages.map((l, i) => (
          <Reveal
            key={l.name}
            delay={i * 0.05}
            y={0}
            x={i % 2 === 0 ? -64 : 64}
            className={l.span || ""}
          >
            <SkillTile item={l} certifiedLabel={certifiedLabel} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-5 rounded-2xl border border-line bg-surface/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
            <Sparkles className="h-3.5 w-3.5" /> {s.moreLabel}
          </div>
          <div className="mt-6 divide-y divide-line">
            {s.more.map((g) => {
              const GIcon = ICONS[g.icon];
              return (
                <div
                  key={g.group}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:gap-6"
                >
                  <div className="flex items-center gap-2.5 md:w-56 md:shrink-0">
                    {GIcon && <GIcon className="h-4 w-4 text-accent" />}
                    <span className="text-sm font-medium">{g.group}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <span
                        key={it.name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/40 px-3 py-1.5 text-sm text-muted"
                      >
                        {it.name}
                        {it.certified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  SERTİFİKALAR                                                       */
/* ================================================================== */
function CertificateCard({ cert, labels }) {
  const Icon = ICONS[cert.icon] || Award;
  return (
    <a
      href={cert.file}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface/40 p-7 transition-all duration-500 hover:-translate-y-1 hover:border-[#34343c] hover:bg-surface"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-elevated text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
          <BadgeCheck className="h-3.5 w-3.5" /> {labels.verified}
        </span>
      </div>

      <h3 className="mt-7 font-display text-xl leading-snug tracking-tight">
        {cert.title}
      </h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Award className="h-4 w-4 text-faint" /> {cert.issuer}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> {cert.date}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono">
          <Hash className="h-3.5 w-3.5" /> {cert.code}
        </span>
      </div>

      <div className="mt-auto border-t border-line pt-5">
        <div className="text-[10px] uppercase tracking-wider text-faint">
          {labels.validates}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-ink px-3 py-1 text-sm font-medium text-canvas">
            {cert.skill}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors group-hover:text-ink">
            <FileText className="h-4 w-4" />
            {labels.view}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function Certificates() {
  const { t } = useLang();
  const c = t.certificates;
  const scrollerRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const labels = { verified: c.verified, validates: c.validates, view: c.view };

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, []);

  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.9;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const Arrow = ({ dir, disabled, side }) => (
    <button
      type="button"
      onClick={() => scrollByCard(dir)}
      disabled={disabled}
      aria-label={dir < 0 ? c.prev : c.next}
      className={`absolute top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/80 text-ink backdrop-blur transition hover:border-accent hover:bg-elevated disabled:pointer-events-none disabled:opacity-0 md:flex ${
        side === "left" ? "-left-2 lg:-left-5" : "-right-2 lg:-right-5"
      }`}
    >
      {dir < 0 ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <section id="sertifikalar" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={c.index} title={c.title} kicker={c.kicker} />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="relative mt-14 md:mt-16">
          <Arrow dir={-1} disabled={atStart} side="left" />
          <Arrow dir={1} disabled={atEnd} side="right" />

          <div
            ref={scrollerRef}
            onScroll={updateArrows}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {c.items.map((cert) => (
              <div
                key={cert.code}
                data-card
                className="shrink-0 snap-start basis-[85%] sm:basis-[47%] lg:basis-[31.5%]"
              >
                <CertificateCard cert={cert} labels={labels} />
              </div>
            ))}
          </div>

          {/* Mobilde alt-orta gezinme okları */}
          <div className="mt-7 flex items-center justify-center gap-4 md:hidden">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label={c.prev}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink transition hover:border-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label={c.next}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink transition hover:border-accent disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  PROJE GÖRSELLERİ (mock arayüzler)                                  */
/* ================================================================== */
function WindowDots() {
  return (
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
    </div>
  );
}

function ClipboardMock() {
  const { t } = useLang();
  const m = t.mock;
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <ClipboardList className="h-3.5 w-3.5" /> AIO Hybrid Clipboard
        </div>
        <span className="ml-auto rounded-md border border-line px-2 py-1 font-mono text-[10px] text-faint">
          ALT + SPACE
        </span>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-sm text-faint">
          <Search className="h-4 w-4" /> {m.search}
        </div>
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            1
          </span>
          <Code2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            git commit -m "perf: 0.5ms timer"
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+1
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            2
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#26262c] to-[#16161a] text-faint">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-canvas">
                OCR
              </span>
              <span className="truncate text-xs text-ink/90">
                Fatura No: 2026-0192
              </span>
            </div>
            <div className="truncate text-[10px] text-faint">{m.ocrCaption}</div>
          </div>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+2
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            3
          </span>
          <Link2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            github.com/Layellie
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+3
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <ScanText className="h-3.5 w-3.5" /> {m.ocrEngine}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">
          {m.reverse}
        </span>
      </div>
    </div>
  );
}

function TimerMock() {
  const { t } = useLang();
  const m = t.mock;
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <Gauge className="h-3.5 w-3.5" /> StandbyAndTimer
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] text-faint">
          <Lock className="h-3 w-3" /> {m.admin}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5">
        <div className="col-span-2 rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-faint">
              {m.timerRes}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              <Lock className="h-3 w-3" /> {m.locked}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="font-display text-5xl leading-none tracking-tight md:text-6xl">
              0.50
            </span>
            <span className="mb-1 text-lg text-muted">ms</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <MemoryStick className="h-4 w-4" /> {m.standbyMem}
          </div>
          <div className="mt-3 font-display text-2xl">3.4 GB</div>
          <div className="mt-1 text-[11px] text-faint">{m.cleared}</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-[82%] rounded-full bg-accent" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <Gamepad2 className="h-4 w-4" /> {m.gameMode}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent px-0.5">
              <span className="ml-auto h-4 w-4 rounded-full bg-canvas" />
            </span>
            <span className="text-sm text-ink">{m.on}</span>
          </div>
          <div className="mt-2 text-[11px] text-faint">{m.affinity}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> NtSetTimerResolution · Win32 P/Invoke
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">MVVM</span>
      </div>
    </div>
  );
}

const VISUALS = { clipboard: ClipboardMock, standby: TimerMock };

/* ================================================================== */
/*  GitHub canlı istatistik şeridi                                     */
/* ================================================================== */
// Görünüme girince 0'dan hedef değere sayan animasyonlu sayaç.
function Counter({ value, duration = 2.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-40px" });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) {
      setDisplay(0);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);
  return <span ref={ref}>{display}</span>;
}

function GithubStats({ stats }) {
  const { t } = useLang();
  const labels = t.projects.stats;
  const cards = [
    { icon: FolderGit2, value: stats.repos, label: labels.repos },
    { icon: Star, value: stats.stars, label: labels.stars },
    { icon: Users, value: stats.followers, label: labels.followers },
  ];
  return (
    <Reveal>
      <div className="mt-16 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {cards.map((c) => (
          <a
            key={c.label}
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-1 bg-surface p-5 transition-colors hover:bg-elevated md:p-7"
          >
            <c.icon className="h-5 w-5 text-accent" />
            <div className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
              <Counter value={c.value} />
              {c.value > 0 && <span className="text-accent">+</span>}
            </div>
            <div className="text-xs uppercase tracking-wider text-faint">
              {c.label}
            </div>
          </a>
        ))}
      </div>
    </Reveal>
  );
}

function ContributionGraph() {
  const { t } = useLang();
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <Reveal>
      <div className="mt-5 rounded-2xl border border-line bg-surface/40 p-6 md:p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
          <Github className="h-3.5 w-3.5" /> {t.projects.contributions}
        </div>
        <div className="mt-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <img
            src={`https://ghchart.rshah.org/d6ff3f/${IDENTITY.githubUser}`}
            alt={t.projects.contributions}
            loading="lazy"
            onError={() => setOk(false)}
            className="w-full min-w-[680px] opacity-90"
          />
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  GITHUB REPOLARI — otomatik çekilen "daha fazlası" grid'i           */
/* ================================================================== */
const LANG_COLORS = {
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  PHP: "#4F5D95",
  Python: "#3572A5",
  Shell: "#89e051",
  Batchfile: "#C1F12E",
  PowerShell: "#012456",
};

function RepoCard({ repo, noDesc }) {
  const license =
    repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : null;
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface/40 p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#34343c] hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          <FolderGit2 className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{repo.name}</span>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">
        {repo.description || noDesc}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-faint">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: LANG_COLORS[repo.language] || "#8b8b94" }}
            />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5" /> {repo.stargazers_count}
        </span>
        {license && (
          <span className="ml-auto rounded-full border border-line px-2 py-0.5">
            {license}
          </span>
        )}
      </div>
    </a>
  );
}

function MoreRepos({ repos, labels }) {
  if (!repos.length) return null;
  return (
    <Reveal delay={0.1}>
      <div className="mt-12 md:mt-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
          <Sparkles className="h-3.5 w-3.5" /> {labels.title}
        </div>
        <p className="mt-2 text-sm text-muted">{labels.subtitle}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((r) => (
            <RepoCard key={r.id} repo={r} noDesc={labels.noDesc} />
          ))}
        </div>

        <div className="mt-6">
          <a
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            className="group/btn inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <Github className="h-4 w-4" /> {labels.viewAll}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
          </a>
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  PROJELER                                                           */
/* ================================================================== */
function ProjectCard({ project, num, reverse, viewLabel }) {
  const Visual = VISUALS[project.id];
  return (
    <Reveal y={0} x={reverse ? 90 : -90}>
      <article className="group grid grid-cols-1 items-center gap-8 rounded-3xl border border-line bg-surface/30 p-6 transition-colors duration-500 hover:border-[#33333a] md:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10">
        <div className={`lg:col-span-6 ${reverse ? "lg:order-2" : ""}`}>
          {Visual && <Visual />}
        </div>

        <div className={`lg:col-span-6 ${reverse ? "lg:order-1" : ""}`}>
          <div className="flex flex-wrap items-center gap-3 text-xs text-faint">
            <span className="font-mono text-accent">({num})</span>
            <span className="h-px w-8 bg-line" />
            <span className="text-muted">{project.type}</span>
            <span>·</span>
            <span>{project.year}</span>
            <span className="ml-auto rounded-full border border-line px-2 py-0.5">
              {project.license}
            </span>
          </div>

          <h3 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[0.95] tracking-tight">
            {project.name}
          </h3>

          <p className="mt-4 max-w-xl leading-relaxed text-muted md:text-lg">
            {project.description}
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {project.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-2">
            {project.stack.map((stk) => (
              <span
                key={stk}
                className="rounded-full border border-line bg-canvas/40 px-3 py-1 font-mono text-xs text-muted"
              >
                {stk}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="group/btn inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-ink hover:text-canvas"
            >
              <Github className="h-4 w-4" /> {viewLabel}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
            </a>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function Projects() {
  const { t } = useLang();
  const p = t.projects;
  const { stats, repos } = useGithub(IDENTITY.githubUser, IDENTITY.statsFallback);

  // Flagship projeler elde küratörlü; geri kalan repolar otomatik listelenir.
  const moreRepos = useMemo(() => {
    const featured = new Set(
      p.items.map((it) => it.github.split("/").pop().toLowerCase())
    );
    return repos
      .filter(
        (r) =>
          !r.fork &&
          !r.archived &&
          !r.name.toLowerCase().endsWith(".github.io") && // sitenin kendi reposu
          !featured.has(r.name.toLowerCase())
      )
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          new Date(b.pushed_at) - new Date(a.pushed_at)
      )
      .slice(0, 6);
  }, [repos, p.items]);

  return (
    <section id="projeler" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={p.index} title={p.title} kicker={p.kicker} />
      </Reveal>

      <GithubStats stats={stats} />

      <ContributionGraph />

      <div className="mt-8 space-y-8 md:mt-12 md:space-y-12">
        {p.items.map((proj, i) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            num={String(i + 1).padStart(2, "0")}
            reverse={i % 2 === 1}
            viewLabel={p.view}
          />
        ))}
      </div>

      <MoreRepos repos={moreRepos} labels={p.more} />
    </section>
  );
}

/* ================================================================== */
/*  İLETİŞİM                                                           */
/* ================================================================== */
function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi reddedilirse sessizce geç */
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
    >
      <Mail className="h-4 w-4" />
      <span className="font-mono">{email}</span>
      {copied ? (
        <Check className="h-4 w-4 text-accent" />
      ) : (
        <Copy className="h-4 w-4 text-faint" />
      )}
    </button>
  );
}

function Contact() {
  const { t } = useLang();
  const c = t.contact;
  return (
    <section id="iletisim" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="font-mono text-accent">({c.index})</span>
          <span>{c.label}</span>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <a href={`mailto:${IDENTITY.email}`} className="group mt-10 block">
          <span className="block font-display text-[clamp(3rem,13vw,11.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]">
            {c.big[0]}
          </span>
          <span className="mt-1 flex items-end gap-4 font-display text-[clamp(3rem,13vw,11.5rem)] font-semibold leading-[0.82] tracking-[-0.03em]">
            <span className="transition-colors duration-300 group-hover:text-accent">
              {c.big[1]}
            </span>
            <ArrowUpRight className="mb-2 h-[0.5em] w-[0.5em] text-muted transition-all duration-300 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:text-accent" />
          </span>
        </a>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-16 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md leading-relaxed text-muted">{c.blurb}</p>
          <div className="flex flex-wrap items-center gap-3">
            <CopyEmail email={IDENTITY.email} />
            <a
              href={IDENTITY.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a
              href={IDENTITY.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm transition-colors hover:bg-surface"
            >
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  FOOTER                                                             */
/* ================================================================== */
function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 border-t border-line">
      <div
        className={`${WRAP} flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted md:flex-row`}
      >
        <span>
          © 2026 Samet Kaşmer —{" "}
          <span className="text-faint">@{IDENTITY.handle}</span>
        </span>
        <div className="flex items-center gap-5">
          <a
            href={IDENTITY.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="transition-colors hover:text-ink"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href={IDENTITY.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="transition-colors hover:text-ink"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a href="#top" className="transition-colors hover:text-ink">
            {t.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================== */
/*  Arka plan: meteor / yıldız kayması animasyonu                      */
/* ================================================================== */
function Meteors({ count = 10 }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100, // %
        top: -10 - Math.random() * 30, // % (ekranın üstünde başlar)
        delay: Math.random() * 8, // s
        duration: 3.5 + Math.random() * 6, // s
        tail: 110 + Math.random() * 170, // px — izin uzunluğu
      })),
    [count]
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {meteors.map((m, i) => (
        <span
          key={i}
          className="meteor"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            height: `${m.tail}px`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  KOMUT PALETİ (⌘K / Ctrl+K)                                         */
/* ================================================================== */
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
const META_LABEL = IS_MAC ? "⌘" : "Ctrl";

function CommandPalette() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const activeRef = useRef(null);

  const commands = useMemo(() => {
    const go = (href) => () => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    const sections = NAV_KEYS.map((n) => ({
      id: n.href,
      label: t.nav[n.key],
      hint: t.cmd.goto,
      icon: ChevronRight,
      action: go(n.href),
    }));
    return [
      ...sections,
      {
        id: "lang",
        label:
          lang === "tr" ? "Switch to English" : "Türkçe'ye geç",
        hint: t.cmd.lang,
        icon: Languages,
        action: () => setLang(lang === "tr" ? "en" : "tr"),
      },
      {
        id: "email",
        label: IDENTITY.email,
        hint: t.cmd.copyEmail,
        icon: Copy,
        action: () => navigator.clipboard?.writeText(IDENTITY.email),
      },
      {
        id: "github",
        label: `GitHub · @${IDENTITY.githubUser}`,
        hint: t.cmd.open,
        icon: Github,
        action: () => window.open(IDENTITY.github, "_blank", "noopener"),
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        hint: t.cmd.open,
        icon: Linkedin,
        action: () => window.open(IDENTITY.linkedin, "_blank", "noopener"),
      },
      {
        id: "top",
        label: t.cmd.toTop,
        hint: "",
        icon: ArrowUpRight,
        action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
    ];
  }, [t, lang, setLang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint || "").toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener("keydown", onKey);
    window.addEventListener("toggle-cmdk", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("toggle-cmdk", onToggle);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (cmd) => {
    setOpen(false);
    setTimeout(() => cmd.action(), 0);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[index]) run(filtered[index]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t.cmd.placeholder}
                className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-faint"
              />
              <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
                ESC
              </kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-faint">
                  {t.cmd.empty}
                </div>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      ref={i === index ? activeRef : null}
                      onMouseMove={() => setIndex(i)}
                      onClick={() => run(cmd)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        i === index
                          ? "bg-elevated text-ink"
                          : "text-muted hover:bg-elevated/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wider text-faint">
                          {cmd.hint}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================== */
/*  APP                                                                */
/* ================================================================== */
/* ================================================================== */
/*  İNTERAKTİF TERMINAL — ziyaretçi komut yazarak siteyi keşfeder      */
/* ================================================================== */
const TERMINAL_CMDS = [
  "help",
  "whoami",
  "about",
  "skills",
  "projects",
  "certs",
  "contact",
  "social",
  "date",
  "clear",
];

function Terminal() {
  const { t, lang } = useLang();
  const tt = t.terminal;
  const prompt = `${tt.user}@${tt.host}:~$`;

  const bootLines = useMemo(
    () => [
      { tone: "accent", text: tt.welcome },
      { tone: "muted", text: tt.hint },
    ],
    [tt.welcome, tt.hint]
  );

  const [lines, setLines] = useState(bootLines);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // dil değişince terminali baştan başlat
  useEffect(() => {
    setLines(bootLines);
    setInput("");
    setHist([]);
    setHistIdx(-1);
  }, [bootLines]);

  // her yeni çıktıda en alta kaydır
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const out = (text, tone = "out") => ({ text, tone });

  function runCommand(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const [name, ...rest] = trimmed.toLowerCase().split(/\s+/);

    switch (name) {
      case "help":
        return [
          out(tt.helpTitle, "accent"),
          ...TERMINAL_CMDS.map((c) =>
            out(`  ${c.padEnd(10)} ${tt.cmds[c] || ""}`)
          ),
        ];
      case "whoami":
        return [
          out(`${IDENTITY.name} · @${IDENTITY.handle}`, "accent"),
          out(t.hero.role),
        ];
      case "about":
        return t.about.facts.map((f) =>
          out(`${(f.label + ":").padEnd(18)}${f.value}`)
        );
      case "skills":
        return [
          out(`${tt.labels.langs}:`, "accent"),
          ...t.skills.languages.map((l) => out(`  ▸ ${l.name.padEnd(8)}${l.note}`)),
          out(""),
          out(`${tt.labels.focus}:`, "accent"),
          ...t.skills.focus.map((f) => out(`  ▸ ${f.title}`)),
        ];
      case "projects":
        return t.projects.items.flatMap((p) => [
          out(`  ▸ ${p.name} (${p.year}) — ${p.type}`, "accent"),
          out(`    ${p.github}`, "link"),
        ]);
      case "certs":
        return [
          out(
            `${t.certificates.items.length} ${tt.labels.certCount}:`,
            "accent"
          ),
          ...t.certificates.items.map((c) =>
            out(`  ✓ ${c.title}  ·  ${c.date}`)
          ),
        ];
      case "contact":
        return [
          out(`email     ${IDENTITY.email}`),
          out(`github    ${IDENTITY.github}`, "link"),
          out(`linkedin  ${IDENTITY.linkedin}`, "link"),
        ];
      case "social":
        return [
          out(`github    ${IDENTITY.github}`, "link"),
          out(`linkedin  ${IDENTITY.linkedin}`, "link"),
        ];
      case "date":
        return [
          out(
            new Date().toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          ),
        ];
      case "echo":
        return [out(rest.join(" "))];
      case "sudo":
        return [out(tt.labels.sudo, "error")];
      case "clear":
        return "CLEAR";
      default:
        return [out(`${tt.notFound}: ${name}`, "error"), out(tt.tryHelp, "muted")];
    }
  }

  function submit() {
    const raw = input;
    const result = runCommand(raw);
    if (result === "CLEAR") {
      setLines([]);
      setInput("");
      setHistIdx(-1);
      return;
    }
    setLines((prev) => [...prev, { tone: "cmd", text: raw }, ...result]);
    if (raw.trim()) setHist((h) => [...h, raw]);
    setHistIdx(-1);
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hist.length) return;
      const idx = histIdx === -1 ? hist.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(hist[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= hist.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(idx);
        setInput(hist[idx]);
      }
    }
  }

  const toneClass = {
    out: "text-muted",
    accent: "text-accent",
    muted: "text-faint",
    error: "text-red-400",
    link: "text-ink/70",
  };

  return (
    <section id="terminal" className={`${WRAP} scroll-mt-28 py-28 md:py-40`}>
      <Reveal>
        <SectionHeader index={tt.index} title={tt.title} kicker={tt.kicker} />
      </Reveal>

      <Reveal y={36} delay={0.05}>
        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-[#0b0b0e] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
          {/* başlık çubuğu */}
          <div className="flex items-center gap-3 border-b border-line bg-surface/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="mx-auto select-none font-mono text-xs text-faint">
              {tt.user}@{tt.host}: ~
            </span>
          </div>

          {/* gövde */}
          <div
            ref={bodyRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[340px] cursor-text overflow-y-auto p-4 font-mono text-[13px] leading-relaxed md:h-[400px] md:p-5"
          >
            {lines.map((l, i) =>
              l.tone === "cmd" ? (
                <div key={i} className="flex gap-2 break-all">
                  <span className="shrink-0 text-accent">{prompt}</span>
                  <span className="text-ink">{l.text}</span>
                </div>
              ) : (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-words ${
                    toneClass[l.tone] || "text-muted"
                  }`}
                >
                  {l.text || " "}
                </div>
              )
            )}

            {/* aktif giriş satırı */}
            <div className="flex gap-2">
              <span className="shrink-0 text-accent">{prompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                aria-label="terminal"
                className="flex-1 bg-transparent text-ink caret-accent outline-none"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "tr";
    return window.localStorage.getItem("lang") || "tr";
  });

  useEffect(() => {
    window.localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = CONTENT[lang];

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      <ScrollProgress />
      <CommandPalette />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% -10%, rgba(214,255,63,0.07), transparent 70%)",
        }}
      />
      <Meteors />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.035]"
        style={{ backgroundImage: NOISE }}
      />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <Marquee />
        <About />
        <Skills />
        <Certificates />
        <Projects />
        <Terminal />
        <Contact />
      </main>

      <Footer />
    </LangCtx.Provider>
  );
}
