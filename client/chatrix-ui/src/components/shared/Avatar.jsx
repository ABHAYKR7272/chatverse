import { SERVER_URL } from '../../utils/api';
import { getInitials } from '../../utils/format';

export default function Avatar({ user, size = 40, className = '' }) {
  if (!user) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#2A3942', flexShrink: 0 }} />
  );

  const name = user.username || user.name || '?';
  const avatarUrl = user.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : `${SERVER_URL}${user.avatar}`)
    : null;
  const isGroup = user.type === 'group';
  const color = user.avatarColor || '#25D366';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={className}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0, display: 'block'
        }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: isGroup ? '#128C7E' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.38), fontWeight: '600',
        color: 'white', flexShrink: 0, userSelect: 'none',
        letterSpacing: '0.5px'
      }}
    >
      {isGroup ? '👥' : getInitials(name)}
    </div>
  );
}
