
import { useState } from "react"

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: "Главная", href: "#" },
    { name: "Галерея", href: "#" },
    { name: "Контакты", href: "#" },
  ]

  return (
    <header className="header">
      <div className="container">
        <div className="navbar">
          {/* Логотип */}
          <div className="logo">
            <a href="#">MY WEBSITE</a>
          </div>

          {/* Кнопка мобильного меню */}
          <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            Меню
          </button>

          {/* Навигация для десктопа */}
          <nav className="desktop-nav">
            {navItems.map((item) => (
              <a key={item.name} href={item.href} className="nav-link">
                {item.name}
              </a>
            ))}
          </nav>
        </div>

        {/* Мобильное меню */}
        {isMenuOpen && (
          <div className="mobile-nav">
            {navItems.map((item) => (
              <a key={item.name} href={item.href} className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                {item.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navigation
