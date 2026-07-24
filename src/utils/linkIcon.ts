import { Mail, MessageCircle, Phone, Link as LinkIcon, AtSign } from 'lucide-react';

// lucide-react no longer ships brand/logo icons (Instagram, Facebook, Youtube, ...) — this only
// picks generic icons it actually has, and falls back to a plain link icon for everything else.
// Shared by ArchetypeRenderer (link blocks) and ProfileHeader (shortcut buttons) so both stay in sync.
export function iconForLinkUrl(url: string) {
  const u = (url || '').toLowerCase();
  if (u.includes('instagram.com')) return AtSign;
  if (u.includes('wa.me') || u.includes('whatsapp')) return MessageCircle;
  if (u.startsWith('mailto:')) return Mail;
  if (u.startsWith('tel:')) return Phone;
  return LinkIcon;
}
