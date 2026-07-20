export type TickTickMainResponse = {
  inboxId: string;
  syncTaskBean: {
    update: TickTickTask[];
  };
  filters: TickTickFilter[] | null;
};

export type TickTickFilter = {
  id: string;
  name: string;
  rule: string; // this is a stringified JSON object
  sortOrder: number;
  sortType: string;
  viewMode: string | null;
  timeline: {
    range: string | null;
    sortType: string;
    sortOption: {
      groupBy: string;
      orderBy: string;
    };
  };
  etag: string;
  createdTime: string; // ISO date string
  modifiedTime: string; // ISO date string
  sortOption: {
    groupBy: string;
    orderBy: string;
  };
};

export type TickTickReminder = {
  id: string;
  trigger: string;
};

export type TickTickTask = {
  id: string;
  projectId: string;
  sortOrder: number;
  title: string;
  content: string;
  timeZone: string;
  reminders: TickTickReminder[];
  tags: string[];
  startDate?: string;
  dueDate?: string;
  createdTime: string;
  creator: number;
  status?: number;
  deleted?: number;
  // desc: string;
  // isFloating: boolean;
  isAllDay: boolean;
  // reminder: string;
  // repeatFirstDate: string;
  // repeatFlag: string;
  // exDate: string[];
  // repeatTaskId: string;
  // priority: number;
  // // TODO: refine this type
  // items: any[]; // You can refine this if you know the structure
  // progress: number;
  // modifiedTime: string;
  // etag: string;
  // deleted: number;
  // repeatFrom: string;
  // attachments: any[]; // You can refine this too
  // commentCount: number;
  // focusSummaries: any[]; // Same here
  // columnId: string;
  // kind: string;
  // imgMode: number;
};

// Types
export type LoginResponse = {
  token: string;
};

export type ErrorLoginResponse = {
  errorId: string;
  errorCode: string;
  errorMessage: string;
  data: {
    remainderTimes: number;
  };
};

export type TickTickProject = {
  id: string;
  name: string;
  // isOwner: boolean;
  // color: string;
  // sortOrder: number;
  // sortOption: {
  // 	groupBy: string;
  // 	orderBy: string;
  // };
  // sortType: string;
  // userCount: number;
  // etag: string;
  // modifiedTime: string;
  // inAll: boolean;
  // showType: number;
  // muted: boolean;
  // reminderType: number;
  // closed: boolean | null;
  // transferred: boolean | null;
  // groupId: string | null;
  // viewMode: string;
  // notificationOptions: any[]; // You can replace `any` with a more specific type if known
  // teamId: string | null;
  // permission: any | null; // You can refine this too
  // kind: string;
  // timeline: {
  // 	range: any | null; // Again, refine if needed
  // 	sortType: string;
  // 	sortOption: {
  // 		groupBy: string;
  // 		orderBy: string;
  // 	};
  // };
  // needAudit: boolean;
  // barcodeNeedAudit: boolean;
  // openToTeam: boolean | null;
  // teamMemberPermission: any | null; // Refine if details are available
  // source: number;
};

export type DeleteTaskParams = {
  taskId: string;
  projectId: string;
};

export type UpdateTaskParams = {
  title: string;
  id?: string;
  projectId?: string;
  tags?: string[];
  reminders?: TickTickReminder[];
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  isAllDay?: boolean;
  completedTime?: string;
  completedUserId?: number;
  creator?: number;
};

export enum Action {
  Add = 'add',
  Update = 'update',
  Delete = 'delete',
}

export type HandleTasksBody = {
  add: UpdateTaskParams[];
  update: UpdateTaskParams[];
  delete: DeleteTaskParams[];
};

export type TaskOperationResponse = {
  id2etag: Record<string, string>;
  id2error: Record<string, string>;
};

export type TickTickFilterRule = {
  type: number;
  and: Condition[];
  version: number;
};

export type Condition = {
  conditionType: number;
  not: (string | OrCondition)[];
  conditionName: string;
};

export type OrCondition = {
  or: string[];
  conditionName: string;
};
