import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Record } from '@/types';
import { formatDate } from '@/utils';
import styles from './index.module.scss';

interface RecordItemProps {
  record: Record;
}

const actionConfig: Record<string, { icon: string; bg: string; color: string }> = {
  retain: { icon: '✅', bg: '#ECFDF5', color: '#10B981' },
  revoke: { icon: '🚫', bg: '#FEF2F2', color: '#EF4444' },
  feedback: { icon: '📝', bg: '#EFF6FF', color: '#2563EB' },
};

const statusConfig: Record<string, { text: string; bg: string; color: string }> = {
  pending: { text: '处理中', bg: '#FEF3C7', color: '#D97706' },
  completed: { text: '已完成', bg: '#ECFDF5', color: '#10B981' },
  rejected: { text: '已拒绝', bg: '#FEF2F2', color: '#EF4444' },
};

const RecordItem: React.FC<RecordItemProps> = ({ record }) => {
  const actConf = actionConfig[record.action] || actionConfig.feedback;
  const statConf = statusConfig[record.status] || statusConfig.pending;

  const handleClick = () => {
    Taro.navigateTo({
      url: `/pages/feedback-detail/index?recordId=${record.id}`,
    });
  };

  return (
    <View className={styles.item} onClick={handleClick}>
      <View className={styles.leftCol}>
        <View
          className={styles.actionIcon}
          style={{ background: actConf.bg }}
        >
          <Text className={styles.iconText}>{actConf.icon}</Text>
        </View>
      </View>

      <View className={styles.mainCol}>
        <View className={styles.topRow}>
          <Text
            className={styles.actionText}
            style={{ color: actConf.color }}
          >
            {record.actionText}
          </Text>
          <View
            className={styles.statusTag}
            style={{ background: statConf.bg }}
          >
            <Text
              className={styles.statusText}
              style={{ color: statConf.color }}
            >
              {statConf.text}
            </Text>
          </View>
        </View>

        <Text className={styles.memberName}>
          <Text className={styles.label}>成员：</Text>
          {record.memberName}
        </Text>
        <Text className={styles.folderName}>
          <Text className={styles.label}>文件夹：</Text>
          {record.folderName}
        </Text>

        {record.reason && (
          <View className={styles.reasonBox}>
            <Text className={styles.reasonText}>{record.reason}</Text>
          </View>
        )}

        <View className={styles.metaRow}>
          <Text className={styles.metaText}>
            操作人：{record.operator}
          </Text>
          {record.expireAt && (
            <Text className={classnames(styles.metaText, styles.expire)}>
              有效期至：{record.expireAt}
            </Text>
          )}
        </View>

        <Text className={styles.timeText}>
          {formatDate(record.createdAt)}
        </Text>
      </View>
    </View>
  );
};

export default RecordItem;
