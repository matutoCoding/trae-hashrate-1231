import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface SectionHeaderProps {
  title: string;
  extra?: React.ReactNode;
  desc?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, extra, desc }) => {
  return (
    <View className={styles.header}>
      <View className={styles.left}>
        <View className={styles.titleBar} />
        <Text className={styles.title}>{title}</Text>
      </View>
      {desc && <Text className={styles.desc}>{desc}</Text>}
      {extra && <View className={styles.extra}>{extra}</View>}
    </View>
  );
};

export default SectionHeader;
