// src/utils/date.ts

type DateInput = Date | string;

const parseDateInput = (date: DateInput): Date => {
    if (date instanceof Date) return date;

    const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return new Date(date);
};

export const formatDateForApi = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; // e.g. "2026-04-08"
};

export const formatDateStringForApi = (date: string): string | null => {
    if (!date) return null;
    const [day, month, year] = date.split('-');
    return `${year}-${month}-${day}`;
};

export const formatApiDateForDisplay = (date?: string): string => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
};

export const formatShortDateDisplay = (date: DateInput): string =>
    parseDateInput(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export const formatGroupDateDisplay = (date: DateInput): string =>
    parseDateInput(date).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }); // e.g. "April 8, 2026"
};

// export const formatTimeDisplay = (date: Date): string => {
//     return date.toLocaleTimeString('en-US', {
//         hour: '2-digit',
//         minute: '2-digit',
//     }); // e.g. "10:30 AM"
// };

export const formatTimeForApi = (timeLabel: string): string => {
    const trimmed = timeLabel.trim().toUpperCase();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);

    if (!match) return timeLabel;

    const [, hText, mText, suffix] = match;
    let hour = Number.parseInt(hText, 10);

    if (suffix === 'PM' && hour !== 12) hour += 12;
    if (suffix === 'AM' && hour === 12) hour = 0;

    return `${String(hour).padStart(2, '0')}:${mText}`;
};

// export const isToday = (date: Date): boolean => {
//     const today = new Date();
//     return (
//         date.getDate() === today.getDate() &&
//         date.getMonth() === today.getMonth() &&
//         date.getFullYear() === today.getFullYear()
//     );
// };
