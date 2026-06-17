import React from 'react';
import { FiBook, FiList, FiFileText, FiSearch, FiSettings, FiBookmark, FiEdit3 } from 'react-icons/fi';
import logo from '../../assets/logo.png';
import './Slider.css';

const Slider = ({ activeView, setActiveView, onOpenSearch }) => {
  
  return (
    <div className="sidebar-wrapper">
      
      <div className="sidebar-logo-section">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveView('hero'); }}
          className="sidebar-logo-link"
          title="الرجوع للصفحة الرئيسية"
        >
          <img
            src={logo}
            alt="شعار الباحث الفقهي"
            className="sidebar-logo-img"
          />
        </a>
        <span className="sidebar-tagline">دراسة وتدبر</span>
      </div>

      <ul className="sidebar-nav">
        <li className="sidebar-nav-item">
          <button 
            className={`sidebar-btn ${activeView === 'books' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('books')}
          >
            <FiBook className="sidebar-btn-icon" size={22} /> الكتب
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button 
            className={`sidebar-btn ${activeView === 'chapters' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('chapters')}
          >
            <FiList className="sidebar-btn-icon" size={22} /> الفصول
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button 
            className={`sidebar-btn ${activeView === 'lessons' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('lessons')}
          >
            <FiFileText className="sidebar-btn-icon" size={22} /> المسائل
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button 
            className={`sidebar-btn ${activeView === 'bookmarks' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('bookmarks')}
          >
            <FiBookmark className="sidebar-btn-icon" size={22} /> المفضلة
          </button>
        </li>
        <li className="sidebar-nav-item">
          <button 
            className={`sidebar-btn ${activeView === 'highlights' ? 'sidebar-btn-active' : ''}`}
            onClick={() => setActiveView('highlights')}
          >
            <FiEdit3 className="sidebar-btn-icon" size={22} /> الفوائد المقتبسة
          </button>
        </li>
      </ul>

      <div className="sidebar-footer">
        <button 
          className="sidebar-search-btn" 
          onClick={onOpenSearch}
        >
          <FiSearch size={20} /> بحث شامل
        </button>
        
        <ul className="sidebar-secondary-nav">
          <li className="sidebar-nav-item">
            <button 
              className={`sidebar-settings-btn ${activeView === 'settings' ? 'sidebar-settings-active' : ''}`}
              onClick={() => setActiveView('settings')}
            >
              <FiSettings className="sidebar-btn-icon" size={22} /> الإعدادات
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Slider;