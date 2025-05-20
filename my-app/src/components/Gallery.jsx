import { useState, useEffect } from "react"

/**
 * Gallery component with low-res thumbnail images and high-res popup images
 * props.images: array of objects { id, thumbSrc, src, alt }
 */
function Gallery({ images }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  function openImage(index) {
    setSelectedIndex(index)
    document.body.style.overflow = "hidden"
  }

  function closeImage() {
    setSelectedIndex(null)
    document.body.style.overflow = "auto"
  }

  function showPrev(e) {
    if (e) e.stopPropagation()
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }

  function showNext(e) {
    if (e) e.stopPropagation()
    setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }

  // Keyboard navigation: ←, →, Esc
  useEffect(() => {
    function handleKeyDown(e) {
      if (selectedIndex !== null) {
        if (e.key === "ArrowLeft") showPrev()
        else if (e.key === "ArrowRight") showNext()
        else if (e.key === "Escape") closeImage()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex])

  const currentImage = selectedIndex !== null ? images[selectedIndex] : null

  return (
    <div className="gallery">
      <div className="gallery-grid">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="gallery-item"
            onClick={() => openImage(index)}
          >
            {/* Low-res thumbnail */}
            <img
              src={image.thumbSrc || image.src}
              alt={image.alt}
              className="gallery-image"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {currentImage && (
        <div className="image-popup" onClick={closeImage}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button onClick={showPrev} className="nav-button prev">←</button>

            <div className="popup-image-container">
              {/* High-res full image */}
              <img
                src={currentImage.src}
                alt={currentImage.alt}
                className="popup-image"
              />
            </div>

            <button onClick={showNext} className="nav-button next">→</button>
            <button className="close-button" onClick={closeImage}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery
