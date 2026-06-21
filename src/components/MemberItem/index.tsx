import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import { Member } from '@/types';
import { formatRelativeTime, getPermissionText, getPermissionColor } from '@/utils';
import styles from './index.module.scss';

interface MemberItemProps {
  member: Member;
  showAction?: boolean;
  onAction?: (member: Member) => void;
  actionText?: string;
}

const MemberItem: React.FC<MemberItemProps> = ({
  member,
  showAction = false,
  onAction,
  actionText = '处理',
}) => {
  const permColor = getPermissionColor(member.permission);

  return (
    <View className={classnames(styles.item, member.needReview && styles.needReview)}>
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

      {showAction && (
        <View
          className={styles.actionBtn}
          onClick={() => onAction && onAction(member)}
        >
          <Text className={styles.actionText}>{actionText}</Text>
        </View>
      )}
    </View>
  );
};

export default MemberItem;
