import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export { dayjs };

export const formatDate = (date: string, format: string = 'YYYY-MM-DD HH:mm') => {
  return dayjs(date).format(format);
};

export const formatRelativeTime = (date: string) => {
  return dayjs(date).fromNow();
};

export const getStatusColor = (status: string) => {
  const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
    safe: { bg: '#ECFDF5', text: '#10B981', dot: '#10B981' },
    warning: { bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' },
    danger: { bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444' },
  };
  return colorMap[status] || colorMap.safe;
};

export const getPermissionText = (level: string) => {
  return level === 'edit' ? '编辑权限' : '查看权限';
};

export const getPermissionColor = (level: string) => {
  return level === 'edit' ? { bg: '#FEF3C7', text: '#D97706' } : { bg: '#DBEAFE', text: '#2563EB' };
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 10);
};

export const getDaysUntilExpire = (expireAt: string) => {
  const now = dayjs();
  const expire = dayjs(expireAt);
  return expire.diff(now, 'day');
};
