export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="container prose prose-neutral dark:prose-invert max-w-3xl py-16 md:py-24">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        These Terms of Service ("Terms") govern your access to and use of Inspector. By creating an
        account or using the service, you agree to be bound by these Terms.
      </p>
      <h2>Use of the service</h2>
      <p>
        You agree to use Inspector only for lawful purposes and in accordance with these Terms and
        any applicable laws and regulations.
      </p>
      <h2>Subscriptions and billing</h2>
      <p>
        Paid plans are billed monthly or annually in advance. You may cancel at any time; access
        continues through the end of the current billing period.
      </p>
      <h2>Data ownership</h2>
      <p>
        You retain all rights to the data you submit to Inspector. We process this data only as
        required to deliver the service.
      </p>
      <h2>Service availability</h2>
      <p>
        We strive for high availability and reliability. Enterprise plans include service-level
        agreements (SLA).
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:legal@inspector.app">legal@inspector.app</a>.
      </p>
    </article>
  );
}
