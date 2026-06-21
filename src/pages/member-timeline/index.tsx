import React, { useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import { formatDate, formatRelativeTime, getPermissionText, getPermissionColor } from '@/utils';
import { Record as RecordType, ActionType } from '@/types';
import styles from './index.module.scss';

const getActionDotColor = (action: ActionType): string => {
  switch (action) {
    case 'retain':
      return '#10B981';
    case 'revoke':
      return '#EF4444';
    case 'feedback':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
};

const getActionBgColor = (action: ActionType): string => {
  switch (action) {
    case 'retain':
      return 'rgba(16, 185, 129, 0.08)';
    case 'revoke':
      return 'rgba(239, 68, 68, 0.08)';
    case 'feedback':
      return 'rgba(245, 158, 11, 0.08)';
    default:
      return 'rgba(107, 114, 128, 0.08)';
  }
};

const getActionBorderColor = (action: ActionType): string => {
  switch (action) {
    case 'retain':
      return 'rgba(16, 185, 129, 0.2)';
    case 'revoke':
      return 'rgba(239, 68, 68, 0.2)';
    case 'feedback':
      return 'rgba(245, 158, 11, 0.2)';
    default:
      return 'rgba(107, 114, 128, 0.2)';
  }
};

const MemberTimelinePage: React.FC = () => {
  const router = useRouter();
  const { getFolderById, getMemberById, records, refreshKey } = useAppContext();
  const folderId = router.params.folderId || '';
  const memberId = router.params.memberId || '';

  const folder = getFolderById(folderId);
  const member = useMemo(() => {
    const fromFolder = folder?.members?.find((m) => m.id === memberId);
    if (fromFolder) return fromFolder;
    return getMemberById(memberId);
  }, [folder, memberId, getMemberById, refreshKey]);

  const memberRecords = useMemo(() => {
    if (!member) return [];
    return records
      .filter((r) => r.folderId === folderId && r.memberName === member.name)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [records, folderId, member, refreshKey]);

  const handleBack = () => {
    Taro.navigateBack();
  };

  if (!member) {
    return (
      <ScrollView scrollY className="pageContainer">
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>❓</Text>
          <Text className={styles.emptyText}>成员不存在</Text>
          <View className={styles.backBtn} onClick={handleBack}>
            <Text className={styles.backBtnText}>返回文件夹</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const permColor = getPermissionColor(member.permission);

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.profileCard}>
        <View className={styles.profileHeader}>
          <View className={styles.avatarWrap}>
            <Image
              className={styles.avatar}
              src={member.avatar}
              mode="aspectFill"
            />
            {member.isExternal && <View className={styles.externalBadge}>外</View>}
          </View>
          <View className={styles.profileInfo}>
            <View className={styles.nameRow}>
              <Text className={styles.name}>{member.name}</Text>
              {member.isExternal && (
                <View className={styles.externalTag}>
                  <Text className={styles.externalTagText}>
                    {member.externalCompany || '外部协作'}
                  </Text>
                </View>
              )}
            </View>
            <Text className={styles.dept}>{member.department}</Text>
          </View>
        </View>

        <View className={styles.profileStats}>
          <View className={styles.profileStatItem}>
            <View
              className={styles.permBadge}
              style={{ background: permColor.bg }}
            >
              <Text className={styles.permBadgeText} style={{ color: permColor.text }}>
                {getPermissionText(member.permission)}
              </Text>
            </View>
            <Text className={styles.profileStatLabel}>当前权限</Text>
          </View>

          <View className={styles.profileStatDivider} />

          <View className={styles.profileStatItem}>
            <Text className={styles.profileStatNum}>{memberRecords.length}</Text>
            <Text className={styles.profileStatLabel}>变更记录</Text>
          </View>

          <View className={styles.profileStatDivider} />

          <View className={styles.profileStatItem}>
            <Text
              className={classnames(
                styles.profileStatNum,
                member.needReview && styles.dangerText
              )}
            >
              {member.needReview ? '待审核' : '正常'}
            </Text>
            <Text className={styles.profileStatLabel}>状态</Text>
          </View>
        </View>

        {member.expireAt && (
          <View className={styles.expireRow}>
            <Text className={styles.expireIcon}>⏰</Text>
            <Text className={styles.expireLabel}>有效期至：</Text>
            <Text className={styles.expireValue}>{member.expireAt}</Text>
          </View>
        )}

        {folder && (
          <View className={styles.folderRow}>
            <Text className={styles.folderIcon}>📁</Text>
            <Text className={styles.folderLabel}>所属文件夹：</Text>
            <Text className={styles.folderValue}>{folder.name}</Text>
          </View>
        )}
      </View>

      <View className={styles.timelineSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📜 变更时间线</Text>
          <Text className={styles.sectionDesc}>共 {memberRecords.length} 条记录</Text>
        </View>

        {memberRecords.length > 0 ? (
          <View className={styles.timeline}>
            {memberRecords.map((record, index) => (
              <TimelineItem
                key={record.id}
                record={record}
                isLast={index === memberRecords.length - 1}
              />
            ))}
          </View>
        ) : (
          <View className={styles.emptyTimeline}>
            <Text className={styles.emptyTimelineIcon}>📭</Text>
            <Text className={styles.emptyTimelineText}>暂无变更记录</Text>
          </View>
        )}
      </View>

      <View className={styles.bottomSpace} />

      <View className={styles.footer}>
        <View className={styles.backBtn} onClick={handleBack}>
          <Text className={styles.backBtnIcon}>←</Text>
          <Text className={styles.backBtnText}>返回文件夹</Text>
        </View>
      </View>
    </ScrollView>
  );
};

interface TimelineItemProps {
  record: RecordType;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ record, isLast }) => {
  const dotColor = getActionDotColor(record.action);
  const bgColor = getActionBgColor(record.action);
  const borderColor = getActionBorderColor(record.action);

  return (
    <View className={styles.timelineItem}>
      <View className={styles.timelineDotWrap}>
        <View
          className={styles.timelineDot}
          style={{ background: dotColor, boxShadow: `0 0 0 6rpx ${bgColor}` }}
        />
        {!isLast && <View className={styles.timelineLine} />}
      </View>

      <View className={styles.timelineContent}>
        <View
          className={styles.timelineCard}
          style={{ background: bgColor, borderColor }}
        >
          <View className={styles.cardHeader}>
            <View className={styles.actionRow}>
              <Text
                className={styles.actionText}
                style={{ color: dotColor }}
              >
                {record.actionText}
              </Text>
              {record.templateUsedText && (
                <View className={styles.templateTag}>
                  <Text className={styles.templateTagText}>
                    {record.templateUsedText}
                  </Text>
                </View>
              )}
            </View>
            <Text className={styles.timeText}>
              {formatDate(record.createdAt)}
            </Text>
          </View>

          {record.reason && (
            <View className={styles.reasonBox}>
              <Text className={styles.reasonLabel}>📝 原因说明</Text>
              <Text className={styles.reasonText}>{record.reason}</Text>
            </View>
          )}

          {record.expireAt && (
            <View className={styles.metaRow}>
              <Text className={styles.metaLabel}>⏰ 授权到期：</Text>
              <Text className={styles.metaValue}>{record.expireAt}</Text>
            </View>
          )}

          <View className={styles.operatorRow}>
            <Text className={styles.operatorLabel}>操作人：</Text>
            <Text className={styles.operatorValue}>{record.operator}</Text>
            <View
              className={classnames(
                styles.statusTag,
                record.status === 'completed' && styles.statusCompleted,
                record.status === 'pending' && styles.statusPending,
                record.status === 'rejected' && styles.statusRejected
              )}
            >
              <Text className={styles.statusTagText}>{record.statusText}</Text>
            </View>
          </View>
        </View>

        <Text className={styles.relativeTime}>
          {formatRelativeTime(record.createdAt)}
        </Text>
      </View>
    </View>
  );
};

export default MemberTimelinePage;
