"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Star } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/hooks/use-language";
import { getApiErrorMessage } from "@/lib/api/errors";

const PLANS = [
  {
    key: "free",
    nameKey: "planFreeName",
    priceKey: "planFreePrice",
    popular: false,
    color: "border-gray-300",
    features: {
      stores: "planStores1",
      products: "planProducts50",
      staff: "planStaff2",
      support: "planSupportBasic",
      payment: "planPaymentNA",
    },
  },
  {
    key: "pro",
    nameKey: "planProName",
    priceKey: "planProPrice",
    popular: true,
    color: "border-teal-500",
    features: {
      stores: "planStores3",
      products: "planProducts500",
      staff: "planStaff10",
      support: "planSupportPriority",
      payment: "planPaymentCardPaypal",
    },
  },
  {
    key: "enterprise",
    nameKey: "planEnterpriseName",
    priceKey: "planEnterprisePrice",
    popular: false,
    color: "border-gray-300",
    features: {
      stores: "planStoresUnlimited",
      products: "planProductsUnlimited",
      staff: "planStaffUnlimited",
      support: "planSupportDedicated",
      payment: "planPaymentCustom",
    },
  },
];

export default function PlanSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currentPlan = user?.plan || "free";

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Update this URL to your Go backend API endpoint
      const res = await fetch("http://localhost:8080/api/auth/tenant/plan", {
        method: "PATCH",
        credentials: "include", // if using cookies/auth
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess("Plan updated successfully.");
      // Optionally, trigger a user data refresh here if your auth context supports it
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Plan upgrade failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.plan.chooseTitle}</h1>
      <p className="text-gray-600 mb-8">{t.plan.chooseDesc}</p>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50 mb-4">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-x-6 border-spacing-y-0">
          <thead>
            <tr>
              <th className="w-40"></th>
              {PLANS.map((plan) => (
                <th key={plan.key} className={`text-center pb-4 align-bottom ${plan.popular ? 'relative' : ''}`}>
                  <div className={`rounded-t-lg px-6 pt-6 pb-2 border-t-4 ${plan.color} bg-white shadow-sm`}> 
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">{t.plan[plan.nameKey]}</span>
                      <span className="text-lg text-gray-500">{t.plan[plan.priceKey]}</span>
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1"><Star className="h-3 w-3" />{t.plan.mostPopular}</span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td className="font-medium text-gray-700 py-4">{t.plan.stores}</td>
              {PLANS.map(plan => <td key={plan.key} className="text-center py-4">{t.plan[plan.features.stores]}</td>)}
            </tr>
            <tr className="bg-gray-50">
              <td className="font-medium text-gray-700 py-4">{t.plan.products}</td>
              {PLANS.map(plan => <td key={plan.key} className="text-center py-4">{t.plan[plan.features.products]}</td>)}
            </tr>
            <tr>
              <td className="font-medium text-gray-700 py-4">{t.plan.staff}</td>
              {PLANS.map(plan => <td key={plan.key} className="text-center py-4">{t.plan[plan.features.staff]}</td>)}
            </tr>
            <tr className="bg-gray-50">
              <td className="font-medium text-gray-700 py-4">{t.plan.support}</td>
              {PLANS.map(plan => <td key={plan.key} className="text-center py-4">{t.plan[plan.features.support]}</td>)}
            </tr>
            <tr>
              <td className="font-medium text-gray-700 py-4">{t.plan.payment}</td>
              {PLANS.map(plan => <td key={plan.key} className="text-center py-4">{t.plan[plan.features.payment]}</td>)}
            </tr>
            <tr>
              <td></td>
              {PLANS.map(plan => (
                <td key={plan.key} className="text-center py-6">
                  {currentPlan === plan.key ? (
                    <Button disabled variant="outline" className="w-full">{t.plan.currentPlan}</Button>
                  ) : (
                    <Button onClick={() => handleUpgrade(plan.key)} disabled={loading} className={`w-full ${plan.popular ? 'bg-teal-500 text-white hover:bg-teal-600' : ''}`}>
                      {t.plan.upgrade}
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-10 text-center text-gray-500 text-sm">
        <CheckCircle className="inline h-5 w-5 text-green-500 mr-1" />
        {t.plan.trust} <a href="mailto:sales@example.com" className="text-teal-600 underline">{t.plan.contactSales}</a>.
      </div>
    </div>
  );
}
