"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Brain,
  Bookmark,
  BarChart2,
  GraduationCap,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "IN" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI-powered clinical decision support",
    description:
      "Intelligent recommendations based on patient data and evidence-based medicine",
    bg: "bg-brandLight-blue",
    iconBg: "bg-brand-blue/10",
    iconColor: "text-brand-blue",
  },
  {
    icon: Bookmark,
    title: "Comprehensive patient dashboard",
    description:
      "Complete patient history and visit records in one organized place",
    bg: "bg-brandLight-pink",
    iconBg: "bg-brand-pink/10",
    iconColor: "text-brand-pink",
  },
  {
    icon: BarChart2,
    title: "Advanced analytics and reporting",
    description:
      "Deep insights into practice performance and patient outcomes",
    bg: "bg-brandLight-green",
    iconBg: "bg-brand-green/10",
    iconColor: "text-brand-green",
  },
  {
    icon: GraduationCap,
    title: "Multi-device accessibility",
    description:
      "Seamlessly use AIScribe across desktop, tablet, and mobile devices",
    bg: "bg-brandLight-orange",
    iconBg: "bg-brand-orange/10",
    iconColor: "text-brand-orange",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-3iYmNCbNrAz3xweW1kCvDFAA44QRiG.png"
            alt="HIKIGAI AIScribe Logo"
            width={36}
            height={36}
            unoptimized
          />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">
            HIKIGAI AIScribe
          </h1>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-brand-blue text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Feature cards */}
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Upgrade to Premium</h1>
            <p className="text-slate-600 mb-8">
              Unlock the full power of HIKIGAI AIScribe
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`p-4 rounded-xl ${feature.bg} flex items-start gap-3`}
                  >
                    <div className={`${feature.iconBg} p-2 rounded-lg`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-slate-800">{feature.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Get Premium Access</h2>
            <p className="text-slate-500 text-sm mb-6">
              Fill in your details and we&apos;ll call you to discuss pricing
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-brandLight-green flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Thank you for your interest!
                </h3>
                <p className="text-slate-600 text-sm">
                  We&apos;ll be in touch shortly to discuss premium pricing options tailored to your
                  practice.
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Dr. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Clinic / Organization Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Sunrise Health Clinic"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      className="pl-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="name@clinic.com"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      required
                      className="pl-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="!h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code} ({c.country})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative w-2/3">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        required
                        className="pl-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-brand-blue hover:bg-brand-pink text-white rounded-xl text-base font-medium transition-all flex items-center justify-center"
                >
                  {isSubmitting && (
                    <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Get Premium — We&apos;ll Call You
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
