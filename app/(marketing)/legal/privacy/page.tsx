export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="container prose prose-neutral dark:prose-invert max-w-3xl py-16 md:py-24">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        Inspector ("we", "us") respects your privacy. This policy describes how we collect, use and
        protect your information when you use our platform.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account data (name, email, organization).</li>
        <li>EHS records you create within your workspace.</li>
        <li>Usage and diagnostics data to improve the product.</li>
      </ul>
      <h2>How we use your data</h2>
      <p>
        We process your data solely to provide and improve the service, communicate with you about
        your account, and comply with legal obligations.
      </p>
      <h2>Data security</h2>
      <p>
        We employ encryption in transit, role-based access control, audit trails and tenant-scoped
        isolation. Enterprise plans support SSO, custom retention and data export.
      </p>
      <h2>Your rights</h2>
      <p>
        You may access, correct, export or delete your personal data at any time. Contact{" "}
        <a href="mailto:privacy@inspector.app">privacy@inspector.app</a> with any questions.
      </p>
    </article>
  );
}
