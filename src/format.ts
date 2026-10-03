export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export const riskLabel = (score: number) => score > 0 && score < .1
  ? '<0.1' : score > 99.9 ? '>99.9' : score.toFixed(1);
