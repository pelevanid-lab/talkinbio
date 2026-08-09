import styles from './home.module.css';

export type PresenceState = 'idle' | 'listening' | 'thinking' | 'responding' | 'adapted';

export default function PresenceIndicator({
  state = 'idle',
  label,
}: {
  state?: PresenceState;
  label?: string;
}) {
  return (
    <span className={styles.presence} data-state={state} aria-label={label || `Presence: ${state}`}>
      <span />
      <span />
      <span />
    </span>
  );
}
