"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";

interface FormData {
  category: string;
  subject: string;
  description: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

interface FormErrors {
  category?: string;
  subject?: string;
  description?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function HelpCenterPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);

  const submittedBy = useMemo(() => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || "Unknown User";
  }, [user.firstName, user.lastName]);

  const submittedEmail = useMemo(() => user.email || "", [user.email]);

  const [formData, setFormData] = useState<FormData>({
    category: "",
    subject: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formData.category) {
      nextErrors.category = "Please select a category";
    }

    if (!formData.subject.trim()) {
      nextErrors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 5) {
      nextErrors.subject = "Subject must be at least 5 characters";
    }

    if (!formData.description.trim()) {
      nextErrors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      nextErrors.description = "Description must be at least 10 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: AttachedFile[] = [];

    const allowedPrefixes = ["image/", "video/"];

    for (const file of files) {
      const isPdf = file.type === "application/pdf";
      const isAllowedPrefix = allowedPrefixes.some((prefix) => file.type.startsWith(prefix));
      if (!isPdf && !isAllowedPrefix) {
        toast.error(`${file.name} is not a supported file type.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      validFiles.push({ file, preview });
    }

    if (validFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...validFiles]);
    }

    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const next = [...prev];
      if (next[index]?.preview) {
        URL.revokeObjectURL(next[index].preview as string);
      }
      next.splice(index, 1);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("name", submittedBy);
      payload.append("email", submittedEmail);
      payload.append("category", formData.category);
      payload.append("subject", formData.subject.trim());
      payload.append("description", formData.description.trim());
      attachedFiles.forEach((item) => payload.append("attachments", item.file));

      const response = await fetch("/api/help/contact", {
        method: "POST",
        body: payload,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = data?.details ? `${data.error}\n\n${data.details}` : data?.error || "Failed to submit form";
        throw new Error(errorMsg);
      }

      toast.success("Your message has been sent successfully! We will get back to you soon.");

      attachedFiles.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });

      setFormData({ category: "", subject: "", description: "" });
      setAttachedFiles([]);
      setErrors({});

      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(229,100,159,0.35)_0%,rgba(247,148,29,0.35)_35%,rgba(140,198,63,0.35)_68%,rgba(41,171,226,0.35)_100%)]" />

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="shadow-lg rounded-xl border border-slate-200 bg-[#f8f8f9]">
          <div className="px-5 md:px-6 pt-5">
            <h1 className="text-4xl leading-none md:text-[40px] font-semibold text-slate-900">Help Center</h1>
            <p className="text-base text-slate-500 mt-2 mb-4">
              Having trouble? Let us know and we&apos;ll get back to you as soon as possible.
            </p>
          </div>

          <div className="px-5 md:px-6 pb-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-[#f8f8f9] p-3 space-y-1.5">
                <div className="text-sm font-semibold text-slate-600">Submitted by:</div>
                <div className="text-sm text-slate-800">{submittedBy}</div>
                <div className="text-sm font-semibold text-slate-600 mt-1">Email:</div>
                <div className="text-sm text-slate-600 break-all">{submittedEmail}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="category" className="text-sm font-semibold text-slate-700">
                    Category <span className="text-orange-500">*</span>
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="category"
                      className={`h-10 bg-white whitespace-nowrap ${errors.category ? "border-red-500" : ""}`}
                    >
                      <SelectValue placeholder="Select a category" className="whitespace-nowrap" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing & Subscription</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="account">Account & Login</SelectItem>
                      <SelectItem value="transcription">Transcription Quality</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category ? <p className="text-xs text-red-600">{errors.category}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-sm font-semibold text-slate-700">
                    Subject <span className="text-orange-500">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="Brief description of the issue"
                    value={formData.subject}
                    onChange={(event) => handleInputChange("subject", event.target.value)}
                    className={`h-10 w-full rounded-md border px-3 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors.subject ? "border-red-500" : "border-slate-200"}`}
                    disabled={isSubmitting}
                  />
                  {errors.subject ? <p className="text-xs text-red-600">{errors.subject}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-semibold text-slate-700">
                  Description <span className="text-orange-500">*</span>
                </label>
                <textarea
                  id="description"
                  placeholder="Please provide detailed information about your problem..."
                  value={formData.description}
                  onChange={(event) => handleInputChange("description", event.target.value)}
                  className={`min-h-[95px] w-full rounded-md border px-3 py-2 text-sm bg-white placeholder:text-slate-400 resize-y focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors.description ? "border-red-500" : "border-slate-200"}`}
                  disabled={isSubmitting}
                  rows={4}
                />
                {errors.description ? <p className="text-xs text-red-600">{errors.description}</p> : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="attachments" className="text-sm font-semibold text-slate-700">Attachments (Optional)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileSelect}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("attachments")?.click()}
                    disabled={isSubmitting}
                    className="h-9 px-3 rounded-md border border-slate-300 bg-white inline-flex items-center gap-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach Files
                  </button>
                  <span className="text-sm text-slate-400">Images, videos, PDFs (max 10MB each)</span>
                </div>

                {attachedFiles.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {attachedFiles.map((attachedFile, index) => (
                      <div key={`${attachedFile.file.name}-${index}`} className="flex items-center gap-2 p-2 bg-white rounded-md border border-slate-200">
                        {attachedFile.preview ? (
                          <Image
                            src={attachedFile.preview}
                            alt={attachedFile.file.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachedFile.file.name}</p>
                          <p className="text-xs text-slate-500">{(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          className="h-8 w-8 rounded-md hover:bg-slate-100 inline-flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="h-10 rounded-md border border-slate-300 bg-[#f8f8f9] text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-md bg-[#33363b] text-white hover:bg-[#22252a] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span>Sending...</span>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
