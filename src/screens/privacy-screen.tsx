import { Stack } from 'expo-router';
import { Copy, Display, Eyebrow, Page, Section } from '@/components/ui';

export function PrivacyScreen() {
  return <Page>
    <Stack.Title>Privacy & beta details</Stack.Title>
    <Eyebrow>A SMALL STUDIO, CLEAR BOUNDARIES.</Eyebrow><Display>Your photos.{ '\n' }Your choice.</Display>
    <Section title="WHAT STAYS ON YOUR DEVICE"><Copy>Your selected working copy and completed edits are kept in the app’s local storage. Native sessions use the OS Keychain/Keystore. The browser preview stores sessions in browser storage and photos in IndexedDB. The photo collection is not separately encrypted by this beta.</Copy></Section>
    <Section title="WHEN YOU MAKE AN EDIT"><Copy>The selected image is resized and converted to JPEG before upload. The API removes image metadata, including EXIF location data. Inputs are processed in memory, not written into the server database or application logs. Successful result previews stay in server memory for up to ten minutes so your device can download them. Your app saves completed edits locally automatically.</Copy></Section>
    <Section title="DEMO IS NOT AI"><Copy>Demo mode applies deterministic color and exposure effects. No image is sent to an AI provider and no AI fees are incurred. Thumbnails and the sample portrait show these illustrative demo effects, not generative AI quality.</Copy></Section>
    <Section title="LIVE AI PILOT"><Copy>Only an operator can enable live Gemini processing on the server. It requires a server-side key, explicit live-mode configuration, and an invite code. Your selected photo is sent to Google’s Gemini API after you consent. Google’s own data retention and usage terms apply; the operator must review the terms for their account before inviting users. Stilllight does not promise that a provider never retains data.</Copy></Section>
    <Section title="WHAT THE SERVER REMEMBERS"><Copy>The beta stores a hashed session token, expiry, beta credit balance, request fingerprints, and edit status/timestamps in SQLite. It does not store your photo bytes in SQLite. Anonymous beta sessions are not a replacement for a recoverable customer account. Losing a session can lose access to its beta credits.</Copy></Section>
    <Section title="DELETE AND EXPORT"><Copy>Delete individual edits from their result screen, or clear the entire local collection in Settings. Delete beta session & data removes your server account, credit balance, job metadata and temporary previews, along with your local collection. Copies you have exported to Photos, Downloads, or other apps must be deleted there separately.</Copy></Section>
    <Section title="BEFORE A PUBLIC LAUNCH"><Copy>This private beta does not collect payments. Store billing, verified credit purchases, recoverable accounts, stronger anti-abuse controls, commercial asset clearance, provider privacy review and real-device quality testing are still required. AI output can change details unintentionally; review your photos before sharing.</Copy></Section>
  </Page>;
}
