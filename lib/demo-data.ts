/**
 * DEMO DATA — Not integrated into any page until explicitly asked.
 * Contains all mock state values for local/demo testing.
 */

import type { UserState } from "@/store/slices/userSlice";
import type { ReportData } from "@/store/slices/recordingSlice";

export const DEMO_USER: UserState = {
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah.chen@healthclinic.com",
  phone: "+15551234567",
  speciality: "Internal Medicine",
  clinicName: "Sunrise Health Clinic",
  totalMinutesLeft: 240,
  totalMinutesAllowed: 600,
  isLoggedIn: true,
};

export const DEMO_TRANSCRIPTION: string[] = [
  "Doctor: Good morning. What brings you in today?",
  "Patient: I've been having severe headaches for the past three days, mostly on the right side.",
  "Doctor: Any nausea or sensitivity to light?",
  "Patient: Yes, I've had some nausea but no vomiting. Bright lights do make it worse.",
  "Doctor: How would you rate the pain on a scale of one to ten?",
  "Patient: About a seven when it peaks.",
];

export const DEMO_REPORT: ReportData = {
  visitNotes: [
    "Patient presents with a 3-day history of right-sided headaches, rated 7/10 at peak intensity. Associated symptoms include nausea and photophobia. No fever, no neck stiffness. PMH: migraines (childhood). Current medications: ibuprofen PRN. Neurological exam within normal limits. Assessment: Migraine without aura. Plan: Prescribe sumatriptan 50mg PRN, avoid triggers, follow up in 2 weeks if no improvement.",
  ],
  soapNote: {
    subjective: {
      "Chief Complaint": "Right-sided headache for 3 days",
      "History of Present Illness":
        "Patient reports 3-day history of right-sided headache, 7/10 severity. Associated with nausea and photophobia.",
      "Past Medical History": "Childhood migraines",
      "Current Medications": "Ibuprofen PRN",
    },
    objective: {
      "Vital Signs": "BP 118/76, HR 72, Temp 98.6°F",
      "Neurological Exam": "Alert and oriented x3, CN II-XII intact, no focal deficits",
    },
    assessment: {
      "Primary Diagnosis": "Migraine without aura (G43.009)",
    },
    plan: {
      Treatment: "Sumatriptan 50mg PO PRN for acute attacks",
      "Follow-up": "Return in 2 weeks or sooner if symptoms worsen",
      "Patient Education": "Avoid known triggers, maintain headache diary",
    },
  },
  icdCodes: {
    icd_codes: [
      { icd_10_code: "G43.009", name: "Migraine without aura, not intractable" },
    ],
  },
  cptCodes: {
    cpt_codes: [
      {
        cpt_code: "99213",
        name: "Office visit, established patient, 20-29 minutes",
      },
    ],
  },
  cpt2Codes: {
    codes: [
      {
        cpt2_code: "1P",
        description:
          "Performance Measure Exclusion Modifier due to Medical Reasons",
      },
    ],
  },
  emCodes: {
    em_code: "99213",
    description:
      "Office or other outpatient visit for the evaluation and management of an established patient",
  },
  medication: {
    prescribed_medications: [
      {
        correct_medicine_name: "Sumatriptan",
        dosage: "50",
        unit: "mg",
        frequency: { morning: null, afternoon: null, night: "1" },
        start_date: "2026-05-19",
        days: "30",
        instruction: "Take at onset of migraine",
      },
    ],
    in_clinic_medications: [],
  },
  labtest: { lab_test: [] },
  followup: {
    follow_up_appointment: { duration: "2 weeks", reason: "Headache review" },
  },
  vaccine: { vaccine: [] },
  procedure: { procedure: [] },
  referrals: [],
};

export const DEMO_QA_HISTORY = [
  {
    questionEn: "What is your main reason for visiting today?",
    questionTranslated: "¿Cuál es su razón principal para visitar hoy?",
    responseTranslated: {
      english_translation: "I have been having headaches for three days.",
      original_text: "Tengo dolor de cabeza por tres días.",
    },
  },
  {
    questionEn: "Are you taking any medications currently?",
    questionTranslated: "¿Está tomando algún medicamento actualmente?",
    responseTranslated: {
      english_translation: "Only ibuprofen occasionally.",
      original_text: "Solo ibuprofeno ocasionalmente.",
    },
  },
];

export const SPECIALTIES = [
  "Allergy and Immunology",
  "Anesthesiology",
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Endocrinology",
  "Family Medicine",
  "Gastroenterology",
  "General Surgery",
  "Geriatrics",
  "Hematology",
  "Infectious Disease",
  "Internal Medicine",
  "Nephrology",
  "Neurology",
  "Obstetrics and Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Otolaryngology (ENT)",
  "Pathology",
  "Pediatrics",
  "Physical Medicine",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Rheumatology",
  "Sports Medicine",
  "Urology",
  "Vascular Surgery",
];

export const COUNTRY_CODES = [
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "IN" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+971", country: "AE" },
  { code: "+966", country: "SA" },
  { code: "+65", country: "SG" },
  { code: "+234", country: "NG" },
  { code: "+27", country: "ZA" },
];

export const LANGUAGES = [
  "Arabic",
  "Bengali",
  "Chinese",
  "English",
  "French",
  "German",
  "Gujarati",
  "Hindi",
  "Italian",
  "Japanese",
  "Kannada",
  "Korean",
  "Malayalam",
  "Marathi",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Tamil",
  "Telugu",
  "Thai",
  "Ukrainian",
  "Vietnamese",
];
