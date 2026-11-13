// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LessonListItem from './LessonListItem';

describe('LessonListItem Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('يعرض عنوان المسألة ورقم الصفحة بنجاح', () => {
    render(
      <LessonListItem
        title="المسألة الأولى: في أحكام الطهارة"
        pageNumber="15"
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('المسألة الأولى: في أحكام الطهارة')).toBeTruthy();
    expect(screen.getByText('ص 15')).toBeTruthy();
  });

  it('يستدعي onClick عند النقر على المسألة', () => {
    const handleClick = vi.fn();
    render(
      <LessonListItem
        title="المسألة الثانية"
        onClick={handleClick}
      />
    );

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('يعرض شارات الوسائط والملاحظات عند تفعيلها', () => {
    render(
      <LessonListItem
        title="مسألة بشارات"
        hasVideo
        hasAudio
        hasAdminNote
        hasBookmark
        hasNotes
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTitle('يحتوي على شرح مرئي (فيديو)')).toBeTruthy();
    expect(screen.getByTitle('يحتوي على تسجيل صوتي')).toBeTruthy();
    expect(screen.getByTitle('تحتوي على ملحوظة هامة')).toBeTruthy();
    expect(screen.getByTitle('محفوظة في المفضلة')).toBeTruthy();
    expect(screen.getByTitle('لديك ملاحظة مدونة عليها')).toBeTruthy();
  });

  it('يعرض نمط الفهرس المدمج (variant=toc)', () => {
    render(
      <LessonListItem
        title="مسألة في الفهرس"
        pageNumber="22"
        variant="toc"
        isRead
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('مسألة في الفهرس')).toBeTruthy();
    expect(screen.getByText('ص 22')).toBeTruthy();
  });
});
