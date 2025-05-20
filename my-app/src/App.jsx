import "./App.css"
import Navigation from "./components/Navigation"
import Gallery from "./components/Gallery"
import FeedbackForm from "./components/FeedbackForm"
import TimedPopup from "./components/TimedPopup"

function App() {
  const images = [
    { id: 1, src: "public/images/photo.png", alt: "Фото 1" },
    { id: 2, src: "public/images/photo2.png", alt: "Фото 2" },
    { id: 3, src: "public/images/photo3.png", alt: "Фото 3" },
    { id: 4, src: "public/images/photo5.png", alt: "Фото 4" },
    { id: 5, src: "public/images/photo6.png", alt: "Фото 5" },
    { id: 6, src: "public/images/photo7.png", alt: "Фото 6" },
    { id: 7, src: "public/images/photo4.png", alt: "Фото 7" },
    { id: 8, src: "public/images/photo8.png", alt: "Фото 8" }
  ]

  return (
    <div className="app">
      <Navigation />

      {/* Секция героя */}
      <section className="hero">
        <div className="container">
          <h1>Добро пожаловать на наш сайт</h1>
          <p>Исследуйте наши интерактивные функции и красивую галерею</p>
        </div>
      </section>

      {/* Секция галереи */}
      <section className="section">
        <div className="container">
          <h2>Фотогалерея</h2>
          <Gallery images={images} />
        </div>
      </section>

      {/* Секция контактов */}
      <section className="section bg-light">
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
