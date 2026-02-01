/**
 * Modal that displays legal page content (Terms, Privacy, About, Contact, Sponsorship, Copyright).
 * Security: page is allowlisted; only keys in LEGAL_PAGES are rendered. No user-supplied HTML.
 */

import React from 'react';
import Modal from '../common/Modal';
import {
  TermsContent,
  PrivacyContent,
  AboutContent,
  ContactContent,
  SponsorshipContent,
  CopyrightContent,
} from './LegalContent';

export const LEGAL_PAGES = {
  terms: { title: 'Terms & Conditions', Component: TermsContent },
  privacy: { title: 'Privacy Policy', Component: PrivacyContent },
  about: { title: 'About', Component: AboutContent },
  contact: { title: 'Contact Us', Component: ContactContent },
  sponsorship: { title: 'Sponsorship Disclosure', Component: SponsorshipContent },
  copyright: { title: 'Copyright & Takedown Policy', Component: CopyrightContent },
};

const ALLOWED_LEGAL_PAGES = Object.keys(LEGAL_PAGES);

export default function LegalModal({ page, onClose }) {
  // Allowlist: only render known pages (no prototype pollution / injection)
  if (!page || typeof page !== 'string' || !ALLOWED_LEGAL_PAGES.includes(page)) return null;

  const { title, Component } = LEGAL_PAGES[page];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      size="xl"
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEsc={true}
    >
      <Component />
    </Modal>
  );
}
