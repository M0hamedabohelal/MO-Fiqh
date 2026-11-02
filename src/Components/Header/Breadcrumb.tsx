interface BreadcrumbProps {
  book: string;
  chapter: string;
}

const Breadcrumb = ({ book, chapter }: BreadcrumbProps) => {
  return (
    <nav aria-label="مسار التصفح" className="text-center text-muted small mt-1 mt-md-2 mb-1 fw-bold reading-breadcrumb">
      <ol className="list-unstyled d-inline-flex flex-wrap justify-content-center align-items-center gap-1 gap-md-2 mb-0 px-2">
        <li className="text-truncate" style={{ maxWidth: '42vw' }}>{book}</li>
        <li aria-hidden="true" className="opacity-50"><span className="mx-1">&gt;</span></li>
        <li aria-current="page" className="text-truncate" style={{ maxWidth: '48vw' }}>{chapter}</li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;
