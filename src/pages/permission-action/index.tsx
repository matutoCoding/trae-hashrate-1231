import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { getFolderById, mockMembers } from '@/data/folders';
import { getTaskById } from '@/data/tasks';
import { getPermissionText, getPermissionColor, dayjs } from '@/utils';
import { Member, PermissionLevel } from '@/types';
import { useAppContext } from '@/store/AppContext';
import styles from './index.module.scss';

type ActionChoice = 'retain' | 'revoke' | 'feedback' | null;

const PermissionActionPage: React.FC = () => {
  const router = useRouter();
  const { triggerRefresh } = useAppContext();
  const { taskId, folderId = 'f1', memberId = 'm4' } = router.params;

  const task = taskId ? getTaskById(taskId) : undefined;
  const folder = getFolderById(folderId);
  const member: Member | undefined = useMemo(() => {
    if (folder?.members) {
      return folder.members.find((m) => m.id === memberId);
    }
    return mockMembers.find((m) => m.id === memberId);
  }, [folder, memberId]);

  const [action, setAction] = useState<ActionChoice>(null);
  const [expireDate, setExpireDate] = useState<string>(
    member?.expireAt || dayjs().add(7, 'day').format('YYYY-MM-DD')
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const permColor = member ? getPermissionColor(member.permission) : { bg: '', text: '' };

  const quickDateOptions = [
    { label: '3天', days: 3 },
    { label: '7天', days: 7 },
    { label: '15天', days: 15 },
    { label: '30天', days: 30 },
    { label: '90天', days: 90 },
  ];

  const reasonTemplates =
    action === 'revoke'
      ? ['项目合作已结束', '员工已离职/转岗', '权限已不再需要', '已过项目交付期']
      : action === 'feedback'
      ? ['账号来源不明', '权限等级异常', '长期未使用账号', '发现异常访问记录']
      : ['项目持续进行中', '合同期内正常使用', '阶段性工作需要', '需持续提供支持'];

  const isDateActive = (days: number) => {
    const target = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return expireDate === target;
  };

  const handleDatePick = () => {
    const year = dayjs(expireDate).year();
    const month = String(dayjs(expireDate).month() + 1).padStart(2, '0');
    const day = String(dayjs(expireDate).date()).padStart(2, '0');
    const initial = `${year}-${month}-${day}`;
    Taro.showActionSheet({
      itemList: quickDateOptions.map((o) => `${o.label}（${dayjs().add(o.days, 'day').format('MM月DD日')}）`),
      success: (res) => {
        const selected = quickDateOptions[res.tapIndex];
        setExpireDate(dayjs().add(selected.days, 'day').format('YYYY-MM-DD'));
      },
    });
  };

  const canSubmit = action !== null && (action !== 'retain' || !!expireDate);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    console.log('[PermissionAction] 提交审核:', {
      taskId,
      folderId,
      memberId,
      action,
      expireDate: action === 'retain' ? expireDate : undefined,
      reason,
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));

    setSubmitting(false);
    triggerRefresh();

    const actionText =
      action === 'retain' ? '权限已保留' : action === 'revoke' ? '权限已收回' : '反馈已提交';
    Taro.showToast({
      title: actionText,
      icon: 'success',
      duration: 1500,
    });

    setTimeout(() => {
      Taro.navigateBack({ delta: 1 });
    }, 1200);
  };

  const handleCancel = () => {
    Taro.navigateBack({ delta: 1 });
  };

  const submitBtnText = submitting
    ? '提交中...'
    : action === 'retain'
    ? '确认保留权限'
    : action === 'revoke'
    ? '确认收回权限'
    : '提交反馈';

  return (
    <>
      <ScrollView scrollY className="pageContainer">
        <View className={styles.taskInfoCard}>
          <View className={styles.taskHeader}>
            <View className={styles.taskTypeTag}>
              <Text className={styles.taskTypeIcon}>
                {task?.type === 'expire' ? '⏰' : task?.type === 'abnormal' ? '⚠️' : '🔍'}
              </Text>
              <Text className={styles.taskTypeText}>
                {task?.typeText || '权限审核'}
              </Text>
            </View>
            <Text className={styles.priorityTag}>
              {task?.priority === 'high'
                ? '高优先级'
                : task?.priority === 'medium'
                ? '中优先级'
                : '待处理'}
            </Text>
          </View>
          <Text className={styles.taskDesc}>
            {task?.description ||
              '请审核该成员的共享文件夹权限，选择保留、收回或反馈异常情况。'}
          </Text>
        </View>

        <View className={styles.memberProfile}>
          <Image
            className={styles.memberAvatar}
            src={member?.avatar || 'https://picsum.photos/id/1005/200/200'}
            mode="aspectFill"
          />
          <View className={styles.memberBasicInfo}>
            <View className={styles.memberNameRow}>
              <Text className={styles.memberName}>{member?.name || '未知用户'}</Text>
              {member?.isExternal && (
                <Text className={styles.externalBadge}>
                  {member.externalCompany || '外部协作'}
                </Text>
              )}
              <Text
                className={styles.permBadge}
                style={{ background: permColor.bg, color: permColor.text }}
              >
                {getPermissionText((member?.permission || 'view') as PermissionLevel)}
              </Text>
            </View>
            <Text className={styles.memberDept}>{member?.department || '未知部门'}</Text>
            <Text className={styles.memberMeta}>
              最近访问：
              {member ? dayjs(member.lastAccess).fromNow() : '无记录'}
              {member?.expireAt && `  |  有效期至：${member.expireAt}`}
            </Text>
          </View>
        </View>

        <View className={styles.contextInfo}>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>所属文件夹</Text>
            <Text className={styles.infoValue}>📂 {folder?.name || '未知文件夹'}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>当前权限</Text>
            <Text className={styles.infoValue}>
              {getPermissionText((member?.permission || 'view') as PermissionLevel)}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>成员总数</Text>
            <Text className={styles.infoValue}>
              {folder?.memberCount || 0} 人（含 {folder?.externalCount || 0} 个外部协作）
            </Text>
          </View>
          {task && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>发起时间</Text>
              <Text className={styles.infoValue}>
                {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
              </Text>
            </View>
          )}
        </View>

        <View className={styles.actionSection}>
          <Text className={styles.actionTitle}>📋 请选择处理方式</Text>
          <View className={styles.actionOptions}>
            <View
              className={classnames(styles.optionCard, action === 'retain' && styles.active)}
              onClick={() => setAction('retain')}
            >
              <View className={styles.optionCheck}>✓</View>
              <View className={styles.optionHeader}>
                <View className={styles.optionIcon}>✅</View>
                <Text className={styles.optionTitle}>继续保留权限</Text>
              </View>
              <Text className={styles.optionDesc}>
                该账号权限仍属必要，选择保留并设置新的有效期，到期前会再次提醒您确认。
              </Text>
            </View>

            <View
              className={classnames(
                styles.optionCard,
                styles.danger,
                action === 'revoke' && styles.active
              )}
              onClick={() => setAction('revoke')}
            >
              <View className={styles.optionCheck}>✓</View>
              <View className={styles.optionHeader}>
                <View className={styles.optionIcon}>🚫</View>
                <Text className={styles.optionTitle}>建议收回权限</Text>
              </View>
              <Text className={styles.optionDesc}>
                该账号已不再需要共享文件夹访问权限，系统将在收到您的指令后自动移除。
              </Text>
            </View>

            <View
              className={classnames(styles.optionCard, action === 'feedback' && styles.active)}
              onClick={() => setAction('feedback')}
            >
              <View className={styles.optionCheck}>✓</View>
              <View className={styles.optionHeader}>
                <View className={styles.optionIcon}>📝</View>
                <Text className={styles.optionTitle}>一键反馈问题</Text>
              </View>
              <Text className={styles.optionDesc}>
                发现异常情况（陌生账号、权限越权等），请上报给安全管理团队进一步核查。
              </Text>
            </View>
          </View>
        </View>

        {action === 'retain' && (
          <View className={styles.dateSection}>
            <View className={styles.dateRow}>
              <Text className={styles.dateLabel}>📅 保留有效期至</Text>
              <View className={styles.datePicker} onClick={handleDatePick}>
                <Text>{expireDate}</Text>
                <Text>▾</Text>
              </View>
            </View>
            <View className={styles.quickDates}>
              {quickDateOptions.map((opt) => (
                <View
                  key={opt.days}
                  className={classnames(
                    styles.quickDateBtn,
                    isDateActive(opt.days) && styles.active
                  )}
                  onClick={() =>
                    setExpireDate(dayjs().add(opt.days, 'day').format('YYYY-MM-DD'))
                  }
                >
                  <Text>{opt.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className={styles.reasonSection}>
          <View className={styles.reasonLabel}>
            <Text>✏️ 填写原因说明</Text>
            <Text className={styles.reasonOptional}>
              {action === 'revoke' ? '（必填）' : '（选填，建议填写以便审计追溯）'}
            </Text>
          </View>
          <View className={styles.reasonInputWrap}>
            <Textarea
              className={styles.reasonInput}
              placeholder={
                action === 'revoke'
                  ? '请简要说明收回该账号权限的原因...'
                  : action === 'feedback'
                  ? '请描述您发现的异常情况，便于安全团队跟进...'
                  : '例如：项目持续进行中，合同期至XX时间...'
              }
              value={reason}
              onInput={(e) => setReason(e.detail.value)}
              maxlength={200}
              autoHeight
            />
          </View>
          <View className={styles.reasonTemplates}>
            {reasonTemplates.map((t) => (
              <View
                key={t}
                className={styles.reasonChip}
                onClick={() => setReason(t)}
              >
                <Text>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.cancelBtn} onClick={handleCancel}>
          <Text>取消</Text>
        </View>
        <View
          className={classnames(
            styles.submitBtn,
            action === 'revoke' && styles.danger,
            !canSubmit && styles.disabled
          )}
          onClick={handleSubmit}
        >
          <Text className={styles.submitBtnText}>{submitBtnText}</Text>
        </View>
      </View>
    </>
  );
};

export default PermissionActionPage;
