import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { mockRecords } from '@/data/records';
import { getFolderById, mockMembers } from '@/data/folders';
import { formatDate, formatRelativeTime, dayjs, getPermissionText, getPermissionColor } from '@/utils';
import { Member, Record as RecordType } from '@/types';
import styles from './index.module.scss';

interface TimelineNode {
  dotType: 'primary' | 'done' | 'warn';
  action: string;
  desc: string;
  time: string;
}

const FeedbackDetailPage: React.FC = () => {
  const router = useRouter();
  const { recordId } = router.params;

  const record: RecordType | undefined = useMemo(
    () => mockRecords.find((r) => r.id === recordId),
    [recordId]
  );

  const folder = useMemo(() => {
    if (!record) return undefined;
    return getFolderById(record.folderId);
  }, [record]);

  const member: Member | undefined = useMemo(() => {
    if (!record) return undefined;
    if (folder?.members) {
      return folder.members.find((m) => m.name === record.memberName);
    }
    return mockMembers.find((m) => m.name === record.memberName);
  }, [record, folder]);

  const statusIcon = record?.status === 'completed' ? '✅' : record?.status === 'pending' ? '⏳' : '❌';
  const statusMainText = record?.statusText || '未知状态';
  const actionIcon =
    record?.action === 'retain' ? '✅' : record?.action === 'revoke' ? '🚫' : '📝';

  const timeline = useMemo<TimelineNode[]>(() => {
    if (!record) return [];
    const base: TimelineNode[] = [
      {
        dotType: 'done',
        action: `发起${record.actionText}`,
        desc: `操作人：${record.operator}${record.reason ? `  |  原因：${record.reason}` : ''}`,
        time: formatDate(record.createdAt),
      },
    ];

    if (record.action === 'retain' && record.expireAt) {
      base.push({
        dotType: 'warn',
        action: '设置有效期',
        desc: `权限保留至 ${record.expireAt}，到期前 3 天将推送提醒`,
        time: formatDate(record.createdAt),
      });
    }

    if (record.action === 'feedback') {
      if (record.status === 'completed') {
        base.push({
          dotType: 'done',
          action: '安全团队处理完成',
          desc: '已根据反馈核实情况并做出相应权限调整',
          time: formatDate(dayjs(record.createdAt).add(1, 'day').format('YYYY-MM-DD HH:mm')),
        });
      } else {
        base.push({
          dotType: 'primary',
          action: '安全团队正在处理',
          desc: '预计 24 小时内给出处理结果，请留意站内信通知',
          time: '处理中...',
        });
      }
    }

    if (record.action === 'revoke') {
      base.push({
        dotType: 'done',
        action: '权限已自动移除',
        desc: '系统已按操作指令将该成员从共享文件夹权限列表中移除',
        time: formatDate(dayjs(record.createdAt).add(5, 'minute').format('YYYY-MM-DD HH:mm')),
      });
    }

    return base;
  }, [record]);

  const handleGoFolder = () => {
    if (!record) return;
    Taro.navigateTo({ url: `/pages/folder-detail/index?id=${record.folderId}` });
  };

  const handleShare = () => {
    Taro.showActionSheet({
      itemList: ['复制详情链接', '生成分享海报', '发送给同事'],
      success: (res) => {
        const tips = ['链接已复制', '海报生成中...', '请选择同事'];
        Taro.showToast({ title: tips[res.tapIndex], icon: 'none' });
      },
    });
  };

  if (!record) {
    return (
      <ScrollView scrollY className="pageContainer">
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📭</Text>
          <Text className={styles.emptyText}>未找到对应记录</Text>
        </View>
      </ScrollView>
    );
  }

  const permColor = member ? getPermissionColor(member.permission) : { bg: '#DBEAFE', text: '#2563EB' };
  const permText = member ? getPermissionText(member.permission) : '未知权限';

  return (
    <>
      <ScrollView scrollY className="pageContainer">
        <View className={styles.pageWrap}>
          <View className={classnames(styles.statusHeader, record.status)}>
            <View className={styles.statusIconWrap}>
              <Text>{statusIcon}</Text>
            </View>
            <View className={styles.statusInfo}>
              <Text className={styles.statusMain}>{statusMainText}</Text>
              <Text className={styles.statusSub}>
                操作编号 #{record.id.toUpperCase()}  ·  {formatRelativeTime(record.createdAt)}
              </Text>
            </View>
            <Text className={classnames(styles.actionTag, record.action)}>
              <Text>{actionIcon}</Text>
              <Text>{record.actionText}</Text>
            </Text>
          </View>

          <View className={styles.detailCard}>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>操作对象</Text>
              <View className={styles.detailValue}>
                <View className={styles.memberMini}>
                  <Image
                    className={styles.avatarMini}
                    src={member?.avatar || 'https://picsum.photos/id/1012/100/100'}
                    mode="aspectFill"
                  />
                  <View className={styles.memberMiniInfo}>
                    <View className={styles.memberMiniName}>
                      <Text>{record.memberName}</Text>
                      {member?.isExternal && (
                        <Text className={styles.externalBadgeMini}>
                          {member.externalCompany || '外部'}
                        </Text>
                      )}
                    </View>
                    <Text className={styles.memberMiniMeta}>
                      {member?.department || '档案中暂无'}  ·  {permText}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>所属文件夹</Text>
              <View className={classnames(styles.detailValue, styles.link)} onClick={handleGoFolder}>
                📂 {record.folderName} →
              </View>
            </View>

            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>操作人</Text>
              <Text className={styles.detailValue}>
                {record.operator}（本人）
              </Text>
            </View>

            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>操作时间</Text>
              <Text className={styles.detailValue}>
                {formatDate(record.createdAt, 'YYYY年MM月DD日 HH:mm:ss')}
              </Text>
            </View>

            {record.expireAt && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>权限有效期</Text>
                <Text className={styles.detailValue}>
                  📅 至 {record.expireAt}（剩余 {dayjs(record.expireAt).diff(dayjs(), 'day')} 天）
                </Text>
              </View>
            )}

            {record.reason && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>原因说明</Text>
                <View className={styles.detailValue}>
                  <View className={styles.reasonBox}>「{record.reason}」</View>
                </View>
              </View>
            )}
          </View>

          <View className={styles.detailCard}>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>最近访问</Text>
              <Text className={styles.detailValue}>
                {member ? dayjs(member.lastAccess).format('YYYY-MM-DD HH:mm') : '无访问记录'}
                {member ? `（${dayjs(member.lastAccess).fromNow()}）` : ''}
              </Text>
            </View>

            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>当前状态</Text>
              <View className={styles.detailValue}>
                <Text className={classnames(styles.statusTag, record.status)}>
                  {statusIcon} {statusMainText}
                </Text>
              </View>
            </View>

            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>文件夹总成员</Text>
              <Text className={styles.detailValue}>
                {folder?.memberCount || 0} 人  ·  编辑权限 {folder?.editCount || 0} 人  ·  外部协作 {folder?.externalCount || 0} 人
              </Text>
            </View>
          </View>

          <View className={styles.timelineSection}>
            <Text className={styles.timelineTitle}>🕒 操作时间线</Text>
            <View className={styles.timelineWrap}>
              {timeline.map((node, idx) => (
                <View key={idx} className={styles.timelineItem}>
                  <View
                    className={classnames(
                      styles.timelineDot,
                      node.dotType === 'done' && styles.done,
                      node.dotType === 'warn' && styles.warn
                    )}
                  />
                  <View className={styles.timelineLine} />
                  <View className={styles.timelineContent}>
                    <Text className={styles.timelineAction}>{node.action}</Text>
                    <Text className={styles.timelineDesc}>{node.desc}</Text>
                    <Text className={styles.timelineTime}>{node.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.secondaryBtn} onClick={handleShare}>
          <Text>📤 分享</Text>
        </View>
        <View className={styles.primaryBtn} onClick={handleGoFolder}>
          <Text>📂 查看文件夹</Text>
        </View>
      </View>
    </>
  );
};

export default FeedbackDetailPage;
