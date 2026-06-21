import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import TaskCard from '@/components/TaskCard';
import SectionHeader from '@/components/SectionHeader';
import { Task } from '@/types';
import { getDaysUntilExpire } from '@/utils';
import styles from './index.module.scss';

type TabType = 'pending' | 'handled' | 'all';
type UrgencyType = 'all' | 'today' | '3day' | '7day';

const tabs: { key: TabType; label: string }[] = [
  { key: 'pending', label: '待处理' },
  { key: 'handled', label: '已处理' },
  { key: 'all', label: '全部' },
];

const urgencyChips: { key: UrgencyType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今天到期' },
  { key: '3day', label: '3天内到期' },
  { key: '7day', label: '7天内到期' },
];

const getUrgencyCategory = (task: Task): UrgencyType | null => {
  if (!task.expireAt || task.handled) return null;
  const daysLeft = getDaysUntilExpire(task.expireAt);
  if (daysLeft <= 0) return 'today';
  if (daysLeft <= 3) return '3day';
  if (daysLeft <= 7) return '7day';
  return null;
};

const TasksPage: React.FC = () => {
  const { tasks, refreshKey, triggerRefresh, toggleTaskNotification } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [activeUrgency, setActiveUrgency] = useState<UrgencyType>('all');

  usePullDownRefresh(() => {
    setTimeout(() => {
      triggerRefresh();
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  });

  const pendingExpireTasks = useMemo(() => {
    return tasks.filter((t) => !t.handled && t.expireAt);
  }, [tasks, refreshKey]);

  const urgencyCounts = useMemo(() => {
    const counts = { today: 0, '3day': 0, '7day': 0 };
    pendingExpireTasks.forEach((t) => {
      const cat = getUrgencyCategory(t);
      if (cat) counts[cat]++;
    });
    return counts;
  }, [pendingExpireTasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    switch (activeTab) {
      case 'pending':
        result = result.filter((t) => !t.handled);
        break;
      case 'handled':
        result = result.filter((t) => t.handled);
        break;
    }

    if (activeTab === 'pending' && activeUrgency !== 'all') {
      result = result.filter((t) => {
        const cat = getUrgencyCategory(t);
        if (activeUrgency === 'today') return cat === 'today';
        if (activeUrgency === '3day') return cat === 'today' || cat === '3day';
        if (activeUrgency === '7day') return cat === 'today' || cat === '3day' || cat === '7day';
        return true;
      });
    }

    return result.sort((a, b) => {
      if (a.handled !== b.handled) return a.handled ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [activeTab, activeUrgency, tasks, refreshKey]);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => !t.handled);
    const highPriority = pending.filter((t) => t.priority === 'high').length;
    const expiringSoon = pending.filter(
      (t) => t.expireAt && t.notifyEnabled !== false
    ).length;
    return {
      pendingCount: pending.length,
      highPriority,
      expiringSoon,
    };
  }, [tasks, refreshKey]);

  const handleTaskAction = (task: Task) => {
    console.log('[TasksPage] 处理待办:', task.id, task.type);
    Taro.navigateTo({
      url: `/pages/permission-action/index?taskId=${task.id}&folderId=${task.folderId}&memberId=${task.memberId}`,
    });
  };

  const handleQuickAdd = () => {
    Taro.navigateTo({
      url: '/pages/add-authorization/index',
    });
  };

  const handleToggleNotification = (taskId: string, enabled: boolean) => {
    toggleTaskNotification(taskId, enabled);
  };

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.header}>
        <Text className={styles.pageTitle}>待办中心</Text>
        <Text className={styles.pageDesc}>
          您有 {stats.pendingCount} 项权限事项待处理，请及时审核
        </Text>

        <View className={styles.tabsBar}>
          {tabs.map((tab) => {
            const count =
              tab.key === 'pending'
                ? stats.pendingCount
                : tab.key === 'handled'
                ? tasks.length - stats.pendingCount
                : tasks.length;
            return (
              <View
                key={tab.key}
                className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
                onClick={() => {
                  setActiveTab(tab.key);
                  setActiveUrgency('all');
                }}
              >
                <Text>{tab.label}</Text>
                {count > 0 && tab.key !== 'all' && (
                  <Text className={styles.tabCount}>{count}</Text>
                )}
              </View>
            );
          })}
        </View>

        <View className={styles.quickActions}>
          <View
            className={styles.quickCard}
            onClick={() => setActiveTab('pending')}
          >
            <View
              className={styles.quickIconWrap}
              style={{ background: '#FEF2F2' }}
            >
              <Text className={styles.quickIcon}>🔥</Text>
            </View>
            <View className={styles.quickInfo}>
              <Text className={styles.quickValue} style={{ color: '#EF4444' }}>
                {stats.highPriority}
              </Text>
              <Text className={styles.quickLabel}>高优先级</Text>
            </View>
          </View>

          <View
            className={styles.quickCard}
            onClick={() => setActiveTab('pending')}
          >
            <View
              className={styles.quickIconWrap}
              style={{ background: '#FEF3C7' }}
            >
              <Text className={styles.quickIcon}>⏳</Text>
            </View>
            <View className={styles.quickInfo}>
              <Text className={styles.quickValue} style={{ color: '#F59E0B' }}>
                {stats.expiringSoon}
              </Text>
              <Text className={styles.quickLabel}>即将到期</Text>
            </View>
          </View>

          <View className={styles.quickCard} onClick={handleQuickAdd}>
            <View
              className={styles.quickIconWrap}
              style={{ background: '#DBEAFE' }}
            >
              <Text className={styles.quickIcon}>➕</Text>
            </View>
            <View className={styles.quickInfo}>
              <Text className={styles.quickValue} style={{ color: '#2563EB' }}>
                新增
              </Text>
              <Text className={styles.quickLabel}>临时授权</Text>
            </View>
          </View>
        </View>
      </View>

      {activeTab === 'pending' && pendingExpireTasks.length > 0 && (
        <View className={styles.urgencyBar}>
          {urgencyChips.map((chip) => {
            const chipCount =
              chip.key === 'all'
                ? pendingExpireTasks.length
                : chip.key === 'today'
                ? urgencyCounts.today
                : chip.key === '3day'
                ? urgencyCounts.today + urgencyCounts['3day']
                : urgencyCounts.today + urgencyCounts['3day'] + urgencyCounts['7day'];
            if (chip.key !== 'all' && chipCount === 0) return null;
            return (
              <View
                key={chip.key}
                className={classnames(
                  styles.urgencyChip,
                  activeUrgency === chip.key && styles.urgencyChipActive
                )}
                onClick={() => setActiveUrgency(chip.key)}
              >
                <Text className={styles.urgencyChipText}>{chip.label}</Text>
                {chipCount > 0 && (
                  <Text className={styles.urgencyChipCount}>{chipCount}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <SectionHeader
        title={activeTab === 'pending' ? '待办列表' : activeTab === 'handled' ? '已处理记录' : '全部事项'}
        desc={`${filteredTasks.length} 项`}
      />

      <View className={styles.listWrap}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onAction={handleTaskAction}
              onToggleNotification={handleToggleNotification}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>
              {activeTab === 'pending' ? '🎉' : '📋'}
            </Text>
            <Text className={styles.emptyText}>
              {activeTab === 'pending' ? '太棒了，暂无待办事项' : '暂无已处理记录'}
            </Text>
            <Text className={styles.emptyDesc}>
              {activeTab === 'pending' ? '您已完成所有权限审核工作' : '处理过的事项会显示在这里'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default TasksPage;
