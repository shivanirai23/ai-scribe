"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mic, FileText, BarChart2, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "How do I start a recording session?",
    answer:
      "Click 'Start Visit' on the recording page to initialize a session. Then click 'Start Recording' to begin capturing audio. The AI will transcribe the conversation in real time.",
  },
  {
    question: "What is the difference between Normal Mode and Conversational Mode?",
    answer:
      "Normal Mode records and transcribes the full doctor-patient conversation. Conversational Mode provides a structured questionnaire for multi-language patient interactions, with automatic translation.",
  },
  {
    question: "How do I view the generated medical report?",
    answer:
      "After stopping a recording, the app automatically processes the transcription and generates a medical report. You can view it on the Report tab which appears after processing is complete.",
  },
  {
    question: "Can I edit the visit notes?",
    answer:
      "Yes! In the Medical Notes tab of the report view, click the pencil icon next to 'Visit Summary' to edit the notes inline. Click 'Save Changes' when done.",
  },
  {
    question: "What is the QR code feature?",
    answer:
      "The QR code feature lets you connect the HIKIGAI AIScribe iOS app to your current recording session by scanning the code with your iPhone or iPad.",
  },
  {
    question: "How do I export a report as PDF?",
    answer:
      "In the report view, click the 'Export PDF' button in the header. This will open your browser's print dialog where you can save as PDF.",
  },
  {
    question: "What audio formats are supported?",
    answer:
      "HIKIGAI AIScribe supports standard web audio formats captured through your browser's microphone. Ensure your browser has microphone permissions enabled.",
  },
  {
    question: "How do I upgrade to Premium?",
    answer:
      "Click the 'Get Premium' button in the app header, or navigate to the Pricing page. Fill in your details and our team will contact you with pricing information.",
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-brand-gradient mb-2">
          Help &amp; Support
        </h1>
        <p className="text-slate-600 mb-8">
          Find answers to common questions about HIKIGAI AIScribe.
        </p>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Mic, label: "Recording", color: "text-brand-green", bg: "bg-brandLight-green" },
            { icon: FileText, label: "Reports", color: "text-brand-blue", bg: "bg-brandLight-blue" },
            { icon: BarChart2, label: "Analytics", color: "text-brand-pink", bg: "bg-brandLight-pink" },
            { icon: HelpCircle, label: "General", color: "text-brand-orange", bg: "bg-brandLight-orange" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${item.bg} p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity`}>
                <Icon className={`h-6 w-6 ${item.color}`} />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Frequently Asked Questions
          </h2>
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden"
            >
              <button
                className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-slate-800 pr-4">{item.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-slate-600 text-sm leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact support */}
        <div className="mt-8 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 text-center">
          <h3 className="font-semibold text-slate-800 mb-2">Still need help?</h3>
          <p className="text-slate-600 text-sm mb-4">
            Our support team is available Monday to Friday, 9am–5pm EST.
          </p>
          <a
            href="mailto:support@hikigai.ai"
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-pink text-white rounded-xl px-6 py-3 text-sm font-medium transition-colors"
          >
            Contact Support
          </a>
        </div>
      </main>
    </div>
  );
}
