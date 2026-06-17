import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = {
    backgroundColor: variant === 'primary' ? 'var(--primary-color)' : 'transparent',
    color: variant === 'primary' ? 'white' : 'var(--text-main)',
    border: variant === 'outline' ? '1px solid var(--primary-color)' : 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    transition: 'all 0.3s ease'
  };

  return (
    <button onClick={onClick} style={baseStyle} className={className} {...props}>
      {children}
    </button>
  );
};

export default Button;