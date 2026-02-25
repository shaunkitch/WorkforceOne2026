"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FileText,
    Settings,
    Database,
    Users,
    BarChart3,
    BarChart2,
    Clock,
    Banknote,
    MapPin,
    Package,
    Briefcase,
    CalendarDays,
    Calendar,
    Receipt,
    ShieldCheck,
    AlertTriangle,
    ScanLine,
    ClipboardList,
    GitBranch,
    PieChart,
    ClipboardCheck,
} from "lucide-react";

const routes = [
    {
        label: "Overview",
        icon: LayoutDashboard,
        href: "",
        exact: true,
    },
    {
        label: "Analytics",
        icon: BarChart3,
        href: "/analytics",
    },
    {
        label: "Forms",
        icon: FileText,
        href: "/forms",
    },
    {
        label: "Sites & Locations",
        icon: MapPin,
        href: "/sites",
    },
    {
        label: "Inventory",
        icon: Package,
        href: "/inventory",
    },
    {
        label: "Clients",
        icon: Briefcase,
        href: "/clients",
    },
    {
        label: "Visits",
        icon: CalendarDays,
        href: "/visits",
    },
    {
        label: "Quotes",
        icon: Receipt,
        href: "/quotes",
    },
    {
        label: "Users",
        icon: Users,
        href: "/users",
    },
    {
        label: "Timesheets",
        icon: Clock,
        href: "/hr/timesheet",
    },
    {
        label: "Payroll",
        icon: Banknote,
        href: "/hr/payroll",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/settings",
    },
];

interface SidebarProps {
    orgId: string;
    brandColor?: string | null;
    logoUrl?: string | null;
    orgName?: string;
    features?: any;
}

export function Sidebar({ orgId, brandColor, logoUrl, orgName = "WorkforceOne", features = {} }: SidebarProps) {
    const pathname = usePathname();
    const bgColor = brandColor || "#0f172a"; // Default slate-900

    const groups = [
        {
            label: "General",
            routes: [
                {
                    label: "Overview",
                    icon: LayoutDashboard,
                    href: "",
                    exact: true,
                },
                {
                    label: "Analytics",
                    icon: BarChart3,
                    href: "/analytics",
                },
                {
                    label: "Forms",
                    icon: FileText,
                    href: "/forms",
                },
            ]
        },
        {
            label: "Operations",
            visible: features.operations,
            routes: [
                {
                    label: "Sites & Locations",
                    icon: MapPin,
                    href: "/sites",
                },
                {
                    label: "Inventory",
                    icon: Package,
                    href: "/inventory",
                },
            ]
        },
        {
            label: "CRM",
            visible: features.crm,
            routes: [
                {
                    label: "Clients",
                    icon: Briefcase,
                    href: "/clients",
                    exact: true,
                },
                {
                    label: "Pipeline",
                    icon: GitBranch,
                    href: "/clients/pipeline",
                },
                {
                    label: "Quotes",
                    icon: Receipt,
                    href: "/quotes",
                },
                {
                    label: "Invoices",
                    icon: Banknote,
                    href: "/invoices",
                },
            ]
        },
        {
            label: "HR & Payroll",
            visible: features.payroll,
            routes: [
                {
                    label: "Users",
                    icon: Users,
                    href: "/users",
                },
                {
                    label: "Timesheets",
                    icon: Clock,
                    href: "/hr/timesheet",
                },
                {
                    label: "Attendance Analytics",
                    icon: BarChart2,
                    href: "/hr/attendance",
                },
                {
                    label: "Anomaly Detection",
                    icon: AlertTriangle,
                    href: "/hr/anomalies",
                },
                {
                    label: "Expenses",
                    icon: Receipt,
                    href: "/hr/expenses",
                },
                {
                    label: "Leave Management",
                    icon: Calendar,
                    href: "/hr/leave",
                },
                {
                    label: "Payroll",
                    icon: Banknote,
                    href: "/hr/payroll",
                    exact: true,
                },
                {
                    label: "Payroll Analytics",
                    icon: PieChart,
                    href: "/hr/payroll/analytics",
                },
            ]
        },
        {
            label: "Compliance",
            routes: [
                {
                    label: "Compliance Report",
                    icon: ClipboardCheck,
                    href: "/compliance",
                },
            ]
        },
        {
            label: "Security",
            // visible: features.security || true, // TODO: Enable feature flag
            routes: [
                {
                    label: "Overview",
                    icon: ShieldCheck,
                    href: "/security",
                },
                {
                    label: "Checkpoints",
                    icon: ScanLine,
                    href: "/security/checkpoints",
                },
                {
                    label: "Patrols",
                    icon: ClipboardList,
                    href: "/security/patrols",
                },
                {
                    label: "Incidents",
                    icon: AlertTriangle,
                    href: "/security/incidents",
                },
                {
                    label: "Security Settings",
                    icon: Settings,
                    href: "/security/settings",
                },
            ]
        },
        {
            label: "Settings",
            routes: [
                {
                    label: "Global Settings",
                    icon: Settings,
                    href: "/settings",
                },
            ]
        }
    ];

    return (
        <div
            className="space-y-4 py-4 flex flex-col h-full text-white w-64 transition-all duration-300 ease-in-out border-r border-white/10"
            style={{
                backgroundColor: brandColor ? `${brandColor}dd` : '#0f172abb', // translucent
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            <div className="px-3 py-2 flex-1 overflow-y-auto">
                <Link href={`/dashboard/${orgId}`} className="flex items-center pl-3 mb-8">
                    <h1 className="text-2xl font-bold truncate tracking-tight">{orgName}</h1>
                </Link>

                <div className="space-y-6">
                    {groups.map((group, i) => {
                        if (group.visible === false) return null;

                        return (
                            <div key={group.label || i}>
                                {group.label && group.label !== "General" && group.label !== "Settings" && (
                                    <h4 className="mb-2 px-4 text-xs font-semibold tracking-wider text-white/40 uppercase">
                                        {group.label}
                                    </h4>
                                )}
                                <div className="space-y-1">
                                    {group.routes.map((route) => {
                                        const path = `/dashboard/${orgId}${route.href}`;
                                        const isActive = route.exact
                                            ? pathname === path
                                            : pathname.startsWith(path);

                                        return (
                                            <Link
                                                key={route.href}
                                                href={path}
                                                className={cn(
                                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                                    isActive ? "text-white bg-white/10" : "text-zinc-400"
                                                )}
                                            >
                                                <div className="flex items-center flex-1">
                                                    <route.icon className={cn("h-5 w-5 mr-3", isActive ? "text-white" : "text-zinc-400")} />
                                                    {route.label}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {logoUrl && (
                <div className="p-4 flex justify-center pb-8 opacity-80 hover:opacity-100 transition-opacity mt-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain max-h-16" />
                </div>
            )}
        </div>
    );
}
