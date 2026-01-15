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
    Clock,
    Banknote,
    MapPin
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
}

export function Sidebar({ orgId, brandColor, logoUrl, orgName = "WorkforceOne" }: SidebarProps) {
    const pathname = usePathname();
    const bgColor = brandColor || "#0f172a"; // Default slate-900

    return (
        <div
            className="space-y-4 py-4 flex flex-col h-full text-white w-64 transition-all duration-300 ease-in-out border-r border-white/10"
            style={{
                backgroundColor: brandColor ? `${brandColor}dd` : '#0f172abb', // translucent
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            <div className="px-3 py-2 flex-1">
                <Link href={`/dashboard/${orgId}`} className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold truncate tracking-tight">{orgName}</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => {
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
            {logoUrl && (
                <div className="p-4 flex justify-center pb-8 opacity-80 hover:opacity-100 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain" />
                </div>
            )}
        </div>
    );
}
