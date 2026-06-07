# Google Stitch Autonomous Brief

Use this as the master prompt in Google Stitch for the Artbook Android UI/UX rebuild. The goal is to generate a new high-fidelity Android app design that preserves the working flow from the existing Artbook prototype, while replacing the old oversized single-file UI with a cleaner mobile-first experience.

## Master Prompt

Design a complete high-fidelity Android mobile app called **Artbook**.

Artbook is a mobile-first platform for discovering artwork, following artists, joining live art moments, booking artist/gallery experiences, saving guest orders, and showing conversion evidence in an internal ledger. The app should feel like a premium art/community product with practical operational flows underneath. It must not look like a generic social app, crypto app, finance app, or booking template.

Create a polished Android design for a Motorola-sized phone viewport. Use a modern Material-inspired system, but make it custom and art-forward: clean surfaces, refined typography, strong image treatment, tactile buttons, clear bottom navigation, and elegant empty/loading/success states. The UI should feel calm, creative, and trustworthy.

Do **not** copy the existing Artbook prototype UI. Preserve only the flow and app logic. The old prototype was too large and visually overloaded, so this design should be simpler, more modular, and easier to build in Android Studio.

Use the attached reference images as style and flow references:

- Use `06-designcode-*` references for the design system: buttons, cards, icon style, colors, menus, typography, light/dark palettes, blur treatment, and component spacing.
- Use `07-saas-organizational-*` for responsive dashboard density, structured navigation, list/table rhythm, and professional light/dark variants.
- Use `09-omnichart-*` for flow mapping, node relationships, and visual explanation of multi-step journeys.
- Use `11-chat-app-6-mobile-frames` for messaging layout, thread list, conversation detail, composer, and attachment states.
- Use `12-furniture-marketplace-product-order-payment-screens` for product/artwork detail, order review, checkout-like guest order capture, and confirmation layout.
- Use `13-dark-nft-components-provenance-cards` for artwork provenance, edition metadata, collector confidence cards, and ownership-style information without making the app feel like a crypto product.
- Use `14-event-booking-design-full-light-dark-30-screens` and `15-scheddo-booking-*` for the booking flow: landing, select service, select time, login/create account, review/confirm, success, and booking dashboard.
- Use `17-musing-music-player-now-playing-lyrics` only for immersive artist media moments such as audio notes, studio stories, or narrated collection context.
- Use `18-ai-chatbot-full-desktop-mobile-screens` for an assistant/helper pattern inside Artbook, especially support and guided discovery.
- Use `19-social-network-full-desktop-mobile-feed-profile` for community feed, artist profile, collector profile, comments, reactions, and follow states.
- Use `20-live-streaming-app-1-published-site` and `21-zuzu-short-video-212-frames-light-dark` for live studio sessions, short art videos, vertical media browsing, and creator content flow.
- Use `24-money-management-142-screens-light` and `24-money-management-142-screens-dark` for the internal ledger and conversion evidence screens. These screens should show source lead, order/booking status, timestamps, and evidence without implying a payment or approved booking happened when it did not.
- Use `25-saas-podcasting-final-result` for creator studio/publishing structure if an artist records audio/video updates or guided artwork notes.

## Required Screens

Generate these Android screens as separate named frames. Use realistic sample data and artwork placeholders.

1. **Welcome / Mode Gate**
   - Brand: Artbook.
   - Primary actions: Explore as Collector, Continue as Artist, Gallery/Admin.
   - Include subtle visual signal of artwork discovery, live events, bookings, and artist studios.

2. **Collector Home**
   - Personalized feed with featured artwork, live studio cards, new drops, nearby gallery/event prompts, and quick search.
   - Bottom navigation: Home, Explore, Live, Orders, Profile.

3. **Explore / Search**
   - Search bar, filter chips, category tabs, saved filters, masonry/list hybrid artwork results.
   - Include states for trending artists, mediums, price bands, location, and availability.

4. **Artwork Detail**
   - Large artwork image, artist summary, artwork title, medium, dimensions, availability/status, provenance card, story/audio note entry, save/share actions.
   - Primary actions: Enquire, Reserve Interest, Book Viewing.

5. **Artist Profile**
   - Artist hero, follow button, short bio, artwork grid, live/short video strip, upcoming events, contact/enquiry action.
   - Show community/social cues without clutter.

6. **Open-Door Lead / Enquiry Form**
   - Lightweight form for guest or signed-in user.
   - Fields: name, email/phone, interest type, preferred contact, message.
   - If arriving from an artwork or artist, show a compact source card so the lead origin is preserved.

7. **Booking: Select Service**
   - Use the booking references for layout.
   - Services: Studio Visit, Gallery Viewing, Artist Call, Workshop Seat.
   - Include duration, price/free label, description, and selected state.

8. **Booking: Select Time**
   - Calendar/date selector, time slots, location/online toggle, timezone hint.
   - Clear disabled/full/pending states.

9. **Login / Create Account / Continue as Guest**
   - Offer account creation without blocking guest flow.
   - Clean social/email options and privacy reassurance.

10. **Review + Confirm**
   - Summary of source artwork/artist/lead, chosen service/time, contact details, and notes.
   - CTA: Send Booking Request.
   - Copy must say request/pending, not approved/paid.

11. **Success / Pending Request**
   - Clear confirmation that the request was sent.
   - Show next steps: artist/gallery will confirm; user can track in Orders.
   - Actions: View Request, Message Artist, Back Home.

12. **Orders / Requests**
   - List of enquiries, guest orders, booking requests, statuses, source artwork/artist, and timestamps.
   - Statuses: Draft, Sent, Pending, Confirmed, Declined, Converted.

13. **Messages**
   - Thread list and conversation detail.
   - Include artwork context pill, booking/order context, attachment button, voice/audio note option, and safe composer.

14. **Live / Shorts**
   - Vertical content browsing for studio livestreams, short artwork videos, artist updates.
   - Include live badge, viewer count, comment/reaction affordances, and artwork/product link drawer.

15. **Artist Studio Dashboard**
   - Artist-facing overview: new leads, pending booking requests, recent messages, live session schedule, artwork management shortcuts.
   - Use dense SaaS/dashboard patterns but keep it mobile friendly.

16. **Artist Lead Detail**
   - Show lead source, contact info, message, related artwork, timeline, and actions: reply, convert to guest order, propose booking time, mark closed.

17. **Guest Order Detail**
   - Order-like record that can be linked to an enquiry/lead.
   - Include item, source lead, contact, notes, status, evidence timeline.
   - Avoid payment language unless explicitly marked unpaid/paid sample state.

18. **Ledger / Conversion Evidence**
   - Internal/admin style screen.
   - Show event timeline proving how a lead became an order or booking request.
   - Include source lead id, artwork id, artist id, status history, created/sent/confirmed timestamps, and audit-friendly labels.
   - Important: do not claim a payment or confirmed booking unless status says confirmed/paid.

19. **Profile / Settings**
   - Account info, role switcher, saved artworks, notifications, privacy, connected artist/gallery workspace.

20. **Empty, Error, Loading, Offline States**
   - Provide reusable states for no results, no messages, failed send, offline mode, and skeleton loading.

## Interaction Flow

Create clickable prototype connections:

- Welcome -> Collector Home -> Explore -> Artwork Detail -> Enquiry Form -> Success.
- Artwork Detail -> Booking Select Service -> Select Time -> Login/Guest -> Review Confirm -> Success -> Orders.
- Artist Profile -> Message -> Conversation.
- Collector Home -> Live/Shorts -> Artwork Detail drawer.
- Artist Studio Dashboard -> Lead Detail -> Guest Order Detail -> Ledger Evidence.
- Orders -> Request Detail -> Message Artist.
- Profile -> Role Switcher -> Artist Studio Dashboard.

## Visual Direction

Use a refined light theme first, with dark-theme variants for dashboard, live/video, and ledger screens where useful. Avoid a one-color purple/blue gradient look. Use a balanced palette: warm gallery neutrals, ink text, crisp white surfaces, charcoal surfaces for media, muted green/teal success states, amber pending states, and red only for destructive/error states.

Use real app UI density, not a landing page. Avoid oversized marketing hero sections. Keep cards at 8px radius or less unless an image surface needs a softer container. Use icon buttons for common actions and text buttons only for clear commands. Ensure all text fits on mobile.

## Build Handoff Requirements

For each frame, keep layers/components named clearly for Android Studio handoff. Prefer reusable components:

- Bottom navigation
- Top app bar
- Artwork card
- Artist card
- Booking service row
- Time slot chip
- Status badge
- Source lead card
- Timeline/evidence row
- Message bubble
- Media/live card
- Empty state

Include enough design detail that an Android engineer can rebuild the screens in Jetpack Compose or native Android views without depending on the original old prototype.

## Copy Rules

Use careful status language:

- Say **booking request sent**, not booking approved.
- Say **guest order record**, not purchase, unless payment is explicitly included.
- Say **conversion evidence**, not revenue proof, unless payment is confirmed.
- Preserve source context from lead to order/booking.

## Output Goal

Produce a complete mobile UI kit plus the 20 screens above, with prototype links showing the main flow. The design should be polished enough to guide the Android rebuild, but structured enough that it can be implemented in stages without crashing Codex or Android Studio.
