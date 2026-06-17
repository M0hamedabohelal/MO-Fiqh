import React from 'react';

const Breadcrumb = ({ book, chapter }) => {
  return (
    <nav className="text-center text-muted small mt-2 fw-bold">
      {book} <span className="mx-2">&gt;</span> {chapter}
    </nav>
  );
};

export default Breadcrumb;