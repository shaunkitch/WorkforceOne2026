"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { motion } from "framer-motion";
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
  FileText
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function IndexPage() {
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="px-4 py-1.5 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-8 backdrop-blur-md">
                ✨ The Operating System for Field Operations
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 dark:text-white max-w-5xl text-balance mb-8"
            >
              One Platform. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Limitless Possibilities.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed text-balance mb-10"
            >
              From Payroll and HR to Security Patrols and CRM. WorkforceOne is the modular platform that grows with your business. Turn features on and off as you need them.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 bg-blue-600 hover:bg-blue-700">
                <Link href="/signup">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-800">
                <Link href="#features">Explore Modules</Link>
              </Button>
            </motion.div>

            {/* CSS 3D Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 10 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-20 relative w-full max-w-6xl perspective-1000"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out"
                style={{ transformStyle: "preserve-3d", transform: "rotateX(10deg)" }}
              >
                {/* Header Bar Mock */}
                <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-400 font-mono">dashboard.workforceone.com</div>
                </div>
                {/* Content Image */}
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2600&auto=format&fit=crop"
                  alt="Dashboard Interface"
                  className="w-full h-auto object-cover opacity-90"
                />

                {/* Floating Elements (Mock) */}
                <div className="absolute top-1/4 -right-12 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white">Audit Complete</div>
                      <div className="text-xs text-slate-500">Just now</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-1/4 -left-12 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 animate-float-delayed hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white">New Employee</div>
                      <div className="text-xs text-slate-500">Added via Mobile</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- MODULAR FEATURES (BENTO GRID) --- */}
        <section id="features" className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
              <Badge variant="secondary" className="mb-4">Modular Architecture</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white">Build your perfect platform</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                WorkforceOne isn't just one app. It's a suite of powerful modules that work together seamlessly.
                Enable what you need, hide what you don't.
              </p>
            </div>

            <BentoGrid className="max-w-6xl mx-auto">
              {/* Payroll */}
              <BentoGridItem
                title="Payroll & HR"
                description="Managing your team shouldn't be a headache. Automate specialized payroll runs, manage comprehensive employee profiles, and issue payslips in seconds."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20" />}
                icon={<CreditCard className="h-8 w-8 text-blue-500" />}
                className="md:col-span-1"
              />

              {/* Security - Featured Large Item */}
              <BentoGridItem
                title="Security & Patrols"
                description="Advanced guard management with GPS-tracked patrols, QR code checkpoints, and real-time incident reporting directly from the field."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20" />}
                icon={<ShieldCheck className="h-8 w-8 text-purple-500" />}
                className="md:col-span-2"
              />

              {/* CRM - Featured Large Item */}
              <BentoGridItem
                title="CRM & Sales"
                description="Track every client interaction. Schedule recurring visits, manage leads, and ensure your sales team is always at the right place at the right time."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20" />}
                icon={<Users className="h-8 w-8 text-orange-500" />}
                className="md:col-span-2"
              />

              {/* Operations */}
              <BentoGridItem
                title="Operations & Forms"
                description="The core of your business. Build custom forms with AI, track inventory, and manage audits with ease."
                header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20" />}
                icon={<LayoutDashboard className="h-8 w-8 text-green-500" />}
                className="md:col-span-1"
              />
            </BentoGrid>

          </div>
        </section>

        {/* --- COMPARISON / PRICING --- */}
        <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="container">
            <div className="flex flex-col items-center justify-center text-center mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Transparent Pricing</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">Choose the plan that fits your scale.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Basic */}
              <PricingCard
                name="Starter"
                price="$0"
                description="For small teams just getting started."
                features={['1 Admin User', 'Mobile App Access', 'Basic Forms', 'Up to 5 Team Members']}
              />
              {/* Pro */}
              <PricingCard
                name="Professional"
                price="$29"
                period="/mo"
                description="For growing businesses needing automation."
                popular
                features={['Unlimited Admins', 'All Modules Available', 'Advanced Automations', 'Priority Support', '50GB Storage']}
              />
              {/* Enterprise */}
              <PricingCard
                name="Enterprise"
                price="Custom"
                description="For large organizations with custom needs."
                features={['Dedicated Success Manager', 'Custom Integrations', 'SLA Guarantee', 'On-premise Deployment Options', '24/7 Phone Support']}
              />
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600 rounded-full blur-3xl opacity-20"></div>

          <div className="container relative z-10 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to transform your operations?</h2>
            <p className="text-xl text-slate-300 max-w-2xl mb-10">
              Join thousands of companies using WorkforceOne to streamline their field operations.
              Start your 14-day free trial today.
            </p>
            <Button asChild size="lg" className="h-16 px-10 text-lg rounded-full bg-white text-slate-900 hover:bg-slate-100 hover:text-blue-600 transition-colors">
              <Link href="/signup">Get Started for Free</Link>
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight">WorkforceOne</span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} WorkforceOne Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
            <Link href="#" className="hover:text-blue-600">Privacy</Link>
            <Link href="#" className="hover:text-blue-600">Terms</Link>
            <Link href="#" className="hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, popular }: any) {
  return (
    <div className={`relative p-8 rounded-2xl border ${popular ? 'border-blue-600 shadow-2xl scale-105 bg-white' : 'border-slate-200 bg-slate-50/50'} flex flex-col h-full`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded-full shadow-lg">
          Most Popular
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900">{name}</h3>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>
      <div className="mb-8 flex items-baseline">
        <span className="text-4xl font-bold text-slate-900">{price}</span>
        {period && <span className="text-slate-500 ml-1">{period}</span>}
      </div>
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className={`w-full ${popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
        Choose Plan
      </Button>
    </div>
  )
}