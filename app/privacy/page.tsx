/**
 * app/privacy/page.tsx — Privacy Policy for CyberShield LMS.
 */

import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export const metadata = { title: 'Privacy Policy' };

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `When you register for CyberShield LMS, we collect your name, email address, and a securely hashed password. As you use the Platform, we collect educational activity data including quiz attempts, scores, accuracy rates, response times, EXP earned, badges awarded, and assignment submissions. We do not collect payment information, government identifiers, or sensitive personal data beyond what is necessary to operate the educational service.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: operate and maintain your account and profile; display your progress, level, and rank on the leaderboard; enable teachers to review class analytics and grade assignments; award EXP, medals, and badges based on quiz performance; send transactional emails such as account confirmation and password reset links; and improve the Platform's content and user experience. We do not use your data for advertising purposes.`,
  },
  {
    title: '3. Data Sharing and Disclosure',
    body: `We do not sell, rent, or trade your personal information to third parties. Your quiz results and profile data may be visible to: teachers who manage the class you are enrolled in (for educational oversight); other students on the leaderboard (name, level, and total EXP only); and administrators for platform management. We may disclose your information if required by law or to protect the rights and safety of the Platform and its users.`,
  },
  {
    title: '4. Data Storage and Security',
    body: `Your data is stored on Supabase's cloud infrastructure, which uses encrypted connections (TLS) and encrypted storage. We implement reasonable technical and organizational safeguards to protect your personal information from unauthorized access, loss, or misuse. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '5. Cookies and Local Storage',
    body: `We use authentication cookies to maintain your login session across page loads. These cookies are essential for the Platform to function and cannot be disabled without breaking authentication. We do not use tracking cookies, advertising cookies, or third-party analytics cookies. Your session data is stored in encrypted cookies managed by our authentication provider.`,
  },
  {
    title: '6. Children\'s Privacy',
    body: `CyberShield LMS is intended for use by students aged 13 and older. If you are under 13, please do not create an account without the supervision and consent of a parent or guardian. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to delete that information promptly. Educational institutions using this Platform for younger students are responsible for obtaining appropriate consents.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to: access the personal information we hold about you; request correction of inaccurate data; request deletion of your account and associated data; and object to or restrict certain processing of your data. To exercise these rights, please contact your teacher or institution administrator, or reach out through our support channels.`,
  },
  {
    title: '8. Data Retention',
    body: `We retain your account data and educational records for as long as your account is active or as needed to provide the service. Quiz attempt history is retained to power analytics and leaderboards. If you request account deletion, we will delete or anonymize your personal data within 30 days, except where retention is required by law or for legitimate educational record-keeping purposes.`,
  },
  {
    title: '9. Third-Party Services',
    body: `We use Supabase as our backend infrastructure provider for database storage and authentication services. Supabase processes your data in accordance with their own privacy policy and security practices. We use Vercel for hosting the web application. We do not integrate with social media platforms, advertising networks, or data brokers.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will notify users of material changes by updating the "Last updated" date at the top of this page. Continued use of the Platform after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    body: `If you have questions, concerns, or requests regarding this Privacy Policy or how we handle your personal data, please contact us through the Platform's support channels or through your institution's administrator. We take privacy concerns seriously and will respond within a reasonable timeframe.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-500">
            Last updated: March 2026 &nbsp;·&nbsp;{' '}
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              Terms of Service
            </Link>
          </p>
        </div>

        {/* Introduction */}
        <p className="text-sm text-gray-400 leading-relaxed mb-8 p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5">
          Your privacy matters to us. This policy explains what information CyberShield LMS collects,
          how we use it, and the choices you have about your data.
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold text-white mb-2">{section.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <Link href="/" className="text-xs text-gray-600 hover:text-cyan-400 transition-colors">
            ← Back to CyberShield LMS
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
