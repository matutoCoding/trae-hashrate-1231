import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { UserProfile, Folder, Task, Record, Member, PermissionLevel, ActionType } from '@/types';
import { initialMembers, initialFolders } from '@/data/folders';
import { initialTasks } from '@/data/tasks';
import { initialRecords } from '@/data/records';
import { dayjs, generateId } from '@/utils';

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
  }) => void;
  addAuthorization: (payload: {
    folderId: string;
    memberIds: string[];
    permission: PermissionLevel;
    expireAt: string;
    notifyBeforeExpire: boolean;
  }) => void;
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
    (m) => m.expireAt && dayjs(m.expireAt).diff(dayjs(), 'day') <= 3
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
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [refreshKey, setRefreshKey] = useState(0);

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
    }: {
      taskId?: string;
      folderId: string;
      memberId: string;
      memberName: string;
      action: ActionType;
      reason: string;
      expireAt?: string;
    }) => {
      if (taskId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, handled: true } : t))
        );
      }

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
        actionText: actionTextMap[action],
        folderId,
        folderName: folder?.name || '未知文件夹',
        memberName,
        operator: user.name,
        reason,
        expireAt: action === 'retain' ? expireAt : undefined,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: action === 'feedback' ? 'pending' : 'completed',
        statusText: action === 'feedback' ? '处理中' : '已生效',
      };
      setRecords((prev) => [newRecord, ...prev]);

      triggerRefresh();
    },
    [folders, triggerRefresh, user.name]
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
      const allMembers = initialMembers;
      const addedMembers: Member[] = memberIds
        .map((mid) => allMembers.find((m) => m.id === mid))
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
          const existIds = new Set((folder.members || []).map((m) => m.id));
          const toAdd = addedMembers.filter((m) => !existIds.has(m.id));
          const newMembers = [...(folder.members || []), ...toAdd];
          return recalcFolderStatus({ ...folder, members: newMembers });
        })
      );

      if (notifyBeforeExpire) {
        const folder = folders.find((f) => f.id === folderId);
        const daysUntil = dayjs(expireAt).diff(dayjs(), 'day');
        const newTasks: Task[] = addedMembers.map((m, idx) => ({
          id: 't' + generateId() + idx,
          type: daysUntil <= 3 ? 'expire' : 'review',
          typeText: daysUntil <= 3 ? '即将到期' : '权限审核',
          folderId,
          folderName: folder?.name || '未知文件夹',
          memberId: m.id,
          memberName: m.name,
          memberAvatar: m.avatar,
          description: `${m.name} 的临时授权将于 ${expireAt} 到期，请确认是否续期`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
          handled: false,
          expireAt,
        }));
        setTasks((prev) => [...newTasks, ...prev]);
      }

      const folder = folders.find((f) => f.id === folderId);
      const newRecords: Record[] = addedMembers.map((m, idx) => ({
        id: 'r' + generateId() + idx,
        action: 'retain' as ActionType,
        actionText: '临时授权',
        folderId,
        folderName: folder?.name || '未知文件夹',
        memberName: m.name,
        operator: user.name,
        reason: `新增临时${permission === 'edit' ? '编辑' : '查看'}授权${notifyBeforeExpire ? '，已开启到期提醒' : ''}`,
        expireAt,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: 'completed',
        statusText: '已生效',
      }));
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
