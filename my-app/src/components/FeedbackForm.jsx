
import { useState } from "react"

function FeedbackForm() {
  // Данные формы
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  // Статус формы
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Обработка отправки формы
  function handleSubmit(e) {
    e.preventDefault()

    // Простая валидация
    if (!name || !email || !message) {
      alert("Пожалуйста, заполните все поля")
      return
    }

    setIsSubmitting(true)

    // Имитация отправки формы
    setTimeout(() => {
      console.log("Форма отправлена:", { name, email, message })
      setIsSubmitting(false)
      setIsSubmitted(true)

      // Сброс формы
      setName("")
      setEmail("")
      setMessage("")

      // Сброс сообщения об успехе через 3 секунды
      setTimeout(() => {
        setIsSubmitted(false)
      }, 3000)
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      {/* Поле имени */}
      <div className="form-group">
        <label>Имя</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </div>

      {/* Поле email */}
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
      </div>

      {/* Поле сообщения */}
      <div className="form-group">
        <label>Сообщение</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} disabled={isSubmitting} />
      </div>

      {/* Кнопка отправки */}
      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? "Отправка..." : "Отправить сообщение"}
      </button>

      {/* Сообщение об успехе */}
      {isSubmitted && <div className="success-message">Сообщение успешно отправлено!</div>}
    </form>
  )
}

export default FeedbackForm
