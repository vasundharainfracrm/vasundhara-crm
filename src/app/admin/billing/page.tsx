"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  ShieldAlert, 
  DollarSign, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { type BillingConfig, getISTDateString, getISTMonthString } from "@/lib/billing-utils";

interface HistoryEntry {
  id: string;
  timestamp: string;
  date: string;
  month: string;
  dailySpend: number;
  monthlySpend: number;
  budgetDisplayName: string;
}

export default function BillingSafetyPage() {
  const { user } = useAuth();
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "month">("30d");
  const [metric, setMetric] = useState<"dailySpend" | "monthlySpend">("dailySpend");

  // Real-time listener for the billing configuration document
  useEffect(() => {
    if (!user || user.role !== "super_admin") return;

    const billingDocRef = doc(db, "system", "billing");
    const unsubscribeConfig = onSnapshot(
      billingDocRef,
      (snap) => {
        if (snap.exists()) {
          setBillingConfig(snap.data() as BillingConfig);
        } else {
          setBillingConfig({
            monthlyLimitExceeded: false,
            dailyLimitExceeded: false,
            lastDailyAlertDate: "",
            lastMonthlyAlertDate: "",
            dailySpend: 0,
            monthlySpend: 0,
            bypassUsers: [],
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load billing status:", err);
        toast.error("Failed to sync billing data.");
        setLoading(false);
      }
    );

    return unsubscribeConfig;
  }, [user]);

  // Real-time listener for the billing history collection
  useEffect(() => {
    if (!user || user.role !== "super_admin") return;

    const historyColRef = collection(db, "system", "billing", "history");
    const unsubscribeHistory = onSnapshot(
      historyColRef,
      (snap) => {
        if (!snap.empty) {
          const entries = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as HistoryEntry[];
          
          // Sort ascending by timestamp
          entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setHistoryData(entries);
        } else {
          setHistoryData([]);
        }
      },
      (err) => {
        console.error("Failed to load billing history:", err);
      }
    );

    return unsubscribeHistory;
  }, [user]);

  // Restrict access to superadmin role only
  if (user?.role !== "super_admin") {
    return (
      <>
        <TopBar title="Access Denied" mode="admin" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="p-4 rounded-full bg-danger/10 text-danger mb-4">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Superadmin Access Required</h2>
          <p className="text-muted-foreground max-w-md">
            This panel controls billing safety locks and budget endpoints. Only the account owner or superadmins can modify these settings.
          </p>
        </div>
      </>
    );
  }

  const resetLimit = async (type: "daily" | "monthly") => {
    try {
      const billingDocRef = doc(db, "system", "billing");
      const updatePayload: any = {};
      
      if (type === "daily") {
        updatePayload.dailyLimitExceeded = false;
        updatePayload.dailySpend = 0;
      } else {
        updatePayload.monthlyLimitExceeded = false;
        updatePayload.monthlySpend = 0;
      }
      
      updatePayload.updatedAt = new Date().toISOString();
      await updateDoc(billingDocRef, updatePayload);
      toast.success(`Successfully reset ${type} billing lock.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to reset limit: ${err.message}`);
    }
  };

  // Helper to filter and format data for Recharts
  const getFilteredChartData = () => {
    const today = new Date();
    let filtered = [...historyData];

    if (timeframe === "7d") {
      const cutoff = new Date();
      cutoff.setDate(today.getDate() - 7);
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
    } else if (timeframe === "30d") {
      const cutoff = new Date();
      cutoff.setDate(today.getDate() - 30);
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
    } else if (timeframe === "month") {
      const currentMonth = getISTMonthString();
      filtered = filtered.filter(item => item.month === currentMonth);
    }

    return filtered.map((item) => {
      const dateObj = new Date(item.timestamp);
      // Format: "18 Jun"
      const formattedDate = dateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      });
      return {
        ...item,
        formattedDate,
        amount: item[metric],
      };
    });
  };

  const chartData = getFilteredChartData();

  if (loading) {
    return (
      <>
        <TopBar title="Billing Safety Settings" mode="admin" />
        <div className="flex items-center justify-center min-h-[40vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Billing Safety Settings" mode="admin" />
      <div className="space-y-6 p-4 lg:p-8 max-w-6xl mx-auto">
        
        {/* Status Section */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Daily Switch Card */}
          <Card className="relative overflow-hidden border-border bg-surface/60 backdrop-blur-md shadow-lg transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 p-4">
              <DollarSign className="w-12 h-12 text-muted-foreground/15" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Daily Budget Switch
              </CardTitle>
              <CardDescription>Limit: ~50 INR (approx. $0.60 USD)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                {billingConfig?.dailyLimitExceeded ? (
                  <Badge variant="danger" className="px-2.5 py-1 text-xs font-semibold gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    BLOCKED
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    NORMAL
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Last Alert Date</span>
                  <span>{billingConfig?.lastDailyAlertDate || "None"}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recorded Spend</span>
                  <span>{billingConfig?.dailySpend ? `${billingConfig.dailySpend.toFixed(2)} INR` : "0.00 INR"}</span>
                </div>
              </div>

              <Button
                variant={billingConfig?.dailyLimitExceeded ? "default" : "secondary"}
                className="w-full gap-2 transition-all active:scale-[0.98]"
                disabled={!billingConfig?.dailyLimitExceeded}
                onClick={() => resetLimit("daily")}
              >
                <RefreshCw className="w-4 h-4" />
                Manually Reset Daily Lock
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Switch Card */}
          <Card className="relative overflow-hidden border-border bg-surface/60 backdrop-blur-md shadow-lg transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 p-4">
              <Clock className="w-12 h-12 text-muted-foreground/15" />
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Monthly Budget Switch
              </CardTitle>
              <CardDescription>Limit: ~500 INR (approx. $6.00 USD)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                {billingConfig?.monthlyLimitExceeded ? (
                  <Badge variant="danger" className="px-2.5 py-1 text-xs font-semibold gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    BLOCKED
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    NORMAL
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Last Alert Month</span>
                  <span>{billingConfig?.lastMonthlyAlertDate || "None"}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recorded Spend</span>
                  <span>{billingConfig?.monthlySpend ? `${billingConfig.monthlySpend.toFixed(2)} INR` : "0.00 INR"}</span>
                </div>
              </div>

              <Button
                variant={billingConfig?.monthlyLimitExceeded ? "default" : "secondary"}
                className="w-full gap-2 transition-all active:scale-[0.98]"
                disabled={!billingConfig?.monthlyLimitExceeded}
                onClick={() => resetLimit("monthly")}
              >
                <RefreshCw className="w-4 h-4" />
                Manually Reset Monthly Lock
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historical Line Chart Card */}
        <Card className="border-border bg-surface/60 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Spend Analytics
              </CardTitle>
              <CardDescription>
                Historical billing data tracked from GCP budget alerts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Chart Filters Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-background/40">
              
              {/* Metric filter (Daily vs Monthly) */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Metric:</span>
                <div className="inline-flex rounded-lg bg-surface p-0.5 border border-border">
                  <Button
                    variant={metric === "dailySpend" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px] px-3.5 rounded-md"
                    onClick={() => setMetric("dailySpend")}
                  >
                    Daily Spend
                  </Button>
                  <Button
                    variant={metric === "monthlySpend" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px] px-3.5 rounded-md"
                    onClick={() => setMetric("monthlySpend")}
                  >
                    Monthly Spend
                  </Button>
                </div>
              </div>

              {/* Timeframe filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Timeframe:</span>
                <div className="inline-flex rounded-lg bg-surface p-0.5 border border-border">
                  <Button
                    variant={timeframe === "7d" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px] px-3 rounded-md"
                    onClick={() => setTimeframe("7d")}
                  >
                    7 Days
                  </Button>
                  <Button
                    variant={timeframe === "30d" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px] px-3 rounded-md"
                    onClick={() => setTimeframe("30d")}
                  >
                    30 Days
                  </Button>
                  <Button
                    variant={timeframe === "month" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-[11px] px-3 rounded-md"
                    onClick={() => setTimeframe("month")}
                  >
                    This Month
                  </Button>
                </div>
              </div>

            </div>

            {/* Line Chart Grid */}
            <div className="h-80 w-full pt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#242424" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="formattedDate" 
                      stroke="#888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }}
                      labelClassName="text-xs text-muted-foreground font-semibold mb-1"
                      formatter={(value: any) => [`₹${value} INR`, metric === "dailySpend" ? "Daily Spend" : "Monthly Spend"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={{ r: 3, stroke: "#10b981", strokeWidth: 1.5, fill: "#111" }}
                      activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#10b981" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mb-2 animate-bounce" />
                  <p className="text-xs text-muted-foreground">No billing data records in this timeframe.</p>
                </div>
              )}
            </div>
            
          </CardContent>
        </Card>

      </div>
    </>
  );
}
