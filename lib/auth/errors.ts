const PASSWORD_REQUIREMENTS_MSG =
  "Password must be 8+ chars with lowercase, uppercase, number, and special character.";

export function trimAuthInput(value: string): string {
  return value.trim();
}

export function formatAuthError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = message.toLowerCase();

  if (!message.trim()) {
    return fallback;
  }

  if (
    lower.includes("member must satisfy regular expression pattern") ||
    (lower.includes("validation error detected") && lower.includes("'password'"))
  ) {
    return "Password cannot start or end with a space. Remove any extra spaces before or after your password and try again.";
  }

  if (
    lower.includes("password did not conform") ||
    lower.includes("invalid password") ||
    lower.includes("invalidpasswordexception")
  ) {
    return PASSWORD_REQUIREMENTS_MSG;
  }

  if (
    lower.includes("codemismatchexception") ||
    lower.includes("invalid code") ||
    (lower.includes("validation error detected") && lower.includes("confirmationcode"))
  ) {
    return "The verification code is incorrect. Remove any spaces before or after the code and try again.";
  }

  if (lower.includes("incorrect username or password")) {
    return "The code or password you entered is incorrect. Please check and try again.";
  }

  if (lower.includes("expiredcodeexception") || lower.includes("expired code")) {
    return "This code has expired. Request a new one and try again.";
  }

  if (lower.includes("usernotfoundexception") || lower.includes("user does not exist")) {
    return "No account was found with that email address.";
  }

  if (lower.includes("usernotconfirmedexception")) {
    return "Your email is not verified yet. Please check your inbox for the verification code.";
  }

  if (lower.includes("notauthorizedexception") || lower.includes("incorrect username or password")) {
    return "Incorrect email or password. Please try again.";
  }

  if (lower.includes("limit exceeded") || lower.includes("toomanyrequestsexception")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  return message;
}
