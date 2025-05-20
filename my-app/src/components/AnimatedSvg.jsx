import { useState, useEffect, useRef } from "react";

function AnimatedSvg({ speed = 0.1 }) {
  // текущее положение (которое будем обновлять плавно)
  const [rotate, setRotate] = useState(0);
  const [pos, setPos] = useState({ x: window.innerWidth/2, y: window.innerHeight/2 });

  // цель, к которой «догоняем»
  const target = useRef({ x: pos.x, y: pos.y });

  // при движении мыши меняем target
  useEffect(() => {
    const onMouseMove = e => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // при скролле только угол
  useEffect(() => {
    const onScroll = () => setRotate(window.scrollY / 5);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // анимационный цикл
  useEffect(() => {
    let rafId;

    const animate = () => {
      setPos(prev => {
        const dx = target.current.x - prev.x;
        const dy = target.current.y - prev.y;
        // двигаемся лишь на часть расстояния
        return {
          x: prev.x + dx * speed,
          y: prev.y + dy * speed
        };
      });
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [speed]);

  const style = {
    position: "fixed",
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    pointerEvents: "none",
    // убираем transition, нам не нужна CSS-плавность
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width="80"
      height="80"
      style={style}
    >
      <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="3" fill="red" />
    </svg>
  );
}

export default AnimatedSvg;
