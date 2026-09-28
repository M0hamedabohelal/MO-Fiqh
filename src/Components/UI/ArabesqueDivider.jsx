const ArabesqueDivider = ({ color = 'var(--accent-color)', style = {} }) => {
  return (
    <div className="text-center my-4 opacity-75" style={{ ...style, pointerEvents: 'none' }}>
      <svg width="150" height="24" viewBox="0 0 150 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M75 0C80 8 95 11 110 11.5L150 12L110 12.5C95 13 80 16 75 24C70 16 55 13 40 12.5L0 12L40 11.5C55 11 70 8 75 0Z" fill={color}/>
        <circle cx="75" cy="12" r="4" fill="var(--bg-color)" stroke={color} strokeWidth="1.5"/>
        <circle cx="20" cy="12" r="1.5" fill={color}/>
        <circle cx="130" cy="12" r="1.5" fill={color}/>
      </svg>
    </div>
  );
};

export default ArabesqueDivider;
