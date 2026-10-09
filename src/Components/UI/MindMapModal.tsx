import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronRight } from 'react-icons/fi';
import type { BookStats, ChapterGroup } from '../../types';

interface MindMapModalProps {
  open: boolean;
  onClose: () => void;
  books: BookStats[];
  chapters: ChapterGroup[];
  onSelectLesson: (lessonId: string | number) => void;
}

interface Path {
  bookName?: string;
  chapterName?: string;
}

const W = 600;
const H = 560;
const CX = 300;
const CY = 272;

const short = (s: string, n = 16): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function ringPositions(n: number, r: number): Array<{ x: number; y: number }> {
  if (n === 0) return [];
  if (n === 1) return [{ x: CX, y: CY - r }];
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  });
}

// خريطة ذهنية تفاعلية: كتب ← أبواب ← مسائل — SVG خالص بلا مكتبات، والتنقل بالضغط للداخل
const MindMapModal = ({ open, onClose, books, chapters, onSelectLesson }: MindMapModalProps) => {
  const [path, setPath] = useState<Path>({});

  if (!open) return null;

  const level = !path.bookName ? 0 : !path.chapterName ? 1 : 2;
  const bookChapters = path.bookName ? chapters.filter((c) => c.bookName === path.bookName) : [];
  const chapterIssues = path.bookName && path.chapterName
    ? bookChapters.find((c) => c.chapterName === path.chapterName)?.issues || []
    : [];

  const title = level === 0 ? 'خريطة الفقه' : level === 1 ? path.bookName || '' : path.chapterName || '';
  const subtitle = level === 0
    ? `${books.length} كتب`
    : level === 1
      ? `${bookChapters.length} أبواب`
      : `${chapterIssues.length} مسائل`;

  type Node = { key: string; label: string; sub: string; done: boolean; partial: boolean };
  let nodes: Node[] = [];
  let onNode: (key: string) => void = () => {};
  if (level === 0) {
    nodes = books.map((b) => ({
      key: b.bookName,
      label: b.bookName,
      sub: b.issuesCount > 0 ? `${b.readCount}/${b.issuesCount}` : 'قريبًا',
      done: b.issuesCount > 0 && b.readCount >= b.issuesCount,
      partial: b.readCount > 0,
    }));
    onNode = (key) => setPath({ bookName: key });
  } else if (level === 1) {
    nodes = bookChapters.map((c) => {
      const read = c.issues.filter((i) => i.isRead).length;
      return {
        key: c.chapterName,
        label: c.chapterName,
        sub: `${read}/${c.issues.length}`,
        done: c.issues.length > 0 && read >= c.issues.length,
        partial: read > 0,
      };
    });
    onNode = (key) => setPath({ bookName: path.bookName, chapterName: key });
  } else {
    nodes = chapterIssues.map((l) => ({
      key: String(l.id),
      label: l.title,
      sub: l.isRead ? 'مقروءة' : '',
      done: l.isRead,
      partial: false,
    }));
    onNode = (key) => {
      onSelectLesson(key);
      onClose();
    };
  }

  const radius = Math.min(228, Math.max(132, nodes.length * 26));
  const positions = ringPositions(nodes.length, radius);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
        style={{ zIndex: 1050, background: 'rgba(0,0,0,0.6)', padding: '16px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          className="w-100 custom-card p-3 shadow"
          style={{ maxWidth: '640px', maxHeight: '92dvh', overflowY: 'auto', borderRadius: '18px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex justify-content-between align-items-center mb-1">
            <div className="d-flex align-items-center gap-2">
              {level > 0 && (
                <button
                  className="btn btn-sm d-flex align-items-center"
                  style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '10px' }}
                  onClick={() => setPath(level === 2 ? { bookName: path.bookName } : {})}
                  title="رجوع"
                >
                  <FiChevronRight size={16} /> رجوع
                </button>
              )}
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>{title}</h5>
            </div>
            <button className="btn btn-sm p-1" onClick={onClose} aria-label="إغلاق الخريطة">
              <FiX size={20} />
            </button>
          </div>
          <p className="text-muted small mb-2">{subtitle} — اضغط أي عقدة للتنقل للداخل</p>

          {nodes.length === 0 ? (
            <p className="text-muted text-center py-4">لا محتوى بعد في هذا المستوى.</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={title}>
              {/* العقدة الأم */}
              <circle cx={CX} cy={CY} r={44} fill="var(--primary-color)" opacity={0.92} />
              <text x={CX} y={CY - 2} textAnchor="middle" fontSize={15} fontWeight="bold" fill="var(--text-on-primary)">
                {short(title, 12)}
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle" fontSize={11} fill="var(--text-on-primary)" opacity={0.85}>
                {subtitle}
              </text>
              {positions.map((p, i) => {
                const n = nodes[i];
                const color = n.done ? '#27ae60' : n.partial ? 'var(--accent-color)' : 'var(--border-color)';
                return (
                  <g key={n.key} onClick={() => onNode(n.key)} style={{ cursor: 'pointer' }}>
                    <title>{n.label}</title>
                    <line x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={color} strokeWidth={2} opacity={0.55} />
                    <circle cx={p.x} cy={p.y} r={level === 2 ? 17 : 24} fill="var(--card-bg)" stroke={color} strokeWidth={2.5} />
                    {n.done && <circle cx={p.x} cy={p.y} r={5} fill="#27ae60" />}
                    <text x={p.x} y={p.y + (level === 2 ? 34 : 40)} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--text-main)">
                      {short(n.label, level === 2 ? 14 : 12)}
                    </text>
                    {n.sub !== '' && (
                      <text x={p.x} y={p.y + (level === 2 ? 48 : 55)} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)">
                        {n.sub}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MindMapModal;
