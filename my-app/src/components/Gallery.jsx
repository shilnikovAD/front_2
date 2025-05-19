
import { useState } from "react"

function Gallery({ images }) {
  const [selectedImage, setSelectedImage] = useState(null)

  function openImage(image) {
    setSelectedImage(image)
    document.body.style.overflow = "hidden"
  }

  function closeImage() {
    setSelectedImage(null)
    document.body.style.overflow = "auto"
  }

  return (
    <div className="gallery">
      {/* Сетка галереи */}
      <div className="gallery-grid">
        {images.map((image) => (
          <div key={image.id} className="gallery-item" onClick={() => openImage(image)}>
            <img src={image.src || "/placeholder.svg"} alt={image.alt} className="gallery-image" />
          </div>
        ))}
      </div>

      {/* Попап с изображением */}
      {selectedImage && (
        <div className="image-popup" onClick={closeImage}>
          <button className="close-button" onClick={closeImage}>
            Закрыть
          </button>

          <div className="popup-image-container">
            <img src={selectedImage.src || "/placeholder.svg"} alt={selectedImage.alt} className="popup-image" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery
