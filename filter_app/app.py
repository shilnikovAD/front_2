"""
М6. Фильтрация сигналов — RC-фильтр нижних частот (ФНЧ).

Схема: U_in --[R]--+-- U_out
                   |
                  [C]
                   |
                  GND

Дифференциальное уравнение:
    RC * dU_out/dt + U_out = U_in

Передаточная функция (аналитическая):
    H(jω) = 1 / (1 + jωRC)
    |H(ω)| = 1 / sqrt(1 + (ωRC)²)   — АЧХ
    φ(ω)   = -arctan(ωRC)            — ФЧХ
"""

import json
import numpy as np
from scipy.integrate import solve_ivp
from scipy.fft import rfft, rfftfreq
import sympy as sp
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# ── Параметры цепи ──────────────────────────────────────────────────────────
R = 1000.0        # Ом
C = 1e-6          # Ф
RC = R * C        # 1e-3 с  →  f_c ≈ 159 Гц


# ── Вспомогательные функции ─────────────────────────────────────────────────

def analytical_response(omega_arr):
    """Аналитические АЧХ и ФЧХ."""
    H = 1.0 / (1.0 + 1j * omega_arr * RC)
    return np.abs(H), np.angle(H)


def ode_rhs(t, y, u_func):
    """Правая часть ОДУ: dy/dt = (u_func(t) - y) / RC."""
    return (u_func(t) - y[0]) / RC


def solve_ode(t_span, t_eval, u_func, y0=0.0):
    """Численное решение ОДУ методом Рунге-Кутта 4/5."""
    sol = solve_ivp(
        lambda t, y: ode_rhs(t, y, u_func),
        t_span,
        [y0],
        method="RK45",
        t_eval=t_eval,
        rtol=1e-8,
        atol=1e-10,
    )
    return sol.t, sol.y[0]


# ── Маршруты ────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/frequency_response")
def frequency_response():
    """Аналитические АЧХ и ФЧХ для набора частот."""
    f_min = float(request.args.get("f_min", 1))
    f_max = float(request.args.get("f_max", 100_000))
    n_pts = int(request.args.get("n_pts", 500))

    f = np.logspace(np.log10(f_min), np.log10(f_max), n_pts)
    omega = 2 * np.pi * f
    amp, phase = analytical_response(omega)

    return jsonify(
        f=f.tolist(),
        amplitude=amp.tolist(),
        phase_deg=(np.degrees(phase)).tolist(),
        f_cutoff=1.0 / (2 * np.pi * RC),
        RC=RC,
    )


@app.route("/api/harmonic_response", methods=["POST"])
def harmonic_response():
    """
    Числовое решение для гармонического входного сигнала U_in = U0*sin(ωt).
    Возвращает установившиеся амплитуду и фазу для массива частот.
    """
    data = request.get_json()
    freqs = np.asarray(data.get("frequencies", []))
    U0 = float(data.get("U0", 1.0))
    n_periods = int(data.get("n_periods", 20))  # периодов для переходного + установившегося
    n_steady = int(data.get("n_steady", 5))      # последних периодов — «установившийся» режим
    pts_per_period = int(data.get("pts_per_period", 200))

    amp_num, phase_num = [], []
    amp_an, phase_an = [], []

    for f0 in freqs:
        omega0 = 2 * np.pi * f0
        T = 1.0 / f0
        t_end = n_periods * T
        t_eval = np.linspace(0, t_end, n_periods * pts_per_period)

        u_in = lambda t: U0 * np.sin(omega0 * t)
        _, u_out = solve_ode((0, t_end), t_eval, u_in)

        # Берём последние n_steady периодов
        idx = t_eval >= (n_periods - n_steady) * T
        t_ss = t_eval[idx]
        u_ss = u_out[idx]
        u_in_ss = U0 * np.sin(omega0 * t_ss)

        # Определяем амплитуду и фазу через МНК-подгонку синуса/косинуса
        # U(t) = A*sin(ωt) + B*cos(ωt) → амплитуда=sqrt(A²+B²), фаза=atan2(B,A)
        sin_arr = np.sin(omega0 * t_ss)
        cos_arr = np.cos(omega0 * t_ss)

        def fit_phase_amp(signal):
            A = 2 * np.dot(signal, sin_arr) / len(signal)
            B = 2 * np.dot(signal, cos_arr) / len(signal)
            return np.sqrt(A**2 + B**2), np.arctan2(B, A)

        amp_in_fit, phi_in = fit_phase_amp(u_in_ss)
        amp_out_fit, phi_out = fit_phase_amp(u_ss)

        amp_num.append(float(amp_out_fit / amp_in_fit) if amp_in_fit > 1e-15 else 0.0)
        phase_num.append(float(np.degrees(phi_out - phi_in)))

        # Аналитика
        H = 1.0 / (1.0 + 1j * omega0 * RC)
        amp_an.append(float(np.abs(H)))
        phase_an.append(float(np.degrees(np.angle(H))))

    return jsonify(
        frequencies=freqs.tolist(),
        amp_numerical=amp_num,
        phase_numerical=phase_num,
        amp_analytical=amp_an,
        phase_analytical=phase_an,
    )


@app.route("/api/transient", methods=["POST"])
def transient():
    """
    Процесс установления колебаний для одной частоты.
    Возвращает u_in(t) и u_out(t) за n_periods периодов.
    """
    data = request.get_json()
    f0 = float(data.get("f0", 1000))
    U0 = float(data.get("U0", 1.0))
    n_periods = int(data.get("n_periods", 10))
    pts_per_period = int(data.get("pts_per_period", 300))

    omega0 = 2 * np.pi * f0
    T = 1.0 / f0
    t_end = n_periods * T
    t_eval = np.linspace(0, t_end, n_periods * pts_per_period)

    u_in_arr = U0 * np.sin(omega0 * t_eval)
    _, u_out_arr = solve_ode((0, t_end), t_eval, lambda t: U0 * np.sin(omega0 * t))

    return jsonify(
        t=t_eval.tolist(),
        u_in=u_in_arr.tolist(),
        u_out=u_out_arr.tolist(),
        f0=f0,
        T=T,
    )


@app.route("/api/square_wave", methods=["POST"])
def square_wave():
    """
    Прямоугольные импульсы на входе.
    Возвращает:
      - установившийся u_out(t) (численное решение ОДУ)
      - спектр u_out (численный FFT)
      - аналитический спектр (через АЧХ × спектр прямоугольника)
    """
    data = request.get_json()
    f0 = float(data.get("f0", 500))          # основная частота
    U0 = float(data.get("U0", 1.0))          # амплитуда
    duty = float(data.get("duty", 0.5))       # скважность (0..1)
    n_periods = int(data.get("n_periods", 30))
    pts_per_period = int(data.get("pts_per_period", 1000))
    n_harmonics = int(data.get("n_harmonics", 30))  # для аналитического спектра

    T = 1.0 / f0
    t_end = n_periods * T
    N = n_periods * pts_per_period
    t_eval = np.linspace(0, t_end, N, endpoint=False)

    # Прямоугольный сигнал
    def square(t):
        phase = (t % T) / T
        return U0 * np.where(phase < duty, 1.0, -1.0)

    u_in_arr = square(t_eval)
    _, u_out_arr = solve_ode((0, t_end), t_eval, square)

    # Установившийся режим — последние n_steady периодов
    n_steady = 5
    idx_ss = t_eval >= (n_periods - n_steady) * T
    t_ss = t_eval[idx_ss] - (n_periods - n_steady) * T
    u_out_ss = u_out_arr[idx_ss]
    u_in_ss = u_in_arr[idx_ss]

    # Численный спектр (амплитудный)
    dt = t_eval[1] - t_eval[0]
    Yout = rfft(u_out_ss)
    freqs_out = rfftfreq(len(u_out_ss), dt)
    amp_out = 2 * np.abs(Yout) / len(u_out_ss)

    Yin = rfft(u_in_ss)
    amp_in = 2 * np.abs(Yin) / len(u_in_ss)

    # Аналитический расчёт через спектральный метод:
    # Для сигнала ±U0 с скважностью d коэффициент Фурье k-й гармоники:
    #   |c_k| = 2*U0*|sin(π*k*d)| / (π*k)  = 2*U0*d*|sinc(k*d)|  (numpy sinc)
    # Односторонняя амплитуда (как у rfft): A_k = 2*|c_k| = 4*U0*d*|sinc(k*d)|
    an_freqs, an_amp_in, an_amp_out = [], [], []
    omega0 = 2 * np.pi * f0
    for k in range(1, n_harmonics + 1):
        c_k_mag = 2.0 * U0 * duty * abs(float(np.sinc(k * duty)))
        A_k_in = 2.0 * c_k_mag          # односторонняя амплитуда
        omega_k = k * omega0
        H_k = 1.0 / (1.0 + 1j * omega_k * RC)
        A_k_out = A_k_in * abs(H_k)
        an_freqs.append(k * f0)
        an_amp_in.append(float(A_k_in))
        an_amp_out.append(float(A_k_out))

    # Ограничиваем выдаваемый спектр разумным диапазоном частот
    max_f = n_harmonics * f0 * 1.1
    mask = freqs_out <= max_f

    return jsonify(
        # Временные ряды
        t_ss=t_ss.tolist(),
        u_in_ss=u_in_ss.tolist(),
        u_out_ss=u_out_ss.tolist(),
        # Численный спектр
        freqs_num=freqs_out[mask].tolist(),
        amp_in_num=amp_in[mask].tolist(),
        amp_out_num=amp_out[mask].tolist(),
        # Аналитический спектр
        freqs_an=an_freqs,
        amp_in_an=an_amp_in,
        amp_out_an=an_amp_out,
        f0=f0,
        T=T,
    )


@app.route("/api/sympy_transfer_function")
def sympy_transfer_function():
    """
    Аналитическое выражение для передаточной функции через SymPy.
    """
    omega, r, c = sp.symbols("omega R C", positive=True)
    H = 1 / (1 + sp.I * omega * r * c)
    amplitude = sp.Abs(H)
    phase = sp.atan2(sp.im(H), sp.re(H))

    amplitude_simplified = sp.simplify(sp.sqrt(sp.re(H) ** 2 + sp.im(H) ** 2))
    phase_simplified = sp.simplify(sp.atan(-omega * r * c))

    return jsonify(
        H=str(H),
        amplitude=str(amplitude_simplified),
        phase=str(phase_simplified),
        H_latex=sp.latex(H),
        amplitude_latex=sp.latex(amplitude_simplified),
        phase_latex=sp.latex(phase_simplified),
        R=R,
        C=C,
        RC=RC,
        f_cutoff=float(1.0 / (2 * np.pi * RC)),
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
