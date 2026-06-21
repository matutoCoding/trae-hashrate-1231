import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Folder } from '@/types';
import { formatRelativeTime } from '@/utils';
import StatusBadge from '../StatusBadge';
import styles from './index.module.scss';

interface FolderCardProps {
  folder: Folder;
  onClick?: (folder: Folder) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(folder);
    } else {
      Taro.navigateTo({
        url: `/pages/folder-detail/index?id=${folder.id}`,
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.folderIconWrap}>
          <View className={classnames(styles.folderIcon, styles[folder.status])}>
            <Text className={styles.folderIconText}>📁</Text>
          </View>
        </View>
        <View className={styles.titleWrap}>
          <Text className={styles.title}>{folder.name}</Text>
          <Text className={styles.updateTime}>更新于 {formatRelativeTime(folder.lastUpdate)}</Text>
        </View>
        <StatusBadge status={folder.status} text={folder.statusText} size="sm" />
      </View>

      <Text className={styles.description}>{folder.description}</Text>

      <View className={styles.stats}>
        <View className={styles.statItem}>
          <Text className={styles.statIcon}>👥</Text>
          <Text className={styles.statValue}>{folder.memberCount}</Text>
          <Text className={styles.statLabel}>成员</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statIcon}>✏️</Text>
          <Text className={styles.statValue}>{folder.editCount}</Text>
          <Text className={styles.statLabel}>编辑者</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={classnames(styles.statItem, folder.externalCount > 0 && styles.hasExternal)}>
          <Text className={styles.statIcon}>🔗</Text>
          <Text className={styles.statValue}>{folder.externalCount}</Text>
          <Text className={styles.statLabel}>外部协作</Text>
        </View>
      </View>
    </View>
  );
};

export default FolderCard;
