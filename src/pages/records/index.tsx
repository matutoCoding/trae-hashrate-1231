import React, { useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
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
  const {
    records,
    folders,
    refreshKey,
    triggerRefresh,
    recordsFilter,
    setRecordsFilter,
  } = useAppContext();

  const { actionType, folderId, memberName } = recordsFilter;

  usePullDownRefresh(() => {
    setTimeout(() => {
      triggerRefresh();
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  });

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (actionType !== 'all') {
      result = result.filter((r) => r.action === actionType);
    }
    if (folderId) {
      result = result.filter((r) => r.folderId === folderId);
    }
    if (memberName.trim()) {
      const keyword = memberName.trim().toLowerCase();
      result = result.filter((r) =>
        r.memberName.toLowerCase().includes(keyword)
      );
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [actionType, folderId, memberName, records, refreshKey]);

  const summary = useMemo(() => {
    return {
      retain: records.filter((r) => r.action === 'retain').length,
      revoke: records.filter((r) => r.action === 'revoke').length,
      feedback: records.filter((r) => r.action === 'feedback').length,
    };
  }, [records, refreshKey]);

  const selectedFolderName = useMemo(() => {
    if (!folderId) return '全部文件夹';
    const folder = folders.find((f) => f.id === folderId);
    return folder ? folder.name : '全部文件夹';
  }, [folderId, folders]);

  const hasActiveFilter = actionType !== 'all' || folderId !== '' || memberName.trim() !== '';

  const handleFolderSelect = () => {
    const folderNames = ['全部文件夹', ...folders.map((f) => f.name)];
    Taro.showActionSheet({
      itemList: folderNames,
      success: (res) => {
        if (res.tapIndex === 0) {
          setRecordsFilter({ ...recordsFilter, folderId: '' });
        } else {
          const selected = folders[res.tapIndex - 1];
          if (selected) {
            setRecordsFilter({ ...recordsFilter, folderId: selected.id });
          }
        }
      },
    });
  };

  const handleActionTypeChange = (key: FilterType) => {
    setRecordsFilter({ ...recordsFilter, actionType: key });
  };

  const handleMemberNameInput = (value: string) => {
    setRecordsFilter({ ...recordsFilter, memberName: value });
  };

  const handleClearFilter = () => {
    setRecordsFilter({ actionType: 'all', folderId: '', memberName: '' });
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
                actionType === f.key && styles.active
              )}
              onClick={() => handleActionTypeChange(f.key)}
            >
              <Text>
                {f.icon} {f.label}
              </Text>
            </View>
          ))}
        </View>

        <View className={styles.filterBar}>
          <View className={styles.searchRow}>
            <Input
              className={styles.searchInput}
              placeholder="搜索成员姓名"
              placeholderClass={styles.searchPlaceholder}
              value={memberName}
              onInput={(e) => handleMemberNameInput(e.detail.value)}
            />
            <View
              className={classnames(styles.folderSelect, folderId && styles.folderActive)}
              onClick={handleFolderSelect}
            >
              <Text>� {selectedFolderName}</Text>
            </View>
          </View>
          {hasActiveFilter && (
            <View className={styles.clearFilter} onClick={handleClearFilter}>
              <Text>清除筛选</Text>
            </View>
          )}
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
