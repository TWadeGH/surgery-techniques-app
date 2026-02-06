import React, { useState, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { VALIDATION } from '../../utils/constants';

export default function SponsorshipInquiryModal({ isOpen, onClose, currentUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [message, setMessage] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.from('specialties').select('id, name').order('name').then(({ data }) => setSpecialties(data || []));
    }
  }, [isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    if (!VALIDATION.EMAIL.PATTERN.test(email)) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sponsorship_inquiries').insert([{
        specialty_id: specialtyId || null,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim(),
      }]);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting inquiry:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setName('');
    setEmail(currentUser?.email || '');
    setPhone('');
    setSpecialtyId('');
    setMessage('');
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Partnership Inquiry" size="md">
      {submitted ? (
        <ModalBody>
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Thank you!</p>
            <p className="text-gray-600 dark:text-gray-400">Your inquiry has been submitted. We will be in touch.</p>
          </div>
        </ModalBody>
      ) : (
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
                <select
                  value={specialtyId}
                  onChange={e => setSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select specialty</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
