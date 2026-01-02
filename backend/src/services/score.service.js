export const calculateScore = (infra) => {
    // 1. Обчислюємо "сирий" зважений бал
    const rawScore =
        infra.schools * 0.3 +
        infra.kindergartens * 0.3 +
        infra.parks * 0.2 +
        infra.playgrounds * 0.2;

    // 2. Встановлюємо реалістичні межі на основі твоїх даних
    // Наприклад, для Івано-Франківська ти бачив значення від ~8 до ~35–40
    const MIN_RAW = 5;   // нижче цього — дуже поганий район
    const MAX_RAW = 40;  // вище цього — ідеальний район (можна підкоригувати)

    // 3. Нормалізуємо до діапазону 0–4, потім додаємо 1, щоб було від 1 до 5
    let normalized = (rawScore - MIN_RAW) / (MAX_RAW - MIN_RAW);

    // Обмежуємо діапазон, щоб не виходило за межі
    normalized = Math.max(0, Math.min(1, normalized));

    // Переводимо в 5-бальну шкалу: від 1.0 до 5.0
    let score = 1 + normalized * 4;

    // 4. Округлюємо до одного знака після коми
    score = Math.round(score * 10) / 10;

    return score;
};