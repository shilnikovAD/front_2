import "./App.css"
import Navigation from "./components/Navigation"
import Gallery from "./components/Gallery"
import FeedbackForm from "./components/FeedbackForm"
import TimedPopup from "./components/TimedPopup"
import photo from "./images/photo.png"
import photo2 from "./images/photo2.png"
import photo3 from "./images/photo3.png"
import photo4 from "./images/photo4.png"
import photo5 from "./images/photo5.png"
import photo6 from "./images/photo6.png"
import photo7 from "./images/photo7.png"
import photo8 from "./images/photo8.png"


function App() {
  const images = [
    { id: 1, src: photo, alt: "Фото 1" },
    { id: 2, src: photo2, alt: "Фото 2" },
    { id: 3, src: photo3, alt: "Фото 3" },
    { id: 4, src: photo4, alt: "Фото 4" },
    { id: 5, src: photo5, alt: "Фото 5" },
    { id: 6, src: photo6, alt: "Фото 6" },
    { id: 7, src: photo7, alt: "Фото 7" },
    { id: 8, src: photo8, alt: "Фото 8" }
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

      {/* Секция контактов */}
      <section id="contacts" className="section bg-light">
        <div className="container">
          <h2>Свяжитесь с нами</h2>
          <div className="form-container">
            <FeedbackForm />
          </div>
        </div>
      </section>

      <TimedPopup delayMs={5000} message="Хотите подписаться на нашу рассылку?" />
    </div>
  )
}

export default App
