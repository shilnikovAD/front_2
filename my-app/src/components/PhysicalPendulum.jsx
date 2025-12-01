import React, { useState, useRef, useEffect, useCallback } from 'react'
import './PhysicalPendulum.css'

// Константы
const G = 9.81 // м/с²

// Пресеты для разных форм маятника
const PRESETS = {
  rod: {
    name: 'Стержень (подвешен за конец)',
    // I = (1/3)*m*L², d = L/2
    getParams: (m, L) => ({
      I: (1/3) * m * L * L,
      d: L / 2,
      description: `I = mL²/3, d = L/2`
    })
  },
  disk: {
    name: 'Диск (подвешен за край)',
    // I = (3/2)*m*R², d = R
    getParams: (m, R) => ({
      I: (3/2) * m * R * R,
      d: R,
      description: `I = 3mR²/2, d = R`
    })
  },
  ring: {
    name: 'Кольцо (подвешено за край)',
    // I = 2*m*R², d = R
    getParams: (m, R) => ({
      I: 2 * m * R * R,
      d: R,
      description: `I = 2mR², d = R`
    })
  },
  custom: {
    name: 'Пользовательский',
    getParams: (m, size, I, d) => ({
      I: I,
      d: d,
      description: `I и d заданы вручную`
    })
  }
}

// Производная состояния для RK4
function derivs(theta, omega, params) {
  const { I, m, d, b } = params
  const theta_dot = omega
  const omega_dot = -(b / I) * omega - (m * G * d / I) * Math.sin(theta)
  return { theta_dot, omega_dot }
}

// RK4 интегратор
function rk4Step(theta, omega, dt, params) {
  const k1 = derivs(theta, omega, params)
  const k2 = derivs(theta + 0.5 * dt * k1.theta_dot, omega + 0.5 * dt * k1.omega_dot, params)
  const k3 = derivs(theta + 0.5 * dt * k2.theta_dot, omega + 0.5 * dt * k2.omega_dot, params)
  const k4 = derivs(theta + dt * k3.theta_dot, omega + dt * k3.omega_dot, params)
  
  const theta_new = theta + (dt / 6) * (k1.theta_dot + 2 * k2.theta_dot + 2 * k3.theta_dot + k4.theta_dot)
  const omega_new = omega + (dt / 6) * (k1.omega_dot + 2 * k2.omega_dot + 2 * k3.omega_dot + k4.omega_dot)
  
  return { theta: theta_new, omega: omega_new }
}

// Вычисление энергии
function computeEnergy(theta, omega, params) {
  const { I, m, d } = params
  const KE = 0.5 * I * omega * omega
  const PE = m * G * d * (1 - Math.cos(theta))
  return { KE, PE, E: KE + PE }
}

// Теоретический период малых колебаний
function T_small(params) {
  const { I, m, d } = params
  return 2 * Math.PI * Math.sqrt(I / (m * G * d))
}

// Эллиптический интеграл первого рода (приближённый расчёт)
function ellipticK(k) {
  // Используем ряд AGM (арифметико-геометрическое среднее)
  let a = 1
  let b = Math.sqrt(1 - k * k)
  for (let i = 0; i < 20; i++) {
    const a_new = (a + b) / 2
    const b_new = Math.sqrt(a * b)
    a = a_new
    b = b_new
  }
  return Math.PI / (2 * a)
}

// Точный период для произвольной амплитуды
function T_exact(theta0, params) {
  const { I, m, d } = params
  const k = Math.sin(Math.abs(theta0) / 2)
  const K = ellipticK(k)
  return 4 * Math.sqrt(I / (m * G * d)) * K
}

// Определение периода из данных (метод нуль-переходов)
function detectPeriods(data) {
  const zeroCrossings = []
  for (let i = 1; i < data.length; i++) {
    // Положительный переход через ноль
    if (data[i - 1].theta < 0 && data[i].theta >= 0) {
      // Линейная интерполяция
      const t = data[i - 1].t + (0 - data[i - 1].theta) / (data[i].theta - data[i - 1].theta) * (data[i].t - data[i - 1].t)
      zeroCrossings.push(t)
    }
  }
  
  // Период - разница между последовательными пересечениями
  const periods = []
  for (let i = 1; i < zeroCrossings.length; i++) {
    periods.push(zeroCrossings[i] - zeroCrossings[i - 1])
  }
  
  return periods
}

function PhysicalPendulum() {
  // Параметры симуляции
  const [shape, setShape] = useState('rod')
  const [mass, setMass] = useState(1.0)
  const [size, setSize] = useState(1.0) // Длина стержня или радиус
  const [customI, setCustomI] = useState(0.333)
  const [customD, setCustomD] = useState(0.5)
  const [friction, setFriction] = useState(0)
  const [theta0, setTheta0] = useState(30) // в градусах
  const [omega0, setOmega0] = useState(0)
  const [dt, setDt] = useState(0.001)
  const [duration, setDuration] = useState(10)
  
  // Состояние симуляции
  const [isRunning, setIsRunning] = useState(false)
  const [simulationData, setSimulationData] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [analysisResults, setAnalysisResults] = useState(null)
  
  // Refs
  const canvasRef = useRef(null)
  const graphCanvasRef = useRef(null)
  const energyCanvasRef = useRef(null)
  const animationRef = useRef(null)
  
  // Вычисление параметров на основе формы
  const getPhysicsParams = useCallback(() => {
    let params
    if (shape === 'custom') {
      params = PRESETS.custom.getParams(mass, size, customI, customD)
    } else {
      params = PRESETS[shape].getParams(mass, size)
    }
    return { ...params, m: mass, b: friction }
  }, [shape, mass, size, customI, customD, friction])
  
  // Запуск симуляции
  const runSimulation = useCallback(() => {
    const params = getPhysicsParams()
    const theta0Rad = theta0 * Math.PI / 180
    
    const data = []
    let theta = theta0Rad
    let omega = omega0
    const numSteps = Math.floor(duration / dt)
    
    for (let i = 0; i <= numSteps; i++) {
      const t = i * dt
      const energy = computeEnergy(theta, omega, params)
      data.push({ t, theta, omega, ...energy })
      
      if (i < numSteps) {
        const newState = rk4Step(theta, omega, dt, params)
        theta = newState.theta
        omega = newState.omega
      }
    }
    
    // Анализ результатов
    const periods = detectPeriods(data)
    const avgPeriod = periods.length > 0 ? periods.reduce((a, b) => a + b, 0) / periods.length : null
    const T_theory_small = T_small(params)
    const T_theory_exact = T_exact(theta0Rad, params)
    
    // Анализ энергии
    const E0 = data[0].E
    const E_final = data[data.length - 1].E
    const E_max = Math.max(...data.map(d => d.E))
    const E_min = Math.min(...data.map(d => d.E))
    const E_variation = ((E_max - E_min) / E0) * 100
    
    setAnalysisResults({
      periods,
      avgPeriod,
      T_theory_small,
      T_theory_exact,
      errorSmall: avgPeriod ? Math.abs(avgPeriod - T_theory_small) / T_theory_small * 100 : null,
      errorExact: avgPeriod ? Math.abs(avgPeriod - T_theory_exact) / T_theory_exact * 100 : null,
      E0,
      E_final,
      E_variation,
      energyLoss: ((E0 - E_final) / E0) * 100
    })
    
    setSimulationData(data)
    setCurrentIndex(0)
  }, [getPhysicsParams, theta0, omega0, dt, duration])
  
  // Отрисовка маятника на canvas
  const drawPendulum = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    ctx.clearRect(0, 0, width, height)
    
    // Центр подвеса
    const pivotX = width / 2
    const pivotY = height * 0.2
    const pendulumLength = Math.min(width, height) * 0.35
    
    // Текущий угол
    const theta = simulationData.length > 0 ? simulationData[currentIndex].theta : theta0 * Math.PI / 180
    
    // Позиция груза
    const bobX = pivotX + pendulumLength * Math.sin(theta)
    const bobY = pivotY + pendulumLength * Math.cos(theta)
    
    // Рисуем опору
    ctx.fillStyle = '#333'
    ctx.fillRect(pivotX - 30, pivotY - 10, 60, 10)
    
    // Рисуем стержень
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(bobX, bobY)
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 4
    ctx.stroke()
    
    // Рисуем шарнир
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()
    
    // Рисуем груз в зависимости от формы
    ctx.beginPath()
    if (shape === 'disk') {
      ctx.arc(bobX, bobY, 25, 0, Math.PI * 2)
      ctx.fillStyle = '#3498db'
    } else if (shape === 'ring') {
      ctx.arc(bobX, bobY, 25, 0, Math.PI * 2)
      ctx.strokeStyle = '#e74c3c'
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.fillStyle = 'transparent'
    } else {
      ctx.arc(bobX, bobY, 15, 0, Math.PI * 2)
      ctx.fillStyle = '#2ecc71'
    }
    ctx.fill()
    
    // Метка центра масс
    const cmX = pivotX + (pendulumLength * getPhysicsParams().d / size) * Math.sin(theta)
    const cmY = pivotY + (pendulumLength * getPhysicsParams().d / size) * Math.cos(theta)
    ctx.beginPath()
    ctx.arc(cmX, cmY, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#e74c3c'
    ctx.fill()
    
    // Текущее время и угол
    if (simulationData.length > 0) {
      const data = simulationData[currentIndex]
      ctx.fillStyle = '#333'
      ctx.font = '14px Arial'
      ctx.fillText(`t = ${data.t.toFixed(2)} с`, 10, 20)
      ctx.fillText(`θ = ${(data.theta * 180 / Math.PI).toFixed(1)}°`, 10, 40)
      ctx.fillText(`ω = ${data.omega.toFixed(2)} рад/с`, 10, 60)
    }
  }, [simulationData, currentIndex, theta0, shape, size, getPhysicsParams])
  
  // Отрисовка графиков
  const drawGraphs = useCallback(() => {
    const canvas = graphCanvasRef.current
    if (!canvas || simulationData.length === 0) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    ctx.clearRect(0, 0, width, height)
    
    const padding = 40
    const graphWidth = width - 2 * padding
    const graphHeight = height - 2 * padding
    
    // Оси
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Подписи осей
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.fillText('t (с)', width - padding + 5, height - padding + 5)
    ctx.fillText('θ, ω', padding - 30, padding - 10)
    
    // Масштаб
    const tMax = simulationData[simulationData.length - 1].t
    const thetaMax = Math.max(...simulationData.map(d => Math.abs(d.theta))) * 1.1
    const omegaMax = Math.max(...simulationData.map(d => Math.abs(d.omega))) * 1.1
    const yMax = Math.max(thetaMax, omegaMax / 5) // Нормализуем omega для отображения
    
    // Горизонтальная линия y=0
    const y0 = padding + graphHeight / 2
    ctx.strokeStyle = '#ccc'
    ctx.beginPath()
    ctx.moveTo(padding, y0)
    ctx.lineTo(width - padding, y0)
    ctx.stroke()
    
    // График угла
    ctx.strokeStyle = '#3498db'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < simulationData.length; i++) {
      const x = padding + (simulationData[i].t / tMax) * graphWidth
      const y = y0 - (simulationData[i].theta / yMax) * (graphHeight / 2)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // График угловой скорости (масштабированный)
    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < simulationData.length; i++) {
      const x = padding + (simulationData[i].t / tMax) * graphWidth
      const y = y0 - (simulationData[i].omega / 5 / yMax) * (graphHeight / 2)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // Текущая позиция
    const currentData = simulationData[currentIndex]
    const cx = padding + (currentData.t / tMax) * graphWidth
    ctx.strokeStyle = '#2ecc71'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, padding)
    ctx.lineTo(cx, height - padding)
    ctx.stroke()
    
    // Легенда
    ctx.fillStyle = '#3498db'
    ctx.fillRect(width - padding - 100, padding, 15, 10)
    ctx.fillStyle = '#333'
    ctx.fillText('θ (рад)', width - padding - 80, padding + 10)
    
    ctx.fillStyle = '#e74c3c'
    ctx.fillRect(width - padding - 100, padding + 20, 15, 10)
    ctx.fillStyle = '#333'
    ctx.fillText('ω/5 (рад/с)', width - padding - 80, padding + 30)
  }, [simulationData, currentIndex])
  
  // Отрисовка графика энергии
  const drawEnergy = useCallback(() => {
    const canvas = energyCanvasRef.current
    if (!canvas || simulationData.length === 0) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    ctx.clearRect(0, 0, width, height)
    
    const padding = 40
    const graphWidth = width - 2 * padding
    const graphHeight = height - 2 * padding
    
    // Оси
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Подписи
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.fillText('t (с)', width - padding + 5, height - padding + 5)
    ctx.fillText('E (Дж)', padding - 35, padding - 10)
    
    // Масштаб
    const tMax = simulationData[simulationData.length - 1].t
    const EMax = Math.max(...simulationData.map(d => d.E)) * 1.1
    
    // Полная энергия
    ctx.strokeStyle = '#9b59b6'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < simulationData.length; i++) {
      const x = padding + (simulationData[i].t / tMax) * graphWidth
      const y = height - padding - (simulationData[i].E / EMax) * graphHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // Кинетическая энергия
    ctx.strokeStyle = '#3498db'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < simulationData.length; i++) {
      const x = padding + (simulationData[i].t / tMax) * graphWidth
      const y = height - padding - (simulationData[i].KE / EMax) * graphHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // Потенциальная энергия
    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < simulationData.length; i++) {
      const x = padding + (simulationData[i].t / tMax) * graphWidth
      const y = height - padding - (simulationData[i].PE / EMax) * graphHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // Текущая позиция
    const currentData = simulationData[currentIndex]
    const cx = padding + (currentData.t / tMax) * graphWidth
    ctx.strokeStyle = '#2ecc71'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, padding)
    ctx.lineTo(cx, height - padding)
    ctx.stroke()
    
    // Легенда
    ctx.fillStyle = '#9b59b6'
    ctx.fillRect(width - padding - 100, padding, 15, 10)
    ctx.fillStyle = '#333'
    ctx.fillText('E полн.', width - padding - 80, padding + 10)
    
    ctx.fillStyle = '#3498db'
    ctx.fillRect(width - padding - 100, padding + 20, 15, 10)
    ctx.fillStyle = '#333'
    ctx.fillText('KE', width - padding - 80, padding + 30)
    
    ctx.fillStyle = '#e74c3c'
    ctx.fillRect(width - padding - 100, padding + 40, 15, 10)
    ctx.fillStyle = '#333'
    ctx.fillText('PE', width - padding - 80, padding + 50)
  }, [simulationData, currentIndex])
  
  // Анимация
  useEffect(() => {
    if (isRunning && simulationData.length > 0) {
      const step = Math.max(1, Math.floor(simulationData.length / (duration * 60)))
      animationRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev + step >= simulationData.length) {
            setIsRunning(false)
            return simulationData.length - 1
          }
          return prev + step
        })
      }, 16)
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isRunning, simulationData, duration])
  
  // Перерисовка при изменении
  useEffect(() => {
    drawPendulum()
    drawGraphs()
    drawEnergy()
  }, [drawPendulum, drawGraphs, drawEnergy])
  
  // Начальная отрисовка
  useEffect(() => {
    drawPendulum()
  }, [drawPendulum, theta0, shape])
  
  const handleStart = () => {
    if (simulationData.length === 0) {
      runSimulation()
    }
    setIsRunning(true)
  }
  
  const handlePause = () => {
    setIsRunning(false)
  }
  
  const handleReset = () => {
    setIsRunning(false)
    setSimulationData([])
    setCurrentIndex(0)
    setAnalysisResults(null)
  }
  
  const handleRerun = () => {
    handleReset()
    setTimeout(() => {
      runSimulation()
      setIsRunning(true)
    }, 50)
  }
  
  const params = getPhysicsParams()
  
  return (
    <div className="pendulum-container">
      <h2>Физический маятник</h2>
      <p className="subtitle">Моделирование колебаний твёрдого тела</p>
      
      <div className="pendulum-layout">
        {/* Панель управления */}
        <div className="controls-panel">
          <h3>Параметры маятника</h3>
          
          <div className="control-group">
            <label>Форма тела:</label>
            <select value={shape} onChange={e => { setShape(e.target.value); handleReset(); }}>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>{preset.name}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Масса m (кг):</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={mass}
              onChange={e => { setMass(parseFloat(e.target.value) || 0.1); handleReset(); }}
            />
          </div>
          
          <div className="control-group">
            <label>{shape === 'rod' ? 'Длина L (м):' : 'Радиус R (м):'}</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={size}
              onChange={e => { setSize(parseFloat(e.target.value) || 0.1); handleReset(); }}
            />
          </div>
          
          {shape === 'custom' && (
            <>
              <div className="control-group">
                <label>Момент инерции I (кг·м²):</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customI}
                  onChange={e => { setCustomI(parseFloat(e.target.value) || 0.01); handleReset(); }}
                />
              </div>
              <div className="control-group">
                <label>Расстояние до ЦМ d (м):</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customD}
                  onChange={e => { setCustomD(parseFloat(e.target.value) || 0.01); handleReset(); }}
                />
              </div>
            </>
          )}
          
          <div className="params-info">
            <p>I = {params.I.toFixed(4)} кг·м²</p>
            <p>d = {params.d.toFixed(4)} м</p>
            <p>{PRESETS[shape].getParams(mass, size, customI, customD).description}</p>
          </div>
          
          <h3>Начальные условия</h3>
          
          <div className="control-group">
            <label>Нач. угол θ₀ (°):</label>
            <input
              type="range"
              min="-170"
              max="170"
              value={theta0}
              onChange={e => { setTheta0(parseFloat(e.target.value)); handleReset(); }}
            />
            <span>{theta0}°</span>
          </div>
          
          <div className="control-group">
            <label>Нач. скорость ω₀ (рад/с):</label>
            <input
              type="number"
              step="0.1"
              value={omega0}
              onChange={e => { setOmega0(parseFloat(e.target.value) || 0); handleReset(); }}
            />
          </div>
          
          <h3>Трение</h3>
          
          <div className="control-group">
            <label>Коэфф. трения b:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={friction}
              onChange={e => { setFriction(parseFloat(e.target.value)); handleReset(); }}
            />
            <span>{friction.toFixed(2)}</span>
          </div>
          
          <h3>Параметры расчёта</h3>
          
          <div className="control-group">
            <label>Шаг dt (с):</label>
            <select value={dt} onChange={e => { setDt(parseFloat(e.target.value)); handleReset(); }}>
              <option value="0.0001">0.0001</option>
              <option value="0.0005">0.0005</option>
              <option value="0.001">0.001</option>
              <option value="0.005">0.005</option>
              <option value="0.01">0.01</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Длительность (с):</label>
            <input
              type="number"
              min="1"
              max="60"
              value={duration}
              onChange={e => { setDuration(parseFloat(e.target.value) || 1); handleReset(); }}
            />
          </div>
          
          <div className="buttons">
            <button onClick={handleStart} disabled={isRunning}>▶ Старт</button>
            <button onClick={handlePause} disabled={!isRunning}>⏸ Пауза</button>
            <button onClick={handleReset}>⏹ Сброс</button>
            <button onClick={handleRerun}>🔄 Перезапуск</button>
          </div>
        </div>
        
        {/* Визуализация */}
        <div className="visualization-panel">
          <div className="canvas-container">
            <h4>Анимация</h4>
            <canvas ref={canvasRef} width={400} height={350} />
          </div>
          
          <div className="canvas-container">
            <h4>Угол и угловая скорость</h4>
            <canvas ref={graphCanvasRef} width={400} height={250} />
          </div>
          
          <div className="canvas-container">
            <h4>Энергия</h4>
            <canvas ref={energyCanvasRef} width={400} height={250} />
          </div>
        </div>
        
        {/* Результаты анализа */}
        <div className="results-panel">
          <h3>Теоретический анализ</h3>
          <div className="theory-box">
            <p><strong>Период малых колебаний:</strong></p>
            <p>T₀ = 2π√(I/mgd) = {T_small(params).toFixed(4)} с</p>
            <p><strong>Точный период (θ₀ = {theta0}°):</strong></p>
            <p>T = 4√(I/mgd)·K(sin(θ₀/2)) = {T_exact(theta0 * Math.PI / 180, params).toFixed(4)} с</p>
          </div>
          
          {analysisResults && (
            <>
              <h3>Результаты симуляции</h3>
              <div className="results-box">
                <p><strong>Измеренные периоды:</strong></p>
                {analysisResults.periods.length > 0 ? (
                  <>
                    <p>Средний период: {analysisResults.avgPeriod?.toFixed(4)} с</p>
                    <p>Кол-во измерений: {analysisResults.periods.length}</p>
                  </>
                ) : (
                  <p>Недостаточно данных для измерения периода</p>
                )}
                
                <p><strong>Сравнение с теорией:</strong></p>
                {analysisResults.avgPeriod && (
                  <>
                    <p>Отклонение от T₀: {analysisResults.errorSmall?.toFixed(2)}%</p>
                    <p>Отклонение от T(θ₀): {analysisResults.errorExact?.toFixed(2)}%</p>
                  </>
                )}
                
                <p><strong>Энергия:</strong></p>
                <p>E начальная: {analysisResults.E0.toFixed(6)} Дж</p>
                <p>E конечная: {analysisResults.E_final.toFixed(6)} Дж</p>
                {friction === 0 ? (
                  <p>Вариация E: {analysisResults.E_variation.toFixed(4)}%</p>
                ) : (
                  <p>Потери E: {analysisResults.energyLoss.toFixed(2)}%</p>
                )}
              </div>
              
              {friction === 0 && (
                <div className="info-box success">
                  <strong>✓ Сохранение энергии:</strong><br />
                  {analysisResults.E_variation < 0.1 ? 
                    'Энергия сохраняется с высокой точностью (вариация < 0.1%)' :
                    analysisResults.E_variation < 1 ?
                    'Энергия сохраняется с хорошей точностью (вариация < 1%)' :
                    'Рекомендуется уменьшить шаг dt для лучшего сохранения энергии'}
                </div>
              )}
              
              {friction > 0 && (
                <div className="info-box warning">
                  <strong>⚡ Затухание:</strong><br />
                  При наличии трения энергия рассеивается. 
                  Потери за время симуляции: {analysisResults.energyLoss.toFixed(1)}%
                </div>
              )}
            </>
          )}
          
          <h3>Теория</h3>
          <div className="theory-info">
            <p><strong>Уравнение движения:</strong></p>
            <p className="formula">I·θ'' + b·θ' + m·g·d·sin(θ) = 0</p>
            <p><strong>При малых углах (sin θ ≈ θ):</strong></p>
            <p className="formula">θ(t) = θ₀·cos(ω₀t)·e^(-γt)</p>
            <p>где ω₀ = √(mgd/I), γ = b/(2I)</p>
            <p><strong>Зависимость периода от амплитуды:</strong></p>
            <p>При больших углах период увеличивается. Для θ₀ = 90° период примерно на 18% больше, чем для малых колебаний.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhysicalPendulum
