# App Check Enforcement

Web clients use reCAPTCHA Enterprise. Debug tokens are exclusively bound to localhost and emulator execution paths and MUST NOT be shipped into production web bundles. Functions explicitly declare `enforceAppCheck: true` for sensitive routes.
