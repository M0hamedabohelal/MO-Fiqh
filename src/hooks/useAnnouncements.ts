import { useState, useEffect, useCallback } from 'react';
import { fetchAnnouncements } from '../firebase/services';
import { isFirebaseConfigured } from '../firebase/config';
import type { AnnouncementItem } from '../types';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
      let readIds = [];
      try {
        readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
      } catch {
        readIds = [];
      }
      setUnreadCount(data.filter(a => !readIds.includes(a.id)).length);
    } catch {
      // تجاهل أخطاء الجلب — التنبيهات ليست حرجة
    }
  }, []);

  useEffect(() => {
    // جلب أولي عند التحميل — مقصود (لا بديل تفاعلي له)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const markAsRead = () => {
    const allIds = announcements.map(a => a.id);
    localStorage.setItem('readAnnouncements', JSON.stringify(allIds));
    setUnreadCount(0);
  };

  return { announcements, unreadCount, markAsRead, refresh: load };
}
