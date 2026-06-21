import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import { formatDate } from '@/utils';
import StatusBadge from '@/components/StatusBadge';
import SectionHeader from '@/components/SectionHeader';
import MemberItem from '@/components/MemberItem';
import { Member } from '@/types';
import styles from './index.module.scss';

type MemberFilter = 'all' | 'needReview' | 'external' | 'edit';

const FolderDetailPage: React.FC = () => {
  const router = useRouter();
  const { getFolderById, refreshKey } = useAppContext();
  const folderId = router.params.id || 'f1';
  const folder = getFolderById(folderId);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');

  const filteredMembers = useMemo(() => {
    if (!folder?.members) return [];
    let result = [...folder.members];
    switch (memberFilter) {
      case 'needReview':
        result = result.filter((m) => m.needReview);
        break;
      case 'external':
        result = result.filter((m) => m.isExternal);
        break;
      case 'edit':
        result = result.filter((m) => m.permission === 'edit');
        break;
    }
    return result.sort((a, b) => {
      if (a.needReview !== b.needReview) return a.needReview ? -1 : 1;
      if (a.isExternal !== b.isExternal) return a.isExternal ? -1 : 1;
      return 0;
    });
  }, [folder, memberFilter, refreshKey]);

  const handleMemberAction = (member: Member) => {
    console.log('[FolderDetail] 处理成员:', member.id, member.name);
    Taro.navigateTo({
      url: `/pages/permission-action/index?folderId=${folderId}&memberId=${member.id}`,
    });
  };

  const handleAddAuthorization = () => {
    Taro.navigateTo({
      url: `/pages/add-authorization/index?folderId=${folderId}`,
    });
  };

  if (!folder) {
    return (
      <ScrollView scrollY className="pageContainer">
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>❓</Text>
          <Text className={styles.emptyText}>文件夹不存在</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.headerSection}>
        <View className={styles.folderInfoTop}>
          <View className={styles.folderIcon}>
            <Text className={styles.folderIconText}>📁</Text>
          </View>
          <View className={styles.folderInfo}>
            <Text className={styles.folderName}>{folder.name}</Text>
            <Text className={styles.folderDesc}>{folder.description}</Text>
            <Text className={styles.folderUpdateTime}>
              最近更新：{formatDate(folder.lastUpdate)}
            </Text>
            <View className={styles.statusWrap}>
              <StatusBadge status={folder.status} text={folder.statusText} />
            </View>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statBlock}>
            <Text className={styles.statBlockNum}>{folder.memberCount}</Text>
            <Text className={styles.statBlockLabel}>总成员</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statBlock}>
            <Text className={styles.statBlockNum} style={{ color: '#D97706' }}>
              {folder.editCount}
            </Text>
            <Text className={styles.statBlockLabel}>编辑者</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statBlock}>
            <Text className={styles.statBlockNum} style={{ color: '#8B5CF6' }}>
              {folder.externalCount}
            </Text>
            <Text className={styles.statBlockLabel}>外部协作</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statBlock}>
            <Text
              className={styles.statBlockNum}
              style={{ color: folder.status === 'safe' ? '#10B981' : folder.status === 'warning' ? '#F59E0B' : '#EF4444' }}
            >
              {folder.members?.filter((m) => m.needReview).length || 0}
            </Text>
            <Text className={styles.statBlockLabel}>待审核</Text>
          </View>
        </View>
      </View>

      <View className={styles.actionBtns}>
        <View
          className={classnames(styles.actionBtn, styles.primary)}
          onClick={handleAddAuthorization}
        >
          <Text>➕</Text>
          <Text className={styles.actionBtnText}>新增临时授权</Text>
        </View>
        <View className={classnames(styles.actionBtn, styles.secondary)}>
          <Text>📤</Text>
          <Text className={styles.actionBtnText}>导出成员清单</Text>
        </View>
      </View>

      <SectionHeader title="成员权限" desc={`${filteredMembers.length} 人`} />

      <View className={styles.memberFilter}>
        {[
          { key: 'all' as const, label: '全部' },
          { key: 'needReview' as const, label: '待审核' },
          { key: 'external' as const, label: '外部协作' },
          { key: 'edit' as const, label: '编辑权限' },
        ].map((f) => (
          <View
            key={f.key}
            className={classnames(
              styles.filterTab,
              memberFilter === f.key && styles.active
            )}
            onClick={() => setMemberFilter(f.key)}
          >
            <Text>{f.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.memberListCard}>
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              showAction={member.needReview || member.isExternal}
              onAction={handleMemberAction}
              actionText={member.needReview ? '立即审核' : '查看详情'}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>👥</Text>
            <Text className={styles.emptyText}>暂无符合条件的成员</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default FolderDetailPage;
