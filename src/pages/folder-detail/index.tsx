import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import { formatDate, formatRelativeTime, getPermissionText, getPermissionColor } from '@/utils';
import StatusBadge from '@/components/StatusBadge';
import SectionHeader from '@/components/SectionHeader';
import { Member } from '@/types';
import styles from './index.module.scss';

type MemberFilter = 'all' | 'needReview' | 'external' | 'edit';

const FolderDetailPage: React.FC = () => {
  const router = useRouter();
  const { getFolderById, refreshKey, folderDetailSelectedMemberId, setFolderDetailSelectedMemberId } = useAppContext();
  const folderId = router.params.id || 'f1';
  const folder = getFolderById(folderId);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

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
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(keyword));
    }
    return result.sort((a, b) => {
      if (a.needReview !== b.needReview) return a.needReview ? -1 : 1;
      if (a.isExternal !== b.isExternal) return a.isExternal ? -1 : 1;
      return 0;
    });
  }, [folder, memberFilter, searchKeyword, refreshKey]);

  const handleMemberAction = (member: Member) => {
    console.log('[FolderDetail] 处理成员:', member.id, member.name);
    Taro.navigateTo({
      url: `/pages/permission-action/index?folderId=${folderId}&memberId=${member.id}`,
    });
  };

  const handleTimeline = (member: Member, e: any) => {
    e.stopPropagation && e.stopPropagation();
    setFolderDetailSelectedMemberId(member.id);
    Taro.navigateTo({
      url: `/pages/member-timeline/index?folderId=${folderId}&memberId=${member.id}`,
    });
  };

  const handleAddAuthorization = () => {
    Taro.navigateTo({
      url: `/pages/add-authorization/index?folderId=${folderId}`,
    });
  };

  const handleHealthCheck = () => {
    Taro.navigateTo({
      url: `/pages/folder-healthcheck/index?folderId=${folderId}`,
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
        <View
          className={classnames(styles.actionBtn, styles.secondary)}
          onClick={handleHealthCheck}
        >
          <Text>🩺</Text>
          <Text className={styles.actionBtnText}>权限体检</Text>
        </View>
      </View>

      <SectionHeader title="成员权限" desc={`${filteredMembers.length} 人`} />

      <View className={styles.searchBar}>
        <View className={styles.searchInputWrap}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索成员姓名"
            placeholderClass={styles.searchPlaceholder}
            value={searchKeyword}
            onInput={(e) => setSearchKeyword(e.detail.value)}
          />
          {searchKeyword && (
            <View className={styles.searchClear} onClick={() => setSearchKeyword('')}>
              <Text>✕</Text>
            </View>
          )}
        </View>
      </View>

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
          filteredMembers.map((member) => {
            const permColor = getPermissionColor(member.permission);
            const isSelected = folderDetailSelectedMemberId === member.id;
            return (
              <View
                key={member.id}
                className={classnames(
                  styles.memberCard,
                  member.needReview && styles.needReview,
                  isSelected && styles.selectedMember
                )}
              >
                <View
                  className={styles.timelineBtn}
                  onClick={(e) => handleTimeline(member, e)}
                >
                  <Text>📜</Text>
                  <Text className={styles.timelineBtnText}>变更记录</Text>
                </View>

                <View className={styles.memberCardInner}>
                  <View className={styles.avatarWrap}>
                    <Image
                      className={styles.avatar}
                      src={member.avatar}
                      mode="aspectFill"
                    />
                    {member.isExternal && <View className={styles.externalBadge}>外</View>}
                    {member.needReview && <View className={styles.reviewDot} />}
                  </View>

                  <View className={styles.info}>
                    <View className={styles.nameRow}>
                      <Text className={styles.name}>{member.name}</Text>
                      {member.isExternal && (
                        <View className={styles.externalTag}>
                          <Text className={styles.externalTagText}>
                            {member.externalCompany || '外部协作'}
                          </Text>
                        </View>
                      )}
                      <View
                        className={styles.permTag}
                        style={{ background: permColor.bg }}
                      >
                        <Text
                          className={styles.permTagText}
                          style={{ color: permColor.text }}
                        >
                          {getPermissionText(member.permission)}
                        </Text>
                      </View>
                    </View>

                    <Text className={styles.dept}>{member.department}</Text>

                    <View className={styles.meta}>
                      <Text className={styles.metaText}>
                        最近访问：{formatRelativeTime(member.lastAccess)}
                      </Text>
                      {member.expireAt && (
                        <Text className={classnames(styles.metaText, styles.expireText)}>
                          有效期至：{member.expireAt}
                        </Text>
                      )}
                    </View>
                  </View>

                  {(member.needReview || member.isExternal) && (
                    <View
                      className={styles.actionBtn}
                      onClick={() => handleMemberAction(member)}
                    >
                      <Text className={styles.actionText}>
                        {member.needReview ? '立即审核' : '查看详情'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
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
