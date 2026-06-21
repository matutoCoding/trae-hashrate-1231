import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image, ScrollView, Checkbox } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import { dayjs, getDaysUntilExpire, getPermissionText, getPermissionColor } from '@/utils';
import { Member, ActionType, PermissionLevel } from '@/types';
import styles from './index.module.scss';

type TemplateId = 'external-revoke' | 'expire-retain' | 'inactive-down' | 'none';

interface TemplateConfig {
  templateId: TemplateId;
  templateUsedText: string;
  action: ActionType;
  expireAt?: string;
  overridePermission?: PermissionLevel;
  colorClass: string;
}

interface TemplateOverride {
  templateId: TemplateId;
  action: ActionType;
  expireAt?: string;
  overridePermission?: PermissionLevel;
  templateUsedText: string;
}

interface RiskGroup {
  key: string;
  title: string;
  icon: string;
  riskLevel: 'danger' | 'warning' | 'info';
  members: Member[];
  defaultTemplate: TemplateConfig;
}

const DEFAULT_TEMPLATES: Record<string, TemplateConfig> = {
  externalEdit: {
    templateId: 'external-revoke',
    templateUsedText: '外部编辑收回模板',
    action: 'revoke',
    colorClass: 'revoke',
  },
  expiringSoon: {
    templateId: 'expire-retain',
    templateUsedText: '快到期续期模板',
    action: 'retain',
    expireAt: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    colorClass: 'retain',
  },
  longInactive: {
    templateId: 'inactive-down',
    templateUsedText: '长期未访问降级模板',
    action: 'retain',
    overridePermission: 'view',
    colorClass: 'down',
  },
};

const TEMPLATE_OPTIONS: Array<{ key: string; label: string; template: TemplateConfig | null }> = [
  {
    key: 'external-revoke',
    label: '收回(外部)',
    template: DEFAULT_TEMPLATES.externalEdit,
  },
  {
    key: 'expire-retain',
    label: '续期30天',
    template: DEFAULT_TEMPLATES.expiringSoon,
  },
  {
    key: 'inactive-down',
    label: '降级到查看',
    template: DEFAULT_TEMPLATES.longInactive,
  },
  {
    key: 'clear',
    label: '清除模板',
    template: null,
  },
];

const getTemplateColorClass = (templateId: TemplateId): string => {
  if (templateId === 'external-revoke') return 'revoke';
  if (templateId === 'expire-retain') return 'retain';
  if (templateId === 'inactive-down') return 'down';
  return '';
};

const FolderHealthcheckPage: React.FC = () => {
  const router = useRouter();
  const { getFolderById, batchPermissionAction, handlePermissionAction, refreshKey } = useAppContext();
  const folderId = router.params.folderId || 'f1';
  const folder = getFolderById(folderId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateOverrides, setTemplateOverrides] = useState<Map<string, TemplateOverride>>(new Map());

  const riskGroups = useMemo<RiskGroup[]>(() => {
    if (!folder?.members) return [];

    const externalEdit = folder.members.filter(
      (m) => m.isExternal && m.permission === 'edit'
    );
    const expiringSoon = folder.members.filter(
      (m) => m.expireAt && getDaysUntilExpire(m.expireAt) <= 7 && getDaysUntilExpire(m.expireAt) >= 0
    );
    const longInactive = folder.members.filter(
      (m) => dayjs().diff(dayjs(m.lastAccess), 'day') > 14
    );

    return [
      {
        key: 'externalEdit',
        title: '外部编辑权限',
        icon: '🌐',
        riskLevel: 'danger',
        members: externalEdit,
        defaultTemplate: DEFAULT_TEMPLATES.externalEdit,
      },
      {
        key: 'expiringSoon',
        title: '快到期授权',
        icon: '⏰',
        riskLevel: 'warning',
        members: expiringSoon,
        defaultTemplate: DEFAULT_TEMPLATES.expiringSoon,
      },
      {
        key: 'longInactive',
        title: '长期未访问',
        icon: '💤',
        riskLevel: 'info',
        members: longInactive,
        defaultTemplate: DEFAULT_TEMPLATES.longInactive,
      },
    ];
  }, [folder, refreshKey]);

  const totalRiskCount = useMemo(
    () => riskGroups.reduce((sum, g) => sum + g.members.length, 0),
    [riskGroups]
  );

  const riskScore = useMemo(() => {
    let score = 100;
    riskGroups.forEach((g) => {
      if (g.key === 'externalEdit') score -= g.members.length * 25;
      if (g.key === 'expiringSoon') score -= g.members.length * 15;
      if (g.key === 'longInactive') score -= g.members.length * 10;
    });
    return Math.max(0, score);
  }, [riskGroups]);

  const riskLevel = useMemo(() => {
    if (riskScore >= 80) return 'safe' as const;
    if (riskScore >= 50) return 'warning' as const;
    return 'danger' as const;
  }, [riskScore]);

  const scoreColor = useMemo(() => {
    if (riskLevel === 'safe') return '#10B981';
    if (riskLevel === 'warning') return '#F59E0B';
    return '#EF4444';
  }, [riskLevel]);

  const scoreLabel = useMemo(() => {
    if (riskLevel === 'safe') return '风险较低';
    if (riskLevel === 'warning') return '存在风险';
    return '风险较高';
  }, [riskLevel]);

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((group: RiskGroup) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = group.members.every((m) => next.has(m.id));
      group.members.forEach((m) => {
        if (allSelected) next.delete(m.id);
        else next.add(m.id);
      });
      return next;
    });
  }, []);

  const applyTemplateToGroup = useCallback((group: RiskGroup) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.members.forEach((m) => next.add(m.id));
      return next;
    });

    setTemplateOverrides((prev) => {
      const next = new Map(prev);
      const tpl = group.defaultTemplate;
      group.members.forEach((m) => {
        next.set(m.id, {
          templateId: tpl.templateId,
          action: tpl.action,
          expireAt: tpl.expireAt,
          overridePermission: tpl.overridePermission,
          templateUsedText: tpl.templateUsedText,
        });
      });
      return next;
    });

    Taro.showToast({
      title: `已套用「${group.defaultTemplate.templateUsedText}」`,
      icon: 'success',
    });
  }, []);

  const showMemberTemplateSelector = useCallback((member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    Taro.showActionSheet({
      itemList: TEMPLATE_OPTIONS.map((opt) => opt.label),
      success: (res) => {
        const selected = TEMPLATE_OPTIONS[res.tapIndex];
        if (selected.key === 'clear') {
          setTemplateOverrides((prev) => {
            const next = new Map(prev);
            next.delete(member.id);
            return next;
          });
        } else if (selected.template) {
          const tpl = selected.template;
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.add(member.id);
            return next;
          });
          setTemplateOverrides((prev) => {
            const next = new Map(prev);
            next.set(member.id, {
              templateId: tpl.templateId,
              action: tpl.action,
              expireAt: tpl.expireAt,
              overridePermission: tpl.overridePermission,
              templateUsedText: tpl.templateUsedText,
            });
            return next;
          });
        }
      },
    });
  }, []);

  const handleBatchAction = useCallback(
    (action: ActionType) => {
      const selectedMembers = (folder?.members || []).filter((m) =>
        selectedIds.has(m.id)
      );
      if (selectedMembers.length === 0) {
        Taro.showToast({ title: '请先选择成员', icon: 'none' });
        return;
      }

      if (action === 'feedback') {
        batchPermissionAction({
          folderId,
          memberIds: selectedMembers.map((m) => m.id),
          memberNames: selectedMembers.map((m) => m.name),
          action,
          reason: '批量反馈问题',
        });
        setSelectedIds(new Set());
        Taro.showToast({ title: '反馈已提交', icon: 'success' });
        return;
      }

      const actionLabel = action === 'revoke' ? '收回' : '保留';

      Taro.showModal({
        title: `批量${actionLabel}权限`,
        content: `确认对 ${selectedMembers.length} 位成员批量${actionLabel}权限？`,
        editable: true,
        placeholderText: `请输入${actionLabel}原因`,
        confirmText: '确认',
        confirmColor: '#2563EB',
        success: (res) => {
          if (res.confirm) {
            const reason = res.content?.trim() || `批量${actionLabel}权限`;
            batchPermissionAction({
              folderId,
              memberIds: selectedMembers.map((m) => m.id),
              memberNames: selectedMembers.map((m) => m.name),
              action,
              reason,
            });
            setSelectedIds(new Set());
            Taro.showToast({
              title: `已批量${actionLabel}权限`,
              icon: 'success',
            });
          }
        },
      });
    },
    [folder, folderId, selectedIds, batchPermissionAction]
  );

  const handleTemplateBatchSubmit = useCallback(() => {
    if (templateOverrides.size === 0) {
      Taro.showToast({ title: '暂无模板待提交', icon: 'none' });
      return;
    }

    const membersMap = new Map((folder?.members || []).map((m) => [m.id, m]));

    const groupsByTemplate = new Map<TemplateId, Array<{ id: string; name: string }>>();
    templateOverrides.forEach((override, memberId) => {
      const member = membersMap.get(memberId);
      if (!member) return;
      const list = groupsByTemplate.get(override.templateId) || [];
      list.push({ id: memberId, name: member.name });
      groupsByTemplate.set(override.templateId, list);
    });

    const confirmContent = Array.from(groupsByTemplate.entries())
      .map(([tplId, list]) => {
        const tplInfo = TEMPLATE_OPTIONS.find((o) => o.key === tplId);
        return `${tplInfo?.label || tplId}：${list.length}人`;
      })
      .join('\n');

    Taro.showModal({
      title: `按模板批量提交 ${templateOverrides.size}人`,
      content: confirmContent,
      confirmText: '确认提交',
      confirmColor: '#2563EB',
      success: (res) => {
        if (res.confirm) {
          groupsByTemplate.forEach((list, tplId) => {
            const overrideSample = Array.from(templateOverrides.values()).find(
              (o) => o.templateId === tplId
            );
            if (!overrideSample) return;

            const ids = list.map((x) => x.id);
            const names = list.map((x) => x.name);

            batchPermissionAction({
              folderId,
              memberIds: ids,
              memberNames: names,
              action: overrideSample.action,
              reason: `按模板处理：${overrideSample.templateUsedText}`,
              expireAt: overrideSample.expireAt,
              overridePermission: overrideSample.overridePermission,
              templateUsed: overrideSample.templateId,
              templateUsedText: overrideSample.templateUsedText,
            });
          });

          setTemplateOverrides(new Map());
          setSelectedIds(new Set());
          Taro.showToast({
            title: `已提交 ${templateOverrides.size} 条模板处理`,
            icon: 'success',
          });
        }
      },
    });
  }, [templateOverrides, folder, folderId, batchPermissionAction]);

  const renderMemberCard = (member: Member) => {
    const permColor = getPermissionColor(member.permission);
    const isSelected = selectedIds.has(member.id);
    const daysUntilExpire = member.expireAt
      ? getDaysUntilExpire(member.expireAt)
      : null;
    const inactiveDays = dayjs().diff(dayjs(member.lastAccess), 'day');
    const templateOverride = templateOverrides.get(member.id);

    return (
      <View
        key={member.id}
        className={classnames(styles.memberCard, isSelected && styles.selected)}
        onClick={() => toggleMember(member.id)}
      >
        <View className={styles.cardCheck}>
          <Checkbox checked={isSelected} color="#2563EB" />
        </View>
        <Image
          className={styles.cardAvatar}
          src={member.avatar}
          mode="aspectFill"
        />
        <View className={styles.cardInfo}>
          <View className={styles.cardNameRow}>
            <Text className={styles.cardName}>{member.name}</Text>
            {member.isExternal && (
              <Text className={styles.externalBadge}>
                {member.externalCompany || '外部协作'}
              </Text>
            )}
            <Text
              className={styles.permBadge}
              style={{ background: permColor.bg, color: permColor.text }}
            >
              {getPermissionText(member.permission)}
            </Text>
          </View>
          <Text className={styles.cardDept}>{member.department}</Text>
          <View
            className={styles.cardTemplateRow}
            onClick={(e) => showMemberTemplateSelector(member, e)}
          >
            {templateOverride ? (
              <Text
                className={classnames(
                  styles.templateTag,
                  styles[getTemplateColorClass(templateOverride.templateId)]
                )}
              >
                📋 {templateOverride.templateUsedText}
              </Text>
            ) : (
              <Text className={classnames(styles.templateTag, styles.placeholder)}>
                + 选择模板
              </Text>
            )}
          </View>
          <View className={styles.cardMeta}>
            {daysUntilExpire !== null && (
              <Text
                className={classnames(
                  styles.expireTag,
                  daysUntilExpire <= 3 ? styles.urgent : styles.soon
                )}
              >
                {daysUntilExpire <= 0
                  ? '已到期'
                  : `${daysUntilExpire}天后到期`}
              </Text>
            )}
            {inactiveDays > 14 && (
              <Text className={styles.inactiveTag}>
                {inactiveDays}天未访问
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderRiskGroup = (group: RiskGroup) => {
    if (group.members.length === 0) return null;

    const levelClass =
      group.riskLevel === 'danger'
        ? styles.danger
        : group.riskLevel === 'warning'
        ? styles.warning
        : styles.info;

    const allSelected = group.members.every((m) => selectedIds.has(m.id));

    return (
      <View key={group.key} className={styles.riskGroup}>
        <View
          className={classnames(styles.groupHeader, levelClass)}
        >
          <View className={styles.groupTitleRow} onClick={() => toggleGroup(group)}>
            <Text className={styles.groupIcon}>{group.icon}</Text>
            <Text className={styles.groupTitle}>{group.title}</Text>
            <Text className={styles.groupCount}>{group.members.length}人</Text>
          </View>
          <View className={styles.groupActions}>
            <View
              className={styles.applyTemplateBtn}
              onClick={(e) => {
                e.stopPropagation();
                applyTemplateToGroup(group);
              }}
            >
              <Text className={styles.applyTemplateBtnText}>📋 套用模板</Text>
            </View>
            <View
              className={styles.groupSelectAll}
              onClick={() => toggleGroup(group)}
            >
              <Checkbox checked={allSelected} color="#2563EB" />
              <Text className={styles.selectAllText}>全选</Text>
            </View>
          </View>
        </View>
        <View className={styles.groupMembers}>
          {group.members.map(renderMemberCard)}
        </View>
      </View>
    );
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

  const showBottomBar = selectedIds.size > 0 || templateOverrides.size > 0;

  return (
    <>
      <ScrollView scrollY className="pageContainer">
        <View className={styles.scoreCard}>
          <View className={styles.scoreHeader}>
            <View className={styles.scoreLeft}>
              <Text className={styles.folderIconText}>📁</Text>
              <View className={styles.scoreFolderInfo}>
                <Text className={styles.scoreFolderName}>{folder.name}</Text>
                <Text className={styles.scoreFolderDesc}>
                  {folder.memberCount} 位成员 · {folder.externalCount} 个外部协作
                </Text>
              </View>
            </View>
            <View className={styles.scoreRing}>
              <Text className={styles.scoreNum} style={{ color: scoreColor }}>
                {riskScore}
              </Text>
              <Text className={styles.scoreLabel} style={{ color: scoreColor }}>
                {scoreLabel}
              </Text>
            </View>
          </View>
          <View className={styles.scoreBar}>
            <View
              className={styles.scoreBarFill}
              style={{
                width: `${riskScore}%`,
                background: scoreColor,
              }}
            />
          </View>
          <Text className={styles.scoreHint}>
            发现 {totalRiskCount} 项风险项，建议及时处理
          </Text>
        </View>

        {riskGroups.map(renderRiskGroup)}

        {totalRiskCount === 0 && (
          <View className={styles.allSafeCard}>
            <Text className={styles.allSafeIcon}>✅</Text>
            <Text className={styles.allSafeText}>权限配置健康，暂无风险项</Text>
          </View>
        )}

        <View style={{ height: '240rpx' }} />
      </ScrollView>

      {showBottomBar && (
        <View className={styles.bottomBar}>
          <View className={styles.selectedInfo}>
            <Text className={styles.selectedCount}>
              {templateOverrides.size > 0
                ? `已套用模板 ${templateOverrides.size} 人`
                : `已选择 ${selectedIds.size} 人`}
            </Text>
            <Text
              className={styles.clearBtn}
              onClick={() => {
                setSelectedIds(new Set());
                setTemplateOverrides(new Map());
              }}
            >
              清空
            </Text>
          </View>
          {templateOverrides.size > 0 && (
            <View
              className={classnames(styles.batchBtn, styles.templateSubmitBtn)}
              onClick={handleTemplateBatchSubmit}
            >
              <Text className={styles.batchBtnText}>
                🚀 按模板批量提交 {templateOverrides.size}人
              </Text>
            </View>
          )}
          <View className={styles.batchActions}>
            <View
              className={classnames(styles.batchBtn, styles.revoke)}
              onClick={() => handleBatchAction('revoke')}
            >
              <Text className={styles.batchBtnText}>收回权限</Text>
            </View>
            <View
              className={classnames(styles.batchBtn, styles.retain)}
              onClick={() => handleBatchAction('retain')}
            >
              <Text className={styles.batchBtnText}>保留权限</Text>
            </View>
            <View
              className={classnames(styles.batchBtn, styles.feedback)}
              onClick={() => handleBatchAction('feedback')}
            >
              <Text className={styles.batchBtnText}>反馈问题</Text>
            </View>
          </View>
        </View>
      )}
    </>
  );
};

export default FolderHealthcheckPage;
