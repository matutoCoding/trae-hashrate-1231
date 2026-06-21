import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, Input, Switch } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import { dayjs, getPermissionText } from '@/utils';
import { Member, PermissionLevel, Folder } from '@/types';
import styles from './index.module.scss';

const AddAuthorizationPage: React.FC = () => {
  const router = useRouter();
  const { allMembers, folders, getFolderById, addAuthorization } = useAppContext();
  const initialFolderId = router.params.folderId;

  const [searchText, setSearchText] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [permission, setPermission] = useState<PermissionLevel>('view');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || 'f1');
  const [expireDate, setExpireDate] = useState(
    dayjs().add(7, 'day').format('YYYY-MM-DD')
  );
  const [notifyBeforeExpire, setNotifyBeforeExpire] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  const selectedFolder: Folder | undefined = getFolderById(selectedFolderId);
  const existingMemberIds = useMemo(() => {
    if (!selectedFolder?.members) return new Set<string>();
    return new Set(selectedFolder.members.map((m) => m.id));
  }, [selectedFolder]);

  const getExistingMemberInfo = (id: string) => {
    return selectedFolder?.members?.find((m) => m.id === id);
  };

  const newMembers = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    return allMembers.filter((m) => {
      if (existingMemberIds.has(m.id)) return false;
      if (!kw) return true;
      return (
        m.name.toLowerCase().includes(kw) ||
        m.department.toLowerCase().includes(kw) ||
        (m.externalCompany && m.externalCompany.toLowerCase().includes(kw))
      );
    });
  }, [allMembers, existingMemberIds, searchText]);

  const existingMembersInFolder = useMemo(() => {
    if (!selectedFolder?.members) return [];
    const kw = searchText.trim().toLowerCase();
    if (!kw) return selectedFolder.members;
    return selectedFolder.members.filter(
      (m) =>
        m.name.toLowerCase().includes(kw) ||
        m.department.toLowerCase().includes(kw) ||
        (m.externalCompany && m.externalCompany.toLowerCase().includes(kw))
    );
  }, [selectedFolder, searchText]);

  const quickDateOptions = [
    { label: '1天', days: 1 },
    { label: '3天', days: 3 },
    { label: '7天', days: 7 },
    { label: '15天', days: 15 },
    { label: '30天', days: 30 },
    { label: '自定义', days: -1 },
  ];

  const isDateActive = (days: number) => {
    if (days === -1) return false;
    const target = dayjs().add(days, 'day').format('YYYY-MM-DD');
    return expireDate === target;
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleDatePick = () => {
    Taro.showActionSheet({
      itemList: quickDateOptions.map(
        (o) =>
          o.days === -1
            ? '自定义日期'
            : `${o.label}（${dayjs().add(o.days, 'day').format('MM月DD日')}）`
      ),
      success: (res) => {
        const selected = quickDateOptions[res.tapIndex];
        if (selected.days !== -1) {
          setExpireDate(dayjs().add(selected.days, 'day').format('YYYY-MM-DD'));
        } else {
          Taro.showToast({ title: '请选择日期', icon: 'none' });
        }
      },
    });
  };

  const handleFolderPick = () => {
    Taro.showActionSheet({
      itemList: folders.map((f) => f.name),
      success: (res) => {
        setSelectedFolderId(folders[res.tapIndex].id);
        setSelectedMembers([]);
      },
    });
  };

  const canSubmit = selectedMembers.length > 0 && !!expireDate;

  const validateBeforeSubmit = (): boolean => {
    if (selectedMembers.length === 0) {
      Taro.showToast({ title: '请至少选择一位成员', icon: 'none' });
      return false;
    }
    if (!expireDate) {
      Taro.showToast({ title: '请选择授权有效期', icon: 'none' });
      return false;
    }
    const daysUntil = dayjs(expireDate).diff(dayjs(), 'day');
    if (daysUntil <= 0) {
      Taro.showToast({ title: '有效期需晚于今天', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (!validateBeforeSubmit()) return;
    setSubmitting(true);

    addAuthorization({
      folderId: selectedFolderId,
      memberIds: selectedMembers,
      permission,
      expireAt: expireDate,
      notifyBeforeExpire,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitting(false);

    Taro.showToast({
      title: '授权已生效',
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

  const renderMemberItem = (m: Member, isExisting: boolean) => {
    const existingInfo = isExisting ? getExistingMemberInfo(m.id) : null;
    return (
      <View
        key={m.id}
        className={classnames(
          styles.suggestionItem,
          selectedMembers.includes(m.id) && styles.active,
          isExisting && styles.existingMember
        )}
        onClick={() => toggleMember(m.id)}
      >
        <Image className={styles.sugAvatar} src={m.avatar} mode="aspectFill" />
        <View className={styles.sugInfo}>
          <View className={styles.sugNameRow}>
            <Text className={styles.sugName}>{m.name}</Text>
            <Text
              className={classnames(
                styles.sugTag,
                m.isExternal ? styles.external : styles.internal
              )}
            >
              {m.isExternal ? m.externalCompany || '外部' : '内部'}
            </Text>
            {isExisting && (
              <Text className={styles.existingTag}>已在文件夹</Text>
            )}
          </View>
          <Text className={styles.sugDept}>{m.department}</Text>
          {isExisting && existingInfo && (
            <Text className={styles.existingInfo}>
              当前：{getPermissionText(existingInfo.permission)}
              {existingInfo.expireAt ? ` · 有效期至 ${existingInfo.expireAt}` : ''}
            </Text>
          )}
        </View>
        <View className={styles.sugCheck}>✓</View>
      </View>
    );
  };

  return (
    <>
      <ScrollView scrollY className="pageContainer">
        <View className={styles.tipCard}>
          <Text className={styles.tipIcon}>💡</Text>
          <View className={styles.tipContent}>
            <Text className={styles.tipTitle}>临时授权使用场景</Text>
            <Text className={styles.tipText}>
              适用于出差期间临时加人、短期项目合作等场景。选择已有成员可延长或调整其授权。
            </Text>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formTitle}>👥 选择授权成员</Text>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>
              搜索成员
              <Text className={styles.required}>*</Text>
            </Text>
            <View className={styles.searchInputWrap}>
              <Text className={styles.searchIcon}>🔍</Text>
              <Input
                className={styles.searchInput}
                placeholder="搜索姓名、部门或公司名称"
                value={searchText}
                onInput={(e) => setSearchText(e.detail.value)}
                confirmType="search"
              />
            </View>

            {selectedMembers.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <View className={styles.selectedTag}>
                  <Text>✓ 已选择 {selectedMembers.length} 人</Text>
                </View>
              </View>
            )}

            <View className={styles.memberSectionTitle}>
              <Text className={styles.sectionLabel}>🆕 可新增授权</Text>
              <Text className={styles.sectionCount}>{newMembers.length} 人</Text>
            </View>
            <View className={styles.memberSuggestions}>
              {(searchText.trim() ? newMembers : newMembers.slice(0, 6)).map((m) =>
                renderMemberItem(m, false)
              )}
              {!searchText.trim() && newMembers.length === 0 && (
                <Text className={styles.noResult}>暂无可新增成员</Text>
              )}
            </View>

            <View className={styles.memberSectionTitle}>
              <View
                className={styles.sectionToggle}
                onClick={() => setShowExisting(!showExisting)}
              >
                <Text className={styles.sectionLabel}>📋 已在当前文件夹</Text>
                <Text className={styles.sectionCount}>
                  {existingMembersInFolder.length} 人
                </Text>
                <Text className={styles.toggleArrow}>
                  {showExisting ? '▾' : '▸'}
                </Text>
              </View>
            </View>
            {showExisting && (
              <View className={styles.memberSuggestions}>
                {existingMembersInFolder.map((m) =>
                  renderMemberItem(m, true)
                )}
              </View>
            )}
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formTitle}>📂 选择共享文件夹</Text>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>
              目标文件夹
              <Text className={styles.required}>*</Text>
            </Text>
            <View className={styles.folderPicker} onClick={handleFolderPick}>
              <View className={styles.folderPickerInfo}>
                <Text className={styles.folderPickerName}>
                  📁 {selectedFolder?.name || '请选择文件夹'}
                </Text>
                <Text className={styles.folderPickerDesc}>
                  {selectedFolder
                    ? `${selectedFolder.memberCount} 位成员 · ${selectedFolder.description}`
                    : '点击选择需要授权访问的共享文件夹'}
                </Text>
              </View>
              <Text className={styles.folderPickerArrow}>›</Text>
            </View>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formTitle}>🔐 权限类型设置</Text>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>
              选择权限等级
              <Text className={styles.hintText}>（编辑权限请谨慎授予）</Text>
            </Text>
            <View className={styles.permOptions}>
              <View
                className={classnames(
                  styles.permOption,
                  permission === 'view' && styles.active
                )}
                onClick={() => setPermission('view')}
              >
                <Text className={styles.permIcon}>👁️</Text>
                <Text className={styles.permName}>查看权限</Text>
                <Text className={styles.permDesc}>只读访问，不可修改文件内容</Text>
              </View>
              <View
                className={classnames(
                  styles.permOption,
                  styles.edit,
                  permission === 'edit' && styles.active
                )}
                onClick={() => setPermission('edit')}
              >
                <Text className={styles.permIcon}>✏️</Text>
                <Text className={styles.permName}>编辑权限</Text>
                <Text className={styles.permDesc}>可创建、修改、删除文件</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.formTitle}>⏰ 有效期设置</Text>
          <View className={styles.formRow}>
            <View className={styles.dateRow}>
              <Text className={styles.dateLabel}>
                📅 授权至
                <Text className={styles.required}>*</Text>
              </Text>
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
                    opt.days !== -1 && isDateActive(opt.days) && styles.active
                  )}
                  onClick={() => {
                    if (opt.days !== -1) {
                      setExpireDate(dayjs().add(opt.days, 'day').format('YYYY-MM-DD'));
                    } else {
                      handleDatePick();
                    }
                  }}
                >
                  <Text>{opt.label}</Text>
                </View>
              ))}
            </View>

            <View className={styles.notifyRow}>
              <View className={styles.notifyInfo}>
                <Text className={styles.notifyTitle}>到期前自动提醒确认</Text>
                <Text className={styles.notifyDesc}>
                  到期前 3 天推送消息，确认是否续期或收回权限
                </Text>
              </View>
              <Switch
                checked={notifyBeforeExpire}
                color="#2563EB"
                onChange={(e) => setNotifyBeforeExpire(e.detail.value)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.cancelBtn} onClick={handleCancel}>
          <Text>取消</Text>
        </View>
        <View
          className={classnames(styles.submitBtn, !canSubmit && styles.disabled)}
          onClick={handleSubmit}
        >
          <Text>{submitting ? '提交中...' : '确认授权'}</Text>
        </View>
      </View>
    </>
  );
};

export default AddAuthorizationPage;
