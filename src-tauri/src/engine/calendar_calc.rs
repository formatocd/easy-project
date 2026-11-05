use crate::models::calendar::{Calendar, CalendarException};
use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime, Timelike};
use std::collections::HashMap;

pub struct CalendarCalculator<'a> {
    pub calendar: &'a Calendar,
    pub exceptions: HashMap<String, &'a CalendarException>,
    pub work_start_hour: u32,
}

impl<'a> CalendarCalculator<'a> {
    pub fn new(calendar: &'a Calendar, exceptions: &'a [CalendarException]) -> Self {
        let mut map = HashMap::new();
        for exc in exceptions {
            map.insert(exc.exception_date.clone(), exc);
        }
        Self {
            calendar,
            exceptions: map,
            work_start_hour: 8,
        }
    }

    /// Gets working hours for a given calendar date
    pub fn working_hours_for_date(&self, date: NaiveDate) -> f64 {
        let date_str = date.format("%Y-%m-%d").to_string();
        if let Some(exc) = self.exceptions.get(&date_str) {
            if !exc.is_working {
                return 0.0;
            }
            return exc.working_hours;
        }
        self.calendar.hours_for_weekday(date.weekday())
    }

    /// Returns the start time of the workday for a given date
    pub fn work_start_time(&self) -> NaiveTime {
        NaiveTime::from_hms_opt(self.work_start_hour, 0, 0).unwrap()
    }

    /// Normalizes a datetime so it lands on a working moment.
    /// If it falls before work hours on a working day, sets it to work_start_time.
    /// If it falls after work hours or on a non-working day, advances to start of next working day.
    pub fn normalize_to_working_moment(&self, dt: NaiveDateTime) -> NaiveDateTime {
        let current_date = dt.date();
        let work_start = self.work_start_time();

        let day_hours = self.working_hours_for_date(current_date);
        if day_hours <= 0.0 {
            // Find next working day
            return self.next_working_day_start(current_date);
        }

        let work_end_minutes = (self.work_start_hour as f64 * 60.0 + day_hours * 60.0).round() as u32;
        let work_end = NaiveTime::from_num_seconds_from_midnight_opt(work_end_minutes * 60, 0)
            .unwrap_or(NaiveTime::from_hms_opt(23, 59, 59).unwrap());

        let t = dt.time();
        if t < work_start {
            NaiveDateTime::new(current_date, work_start)
        } else if t >= work_end {
            self.next_working_day_start(current_date)
        } else {
            dt
        }
    }

    pub fn next_working_day_start(&self, from_date: NaiveDate) -> NaiveDateTime {
        let mut d = from_date + Duration::days(1);
        let work_start = self.work_start_time();
        for _ in 0..3650 { // max 10 years search
            if self.working_hours_for_date(d) > 0.0 {
                return NaiveDateTime::new(d, work_start);
            }
            d += Duration::days(1);
        }
        NaiveDateTime::new(from_date + Duration::days(1), work_start)
    }

    /// Adds working hours to a start datetime, returning the finish datetime
    pub fn add_working_hours(&self, start: NaiveDateTime, hours: f64) -> NaiveDateTime {
        if hours <= 0.0 {
            return start;
        }

        let mut current = self.normalize_to_working_moment(start);
        let mut remaining_minutes = (hours * 60.0).round();

        while remaining_minutes > 0.0 {
            let current_date = current.date();
            let day_hours = self.working_hours_for_date(current_date);
            let day_end_minutes = (self.work_start_hour as f64 * 60.0 + day_hours * 60.0).round();

            let current_minutes = (current.time().hour() * 60 + current.time().minute()) as f64;
            let available_today = (day_end_minutes - current_minutes).max(0.0);

            if remaining_minutes <= available_today {
                let finish_minute = current_minutes + remaining_minutes;
                let secs = (finish_minute * 60.0).round() as u32;
                let time = NaiveTime::from_num_seconds_from_midnight_opt(secs, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(23, 59, 59).unwrap());
                return NaiveDateTime::new(current_date, time);
            } else {
                remaining_minutes -= available_today;
                current = self.next_working_day_start(current_date);
            }
        }

        current
    }

    /// Subtracts working hours from a finish datetime (for backward scheduling)
    pub fn subtract_working_hours(&self, finish: NaiveDateTime, hours: f64) -> NaiveDateTime {
        if hours <= 0.0 {
            return finish;
        }

        let mut current = finish;
        let mut remaining_minutes = (hours * 60.0).round();

        for _ in 0..3650 {
            let current_date = current.date();
            let day_hours = self.working_hours_for_date(current_date);
            if day_hours <= 0.0 {
                // Step back one day to end of work
                current = self.prev_working_day_end(current_date);
                continue;
            }

            let work_start = self.work_start_time();
            let work_start_minutes = (self.work_start_hour * 60) as f64;
            let day_end_minutes = work_start_minutes + (day_hours * 60.0).round();

            let current_minutes = (current.time().hour() * 60 + current.time().minute()) as f64;
            let current_clamped = current_minutes.clamp(work_start_minutes, day_end_minutes);
            let available_today = (current_clamped - work_start_minutes).max(0.0);

            if remaining_minutes <= available_today {
                let start_minute = current_clamped - remaining_minutes;
                let secs = (start_minute * 60.0).round() as u32;
                let time = NaiveTime::from_num_seconds_from_midnight_opt(secs, 0)
                    .unwrap_or(work_start);
                return NaiveDateTime::new(current_date, time);
            } else {
                remaining_minutes -= available_today;
                current = self.prev_working_day_end(current_date);
            }

            if remaining_minutes <= 0.0 {
                break;
            }
        }

        current
    }

    pub fn prev_working_day_end(&self, from_date: NaiveDate) -> NaiveDateTime {
        let mut d = from_date - Duration::days(1);
        for _ in 0..3650 {
            let day_hours = self.working_hours_for_date(d);
            if day_hours > 0.0 {
                let total_minutes = (self.work_start_hour as f64 * 60.0 + day_hours * 60.0).round() as u32;
                let time = NaiveTime::from_num_seconds_from_midnight_opt(total_minutes * 60, 0)
                    .unwrap_or(NaiveTime::from_hms_opt(17, 0, 0).unwrap());
                return NaiveDateTime::new(d, time);
            }
            d -= Duration::days(1);
        }
        NaiveDateTime::new(from_date - Duration::days(1), NaiveTime::from_hms_opt(17, 0, 0).unwrap())
    }

    /// Calculates working duration in hours between two dates
    pub fn working_hours_between(&self, start: NaiveDateTime, finish: NaiveDateTime) -> f64 {
        if finish <= start {
            return 0.0;
        }

        let mut current_date = start.date();
        let end_date = finish.date();
        let mut total_hours = 0.0;

        while current_date <= end_date {
            let day_hours = self.working_hours_for_date(current_date);
            if day_hours > 0.0 {
                let work_start_min = (self.work_start_hour * 60) as f64;
                let work_end_min = work_start_min + (day_hours * 60.0).round();

                let day_start = if current_date == start.date() {
                    let m = (start.time().hour() * 60 + start.time().minute()) as f64;
                    m.clamp(work_start_min, work_end_min)
                } else {
                    work_start_min
                };

                let day_finish = if current_date == end_date {
                    let m = (finish.time().hour() * 60 + finish.time().minute()) as f64;
                    m.clamp(work_start_min, work_end_min)
                } else {
                    work_end_min
                };

                if day_finish > day_start {
                    total_hours += (day_finish - day_start) / 60.0;
                }
            }
            current_date += Duration::days(1);
        }

        (total_hours * 100.0).round() / 100.0
    }
}
