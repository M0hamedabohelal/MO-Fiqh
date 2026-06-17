import React from 'react';
import Button from '../UI/Button';
import { FiArrowRight, FiArrowLeft } from 'react-icons/fi';

const Pagination = () => {
  return (
    <div className="d-flex justify-content-between align-items-center mt-5 pb-5">
      <Button variant="primary" className="d-flex align-items-center">
        <FiArrowRight className="ms-2" /> المسألة السابقة
      </Button>
      
      <Button variant="primary" className="d-flex align-items-center">
        المسألة التالية <FiArrowLeft className="me-2" />
      </Button>
    </div>
  );
};

export default Pagination;