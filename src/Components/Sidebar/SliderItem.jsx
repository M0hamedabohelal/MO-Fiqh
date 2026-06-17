import React from 'react';

const SliderItem = ({ title, icon, isActive }) => {
  return (
    <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
      {icon}
      <span>{title}</span>
    </div>
  );
};

export default SliderItem;