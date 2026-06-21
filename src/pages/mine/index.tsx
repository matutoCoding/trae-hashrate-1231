import React from 'react';
import { View, Text, Image, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppContext } from '@/store/AppContext';
import { mockFolders, mockTasks, mockRecords } from '@/data';
import styles from './index.module.scss';

interface MenuItemData {
  icon: string;
  iconBg: string;
  title: string;
  desc?: string;
  badge?: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  onClick?: () => void;
}

const MinePage: React.FC = () => {
  const { user } = useAppContext();
  const [notifyExpire, setNotifyExpire] = React.useState(true);
  const [notifyReview, setNotifyReview] = React.useState(true);
  const [notifyWeekly, setNotifyWeekly] = React.useState(false);

  const myStats = {
    folders: mockFolders.length,
    pendingTasks: mockTasks.filter((t) => !t.handled).length,
    totalActions: mockRecords.length,
  };

  const handleItemClick = (title: string) => {
    console.log('[MinePage] 点击:', title);
    Taro.showToast({ title: `${title}功能开发中`, icon: 'none' });
  };

  const securityMenu: MenuItemData[] = [
    {
      icon: '🔐',
      iconBg: '#DBEAFE',
      title: '账号安全',
      desc: '修改密码、登录设备管理',
      onClick: () => handleItemClick('账号安全'),
    },
    {
      icon: '📱',
      iconBg: '#FEF3C7',
      title: '通知设置',
      desc: '推送、短信、邮件通知偏好',
      onClick: () => handleItemClick('通知设置'),
    },
  ];

  const notifyMenu: MenuItemData[] = [
    {
      icon: '⏰',
      iconBg: '#FEE2E2',
      title: '权限到期提醒',
      desc: '到期前3天推送确认通知',
      showSwitch: true,
      switchValue: notifyExpire,
      onSwitchChange: setNotifyExpire,
    },
    {
      icon: '🔍',
      iconBg: '#FEF3C7',
      title: '待审核提醒',
      desc: '有待处理审核时立即推送',
      showSwitch: true,
      switchValue: notifyReview,
      onSwitchChange: setNotifyReview,
    },
    {
      icon: '📊',
      iconBg: '#DBEAFE',
      title: '周报订阅',
      desc: '每周一发送权限健康报告',
      showSwitch: true,
      switchValue: notifyWeekly,
      onSwitchChange: setNotifyWeekly,
    },
  ];

  const helpMenu: MenuItemData[] = [
    {
      icon: '❓',
      iconBg: '#E0E7FF',
      title: '帮助中心',
      desc: '常见问题、使用指南',
      onClick: () => handleItemClick('帮助中心'),
    },
    {
      icon: '💬',
      iconBg: '#FCE7F3',
      title: '联系客服',
      desc: '工作日9:00-18:00在线',
      onClick: () => handleItemClick('联系客服'),
    },
    {
      icon: '⭐',
      iconBg: '#FEF3C7',
      title: '给我们评分',
      desc: '您的反馈是我们前进的动力',
      onClick: () => handleItemClick('给我们评分'),
    },
    {
      icon: 'ℹ️',
      iconBg: '#F1F5F9',
      title: '关于权限巡查',
      desc: '版本信息、用户协议',
      onClick: () => handleItemClick('关于'),
    },
  ];

  const renderMenuItem = (item: MenuItemData, idx: number) => (
    <View key={idx} className={styles.menuItem} onClick={item.onClick}>
      <View className={styles.menuIconWrap} style={{ background: item.iconBg }}>
        <Text className={styles.menuIcon}>{item.icon}</Text>
      </View>
      <View className={styles.menuContent}>
        <Text className={styles.menuTitle}>{item.title}</Text>
        {item.desc && <Text className={styles.menuDesc}>{item.desc}</Text>}
      </View>
      {item.badge && <Text className={styles.menuBadge}>{item.badge}</Text>}
      {item.showSwitch ? (
        <Switch
          checked={item.switchValue}
          color="#2563EB"
          onChange={(e) => item.onSwitchChange && item.onSwitchChange(e.detail.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Text className={styles.menuArrow}>›</Text>
      )}
    </View>
  );

  return (
    <ScrollView scrollY className="pageContainer">
      <View className={styles.profileCard}>
        <Image className={styles.avatar} src={user.avatar} mode="aspectFill" />
        <View className={styles.profileInfo}>
          <Text className={styles.userName}>{user.name}</Text>
          <Text className={styles.userRole}>{user.role}</Text>
          <Text className={styles.userDept}>{user.department}</Text>
          <View className={styles.statsMiniGrid}>
            <View className={styles.statsMiniItem}>
              <Text className={styles.statsMiniNum}>{myStats.folders}</Text>
              <Text className={styles.statsMiniLabel}>负责文件夹</Text>
            </View>
            <View className={styles.statsMiniItem}>
              <Text className={styles.statsMiniNum}>{myStats.pendingTasks}</Text>
              <Text className={styles.statsMiniLabel}>待处理事项</Text>
            </View>
            <View className={styles.statsMiniItem}>
              <Text className={styles.statsMiniNum}>{myStats.totalActions}</Text>
              <Text className={styles.statsMiniLabel}>累计操作</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.menuGroup}>
        <Text className={styles.groupTitle}>账号与安全</Text>
        {securityMenu.map(renderMenuItem)}
      </View>

      <View className={styles.menuGroup}>
        <Text className={styles.groupTitle}>消息通知</Text>
        {notifyMenu.map(renderMenuItem)}
      </View>

      <View className={styles.menuGroup}>
        <Text className={styles.groupTitle}>帮助与反馈</Text>
        {helpMenu.map(renderMenuItem)}
      </View>

      <View className={styles.versionRow}>
        <Text className={styles.versionText}>权限巡查助手 v1.0.0</Text>
        <Text className={styles.versionText}>© 2026 企业安全管理平台</Text>
      </View>
    </ScrollView>
  );
};

export default MinePage;
