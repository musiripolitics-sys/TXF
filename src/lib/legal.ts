// Legal / policy content, transcribed from the Techxfluence documents.

export type LegalSection = { heading: string; body: string };

export type LegalDoc = {
  slug: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export const terms: LegalDoc = {
  slug: "terms",
  title: "Terms & Conditions",
  updated: "Version 1.0",
  intro:
    "By accessing or using Techxfluence, users agree to comply with these Terms and Conditions.",
  sections: [
    { heading: "1. Acceptance of Terms", body: "By accessing or using Techxfluence, users agree to comply with these Terms and Conditions." },
    { heading: "2. Platform Overview", body: "Techxfluence provides technology events, memberships, community activities, event hosting services, and related offerings." },
    { heading: "3. User Registration", body: "Users must provide accurate information during registration and are responsible for maintaining account security." },
    { heading: "4. Event Registration & Participation", body: "Event registrations may be free or paid. Entry is subject to event-specific requirements and capacity limitations." },
    { heading: "5. Membership Program", body: "Membership benefits, fees, renewal terms, and privileges are subject to change at Techxfluence's discretion." },
    { heading: "6. Payments & Refunds", body: "Payments are processed through approved payment gateways. Refund eligibility depends on the event and cancellation policy." },
    { heading: "7. Event Hosting by Third Parties", body: "Users hosting events through Techxfluence are responsible for the accuracy of event details, legal compliance, and attendee safety." },
    { heading: "8. Code of Conduct", body: "Members and attendees must behave professionally and respectfully. Harassment, discrimination, or disruptive behavior may result in suspension." },
    { heading: "9. Intellectual Property", body: "All trademarks, logos, branding, content, software, and materials belonging to Techxfluence remain its intellectual property." },
    { heading: "10. Privacy", body: "Personal information collected through the platform will be handled according to the Privacy Policy." },
    { heading: "11. Cancellation & Modifications", body: "Techxfluence reserves the right to modify, reschedule, or cancel events due to operational, safety, or unforeseen circumstances." },
    { heading: "12. Limitation of Liability", body: "Techxfluence shall not be liable for indirect, incidental, or consequential damages arising from event participation or platform use." },
    { heading: "13. Community Guidelines", body: "Users must follow community standards while participating in online and offline activities." },
    { heading: "14. Termination", body: "Techxfluence may suspend or terminate accounts that violate these terms." },
    { heading: "15. Governing Law", body: "These Terms shall be governed by the laws of India, and disputes shall be subject to the jurisdiction of Chennai, Tamil Nadu." },
    { heading: "16. Contact Information", body: "Questions regarding these Terms may be directed to the official Techxfluence support team." },
  ],
};

export const handbook: LegalDoc = {
  slug: "handbook",
  title: "Membership Handbook",
  updated: "Version 1.0",
  intro:
    "Welcome to Techxfluence, a community of technology enthusiasts, professionals, students, entrepreneurs, and innovators dedicated to learning, networking, and building impactful solutions.",
  sections: [
    { heading: "Community Vision", body: "To build a thriving technology ecosystem that empowers individuals through events, collaboration, innovation, and leadership opportunities." },
    { heading: "Membership Categories", body: "Free Member, Pro Member, Elite Member, Volunteer Member, and Community Ambassador." },
    { heading: "Member Benefits", body: "Access to community events, networking opportunities, discounts on workshops and conferences, leadership opportunities, partner benefits, exclusive content, and recognition programs." },
    { heading: "Code of Conduct", body: "Members must treat others with respect, maintain professionalism, avoid harassment or discrimination, and contribute positively to the community." },
    { heading: "Event Participation Guidelines", body: "Members are expected to register appropriately, arrive on time, follow event rules, respect speakers and attendees, and maintain professional behavior." },
    { heading: "Community Engagement", body: "Members are encouraged to participate in discussions, challenges, hackathons, workshops, volunteering activities, and leadership initiatives." },
    { heading: "Membership Renewal", body: "Membership validity, renewal schedules, fees, and benefits are subject to the membership plan selected by the member." },
    { heading: "Rewards & Recognition", body: "Members may earn points, badges, certificates, leadership positions, and recognition through active participation and contributions." },
    { heading: "Volunteer & Ambassador Program", body: "Members can apply to become volunteers or ambassadors and help organize events, grow the community, and represent Techxfluence." },
    { heading: "Membership Suspension & Termination", body: "Techxfluence reserves the right to suspend or terminate memberships for violations of community guidelines or misconduct." },
    { heading: "Communication Channels", body: "Official communication may occur through email, website notifications, WhatsApp communities, Discord servers, LinkedIn, and other approved channels." },
    { heading: "Privacy & Data Usage", body: "Member information will be handled according to the Techxfluence Privacy Policy and applicable laws." },
    { heading: "Contact & Support", body: "Members may contact the Techxfluence support team for membership, event, partnership, or community-related assistance." },
  ],
};

export const organizerAgreement: LegalDoc = {
  slug: "organizer-agreement",
  title: "Event Organizer Agreement",
  updated: "Version 1.0",
  intro:
    "This Agreement governs the relationship between Techxfluence and event organizers who list, promote, or conduct events through the Techxfluence platform.",
  sections: [
    { heading: "1. Purpose", body: "This Agreement governs the relationship between Techxfluence and event organizers who list, promote, or conduct events through the Techxfluence platform." },
    { heading: "2. Parties", body: "This Agreement is entered into between Techxfluence and the Event Organizer identified during the registration or event submission process." },
    { heading: "3. Organizer Responsibilities", body: "The Organizer is responsible for providing accurate event information, complying with applicable laws, managing attendees, ensuring venue safety, and delivering the event as advertised." },
    { heading: "4. Event Submission & Approval", body: "All events submitted through the platform are subject to review and approval by Techxfluence. Approval may be denied if the event does not meet platform standards." },
    { heading: "5. Event Changes & Cancellations", body: "The Organizer must promptly notify Techxfluence of any changes, postponements, or cancellations. Refund obligations shall be handled according to the event policy." },
    { heading: "6. Registration & Ticketing", body: "Techxfluence may provide registration, ticketing, and attendee management services. Organizers agree to honor valid registrations." },
    { heading: "7. Revenue Sharing & Fees", body: "Platform fees, payment processing charges, and revenue-sharing arrangements shall be agreed upon separately and may vary by event." },
    { heading: "8. Sponsorship & Branding", body: "Organizers may not use Techxfluence trademarks, branding, or logos without authorization. Sponsored activities must comply with platform guidelines." },
    { heading: "9. Attendee Data", body: "Attendee information provided through the platform may only be used for event-related purposes and must not be sold, transferred, or misused." },
    { heading: "10. Code of Conduct", body: "Organizers must maintain a safe, inclusive, and professional environment free from harassment, discrimination, and unlawful activity." },
    { heading: "11. Intellectual Property", body: "Each party retains ownership of its intellectual property. Event content remains the responsibility of the Organizer unless otherwise agreed." },
    { heading: "12. Insurance & Liability", body: "Organizers are responsible for obtaining necessary permits, licenses, and insurance coverage where applicable." },
    { heading: "13. Indemnification", body: "The Organizer agrees to indemnify and hold Techxfluence harmless from claims arising from the Organizer's actions, negligence, or event operations." },
    { heading: "14. Termination", body: "Techxfluence may suspend or terminate an Organizer's access for policy violations, misconduct, fraudulent activity, or reputational risk." },
    { heading: "15. Dispute Resolution", body: "Any disputes shall first be addressed through negotiation and, if unresolved, through arbitration under applicable laws." },
    { heading: "16. Governing Law", body: "This Agreement shall be governed by the laws of India, with jurisdiction in Chennai, Tamil Nadu." },
    { heading: "17. Acceptance", body: "By submitting or hosting events through Techxfluence, the Organizer agrees to these terms and conditions." },
  ],
};
