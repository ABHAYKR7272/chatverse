import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns';

export const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
  return format(d, 'HH:mm');
};

export const formatChatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  const diff = Date.now() - d.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) return format(d, 'EEE');
  return format(d, 'dd/MM/yyyy');
};

export const formatLastSeen = (dateStr) => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
  return `last seen ${format(d, 'dd/MM/yyyy')} at ${format(d, 'HH:mm')}`;
};

export const formatCallDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getDateLabel = (dateStr) => {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
};

export const getMsgPreview = (chat) => {
  if (!chat.lastMessageText) return '';
  const type = chat.lastMessageType;
  if (type === 'image') return '📷 Photo';
  if (type === 'video') return '🎥 Video';
  if (type === 'audio' || type === 'voice') return '🎤 Voice message';
  if (type === 'file' || type === 'document') return '📎 Document';
  if (type === 'deleted') return 'This message was deleted';
  return chat.lastMessageText;
};
