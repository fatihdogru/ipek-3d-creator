/**
 * ArtStation brand mark — lucide has no icon for it, and it is the one network
 * that matters most for a 3D portfolio. Filled rather than stroked, so it is
 * sized to sit optically level with the lucide icons beside it.
 */
export default function ArtStationIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M0 17.723l2.027 3.505h.001a2.424 2.424 0 0 0 2.164 1.333h13.457l-2.792-4.838H0zm24 .025c0-.484-.143-.935-.388-1.314L15.728 2.728a2.424 2.424 0 0 0-2.142-1.289H9.419L21.598 22.54l1.92-3.325c.378-.637.482-.919.482-1.467zm-11.129-3.462L7.936 5.653l-4.945 8.633h9.88z" />
    </svg>
  );
}
