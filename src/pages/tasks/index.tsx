import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { mockTasks } from '@/data/tasks';
import TaskCard from '@/components/TaskCard';
import SectionHeader from '@/components/SectionHeader';
import { Task } from '@/types';
import styles from './index.module.scss';

type TabType = 'pending' | 'handled' | 'all';

const tabs: { key: TabType; label: string }[] = [
  { key: 'pending', label: '待处理' },
  { key: 'handled', label: '已处理' },
  { key: 'all', label: '全部' },
];

const TasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  });

  const filteredTasks = useMemo(() => {
    let result = [...mockTasks];
    switch (activeTab) {
      case 'pending':
        result = result.filter((t) => !t.handled);
        break;
      case 'handled':
        result = result.filter((t) => t.handled);
        break;
    }
    return result.sort((a, b) => {
      if (a.handled !== b.handled) return a.handled ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [activeTab]);

  const stats = useMemo(() => {
    const pending = mockTasks.filter((t) => !t.handled);
    const highPriority = pending.filter((t) => t.priority === 'high').length;
    const expiringSoon = pending.filter((t) => t.expireAt).length;
    return {
      pendingCount: pending.length,
      highPriority,
      expiringSoon,
    };
  }, []);

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
                ? mockTasks.length - stats.pendingCount
                : mockTasks.length;
            return (
              <View
                key={tab.key}
                className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
                onClick={() => setActiveTab(tab.key)}
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

      <SectionHeader
        title={activeTab === 'pending' ? '待办列表' : activeTab === 'handled' ? '已处理记录' : '全部事项'}
        desc={`${filteredTasks.length} 项`}
      />

      <View className={styles.listWrap}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
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
