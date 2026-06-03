import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import {
  keywordsApi,
  notificationsApi,
  triggerHotspotCheck,
  type Keyword,
  type Notification
} from '../services/api';
import { onNewHotspot, onNotification, subscribeToKeywords } from '../services/socket';
import type { ToastType } from '../hooks/useToast';

export interface AppContextValue {
  keywords: Keyword[];
  setKeywords: React.Dispatch<React.SetStateAction<Keyword[]>>;
  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  isChecking: boolean;
  showNotifications: boolean;
  setShowNotifications: (open: boolean) => void;
  detailHotspotId: string | null;
  setDetailHotspotId: (id: string | null) => void;
  showToast: (message: string, type?: ToastType) => void;
  refreshKeywords: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  handleManualCheck: () => Promise<void>;
  handleNotificationClick: (n: Notification) => Promise<void>;
  handleDeleteNotification: (e: React.MouseEvent, id: string) => Promise<void>;
  handleMarkAllRead: () => Promise<void>;
  handleAddKeyword: (text: string, category?: string) => Promise<void>;
  handleDeleteKeyword: (id: string) => Promise<void>;
  handleToggleKeyword: (id: string) => Promise<void>;
  hotspotRefreshToken: number;
  bumpHotspotRefresh: () => void;
  handleUpdateKeyword: (
    id: string,
    data: { text: string; category?: string }
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  showToast
}: {
  children: ReactNode;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [detailHotspotId, setDetailHotspotId] = useState<string | null>(null);
  const [hotspotRefreshToken, setHotspotRefreshToken] = useState(0);

  const refreshKeywords = useCallback(async () => {
    const data = await keywordsApi.getAll();
    setKeywords(data);
    const active = data.filter((k) => k.isActive).map((k) => k.text);
    if (active.length > 0) subscribeToKeywords(active);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const notifData = await notificationsApi.getAll({ limit: 20 });
    setNotifications(notifData.data);
    setUnreadCount(notifData.unreadCount);
  }, []);

  useEffect(() => {
    refreshKeywords().catch(() => showToast('加载关键词失败', 'error'));
    refreshNotifications().catch(() => {});
  }, [refreshKeywords, refreshNotifications, showToast]);

  useEffect(() => {
    const unsubHotspot = onNewHotspot((hotspot) => {
      showToast('发现新热点: ' + hotspot.title.slice(0, 30), 'success');
      setHotspotRefreshToken((t) => t + 1);
      refreshNotifications();
    });
    const unsubNotif = onNotification(() => {
      setUnreadCount((c) => c + 1);
      refreshNotifications();
    });
    return () => {
      unsubHotspot();
      unsubNotif();
    };
  }, [showToast, refreshNotifications]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const result = await triggerHotspotCheck();
      showToast(
        `扫描完成：新增 ${result.newHotspotsCount} 条（${result.keywordsChecked} 个监控词）`,
        'success'
      );
      setHotspotRefreshToken((t) => t + 1);
      refreshNotifications();
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      const msg = err instanceof Error ? err.message : '触发失败';
      showToast(
        err.code === 'SCAN_IN_PROGRESS' || msg.includes('progress') ? '扫描正在进行中' : msg,
        'error'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationsApi.markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.hotspotId) {
      setShowNotifications(false);
      setDetailHotspotId(n.hotspotId);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      console.error('Failed to mark all as read');
    }
  };

  const handleAddKeyword = async (text: string, category?: string) => {
    const keyword = await keywordsApi.create({
      text: text.trim(),
      ...(category ? { category } : {})
    });
    setKeywords((prev) => [keyword, ...prev]);
    showToast('关键词添加成功', 'success');
    subscribeToKeywords([keyword.text]);
  };

  const handleDeleteKeyword = async (id: string) => {
    await keywordsApi.delete(id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    showToast('关键词已删除', 'success');
  };

  const bumpHotspotRefresh = () => setHotspotRefreshToken((t) => t + 1);

  const handleUpdateKeyword = async (
    id: string,
    data: { text: string; category?: string }
  ) => {
    const updated = await keywordsApi.update(id, data);
    setKeywords((prev) => prev.map((k) => (k.id === id ? updated : k)));
    showToast('关键词已更新', 'success');
    await refreshKeywords();
  };

  const handleToggleKeyword = async (id: string) => {
    const updated = await keywordsApi.toggle(id);
    setKeywords((prev) => prev.map((k) => (k.id === id ? updated : k)));
    const active = (
      await keywordsApi.getAll()
    )
      .filter((k) => k.isActive)
      .map((k) => k.text);
    if (active.length > 0) subscribeToKeywords(active);
  };

  const value: AppContextValue = {
    keywords,
    setKeywords,
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    isChecking,
    showNotifications,
    setShowNotifications,
    detailHotspotId,
    setDetailHotspotId,
    showToast,
    refreshKeywords,
    refreshNotifications,
    handleManualCheck,
    handleNotificationClick,
    handleDeleteNotification,
    handleMarkAllRead,
    handleAddKeyword,
    handleDeleteKeyword,
    handleToggleKeyword,
    handleUpdateKeyword,
    hotspotRefreshToken,
    bumpHotspotRefresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
