
import { useState, useEffect } from "react"

function TimedPopup({ delayMs, message }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs])

  function closePopup() {
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="popup">
      <button onClick={closePopup} className="popup-close">
        X
      </button>

      <p className="popup-message">{message}</p>

      <div className="popup-buttons">
        <button onClick={closePopup} className="popup-button secondary">
          Нет, спасибо
        </button>
        <button onClick={closePopup} className="popup-button primary">
          Подписаться
        </button>
      </div>
    </div>
  )
}

export default TimedPopup
