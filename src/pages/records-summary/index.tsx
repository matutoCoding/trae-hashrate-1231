import React, { useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { useAppContext } from '@/store/AppContext';
import { Record, ActionType } from '@/types';
import { formatDate } from '@/utils';
import styles from './index.module.scss';

const actionLabelMap: Record<ActionType, string> = {
  retain: '保留权限',
  revoke: '收回权限',
  feedback: '问题反馈',
};

const RecordsSummaryPage: React.FC = () => {
  const {
    records,
    allMembers,
    recordsFilter,
    refreshKey,
    getFolderById,
  } = useAppContext();

  const { actionType, folderId, memberName } = recordsFilter;

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
    const folderIds = new Set(filteredRecords.map((r) => r.folderId));
    return {
      totalFolders: folderIds.size,
      totalRecords: filteredRecords.length,
      retain: filteredRecords.filter((r) => r.action === 'retain').length,
      revoke: filteredRecords.filter((r) => r.action === 'revoke').length,
      feedback: filteredRecords.filter((r) => r.action === 'feedback').length,
    };
  }, [filteredRecords]);

  const groupedByFolder = useMemo(() => {
    const groups = new Map<string, Record[]>();
    filteredRecords.forEach((r) => {
      if (!groups.has(r.folderId)) {
        groups.set(r.folderId, []);
      }
      groups.get(r.folderId)!.push(r);
    });
    return Array.from(groups.entries()).map(([fId, recs]) => {
      const folder = getFolderById(fId);
      return {
        folderId: fId,
        folderName: folder?.name || '未知文件夹',
        records: recs,
      };
    });
  }, [filteredRecords, getFolderById]);

  const hasActiveFilter = actionType !== 'all' || folderId !== '' || memberName.trim() !== '';

  const getMemberMeta = (name: string) => {
    const found = allMembers.find((m) => m.name === name);
    if (found) {
      return {
        avatar: found.avatar,
        department: found.department,
      };
    }
    return {
      avatar: '',
      department: '未匹配到成员信息',
    };
  };

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.header}>
        <Text className={styles.pageTitle}>会议复盘汇总</Text>
        <Text className={styles.pageDesc}>
          按文件夹分组展示所有权限操作的复盘结果
        </Text>

        <View className={styles.summaryCard}>
          <Text className={styles.summaryTitle}>📊 汇总统计</Text>
          <View className={styles.summaryGrid}>
            <View className={styles.summaryMain}>
              <View className={styles.summaryMainRow}>
                <Text className={styles.summaryMainLabel}>涉及文件夹</Text>
                <Text className={styles.summaryMainValue}>{summary.totalFolders}</Text>
              </View>
              <View className={styles.summaryMainRow}>
                <Text className={styles.summaryMainLabel}>操作记录总数</Text>
                <Text className={styles.summaryMainValue}>{summary.totalRecords}</Text>
              </View>
            </View>
          </View>
          <View className={styles.summarySubRow}>
            <View className={styles.summarySubItem}>
              <Text className={styles.summarySubNum + ' ' + styles.retain}>
                {summary.retain}
              </Text>
              <Text className={styles.summarySubLabel}>保留权限</Text>
            </View>
            <View className={styles.summarySubItem}>
              <Text className={styles.summarySubNum + ' ' + styles.revoke}>
                {summary.revoke}
              </Text>
              <Text className={styles.summarySubLabel}>收回权限</Text>
            </View>
            <View className={styles.summarySubItem}>
              <Text className={styles.summarySubNum + ' ' + styles.feedback}>
                {summary.feedback}
              </Text>
              <Text className={styles.summarySubLabel}>问题反馈</Text>
            </View>
          </View>
          {hasActiveFilter && (
            <View className={styles.filterInfo}>
              <Text>当前筛选：</Text>
              {actionType !== 'all' && (
                <Text className={styles.filterTag}>
                  操作：{actionLabelMap[actionType as ActionType]}
                </Text>
              )}
              {folderId && (
                <Text className={styles.filterTag}>
                  文件夹：{getFolderById(folderId)?.name || '未知'}
                </Text>
              )}
              {memberName.trim() && (
                <Text className={styles.filterTag}>成员：{memberName.trim()}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {filteredRecords.length > 0 ? (
        <View className={styles.sectionWrap}>
          {groupedByFolder.map((group) => (
            <View key={group.folderId} className={styles.folderSection}>
              <View className={styles.folderHeader}>
                <Text className={styles.folderTitle}>
                  📂 {group.folderName}
                </Text>
                <Text className={styles.folderCount}>
                  {group.records.length} 条记录
                </Text>
              </View>
              <View className={styles.recordList}>
                {group.records.map((record) => {
                  const meta = getMemberMeta(record.memberName);
                  return (
                    <View key={record.id} className={styles.recordCard}>
                      <View className={styles.recordTop}>
                        <View className={styles.memberAvatar}>
                          {meta.avatar ? (
                            <Image
                              className={styles.avatarImg}
                              src={meta.avatar}
                              mode="aspectFill"
                            />
                          ) : (
                            <Text className={styles.avatarFallback}>
                              {record.memberName.charAt(0)}
                            </Text>
                          )}
                        </View>
                        <View className={styles.memberInfo}>
                          <View className={styles.memberNameRow}>
                            <Text className={styles.memberName}>
                              {record.memberName}
                            </Text>
                            <View
                              className={
                                styles.actionTag + ' ' + styles[record.action]
                              }
                            >
                              <Text>{actionLabelMap[record.action]}</Text>
                            </View>
                          </View>
                          <Text className={styles.memberDept}>
                            {meta.department}
                          </Text>
                        </View>
                        <Text className={styles.recordTime}>
                          {formatDate(record.createdAt)}
                        </Text>
                      </View>
                      {record.reason && (
                        <View className={styles.reasonBox}>
                          <Text className={styles.reasonText}>
                            {record.reason}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📭</Text>
          <Text className={styles.emptyText}>暂无复盘记录</Text>
          <Text className={styles.emptyDesc}>
            请先在操作记录页面调整筛选条件，或先进行权限操作
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default RecordsSummaryPage;
