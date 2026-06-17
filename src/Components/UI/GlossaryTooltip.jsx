import React, { useState, useRef } from 'react';
import { glossaryData } from '../../data/glossary';

const GlossaryTooltip = ({ children }) => {
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseOver = (e) => {
    const target = e.target;
    if (target.classList.contains('glossary-term')) {
      const term = target.getAttribute('data-term');
      const definition = glossaryData[term];
      if (definition) {
        const rect = target.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setTooltip({
          show: true,
          text: definition,
          term: term,
          x: rect.right - containerRect.right + (rect.width / 2),
          y: rect.top - containerRect.top - 10
        });
      }
    }
  };

  const handleMouseOut = (e) => {
    if (e.target.classList.contains('glossary-term')) {
      setTooltip({ ...tooltip, show: false });
    }
  };

  return (
    <div ref={containerRef} className="position-relative" onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
      {children}
      {tooltip.show && (
        <div 
          className="glossary-tooltip-popup"
          style={{
            position: 'absolute',
            top: tooltip.y,
            right: '50%',
            transform: 'translate(50%, -100%)',
            zIndex: 1000,
          }}
        >
          <div className="glossary-tooltip-content">
            <strong className="d-block mb-1" style={{ color: 'var(--accent-color)', fontSize: '0.95rem' }}>
              📖 {tooltip.term}
            </strong>
            <span style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              {tooltip.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlossaryTooltip;
