import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import RecordItem from '@/components/RecordItem';
import SectionHeader from '@/components/SectionHeader';
import styles from './index.module.scss';

type FilterType = 'all' | 'retain' | 'revoke' | 'feedback';

const filters: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: '全部操作', icon: '📋' },
  { key: 'retain', label: '保留权限', icon: '✅' },
  { key: 'revoke', label: '收回权限', icon: '🚫' },
  { key: 'feedback', label: '问题反馈', icon: '📝' },
];

const RecordsPage: React.FC = () => {
  const { records, refreshKey, triggerRefresh } = useAppContext();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [timeRange, setTimeRange] = useState('近30天');

  usePullDownRefresh(() => {
    setTimeout(() => {
      triggerRefresh();
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  });

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (activeFilter !== 'all') {
      result = result.filter((r) => r.action === activeFilter);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activeFilter, records, refreshKey]);

  const summary = useMemo(() => {
    return {
      retain: records.filter((r) => r.action === 'retain').length,
      revoke: records.filter((r) => r.action === 'revoke').length,
      feedback: records.filter((r) => r.action === 'feedback').length,
    };
  }, [records, refreshKey]);

  const handleTimeChange = () => {
    const options = ['近7天', '近30天', '近90天', '全部'];
    const currentIndex = options.indexOf(timeRange);
    const nextIndex = (currentIndex + 1) % options.length;
    setTimeRange(options[nextIndex]);
  };

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.header}>
        <Text className={styles.pageTitle}>操作记录</Text>
        <Text className={styles.pageDesc}>
          您的所有权限操作历史，支持审计追踪与回溯
        </Text>

        <View className={styles.summaryCard}>
          <Text className={styles.summaryTitle}>📊 本月操作统计</Text>
          <View className={styles.summaryGrid}>
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryNum, styles.retain)}>
                {summary.retain}
              </Text>
              <Text className={styles.summaryLabel}>保留权限</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryNum, styles.revoke)}>
                {summary.revoke}
              </Text>
              <Text className={styles.summaryLabel}>收回权限</Text>
            </View>
            <View className={styles.summaryDivider} />
            <View className={styles.summaryItem}>
              <Text className={classnames(styles.summaryNum, styles.feedback)}>
                {summary.feedback}
              </Text>
              <Text className={styles.summaryLabel}>问题反馈</Text>
            </View>
          </View>
        </View>

        <View className={styles.filterRow}>
          {filters.map((f) => (
            <View
              key={f.key}
              className={classnames(
                styles.filterChip,
                activeFilter === f.key && styles.active
              )}
              onClick={() => setActiveFilter(f.key)}
            >
              <Text>
                {f.icon} {f.label}
              </Text>
            </View>
          ))}
          <View className={styles.timeSelect} onClick={handleTimeChange}>
            <Text>📅 {timeRange}</Text>
          </View>
        </View>
      </View>

      <SectionHeader
        title="记录列表"
        desc={`${filteredRecords.length} 条记录`}
      />

      <View className={styles.listWrap}>
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <RecordItem key={record.id} record={record} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>暂无操作记录</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default RecordsPage;
