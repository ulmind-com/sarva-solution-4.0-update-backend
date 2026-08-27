import moment from 'moment-timezone';

const TIMEZONE = 'Asia/Kolkata';

export const getISTDate = () => {
    return moment().tz(TIMEZONE).toDate();
};

export const getISTString = () => {
    return moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
};

export const getISTStartOfDay = (date = new Date()) => {
    return moment(date).tz(TIMEZONE).startOf('day').toDate();
};

export const getISTEndOfDay = (date = new Date()) => {
    return moment(date).tz(TIMEZONE).endOf('day').toDate();
};

export const getISTMoment = (date) => {
    return date ? moment(date).tz(TIMEZONE) : moment().tz(TIMEZONE);
};

// Helper to convert an existing UTC date to what it "looks like" in IST (mostly for display/logging if needed)
// But for logic, we usually want the exact moment in time, just aligned to IST day boundaries.
