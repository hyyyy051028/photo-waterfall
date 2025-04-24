import React from 'react';
import { useNavigate } from 'react-router-dom';
import Carousel from '../components/Carousel';
import './Home.css';

// 导入轮播图图片
import carousel1 from '../../imags/轮播1.jpg';
import carousel2 from '../../imags/轮播2.jpg';
import carousel3 from '../../imags/轮播3.jpg';
import carousel4 from '../../imags/轮播4.jpg';
import carousel5 from '../../imags/轮播5.jpg';

function Home() {
  const navigate = useNavigate();
  
  const carouselImages = [
    carousel1,
    carousel2,
    carousel3,
    carousel4,
    carousel5
  ];

  return (
    <div className="home-page">
      <div className="home-main">
        <div className="home-content">
          <div className="content-wrapper">
            <h1>山茶花开</h1>
            <h2>沉鱼落雁鸟惊喧，羞花闭月花愁颤</h2>
            <div className="home-actions">
              <button 
                className="home-button primary"
                onClick={() => navigate('/upload')}
              >
                上传美丽
              </button>
              <button 
                className="home-button secondary"
                onClick={() => navigate('/gallery')}
              >
                一睹盛颜
              </button>
            </div>
          </div>
        </div>
        
        <div className="carousel-container">
          <Carousel images={carouselImages} />
        </div>
      </div>
    </div>
  );
}

export default Home;
