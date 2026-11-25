// Where a video goes inside the app folder. Mirrors
// src/lib/onedrive/layout.ts: <Space>/Performance Reviews/<YYYY-MM>/<record>.<ext>

use super::model::Video;

pub const SECTION: &str = "Performance Reviews";

// Same cleaning as layout.ts cloudSegment.
pub fn cloud_segment(name: &str) -> String {
    let replaced: String = name.chars().map(|c| if "\"*:<>?/\\|".contains(c) { '-' } else { c }).collect();
    let cleaned = replaced.trim().trim_end_matches('.');
    if cleaned.is_empty() { "Untitled".into() } else { cleaned.into() }
}

pub fn month_folder(video: &Video) -> String {
    let (year, month) = year_month(video.added_at);
    format!("{}/{SECTION}/{year:04}-{month:02}", cloud_segment(&video.space_folder))
}

pub fn cloud_path(video: &Video) -> String {
    let ext = video.file_name.rsplit_once('.').map(|(_, ext)| ext).unwrap_or("mp4");
    format!("{}/{}.{ext}", month_folder(video), cloud_segment(&video.record_id))
}

// UTC calendar month of a Unix time (Howard Hinnant's civil_from_days).
fn year_month(unix_seconds: u64) -> (i64, u32) {
    let days = (unix_seconds / 86_400) as i64 + 719_468;
    let era = days.div_euclid(146_097);
    let day_of_era = days.rem_euclid(146_097);
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let mp = (5 * day_of_year + 2) / 153;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let year = year_of_era + era * 400 + i64::from(month <= 2);
    (year, month)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::policy::tests::video;

    #[test]
    fn segments_match_the_typescript_rules() {
        assert_eq!(cloud_segment("Work: Sales"), "Work- Sales");
        assert_eq!(cloud_segment("  Notes.. "), "Notes");
        assert_eq!(cloud_segment("..."), "Untitled");
    }

    #[test]
    fn months_are_utc_calendar_months() {
        assert_eq!(year_month(0), (1970, 1));
        assert_eq!(year_month(1_709_251_199), (2024, 2)); // 2024-02-29 23:59:59
        assert_eq!(year_month(1_709_251_200), (2024, 3));
        assert_eq!(year_month(1_798_761_599), (2026, 12)); // 2026-12-31 23:59:59
    }

    #[test]
    fn videos_go_under_space_section_and_month() {
        let mut v = video(true, false);
        v.space_folder = "Work: Sales".into();
        v.added_at = 1_764_000_000; // 2025-11-24
        assert_eq!(cloud_path(&v), "Work- Sales/Performance Reviews/2025-11/r1.mp4");
    }
}
