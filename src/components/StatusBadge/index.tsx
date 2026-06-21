import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusBadgeProps {
  status: 'safe' | 'warning' | 'danger';
  text: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, showDot = true, size = 'md' }) => {
  return (
    <View className={classnames(styles.badge, styles[status], styles[size])}>
      {showDot && <View className={styles.dot} />}
      <Text className={styles.text}>{text}</Text>
    </View>
  );
};

export default StatusBadge;
