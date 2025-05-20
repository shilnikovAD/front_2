import { useState, useEffect } from "react";

function Countdown({ targetDate }) {
  // Функция для расчёта оставшегося времени
  const calculate = () => {
    const now = new Date();
    const diff = new Date(targetDate) - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculate());

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!timeLeft) {
    return <div className="countdown">Экзамен уже состоялся!</div>;
  }

  return (
    <div className="countdown">
      До экзамена осталось:{" "}
      {timeLeft.days}д {timeLeft.hours}ч {timeLeft.minutes}м {timeLeft.seconds}с
    </div>
  );
}

export default Countdown;
