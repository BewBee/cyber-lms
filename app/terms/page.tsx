/**
 * app/terms/page.tsx — Terms of Service for CyberShield LMS.
 */

import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export const metadata = { title: 'Terms of Service' };

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or accessing CyberShield LMS ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. We reserve the right to update these terms at any time; continued use of the Platform constitutes acceptance of any changes.`,
  },
  {
    title: '2. Use of the Platform',
    body: `CyberShield LMS is an educational platform designed to teach cybersecurity concepts through gamified quizzes, modules, and assignments. You agree to use the Platform solely for lawful educational purposes. You must not: attempt to gain unauthorized access to any system or account; submit content that is harmful, offensive, or violates any applicable law; reverse-engineer, scrape, or exploit any part of the Platform; or share your account credentials with others.`,
  },
  {
    title: '3. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account. Accounts are personal and non-transferable. We reserve the right to suspend or terminate accounts that violate these terms, engage in academic dishonesty, or misuse the gamification features.`,
  },
  {
    title: '4. Student and Teacher Responsibilities',
    body: `Students agree to complete quizzes and assignments honestly and without external assistance unless explicitly permitted by their teacher. Teachers are responsible for the accuracy and appropriateness of the module content, questions, and assignments they create. Teachers must not upload or share content that infringes on third-party intellectual property rights.`,
  },
  {
    title: '5. Intellectual Property',
    body: `All core curriculum content, platform design, branding, and software code are the intellectual property of CyberShield LMS and its licensors. Teachers retain ownership of the custom module content they create but grant CyberShield LMS a non-exclusive license to host and display that content within the Platform. Students retain ownership of their submitted assignment work.`,
  },
  {
    title: '6. Gamification and EXP System',
    body: `Experience points (EXP), levels, medals, and badges are virtual rewards with no monetary value and cannot be redeemed, transferred, or exchanged. We reserve the right to adjust, reset, or remove gamification data for maintenance, fairness, or system integrity purposes. Any attempt to artificially inflate EXP or manipulate the leaderboard will result in account suspension.`,
  },
  {
    title: '7. Privacy',
    body: `Your use of the Platform is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection and use of your information as described in the Privacy Policy.`,
  },
  {
    title: '8. Disclaimer of Warranties',
    body: `The Platform is provided on an "as is" and "as available" basis without warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of harmful components. Cybersecurity knowledge gained through the Platform is for educational purposes; we make no guarantees regarding employment outcomes or professional certification.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the fullest extent permitted by law, CyberShield LMS shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform, including but not limited to loss of data, loss of EXP, or unauthorized account access.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Platform shall be resolved through good-faith negotiation before pursuing any formal legal action.`,
  },
  {
    title: '11. Contact',
    body: `If you have questions about these Terms of Service, please contact us through the Platform's support channels or reach out to your institution's administrator.`,
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-gray-500">
            Last updated: March 2026 &nbsp;·&nbsp;{' '}
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Introduction */}
        <p className="text-sm text-gray-400 leading-relaxed mb-8 p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5">
          Please read these Terms of Service carefully before using CyberShield LMS. These terms
          govern your access to and use of our gamified cybersecurity learning platform.
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
