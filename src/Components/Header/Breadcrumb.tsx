
interface BreadcrumbProps {
  book: string;
  chapter: string;
}

const Breadcrumb = ({ book, chapter }: BreadcrumbProps) => {
  return (
    <nav aria-label="مسار التصفح" className="text-center text-muted small mt-2 fw-bold">
      <ol className="list-unstyled d-inline-flex align-items-center gap-2 mb-0">
        <li>{book}</li>
        <li aria-hidden="true"><span className="mx-1">&gt;</span></li>
        <li aria-current="page">{chapter}</li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;
