import React from 'react';
import { View, Text, Image, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { Task } from '@/types';
import { formatRelativeTime, getDaysUntilExpire } from '@/utils';
import styles from './index.module.scss';

interface TaskCardProps {
  task: Task;
  onAction?: (task: Task) => void;
  onToggleNotification?: (taskId: string, enabled: boolean) => void;
}

const typeConfig: Record<string, { icon: string; bg: string; color: string }> = {
  review: { icon: '🔍', bg: '#FEF3C7', color: '#D97706' },
  expire: { icon: '⏰', bg: '#DBEAFE', color: '#2563EB' },
  abnormal: { icon: '⚠️', bg: '#FEE2E2', color: '#DC2626' },
};

const priorityConfig: Record<string, { text: string; color: string }> = {
  high: { text: '高优先级', color: '#EF4444' },
  medium: { text: '中优先级', color: '#F59E0B' },
  low: { text: '低优先级', color: '#6B7280' },
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onAction, onToggleNotification }) => {
  const typeConf = typeConfig[task.type] || typeConfig.review;
  const priorityConf = priorityConfig[task.priority];
  const daysLeft = task.expireAt ? getDaysUntilExpire(task.expireAt) : null;
  const isNotifyMuted = task.notifyEnabled === false;
  const isExpireType = task.type === 'expire';

  const handleClick = () => {
    if (task.handled) return;
    if (onAction) {
      onAction(task);
    } else {
      Taro.navigateTo({
        url: `/pages/permission-action/index?taskId=${task.id}&folderId=${task.folderId}&memberId=${task.memberId}`,
      });
    }
  };

  const handleSwitchChange = (e) => {
    e.stopPropagation();
    if (onToggleNotification) {
      onToggleNotification(task.id, e.detail.value);
    }
  };

  return (
    <View
      className={classnames(styles.card, task.handled && styles.handled, isNotifyMuted && styles.notifyMuted)}
      onClick={handleClick}
    >
      <View className={styles.topRow}>
        <View
          className={styles.typeTag}
          style={{ background: typeConf.bg }}
        >
          <Text className={styles.typeIcon}>{typeConf.icon}</Text>
          <Text
            className={styles.typeText}
            style={{ color: typeConf.color }}
          >
            {task.typeText}
          </Text>
        </View>
        <View className={styles.priorityRow}>
          {isNotifyMuted && (
            <Text className={styles.notifyOffBadge}>提醒已关闭</Text>
          )}
          <Text
            className={styles.priorityText}
            style={{ color: priorityConf.color }}
          >
            {priorityConf.text}
          </Text>
        </View>
      </View>

      <View className={styles.contentRow}>
        <Image
          className={styles.avatar}
          src={task.memberAvatar}
          mode="aspectFill"
        />
        <View className={styles.content}>
          <Text className={styles.memberName}>{task.memberName}</Text>
          <Text className={styles.description}>{task.description}</Text>
          <Text className={styles.folderName}>📂 {task.folderName}</Text>
        </View>
      </View>

      <View className={styles.bottomRow}>
        <Text className={styles.createTime}>
          {formatRelativeTime(task.createdAt)}发起
        </Text>
        {daysLeft !== null && daysLeft >= 0 && (
          <View className={styles.daysBadge}>
            <Text className={styles.daysText}>
              {daysLeft === 0 ? '今天到期' : `${daysLeft}天后到期`}
            </Text>
          </View>
        )}
        {!task.handled ? (
          <View className={styles.actionBtn}>
            <Text className={styles.actionText}>立即处理</Text>
          </View>
        ) : (
          <View className={styles.doneBadge}>
            <Text className={styles.doneText}>已处理</Text>
          </View>
        )}
      </View>

      {isExpireType && !task.handled && (
        <View className={styles.notifyRow} onClick={(e) => e.stopPropagation()}>
          <Text className={styles.notifyLabel}>到期提醒</Text>
          <Switch
            checked={task.notifyEnabled !== false}
            onChange={handleSwitchChange}
            color="#2563eb"
          />
        </View>
      )}
    </View>
  );
};

export default TaskCard;
