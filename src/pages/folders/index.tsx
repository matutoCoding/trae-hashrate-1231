import React, { useState, useMemo } from 'react';
import { View, Text, Image, Input, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useAppContext } from '@/store/AppContext';
import FolderCard from '@/components/FolderCard';
import SectionHeader from '@/components/SectionHeader';
import StatusBadge from '@/components/StatusBadge';
import { Folder } from '@/types';
import styles from './index.module.scss';

type FilterType = 'all' | 'danger' | 'warning' | 'safe' | 'hasExternal';

const filters: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'danger', label: '高风险', icon: '🔴' },
  { key: 'warning', label: '待关注', icon: '🟡' },
  { key: 'safe', label: '正常', icon: '🟢' },
  { key: 'hasExternal', label: '有外部协作', icon: '🔗' },
];

const FoldersPage: React.FC = () => {
  const { user, folders, refreshKey, triggerRefresh } = useAppContext();
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      triggerRefresh();
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '刷新成功', icon: 'success' });
    }, 800);
  });

  const filteredFolders = useMemo(() => {
    let result = [...folders];

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(keyword) ||
          f.description.toLowerCase().includes(keyword)
      );
    }

    switch (activeFilter) {
      case 'danger':
        result = result.filter((f) => f.status === 'danger');
        break;
      case 'warning':
        result = result.filter((f) => f.status === 'warning');
        break;
      case 'safe':
        result = result.filter((f) => f.status === 'safe');
        break;
      case 'hasExternal':
        result = result.filter((f) => f.externalCount > 0);
        break;
    }

    return result.sort((a, b) => {
      const priority = { danger: 0, warning: 1, safe: 2 } as const;
      return priority[a.status] - priority[b.status];
    });
  }, [searchText, activeFilter, folders, refreshKey]);

  const stats = useMemo(() => {
    const total = folders.length;
    const danger = folders.filter((f) => f.status === 'danger').length;
    const warning = folders.filter((f) => f.status === 'warning').length;
    const safe = folders.filter((f) => f.status === 'safe').length;
    return { total, danger, warning, safe };
  }, [folders, refreshKey]);

  const handleFolderClick = (folder: Folder) => {
    console.log('[FoldersPage] 点击文件夹:', folder.id, folder.name);
    Taro.navigateTo({
      url: `/pages/folder-detail/index?id=${folder.id}`,
    });
  };

  return (
    <ScrollView scrollY className={styles.pageContainer} refresher-enabled>
      <View className={styles.header}>
        <View className={styles.greetingRow}>
          <View className={styles.greeting}>
            <Text className={styles.greetingTitle}>下午好，{user.name}</Text>
            <Text className={styles.greetingDesc}>
              您负责 {stats.total} 个共享文件夹，{stats.danger + stats.warning} 个需要关注
            </Text>
          </View>
          <Image className={styles.headerAvatar} src={user.avatar} mode="aspectFill" />
        </View>

        <View className={styles.statsCard}>
          <View className={styles.statsTitleRow}>
            <Text className={styles.statsTitle}>📊 权限健康概览</Text>
            <Text className={styles.statsRefresh}>今日更新</Text>
          </View>
          <View className={styles.statsGrid}>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{stats.total}</Text>
              <Text className={styles.statLabel}>文件夹总数</Text>
            </View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}>
              <Text className={styles.statNumber} style={{ color: '#FCA5A5' }}>
                {stats.danger}
              </Text>
              <Text className={styles.statLabel}>高风险</Text>
            </View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}>
              <Text className={styles.statNumber} style={{ color: '#FCD34D' }}>
                {stats.warning}
              </Text>
              <Text className={styles.statLabel}>待关注</Text>
            </View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}>
              <Text className={styles.statNumber} style={{ color: '#6EE7B7' }}>
                {stats.safe}
              </Text>
              <Text className={styles.statLabel}>正常</Text>
            </View>
          </View>
        </View>

        <View className={styles.searchBar}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="搜索文件夹名称或描述"
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
            confirmType="search"
          />
        </View>

        <View className={styles.filterBar}>
          {filters.map((f) => (
            <View
              key={f.key}
              className={classnames(styles.filterChip, activeFilter === f.key && styles.active)}
              onClick={() => setActiveFilter(f.key)}
            >
              <Text>{f.icon} {f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <SectionHeader
        title="文件夹列表"
        desc={`共 ${filteredFolders.length} 个`}
        extra={
          <View style={{ display: 'flex', gap: 12 }}>
            {filteredFolders.length > 0 && (
              <StatusBadge
                status={filteredFolders[0].status}
                text={`优先处理${
                  filteredFolders[0].status === 'danger'
                    ? '高风险'
                    : filteredFolders[0].status === 'warning'
                    ? '待关注'
                    : '正常'
                }`}
                size="sm"
              />
            )}
          </View>
        }
      />

      <View className={styles.listArea}>
        {filteredFolders.length > 0 ? (
          filteredFolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onClick={handleFolderClick} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>暂无符合条件的文件夹</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default FoldersPage;
