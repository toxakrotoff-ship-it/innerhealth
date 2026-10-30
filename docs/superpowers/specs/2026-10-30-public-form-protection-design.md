# Public form protection

Approved in conversation for both InnerHealth and Sprint Power.

The shared partnership, contact-help and B2B forms must reject malformed contact data on the server and show matching client errors. Keep existing email syntax/domain/disposable checks; validate phone structure with libphonenumber-js. Optional social profiles accept one @handle or HTTP(S) URL per line. Optional messages remain plain text, bounded to 2000 characters, with conservative generated-string detection. Preserve contact-help email-or-phone submission.

Use existing honeypot/timing utilities and rate limiter rather than add dependencies or an external CAPTCHA service. Client-only checks can be bypassed; server validation before saving or notifying is mandatory. CAPTCHA adds visitor friction and service setup; it is not needed for this agreed incremental change. Valid URLs inside messages must not trigger generated-string detection. Reject bad timing with a visible error for a visitor rather than showing false success.

Email domain validation cannot establish ownership or existence of a specific mailbox. Phone validation cannot establish ownership or reachability. No production deployment is part of this change.
