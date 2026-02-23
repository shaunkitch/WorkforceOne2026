"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Lock,
  Zap,
  CheckCircle2,
  Users,
  Globe,
  Clock,
  ShieldCheck,
  Smartphone,
  LayoutDashboard,
  CreditCard,
  FileText,
  MapPin,
  Bell,
  ClipboardList,
  Truck,
  TrendingUp,
  Star,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// --- Currency Detection ---
type CurrencyInfo = {
  symbol: string;
  code: string;
  rate: number; // Rate relative to USD
  flag: string;
};

const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  ZA: { symbol: "R", code: "ZAR", rate: 18.5, flag: "🇿🇦" },
  GB: { symbol: "£", code: "GBP", rate: 0.79, flag: "🇬🇧" },
  DE: { symbol: "€", code: "EUR", rate: 0.92, flag: "🇩🇪" },
  FR: { symbol: "€", code: "EUR", rate: 0.92, flag: "🇫🇷" },
  NL: { symbol: "€", code: "EUR", rate: 0.92, flag: "🇳🇱" },
  AU: { symbol: "A$", code: "AUD", rate: 1.55, flag: "🇦🇺" },
  CA: { symbol: "C$", code: "CAD", rate: 1.36, flag: "🇨🇦" },
  NG: { symbol: "₦", code: "NGN", rate: 1580, flag: "🇳🇬" },
  IN: { symbol: "₹", code: "INR", rate: 83, flag: "🇮🇳" },
  US: { symbol: "$", code: "USD", rate: 1, flag: "🇺🇸" },
};
const DEFAULT_CURRENCY: CurrencyInfo = { symbol: "$", code: "USD", rate: 1, flag: "🌍" };

// --- Animated Counter ---
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// --- Feature Tabs ---
const FEATURE_TABS = [
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    color: "purple",
    title: "Security & Patrol Management",
    description: "Real-time command centre for security companies. GPS-tracked patrols with live map views, NFC/QR checkpoint scanning, and instant incident reporting from the field.",
    points: [
      "Live GPS tracking for all active officers",
      "NFC & QR code checkpoint verification",
      "Instant incident reports with photo evidence",
      "Automated patrol schedule & compliance alerts",
      "Control room one-touch call button",
    ],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    icon: CreditCard,
    color: "blue",
    title: "Global HR & Payroll",
    description: "Manage a distributed workforce with ease. Automate payroll, handle multi-currency payments (ZAR/USD/EUR), and maintain digital employee files.",
    points: [
      "Multi-currency payroll (ZAR, USD, EUR, GBP)",
      "Digital employee files & contracts",
      "Automated payslip generation & PDF export",
      "Leave management & approval workflows",
      "Clock-in/out with GPS verification",
    ],
  },
  {
    id: "crm",
    label: "Field CRM",
    icon: Users,
    color: "orange",
    title: "Field Sales & CRM",
    description: "Empower your field reps with tools that work even without signal. Schedule client visits, capture leads offline, and generate quotes on the go.",
    points: [
      "Client visit scheduling & recurring routes",
      "Offline lead capture with auto-sync",
      "In-app quote & invoice generation",
      "WhatsApp/email quote sharing",
      "GPS auto-generated client coordinates",
    ],
  },
  {
    id: "ops",
    label: "Operations",
    icon: ClipboardList,
    color: "green",
    title: "Operations & Logistics",
    description: "Digitize every workflow. Create custom mobile forms for audits, inspections, barcode scanning, and inventory — no coding required.",
    points: [
      "Drag-and-drop mobile form builder",
      "Barcode & QR code scanning in forms",
      "GPS location capture on every submission",
      "Photo, signature & file uploads",
      "CSV export & submission dashboard",
    ],
  },
];

export default function IndexPage() {
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [isAnnual, setIsAnnual] = useState(true);
  const [activeTab, setActiveTab] = useState("security");
  const [detectedCountry, setDetectedCountry] = useState("");

  // Geo-currency detection
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const countryCode = data.country_code as string;
        setDetectedCountry(data.country_name || "");
        if (CURRENCY_MAP[countryCode]) {
          setCurrency(CURRENCY_MAP[countryCode]);
        }
      })
      .catch(() => {/* fallback to USD */ });
  }, []);

  const formatPrice = (usdPrice: number) => {
    const converted = usdPrice * currency.rate;
    if (converted < 10) return `${currency.symbol}${converted.toFixed(2)}`;
    // Always use 'en-US' locale to prevent server/client hydration mismatch
    if (converted >= 1000) return `${currency.symbol}${Math.round(converted).toLocaleString('en-US')}`;
    return `${currency.symbol}${Math.round(converted)}`;
  };

  const growthMonthly = isAnnual ? 9 : 12;
  const proMonthly = isAnnual ? 18 : 22;

  const activeFeature = FEATURE_TABS.find((t) => t.id === activeTab)!;
  const ActiveIcon = activeFeature.icon;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-black overflow-x-hidden">
      <SiteHeader />
      <main className="flex-1">

        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-20 md:pt-32 pb-32">
          {/* Background Gradients */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

          <div className="container relative z-10 flex flex-col items-center text-center">

            {/* Logo Mark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mb-8 flex flex-col items-center gap-3"
            >
              {/* SVG Logo Mark — four squares forming a W/grid motif */}
              <div className="flex items-center gap-3">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="18" height="18" rx="4" fill="#2563eb" />
                  <rect x="24" y="2" width="18" height="18" rx="4" fill="#3b82f6" opacity="0.7" />
                  <rect x="2" y="24" width="18" height="18" rx="4" fill="#3b82f6" opacity="0.7" />
                  <rect x="24" y="24" width="18" height="18" rx="4" fill="#2563eb" />
                  <path d="M7 11 L11 15 L15 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M29 11 L33 15 L37 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 33 L11 37 L15 31" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="33" cy="33" r="4" fill="white" />
                </svg>
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Workforce<span className="text-blue-600">One</span>
                </span>
              </div>

              <Badge variant="outline" className="px-4 py-1.5 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium backdrop-blur-md">
                ✦ Trusted by 2,400+ field teams in 47 countries
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 dark:text-white max-w-5xl text-balance mb-6"
            >
              One Platform.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Every Field Operation.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed text-balance mb-10"
            >
              Stop juggling spreadsheets, WhatsApp groups, and disconnected tools.
              WorkforceOne gives your team a live command centre for{" "}
              <strong className="text-slate-700 dark:text-slate-200">Security Patrols</strong>,{" "}
              <strong className="text-slate-700 dark:text-slate-200">HR &amp; Payroll</strong>,{" "}
              <strong className="text-slate-700 dark:text-slate-200">Logistics</strong>, and{" "}
              <strong className="text-slate-700 dark:text-slate-200">Field Sales</strong> —{" "}
              all in one place, working offline.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4"
            >
              <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 bg-blue-600 hover:bg-blue-700">
                <Link href="/signup">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-800">
                <Link href="#features">See How It Works</Link>
              </Button>
            </motion.div>

            {detectedCountry && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-xs text-slate-400 mb-12"
              >
                {currency.flag} Showing prices in <strong>{currency.code}</strong> for {detectedCountry}
              </motion.p>
            )}

            {/* CSS 3D Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 10 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 relative w-full max-w-6xl perspective-1000"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden hover:shadow-blue-500/10 transition-all duration-700 ease-out group"
                style={{ transformStyle: "preserve-3d", transform: "rotateX(10deg)" }}
              >
                {/* Header Bar Mock */}
                <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-400 font-mono">app.workforceone.com/dashboard</div>
                </div>
                {/* Content Image */}
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2600&auto=format&fit=crop"
                  alt="WorkforceOne Dashboard"
                  className="w-full h-auto object-cover opacity-90"
                />

                {/* Floating badge — patrol active */}
                <div className="absolute top-1/4 -right-6 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <ShieldCheck className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white">Patrol Active</div>
                      <div className="text-xs text-slate-500">Site A · 3 officers</div>
                    </div>
                  </div>
                </div>

                {/* Floating badge — invoice sent */}
                <div className="absolute bottom-1/4 -left-6 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float-delayed hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <TrendingUp className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white">Invoice Sent</div>
                      {/* suppressHydrationWarning: currency.rate is set client-side via geo-detection */}
                      <div className="text-xs text-slate-500" suppressHydrationWarning>{currency.symbol}{Math.round(12500 * currency.rate).toLocaleString('en-US')} · Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- STATS STRIP --- */}
        <section className="py-16 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { icon: Users, label: "Field Workers Managed", target: 2400, suffix: "+" },
                { icon: Globe, label: "Countries Deployed", target: 47, suffix: "" },
                { icon: ClipboardList, label: "Forms Submitted Daily", target: 18000, suffix: "+" },
                { icon: Star, label: "Average Rating", target: 49, suffix: "/5.0", display: "4.9" },
              ].map(({ icon: Icon, label, target, suffix, display }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    {display ? display : <AnimatedCounter target={target} suffix={suffix} />}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- MODULAR FEATURES (BENTO GRID) --- */}
        <section id="features" className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
              <Badge variant="secondary" className="mb-4">Modular Architecture</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white">Build your perfect platform</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                WorkforceOne isn't just one app — it's a suite of powerful modules that work together seamlessly. Enable what you need, hide what you don't.
              </p>
            </div>

            <BentoGrid className="max-w-6xl mx-auto">
              <BentoGridItem
                title="Global Payroll & HR"
                description="Automate payroll for remote teams, handle multi-currency payments, and maintain digital employee files — including leave and payslips."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-500" />}
                icon={<CreditCard className="h-8 w-8 text-blue-500" />}
                className="md:col-span-1 group"
              />
              <BentoGridItem
                title="Security & Patrol Management"
                description="Real-time command centre. GPS-tracked patrols, NFC/QR checkpoints, and instant incident reporting from the field app."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 group-hover:from-purple-500/30 group-hover:to-indigo-500/30 transition-all duration-500" />}
                icon={<ShieldCheck className="h-8 w-8 text-purple-500" />}
                className="md:col-span-2 group"
              />
              <BentoGridItem
                title="Field Sales & CRM"
                description="Empower your field reps. Schedule client visits, track locations, capture leads offline, and generate quotes on the go."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 group-hover:from-orange-500/30 group-hover:to-rose-500/30 transition-all duration-500" />}
                icon={<Users className="h-8 w-8 text-orange-500" />}
                className="md:col-span-2 group"
              />
              <BentoGridItem
                title="Operations & Logistics"
                description="Digitize every workflow. Custom mobile forms for audits, inspections, barcode scanning, and inventory. No coding required."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all duration-500" />}
                icon={<LayoutDashboard className="h-8 w-8 text-green-500" />}
                className="md:col-span-1 group"
              />
            </BentoGrid>
          </div>
        </section>

        {/* --- FEATURE DEEP DIVE (TABBED) --- */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-blue-500/30 text-blue-600 dark:text-blue-400">Explore Each Module</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900 dark:text-white">Every tool your field team needs</h2>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {FEATURE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ActiveIcon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeFeature.title}</h3>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{activeFeature.description}</p>
                <ul className="space-y-3">
                  {activeFeature.points.map((point, i) => (
                    <motion.li
                      key={point}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      {point}
                    </motion.li>
                  ))}
                </ul>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>

              {/* Visual panel */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl blur-2xl opacity-20 transform rotate-2"></div>
                <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{activeFeature.title}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Live</span>
                  </div>
                  {activeFeature.points.map((point, i) => (
                    <motion.div
                      key={point}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{point}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- ENTERPRISE CAPABILITIES --- */}
        <section className="py-24 bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <Badge variant="outline" className="border-purple-500 text-purple-600">Enterprise Ready</Badge>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Your Brand.<br />Your Infrastructure.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  We built WorkforceOne for scale. Unlike rigid SaaS tools, we adapt to your operational requirements — not the other way around.
                </p>

                <div className="space-y-6">
                  {[
                    { icon: Zap, color: "blue", title: "Full White-Labeling", body: "Custom domain, logos, and color themes. Your workforce sees your brand — not ours." },
                    { icon: Lock, color: "green", title: "Flexible Deployment", body: "Secure Cloud, Private VPC, or fully On-Premise. We deploy where your data needs to live." },
                    { icon: Smartphone, color: "orange", title: "Offline-First Mobile", body: "Field operations don't stop when the signal drops. Works 100% offline and syncs when back online." },
                  ].map(({ icon: Icon, color, title, body }) => (
                    <div key={title} className="flex gap-4 group">
                      <div className={`mt-1 bg-${color}-100 dark:bg-${color}-900/30 p-2 rounded-lg h-fit group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 text-${color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl blur-2xl opacity-20 transform rotate-3"></div>
                <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 aspect-square flex flex-col justify-center items-center text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                    <span className="text-white text-4xl font-bold">W1</span>
                  </div>
                  <div>
                    <div className="text-sm font-mono text-slate-400 mb-2">whitelabel_config.json</div>
                    <div className="text-left bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 w-full max-w-sm mx-auto">
                      <p><span className="text-purple-600">"brand_name"</span>: <span className="text-green-600">"Acme Security"</span>,</p>
                      <p><span className="text-purple-600">"primary_color"</span>: <span className="text-green-600">"#FF5733"</span>,</p>
                      <p><span className="text-purple-600">"deployment_mode"</span>: <span className="text-green-600">"ON_PREMISE"</span>,</p>
                      <p><span className="text-purple-600">"features"</span>: [</p>
                      <p className="pl-4"><span className="text-green-600">"patrols"</span>, <span className="text-green-600">"checkpoints"</span></p>
                      <p>]</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- PRICING --- */}
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="container">
            <div className="flex flex-col items-center justify-center text-center mb-12 space-y-4">
              <Badge variant="secondary" className="mb-2">Simple, Transparent Pricing</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white">
                Pay only for what you use
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Per-user pricing that scales with your team. No hidden fees. Cancel anytime.
              </p>

              {/* Annual / Monthly Toggle */}
              <div className="flex items-center gap-4 mt-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1.5 shadow-sm">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isAnnual ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}
                >
                  Annual
                  <span className="ml-2 bg-green-500/20 text-green-600 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">-25%</span>
                </button>
              </div>

              {detectedCountry && (
                <p className="text-xs text-slate-400">
                  {currency.flag} Prices shown in <strong>{currency.code}</strong>
                  <button
                    onClick={() => setCurrency(DEFAULT_CURRENCY)}
                    className="ml-2 text-blue-500 hover:underline"
                  >
                    Switch to USD
                  </button>
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter */}
              <PricingCard
                name="Starter"
                price="Free"
                subtext="Forever"
                description="For small teams getting started."
                currency={currency}
                features={[
                  "Up to 5 team members",
                  "Mobile app access",
                  "Basic forms (10/month)",
                  "Clock-in / Clock-out",
                  "Email support",
                ]}
                cta="Start Free"
                href="/signup"
              />
              {/* Growth */}
              <PricingCard
                name="Growth"
                price={formatPrice(growthMonthly)}
                subtext={`/user/month · billed ${isAnnual ? "annually" : "monthly"}`}
                description="For growing businesses needing automation."
                popular
                features={[
                  "Up to 50 users",
                  "All core modules (HR, CRM, Forms)",
                  "Offline mobile sync",
                  "GPS clock-in verification",
                  "CSV export & reporting",
                  "Priority email support",
                ]}
                cta="Start Free Trial"
                href="/signup"
              />
              {/* Professional */}
              <PricingCard
                name="Professional"
                price={formatPrice(proMonthly)}
                subtext={`/user/month · billed ${isAnnual ? "annually" : "monthly"}`}
                description="For organizations needing full power."
                features={[
                  "Unlimited users",
                  "All modules + Security Patrol",
                  "White-labeling & custom branding",
                  "Full Invoicing & Quotes module",
                  "API access",
                  "Dedicated onboarding call",
                  "Priority phone & chat support",
                ]}
                cta="Contact Sales"
                href="/signup"
              />
            </div>

            {/* Enterprise Banner */}
            <div className="mt-8 max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white">
                <div>
                  <h3 className="text-xl font-bold mb-1">Enterprise & Custom Deployment</h3>
                  <p className="text-slate-400 text-sm">On-premise, private VPC, SLA guarantees, custom integrations, and a dedicated success manager.</p>
                </div>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full flex-shrink-0">
                  <Link href="mailto:hello@workforceone.com">Talk to Sales <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600 rounded-full blur-3xl opacity-20"></div>

          <div className="container relative z-10 flex flex-col items-center text-center">
            <Badge variant="outline" className="mb-6 border-white/20 text-white/80">No contract · Cancel anytime</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 max-w-3xl">
              Your field teams deserve
              <span className="text-blue-400"> better tools.</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mb-10">
              Join 2,400+ field workers already running smarter operations.
              Free to start — no credit card, no setup fees.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="h-16 px-10 text-lg rounded-full bg-white text-slate-900 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                <Link href="/signup">Get Started for Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-16 px-10 text-lg rounded-full border-white/20 text-white hover:bg-white/10">
                <Link href="mailto:hello@workforceone.com">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="18" height="18" rx="4" fill="#2563eb" />
              <rect x="24" y="2" width="18" height="18" rx="4" fill="#3b82f6" opacity="0.7" />
              <rect x="2" y="24" width="18" height="18" rx="4" fill="#3b82f6" opacity="0.7" />
              <rect x="24" y="24" width="18" height="18" rx="4" fill="#2563eb" />
              <path d="M7 11 L11 15 L15 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M29 11 L33 15 L37 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 33 L11 37 L15 31" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="33" cy="33" r="4" fill="white" />
            </svg>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              Workforce<span className="text-blue-600">One</span>
            </span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} WorkforceOne Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
            <Link href="#" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link href="mailto:hello@workforceone.com" className="hover:text-blue-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  name, price, subtext, description, features, popular, cta, href, currency
}: {
  name: string;
  price: string;
  subtext: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  href: string;
  currency?: CurrencyInfo;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative p-8 rounded-2xl border flex flex-col h-full ${popular
        ? "border-blue-600 shadow-2xl shadow-blue-500/10 bg-white dark:bg-slate-900 scale-105"
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded-full shadow-lg">
          Most Popular
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{description}</p>
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900 dark:text-white">{price}</span>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 mb-8">{subtext}</div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className={`w-full rounded-full ${popular
          ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
          : "bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
          }`}
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </motion.div>
  );
}