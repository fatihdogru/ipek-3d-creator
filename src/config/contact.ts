import { Instagram, Linkedin, Youtube } from 'lucide-react';
import type { ComponentType } from 'react';
import ArtStationIcon from '../components/icons/ArtStationIcon';

/** Address shown in the contact dialog, alongside the form itself. */
export const CONTACT_EMAIL = 'dogruipekk@gmail.com';

export interface SocialLink {
  name: string;
  href: string;
  /** Loose enough to accept both lucide icons and the local SVG components. */
  Icon: ComponentType<{ className?: string }>;
}

/**
 * Entries with an empty `href` are dropped before rendering, so half-filled
 * profiles never ship as dead links. Fill one in to make it appear.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'Instagram', href: 'https://www.instagram.com/designipek', Icon: Instagram },
  { name: 'ArtStation', href: '', Icon: ArtStationIcon },
  { name: 'LinkedIn', href: '', Icon: Linkedin },
  { name: 'YouTube', href: '', Icon: Youtube },
];

export const VISIBLE_SOCIAL_LINKS = SOCIAL_LINKS.filter((link) => link.href);
