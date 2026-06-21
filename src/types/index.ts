export type PermissionStatus = 'safe' | 'warning' | 'danger';

export type PermissionLevel = 'view' | 'edit';

export type ActionType = 'retain' | 'revoke' | 'feedback';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  department: string;
  permission: PermissionLevel;
  lastAccess: string;
  isExternal: boolean;
  externalCompany?: string;
  expireAt?: string;
  needReview?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  externalCount: number;
  editCount: number;
  lastUpdate: string;
  status: PermissionStatus;
  statusText: string;
  members?: Member[];
}

export interface Task {
  id: string;
  type: 'review' | 'expire' | 'abnormal';
  typeText: string;
  folderId: string;
  folderName: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  description: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  handled: boolean;
  expireAt?: string;
}

export interface Record {
  id: string;
  action: ActionType;
  actionText: string;
  folderId: string;
  folderName: string;
  memberName: string;
  operator: string;
  reason?: string;
  expireAt?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'rejected';
  statusText: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  phone: string;
}
