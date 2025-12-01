"""
Физический маятник - моделирование колебаний твёрдого тела
Physical Pendulum Simulation using RK4 numerical integration
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Использовать backend без GUI
import matplotlib.pyplot as plt


# Константы
G = 9.81  # м/с²


def derivs(state, params):
    """
    Вычисление производных для системы ОДУ
    state = [theta, omega]
    """
    theta, omega = state
    I, m, d, b = params['I'], params['m'], params['d'], params['b']
    
    theta_dot = omega
    omega_dot = -(b / I) * omega - (m * G * d / I) * np.sin(theta)
    
    return np.array([theta_dot, omega_dot])


def rk4_step(state, dt, params):
    """
    Один шаг интегрирования методом Рунге-Кутты 4-го порядка
    """
    k1 = derivs(state, params)
    k2 = derivs(state + 0.5 * dt * k1, params)
    k3 = derivs(state + 0.5 * dt * k2, params)
    k4 = derivs(state + dt * k3, params)
    
    return state + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)


def compute_energy(theta, omega, params):
    """
    Вычисление энергии системы
    """
    I, m, d = params['I'], params['m'], params['d']
    KE = 0.5 * I * omega**2
    PE = m * G * d * (1 - np.cos(theta))
    return KE, PE, KE + PE


def T_small(params):
    """
    Теоретический период малых колебаний
    """
    I, m, d = params['I'], params['m'], params['d']
    return 2 * np.pi * np.sqrt(I / (m * G * d))


def detect_periods(t_data, theta_data):
    """
    Определение периода из данных методом нуль-переходов
    """
    zero_crossings = []
    for i in range(1, len(theta_data)):
        if theta_data[i-1] < 0 and theta_data[i] >= 0:
            # Линейная интерполяция
            d_theta = theta_data[i] - theta_data[i-1]
            if abs(d_theta) > 1e-10:
                t_cross = t_data[i-1] + (0 - theta_data[i-1]) / d_theta * (t_data[i] - t_data[i-1])
                zero_crossings.append(t_cross)
    
    periods = []
    for i in range(1, len(zero_crossings)):
        periods.append(zero_crossings[i] - zero_crossings[i-1])
    
    return periods


def get_preset_params(shape, m, size):
    """
    Получение параметров для разных форм маятника
    """
    if shape == 'rod':
        # Стержень, подвешенный за конец: I = mL²/3, d = L/2
        I = (1/3) * m * size**2
        d = size / 2
    elif shape == 'disk':
        # Диск, подвешенный за край: I = 3mR²/2, d = R
        I = (3/2) * m * size**2
        d = size
    elif shape == 'ring':
        # Кольцо, подвешенное за край: I = 2mR², d = R
        I = 2 * m * size**2
        d = size
    else:  # custom
        raise ValueError("Для custom используйте прямой ввод I и d")
    
    return {'I': I, 'm': m, 'd': d, 'b': 0}


def run_simulation(params, theta0_deg, omega0, dt, duration):
    """
    Запуск симуляции маятника
    """
    theta0 = np.radians(theta0_deg)
    num_steps = int(duration / dt)
    
    # Массивы для хранения данных
    t_data = np.zeros(num_steps + 1)
    theta_data = np.zeros(num_steps + 1)
    omega_data = np.zeros(num_steps + 1)
    KE_data = np.zeros(num_steps + 1)
    PE_data = np.zeros(num_steps + 1)
    E_data = np.zeros(num_steps + 1)
    
    state = np.array([theta0, omega0])
    
    for i in range(num_steps + 1):
        t_data[i] = i * dt
        theta_data[i] = state[0]
        omega_data[i] = state[1]
        KE, PE, E = compute_energy(state[0], state[1], params)
        KE_data[i] = KE
        PE_data[i] = PE
        E_data[i] = E
        
        if i < num_steps:
            state = rk4_step(state, dt, params)
    
    return t_data, theta_data, omega_data, KE_data, PE_data, E_data


def analyze_results(t_data, theta_data, E_data, params, theta0_deg):
    """
    Анализ результатов симуляции
    """
    periods = detect_periods(t_data, theta_data)
    avg_period = np.mean(periods) if periods else None
    T_theory = T_small(params)
    
    E0 = E_data[0]
    E_variation = ((E_data.max() - E_data.min()) / E0 * 100) if E0 > 1e-10 else 0
    
    print("\n" + "="*50)
    print("РЕЗУЛЬТАТЫ СИМУЛЯЦИИ")
    print("="*50)
    print(f"\nПараметры маятника:")
    print(f"  I = {params['I']:.4f} кг·м²")
    print(f"  m = {params['m']:.4f} кг")
    print(f"  d = {params['d']:.4f} м")
    print(f"  b = {params['b']:.4f} (коэфф. трения)")
    
    print(f"\nНачальные условия:")
    print(f"  θ₀ = {theta0_deg}°")
    
    print(f"\nТеоретический период (малые колебания):")
    print(f"  T₀ = 2π√(I/mgd) = {T_theory:.4f} с")
    
    if avg_period:
        print(f"\nИзмеренный средний период: {avg_period:.4f} с")
        print(f"Количество измеренных периодов: {len(periods)}")
        error = abs(avg_period - T_theory) / T_theory * 100
        print(f"Отклонение от теории: {error:.2f}%")
    
    print(f"\nЭнергия:")
    print(f"  E начальная: {E0:.6f} Дж")
    print(f"  Вариация E: {E_variation:.4f}%")
    if params['b'] == 0:
        if E_variation < 0.1:
            print("  ✓ Энергия сохраняется с высокой точностью")
        elif E_variation < 1:
            print("  ✓ Энергия сохраняется с хорошей точностью")
        else:
            print("  ⚠ Рекомендуется уменьшить шаг dt")
    else:
        energy_loss = (E0 - E_data[-1]) / E0 * 100 if E0 > 1e-10 else 0
        print(f"  Потери энергии: {energy_loss:.2f}%")
    
    print("="*50)
    
    return avg_period, T_theory


def plot_results(t_data, theta_data, omega_data, KE_data, PE_data, E_data, params):
    """
    Построение графиков результатов
    """
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle('Физический маятник - Результаты симуляции', fontsize=14)
    
    # График угла
    ax1 = axes[0, 0]
    ax1.plot(t_data, np.degrees(theta_data), 'b-', linewidth=1)
    ax1.set_xlabel('Время (с)')
    ax1.set_ylabel('θ (°)')
    ax1.set_title('Угловое отклонение')
    ax1.grid(True, alpha=0.3)
    
    # График угловой скорости
    ax2 = axes[0, 1]
    ax2.plot(t_data, omega_data, 'r-', linewidth=1)
    ax2.set_xlabel('Время (с)')
    ax2.set_ylabel('ω (рад/с)')
    ax2.set_title('Угловая скорость')
    ax2.grid(True, alpha=0.3)
    
    # График энергии
    ax3 = axes[1, 0]
    ax3.plot(t_data, KE_data, 'b-', label='KE', linewidth=1)
    ax3.plot(t_data, PE_data, 'r-', label='PE', linewidth=1)
    ax3.plot(t_data, E_data, 'g-', label='E полн.', linewidth=1.5)
    ax3.set_xlabel('Время (с)')
    ax3.set_ylabel('Энергия (Дж)')
    ax3.set_title('Энергия системы')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Фазовый портрет
    ax4 = axes[1, 1]
    ax4.plot(np.degrees(theta_data), omega_data, 'purple', linewidth=0.5)
    ax4.set_xlabel('θ (°)')
    ax4.set_ylabel('ω (рад/с)')
    ax4.set_title('Фазовый портрет')
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('pendulum_results.png', dpi=150)
    print("\nГрафики сохранены в файл: pendulum_results.png")
    # plt.show()  # Закомментировано для работы без GUI


def main():
    """
    Главная функция с интерактивным вводом параметров
    """
    print("="*50)
    print("ФИЗИЧЕСКИЙ МАЯТНИК - МОДЕЛИРОВАНИЕ")
    print("="*50)
    
    # Выбор формы маятника
    print("\nВыберите форму маятника:")
    print("  1 - Стержень (подвешен за конец)")
    print("  2 - Диск (подвешен за край)")
    print("  3 - Кольцо (подвешено за край)")
    print("  4 - Пользовательские параметры")
    
    try:
        choice = input("\nВведите номер (1-4) [1]: ").strip() or "1"
        choice = int(choice)
    except ValueError:
        choice = 1
    
    if choice == 4:
        # Пользовательские параметры
        try:
            m = float(input("Введите массу m (кг) [1.0]: ") or "1.0")
            I = float(input("Введите момент инерции I (кг·м²) [0.333]: ") or "0.333")
            d = float(input("Введите расстояние до ЦМ d (м) [0.5]: ") or "0.5")
        except ValueError:
            m, I, d = 1.0, 0.333, 0.5
        params = {'I': I, 'm': m, 'd': d, 'b': 0}
    else:
        # Стандартные формы
        shapes = {1: 'rod', 2: 'disk', 3: 'ring'}
        shape = shapes.get(choice, 'rod')
        
        try:
            m = float(input("\nВведите массу m (кг) [1.0]: ") or "1.0")
            if shape == 'rod':
                size = float(input("Введите длину L (м) [1.0]: ") or "1.0")
            else:
                size = float(input("Введите радиус R (м) [0.5]: ") or "0.5")
        except ValueError:
            m, size = 1.0, 1.0 if shape == 'rod' else 0.5
        
        params = get_preset_params(shape, m, size)
    
    # Начальные условия
    print("\nНачальные условия:")
    try:
        theta0_deg = float(input("Начальный угол θ₀ (°) [30]: ") or "30")
        omega0 = float(input("Начальная угловая скорость ω₀ (рад/с) [0]: ") or "0")
    except ValueError:
        theta0_deg, omega0 = 30, 0
    
    # Параметры трения
    try:
        b = float(input("\nКоэффициент трения b [0]: ") or "0")
    except ValueError:
        b = 0
    params['b'] = b
    
    # Параметры расчёта
    print("\nПараметры расчёта:")
    try:
        dt = float(input("Шаг интегрирования dt (с) [0.001]: ") or "0.001")
        duration = float(input("Длительность симуляции (с) [10]: ") or "10")
    except ValueError:
        dt, duration = 0.001, 10
    
    print("\nЗапуск симуляции...")
    
    # Запуск симуляции
    t_data, theta_data, omega_data, KE_data, PE_data, E_data = run_simulation(
        params, theta0_deg, omega0, dt, duration
    )
    
    # Анализ результатов
    analyze_results(t_data, theta_data, E_data, params, theta0_deg)
    
    # Построение графиков
    try:
        plot_results(t_data, theta_data, omega_data, KE_data, PE_data, E_data, params)
    except Exception as e:
        print(f"\nНе удалось отобразить графики: {e}")
        print("Графики сохранены в файл pendulum_results.png")


if __name__ == "__main__":
    main()
