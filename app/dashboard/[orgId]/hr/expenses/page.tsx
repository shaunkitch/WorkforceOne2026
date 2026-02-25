import { getExpenses, submitExpense, AICategoryResult } from "@/lib/actions/hr/expenses";
import { ExpensesTable } from "@/components/hr/ExpensesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, FileText, CheckCircle2, Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: { orgId: string };
}

export const metadata = {
    title: "AI Expense Management | WorkforceOne",
};

export default async function ExpensesPage({ params }: PageProps) {
    const expenses = await getExpenses(params.orgId);

    const pendingCount = expenses.filter(e => e.status === 'pending').length;
    const autoApprovedCount = expenses.filter(e => e.status === 'approved' && e.confidence_score > 0.89).length;

    // A mock server action to simulate uploading a receipt, processing OCR, and submitting
    const handleMockUpload = async () => {
        "use server";
        await submitExpense(params.orgId, {
            amount: 45.50,
            merchant: "UBER   TRIP HELP.UBER.COM",
            date: new Date().toISOString(),
            description: "Ride from hotel to site B",
            receiptUrl: "https://example.com/receipt.pdf"
        });
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Bot className="h-4 w-4" />
                        AI auto-categorization and approval routing
                    </p>
                </div>
                {/* Mock Upload Button to demonstrate the flow */}
                <form action={handleMockUpload}>
                    <Button type="submit" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Simulate AI Receipt Scan
                    </Button>
                </form>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Auto-Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {autoApprovedCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">High confidence (&gt;90%)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {pendingCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Low confidence or policy flagged</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <FileText className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {expenses.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <ExpensesTable orgId={params.orgId} initialExpenses={expenses} />
        </div>
    );
}
