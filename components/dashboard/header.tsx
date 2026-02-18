"use client";

import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "./notifications-popover";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import TimeClock from "@/components/hr/TimeClock";

interface HeaderProps {
    user: User;
    orgName: string;
}

export function Header({ user, orgName }: HeaderProps) {
    const supabase = createClient();
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login"); // or /
        router.refresh();
    };

    return (
        <div className="h-16 border-b px-4 flex items-center justify-between bg-white dark:bg-slate-950">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">{orgName}</h2>
            </div>
            <div className="flex items-center gap-4">
                <NotificationsPopover />
                <TimeClockWrapper />
                <div className="text-sm text-muted-foreground hidden sm:block">
                    {user.email}
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

function TimeClockWrapper() {
    const params = useParams();
    const orgId = params.orgId as string;

    // Only show if we are in an org context
    if (!orgId) return null;

    return <TimeClock orgId={orgId} />;
}
