"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Bot, CheckCircle2, XCircle, Clock, Search, ExternalLink } from "lucide-react";
import { updateExpenseStatus } from "@/lib/actions/hr/expenses";

export function ExpensesTable({ orgId, initialExpenses }: { orgId: string, initialExpenses: any[] }) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleUpdate = async (id: string, status: 'approved' | 'rejected') => {
        if (isUpdating) return;
        setIsUpdating(id);
        try {
            await updateExpenseStatus(orgId, id, status);
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        } finally {
            setIsUpdating(null);
        }
    };

    const statusBadge: Record<string, { color: string, icon: any }> = {
        pending: { color: "bg-amber-100 text-amber-700", icon: Clock },
        approved: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
        rejected: { color: "bg-red-100 text-red-700", icon: XCircle }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>All Expenses</CardTitle>
                <div className="flex bg-slate-100 px-3 py-1.5 rounded-lg items-center gap-2 text-sm text-slate-500 w-64">
                    <Search className="h-4 w-4" />
                    <span>Search expenses...</span>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Merchant & Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No expenses recorded yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => {
                                const StatusIcon = statusBadge[expense.status]?.icon || Clock;
                                return (
                                    <TableRow key={expense.id}>
                                        <TableCell className="text-sm">
                                            {format(new Date(expense.date), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-800">
                                                {expense.profiles?.full_name || expense.profiles?.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {expense.merchant}
                                                {expense.receipt_url && (
                                                    <a href={expense.receipt_url} target="_blank" rel="noreferrer" title="View Receipt">
                                                        <ExternalLink className="h-3 w-3 text-blue-500 hover:text-blue-700" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                                    {expense.category}
                                                </Badge>
                                                {expense.confidence_score !== null && (
                                                    <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded flex items-center" title="AI Confidence">
                                                        <Bot className="h-3 w-3" />
                                                        {Math.round(expense.confidence_score * 100)}%
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">
                                            {expense.currency === 'USD' ? '$' : expense.currency + ' '}
                                            {expense.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`pl-1.5 pr-2.5 py-0.5 flex gap-1.5 w-max ${statusBadge[expense.status]?.color || "bg-slate-100 text-slate-700"}`}>
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                <span className="capitalize">{expense.status}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {expense.status === "pending" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                        disabled={isUpdating === expense.id}
                                                        onClick={() => handleUpdate(expense.id, 'rejected')}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        disabled={isUpdating === expense.id}
                                                        onClick={() => handleUpdate(expense.id, 'approved')}
                                                    >
                                                        Approve
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="ghost" size="sm" disabled>Processed</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
