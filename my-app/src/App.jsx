import "./App.css"
import Navigation from "./components/Navigation"
import Gallery from "./components/Gallery"
import FeedbackForm from "./components/FeedbackForm"
import TimedPopup from "./components/TimedPopup"
import Countdown from "./components/Countdown"
import AnimatedSvg from "./components/AnimatedSvg"
import photo from "./images/full/photo.png"
import photo2 from "./images/full/photo2.png"
import photo3 from "./images/full/photo3.png"
import photo4 from "./images/full/photo4.png"
import photo5 from "./images/full/photo5.png"
import photo6 from "./images/full/photo6.png"
import photo7 from "./images/full/photo7.png"
import photo8 from "./images/full/photo8.png"
import photoThumb from "./images/thumbs/photo-thumb.png"
import photoThumb2 from "./images/thumbs/photo2-thumb.png"
import photoThumb3 from "./images/thumbs/photo3-thumb.png"
import photoThumb4 from "./images/thumbs/photo4-thumb.png"
import photoThumb5 from "./images/thumbs/photo5-thumb.png"
import photoThumb6 from "./images/thumbs/photo6-thumb.png"
import photoThumb7 from "./images/thumbs/photo7-thumb.png"
import photoThumb8 from "./images/thumbs/photo8-thumb.png"

function App() {
  const images = [
    { id: 1, src: photo, thumbSrc: photoThumb, alt: "Фото 1" },
    { id: 2, src: photo2, thumbSrc: photoThumb2, alt: "Фото 2" },
    { id: 3, src: photo3, thumbSrc: photoThumb3, alt: "Фото 3" },
    { id: 4, src: photo4, thumbSrc: photoThumb4, alt: "Фото 4" },
    { id: 5, src: photo5, thumbSrc: photoThumb5, alt: "Фото 5" },
    { id: 6, src: photo6, thumbSrc: photoThumb6, alt: "Фото 6" },
    { id: 7, src: photo7, thumbSrc: photoThumb7, alt: "Фото 7" },
    { id: 8, src: photo8, thumbSrc: photoThumb8, alt: "Фото 8" }
  ]

  return (
    <div className="app">
      <Navigation />

      {/* Секция героя */}
      <section id="home" className="hero">
        <div className="container">
          <h1>Добро пожаловать на наш сайт</h1>
          <p>Исследуйте наши интерактивные функции и красивую галерею</p>
        </div>
      </section>

      {/* Секция галереи */}
      <section id="gallery" className="section">
        <div className="container">
          <h2>Фотогалерея</h2>
          <Gallery images={images} />
        </div>
      </section>
      {/* Обратный отсчёт до экзамена */}
      <Countdown targetDate="2025-07-15T09:00:00" />


      {/* Секция контактов */}
      <section id="contacts" className="section bg-light">
        <div className="container">
          <h2>Свяжитесь с нами</h2>
          <div className="form-container">
            <FeedbackForm />
          </div>
        </div>
      </section>

      {/* Анимированный SVG */}
      <AnimatedSvg />
      <TimedPopup delayMs={5000} message="Хотите подписаться на нашу рассылку?" />
    </div>
  )
}

export default App
