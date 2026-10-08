
interface BreadcrumbProps {
  book: string;
  chapter: string;
}

const Breadcrumb = ({ book, chapter }: BreadcrumbProps) => {
  return (
    <nav className="text-center text-muted small mt-2 fw-bold">
      {book} <span className="mx-2">&gt;</span> {chapter}
    </nav>
  );
};

export default Breadcrumb;
