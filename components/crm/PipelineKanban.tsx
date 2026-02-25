"use client";

import { useState, useTransition } from "react";
import { updateQuoteStatus, type Quote } from "@/lib/actions/quotes";
import { format } from "date-fns";
import { DollarSign, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Column = { id: string; label: string; color: string };

interface PipelineKanbanProps {
    orgId: string;
    quotes: Quote[];
    columns: Column[];
}

export function PipelineKanban({ orgId, quotes: initialQuotes, columns }: PipelineKanbanProps) {
    const [quotes, setQuotes] = useState(initialQuotes);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const getColumnQuotes = (colId: string) =>
        quotes.filter(q => q.status === colId);

    const getColumnTotal = (colId: string) =>
        getColumnQuotes(colId).reduce((sum, q) => sum + (q.total_amount || 0), 0);

    const handleDragStart = (e: React.DragEvent, quoteId: string) => {
        e.dataTransfer.setData("quoteId", quoteId);
        setDraggingId(quoteId);
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        setDragOverCol(colId);
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const quoteId = e.dataTransfer.getData("quoteId");
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote || quote.status === newStatus) {
            setDraggingId(null);
            setDragOverCol(null);
            return;
        }

        // Optimistic update
        setQuotes(prev =>
            prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q)
        );
        setDraggingId(null);
        setDragOverCol(null);

        startTransition(async () => {
            try {
                await updateQuoteStatus(orgId, quoteId, newStatus);
            } catch {
                // Revert on error
                setQuotes(prev =>
                    prev.map(q => q.id === quoteId ? { ...q, status: quote.status } : q)
                );
            }
        });
    };

    const statusColor: Record<string, string> = {
        draft: "bg-slate-100 text-slate-700",
        sent: "bg-blue-100 text-blue-700",
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
            {columns.map(col => (
                <div
                    key={col.id}
                    className={cn(
                        "flex-shrink-0 w-72 rounded-xl border-2 p-3 transition-colors",
                        col.color,
                        dragOverCol === col.id && "ring-2 ring-blue-400 ring-offset-1"
                    )}
                    onDragOver={e => handleDragOver(e, col.id)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", statusColor[col.id] || "bg-slate-100 text-slate-700")}>
                                {col.label}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                                {getColumnQuotes(col.id).length}
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                            ${getColumnTotal(col.id).toLocaleString()}
                        </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[100px]">
                        {getColumnQuotes(col.id).map(quote => (
                            <div
                                key={quote.id}
                                draggable
                                onDragStart={e => handleDragStart(e, quote.id)}
                                onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                                className={cn(
                                    "bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing select-none transition-opacity",
                                    draggingId === quote.id && "opacity-40 scale-95",
                                    isPending && "pointer-events-none"
                                )}
                            >
                                <div className="flex items-start justify-between mb-1.5">
                                    <span className="text-xs font-mono text-muted-foreground">#{quote.number}</span>
                                    <span className="text-sm font-bold text-slate-800">
                                        ${quote.total_amount.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 leading-tight mb-2">
                                    {quote.title}
                                </p>
                                <div className="space-y-1">
                                    {quote.clients?.name && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span className="truncate">{quote.clients.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(new Date(quote.created_at), "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {getColumnQuotes(col.id).length === 0 && (
                            <div className={cn(
                                "rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-xs text-muted-foreground",
                                dragOverCol === col.id && "border-blue-300 bg-blue-50/50 text-blue-400"
                            )}>
                                {dragOverCol === col.id ? "Drop here" : "No quotes"}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
