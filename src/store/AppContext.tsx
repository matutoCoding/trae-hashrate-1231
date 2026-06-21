import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { UserProfile, Folder, Task, Record, Member, PermissionLevel, ActionType } from '@/types';
import { initialMembers, initialFolders } from '@/data/folders';
import { initialTasks } from '@/data/tasks';
import { initialRecords } from '@/data/records';
import { dayjs, generateId, getDaysUntilExpire } from '@/utils';

type TemplateType = 'external-revoke' | 'expire-retain' | 'inactive-down' | 'none';

interface AppContextType {
  user: UserProfile;
  folders: Folder[];
  tasks: Task[];
  records: Record[];
  allMembers: Member[];
  refreshKey: number;
  triggerRefresh: () => void;
  getFolderById: (id: string) => Folder | undefined;
  getTaskById: (id: string) => Task | undefined;
  getRecordById: (id: string) => Record | undefined;
  getMemberById: (id: string) => Member | undefined;
  handlePermissionAction: (payload: {
    taskId?: string;
    folderId: string;
    memberId: string;
    memberName: string;
    action: ActionType;
    reason: string;
    expireAt?: string;
    overridePermission?: PermissionLevel;
    templateUsed?: TemplateType;
    templateUsedText?: string;
  }) => void;
  addAuthorization: (payload: {
    folderId: string;
    memberIds: string[];
    permission: PermissionLevel;
    expireAt: string;
    notifyBeforeExpire: boolean;
  }) => void;
  batchPermissionAction: (payload: {
    folderId: string;
    memberIds: string[];
    memberNames: string[];
    action: ActionType;
    reason: string;
    expireAt?: string;
    overridePermission?: PermissionLevel;
    templateUsed?: TemplateType;
    templateUsedText?: string;
  }) => void;
  toggleTaskNotification: (taskId: string, enabled: boolean) => void;
  recordsFilter: RecordsFilterState;
  setRecordsFilter: (filter: RecordsFilterState) => void;
  folderDetailSelectedMemberId: string;
  setFolderDetailSelectedMemberId: (id: string) => void;
}

export interface RecordsFilterState {
  actionType: string;
  folderId: string;
  memberName: string;
}

const defaultUser: UserProfile = {
  id: 'u001',
  name: '林德华',
  avatar: 'https://picsum.photos/id/1005/200/200',
  department: '产品研发中心',
  role: '高级项目经理',
  phone: '138****6688',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const actionTextMap: Record<ActionType, string> = {
  retain: '保留权限',
  revoke: '收回权限',
  feedback: '反馈问题',
};

const recalcFolderStatus = (folder: Folder): Folder => {
  const members = folder.members || [];
  const needReviewCount = members.filter((m) => m.needReview).length;
  const externalCount = members.filter((m) => m.isExternal).length;
  const editCount = members.filter((m) => m.permission === 'edit').length;
  const expiringSoon = members.filter(
    (m) => m.expireAt && getDaysUntilExpire(m.expireAt) <= 3
  ).length;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  let statusText = '权限配置正常';
  if (needReviewCount >= 2 || expiringSoon >= 2) {
    status = 'danger';
    statusText = `${needReviewCount + expiringSoon}项权限待确认`;
  } else if (needReviewCount >= 1 || expiringSoon >= 1 || externalCount >= 2) {
    status = 'warning';
    statusText = needReviewCount > 0 ? `${needReviewCount}项权限待审核` : `${expiringSoon}项权限即将到期`;
  }

  return {
    ...folder,
    memberCount: members.length,
    externalCount,
    editCount,
    status,
    statusText,
  };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user] = useState<UserProfile>(defaultUser);
  const [allMembers] = useState<Member[]>(initialMembers);
  const [folders, setFolders] = useState<Folder[]>(() =>
    initialFolders.map((f) => recalcFolderStatus(f))
  );
  const [tasks, setTasks] = useState<Task[]>(initialTasks.map(t => ({
    ...t,
    notifyEnabled: t.notifyEnabled !== undefined ? t.notifyEnabled : (t.type === 'expire' ? true : undefined),
  })));
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recordsFilter, setRecordsFilter] = useState<RecordsFilterState>({
    actionType: 'all',
    folderId: '',
    memberName: '',
  });
  const [folderDetailSelectedMemberId, setFolderDetailSelectedMemberId] = useState<string>('');

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const getFolderById = useCallback(
    (id: string) => folders.find((f) => f.id === id),
    [folders]
  );
  const getTaskById = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks]
  );
  const getRecordById = useCallback(
    (id: string) => records.find((r) => r.id === id),
    [records]
  );
  const getMemberById = useCallback(
    (id: string) => {
      const fromAll = allMembers.find((m) => m.id === id);
      if (fromAll) return fromAll;
      for (const f of folders) {
        const found = f.members?.find((m) => m.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [allMembers, folders]
  );

  const handlePermissionAction = useCallback(
    ({
      taskId,
      folderId,
      memberId,
      memberName,
      action,
      reason,
      expireAt,
      overridePermission,
      templateUsed,
      templateUsedText,
    }: {
      taskId?: string;
      folderId: string;
      memberId: string;
      memberName: string;
      action: ActionType;
      reason: string;
      expireAt?: string;
      overridePermission?: PermissionLevel;
      templateUsed?: TemplateType;
      templateUsedText?: string;
    }) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.handled) return t;
          if (taskId && t.id === taskId) return { ...t, handled: true };
          if (t.folderId === folderId && t.memberId === memberId) return { ...t, handled: true };
          return t;
        })
      );

      setFolders((prev) =>
        prev.map((folder) => {
          if (folder.id !== folderId) return folder;
          const newMembers = (folder.members || []).map((m) => {
            if (m.id !== memberId) return m;
            if (action === 'retain') {
              return {
                ...m,
                needReview: false,
                expireAt: expireAt || m.expireAt,
                permission: overridePermission || m.permission,
              };
            }
            if (action === 'revoke') {
              return { ...m, needReview: false, permission: 'view' as PermissionLevel };
            }
            if (action === 'feedback') {
              return { ...m, needReview: false };
            }
            return m;
          }).filter((m) => !(action === 'revoke' && m.id === memberId && m.isExternal));

          return recalcFolderStatus({ ...folder, members: newMembers });
        })
      );

      const folder = folders.find((f) => f.id === folderId);
      const newRecord: Record = {
        id: 'r' + generateId(),
        action,
        actionText: templateUsed === 'inactive-down'
          ? '降为查看权限'
          : actionTextMap[action],
        folderId,
        folderName: folder?.name || '未知文件夹',
        memberName,
        operator: user.name,
        reason,
        expireAt: action === 'retain' ? expireAt : undefined,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: action === 'feedback' ? 'pending' : 'completed',
        statusText: action === 'feedback' ? '处理中' : '已生效',
        templateUsed,
        templateUsedText,
      };
      setRecords((prev) => [newRecord, ...prev]);

      triggerRefresh();
    },
    [folders, triggerRefresh, user.name]
  );

  const batchPermissionAction = useCallback(
    ({
      folderId,
      memberIds,
      memberNames,
      action,
      reason,
      expireAt,
      overridePermission,
      templateUsed,
      templateUsedText,
    }: {
      folderId: string;
      memberIds: string[];
      memberNames: string[];
      action: ActionType;
      reason: string;
      expireAt?: string;
      overridePermission?: PermissionLevel;
      templateUsed?: TemplateType;
      templateUsedText?: string;
    }) => {
      const midSet = new Set(memberIds);

      setTasks((prev) =>
        prev.map((t) => {
          if (t.handled) return t;
          if (t.folderId === folderId && midSet.has(t.memberId)) return { ...t, handled: true };
          return t;
        })
      );

      setFolders((prev) =>
        prev.map((folder) => {
          if (folder.id !== folderId) return folder;
          const newMembers = (folder.members || []).map((m) => {
            if (!midSet.has(m.id)) return m;
            if (action === 'retain') {
              return {
                ...m,
                needReview: false,
                expireAt: expireAt || m.expireAt,
                permission: overridePermission || m.permission,
              };
            }
            if (action === 'revoke') {
              return { ...m, needReview: false, permission: 'view' as PermissionLevel };
            }
            if (action === 'feedback') {
              return { ...m, needReview: false };
            }
            return m;
          }).filter((m) => !(action === 'revoke' && midSet.has(m.id) && m.isExternal));

          return recalcFolderStatus({ ...folder, members: newMembers });
        })
      );

      const folder = folders.find((f) => f.id === folderId);
      const newRecords: Record[] = memberIds.map((mid, idx) => ({
        id: 'r' + generateId() + idx,
        action,
        actionText: templateUsed === 'inactive-down'
          ? '降为查看权限'
          : actionTextMap[action],
        folderId,
        folderName: folder?.name || '未知文件夹',
        memberName: memberNames[idx] || '未知成员',
        operator: user.name,
        reason,
        expireAt: action === 'retain' ? expireAt : undefined,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: action === 'feedback' ? 'pending' as const : 'completed' as const,
        statusText: action === 'feedback' ? '处理中' : '已生效',
        templateUsed,
        templateUsedText,
      }));
      setRecords((prev) => [...newRecords, ...prev]);

      triggerRefresh();
    },
    [folders, triggerRefresh, user.name]
  );

  const toggleTaskNotification = useCallback(
    (taskId: string, enabled: boolean) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, notifyEnabled: enabled } : t))
      );
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const addAuthorization = useCallback(
    ({
      folderId,
      memberIds,
      permission,
      expireAt,
      notifyBeforeExpire,
    }: {
      folderId: string;
      memberIds: string[];
      permission: PermissionLevel;
      expireAt: string;
      notifyBeforeExpire: boolean;
    }) => {
      const sourceMembers = initialMembers;
      const resolvedMembers: Member[] = memberIds
        .map((mid) => sourceMembers.find((m) => m.id === mid))
        .filter(Boolean)
        .map((m) => ({
          ...(m as Member),
          permission,
          expireAt,
          needReview: false,
          lastAccess: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        })) as Member[];

      setFolders((prev) =>
        prev.map((folder) => {
          if (folder.id !== folderId) return folder;
          const existingMap = new Map((folder.members || []).map((m) => [m.id, m]));
          const newMembers = (folder.members || []).map((m) => {
            const updated = resolvedMembers.find((r) => r.id === m.id);
            if (updated) {
              return { ...m, permission: updated.permission, expireAt: updated.expireAt };
            }
            return m;
          });
          const toAdd = resolvedMembers.filter((m) => !existingMap.has(m.id));
          return recalcFolderStatus({ ...folder, members: [...newMembers, ...toAdd] });
        })
      );

      if (notifyBeforeExpire) {
        const folder = folders.find((f) => f.id === folderId);
        const newTasks: Task[] = resolvedMembers.map((m, idx) => ({
          id: 't' + generateId() + idx,
          type: 'expire',
          typeText: '即将到期',
          folderId,
          folderName: folder?.name || '未知文件夹',
          memberId: m.id,
          memberName: m.name,
          memberAvatar: m.avatar,
          description: `${m.name} 的临时授权将于 ${expireAt} 到期，请确认是否续期`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          priority: 'medium',
          handled: false,
          expireAt,
          notifyEnabled: true,
        }));
        setTasks((prev) => [...newTasks, ...prev]);
      }

      const folder = folders.find((f) => f.id === folderId);
      const newRecords: Record[] = resolvedMembers.map((m, idx) => {
        const existingInFolder = folder?.members?.find((f) => f.id === m.id);
        const isUpdate = !!existingInFolder;
        return {
          id: 'r' + generateId() + idx,
          action: 'retain' as ActionType,
          actionText: isUpdate ? '调整授权' : '临时授权',
          folderId,
          folderName: folder?.name || '未知文件夹',
          memberName: m.name,
          operator: user.name,
          reason: isUpdate
            ? `调整${permission === 'edit' ? '编辑' : '查看'}授权，有效期至 ${expireAt}${notifyBeforeExpire ? '，已开启到期提醒' : ''}`
            : `新增临时${permission === 'edit' ? '编辑' : '查看'}授权${notifyBeforeExpire ? '，已开启到期提醒' : ''}`,
          expireAt,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'completed' as const,
          statusText: '已生效',
          templateUsed: 'none',
          templateUsedText: '手动配置',
        };
      });
      setRecords((prev) => [...newRecords, ...prev]);

      triggerRefresh();
    },
    [folders, triggerRefresh, user.name]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        allMembers,
        folders,
        tasks,
        records,
        refreshKey,
        triggerRefresh,
        getFolderById,
        getTaskById,
        getRecordById,
        getMemberById,
        handlePermissionAction,
        addAuthorization,
        batchPermissionAction,
        toggleTaskNotification,
        recordsFilter,
        setRecordsFilter,
        folderDetailSelectedMemberId,
        setFolderDetailSelectedMemberId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
