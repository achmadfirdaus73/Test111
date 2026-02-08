// ============================================
// DATE HELPERS (Indonesian Format)
// ============================================

const INDONESIAN_MONTHS: { [key: string]: number } = {
  Januari: 0,
  Februari: 1,
  Maret: 2,
  April: 3,
  Mei: 4,
  Juni: 5,
  Juli: 6,
  Agustus: 7,
  September: 8,
  Oktober: 9,
  November: 10,
  Desember: 11,
};

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format tanggal ke format Indonesia: "1 Januari 2024"
 */
export function toIndonesianDate(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse Indonesian date string ke Date object
 * Input: "1 Januari 2024" -> Output: Date
 */
export function parseIndonesianDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  const parts = dateString.split(' ');
  if (parts.length < 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = INDONESIAN_MONTHS[parts[1]];
  const year = parseInt(parts[2], 10);
  
  if (!isNaN(day) && month !== undefined && !isNaN(year)) {
    return new Date(year, month, day);
  }
  
  return null;
}

/**
 * Format timestamp ke Indonesian date + time
 * Output: "1 Januari 2024, 14:30"
 */
export function formatTimestamp(date: Date): string {
  return `${toIndonesianDate(date)}, ${date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Format time ke Indonesia: "14:30"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================
// ORDER HELPERS
// ============================================

/**
 * Generate order ID yang user-friendly
 * Output: "#12345"
 */
export function generateOrderId(): string {
  const randomPart = Math.random().toString().slice(-2);
  const timestampPart = Date.now().toString().slice(-5);
  return `#${timestampPart}${randomPart}`;
}

/**
 * Calculate late days untuk order
 */
export function calculateLateDays(
  startDate: Date,
  tenor: number,
  paymentsCount: number,
  holidays: string[] // Array of "YYYY-MM-DD"
): number {
  let expectedPayments = 0;
  const currentDate = new Date(startDate);
  const today = new Date();
  
  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Skip Sunday dan holidays
    if (dayOfWeek !== 0 && !holidays.includes(dateString)) {
      expectedPayments++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const lateDays = expectedPayments - paymentsCount;
  return lateDays > 0 ? lateDays : 0;
}

/**
 * Calculate maturity date (tanggal lunas estimasi)
 */
export function calculateMaturityDate(
  startDate: Date,
  tenor: number,
  holidays: string[] // Array of "YYYY-MM-DD"
): string {
  const currentDate = new Date(startDate);
  let daysCounted = 0;
  
  while (daysCounted < tenor) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Skip Sunday dan holidays
    if (dayOfWeek !== 0 && !holidays.includes(dateString)) {
      daysCounted++;
    }
  }
  
  return toIndonesianDate(currentDate);
}

// ============================================
// INSTALLMENT CALCULATION HELPERS
// ============================================

export type TenorOption = {
  days: number;
  multiplier: number;
  text: string;
};

export const TENOR_OPTIONS: TenorOption[] = [
  { days: 60, multiplier: 1.20, text: '60 Hari' },
  { days: 90, multiplier: 1.25, text: '90 Hari' },
  { days: 120, multiplier: 1.30, text: '120 Hari' },
  { days: 150, multiplier: 1.35, text: '150 Hari' },
  { days: 180, multiplier: 1.40, text: '180 Hari' },
];

/**
 * Custom rounding untuk installment price
 */
export function customRound(price: number): number {
  const base = Math.floor(price / 1000) * 1000;
  const hundreds = price % 1000;
  
  if (hundreds === 0) return price;
  if (hundreds > 0 && hundreds <= 700) return base + 500;
  return base + 1000;
}

/**
 * Calculate installment price
 */
export function calculateInstallment(
  hargaModal: number,
  dp: number,
  tenorDays: number,
  multiplier: number
): number {
  const rawPrice = ((hargaModal - dp) * multiplier) / tenorDays;
  return customRound(rawPrice);
}

/**
 * Calculate weekly installment (6 hari)
 */
export function calculateWeeklyInstallment(dailyPrice: number): number {
  return dailyPrice * 6;
}

// ============================================
// HOLIDAY API HELPER
// ============================================

/**
 * Fetch holidays dari API
 */
export async function fetchHolidays(year?: number): Promise<string[]> {
  try {
    const currentYear = year || new Date().getFullYear();
    const response = await fetch(
      `https://api-harilibur.vercel.app/api?year=${currentYear}`
    );
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data
        .filter((d: any) => d.is_national_holiday)
        .map((d: any) => d.holiday_date);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

// ============================================
// STATUS COLOR HELPER
// ============================================

export function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    Proses: 'orange',
    Pengiriman: 'blue',
    Terkirim: 'cyan',
    Lunas: 'green',
  };
  return colors[status] || 'grey';
}

/**
 * Get friendly error message from Firebase auth error code
 */
export function getAuthErrorMessage(code: string): string {
  const messages: { [key: string]: string } = {
    'auth/user-not-found': 'Email tidak terdaftar.',
    'auth/wrong-password': 'Password salah.',
    'auth/email-already-in-use': 'Email ini sudah digunakan.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Password terlalu lemah.',
  };
  return messages[code] || 'Terjadi kesalahan.';
}
