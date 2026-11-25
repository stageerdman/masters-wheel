// Is there room on this Mac to bring a video back? Smart is strict (it
// only brings videos home for convenience); Backup and the other
// "everything comes back" moves just keep a safety margin.

use std::path::Path;

use super::model::Mode;

const GB: u64 = 1_000_000_000;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DiskSpace {
    pub free: u64,
    pub total: u64,
}

impl DiskSpace {
    // Free space left after downloading `size` more bytes must stay above
    // the floor.
    pub fn has_room_for(&self, size: u64, mode: Mode) -> bool {
        self.free.saturating_sub(size) > self.floor(mode)
    }

    // How much the user must free up before `size` fits ("Free up N first").
    pub fn shortfall(&self, size: u64, mode: Mode) -> u64 {
        (size + self.floor(mode) + 1).saturating_sub(self.free)
    }

    fn floor(&self, mode: Mode) -> u64 {
        match mode {
            Mode::Smart => (self.total / 10).max(5 * GB),
            Mode::Backup | Mode::AlwaysInCloud => GB,
        }
    }
}

pub fn disk_space(path: &Path) -> Option<DiskSpace> {
    use std::os::unix::ffi::OsStrExt;
    let c_path = std::ffi::CString::new(path.as_os_str().as_bytes()).ok()?;
    let mut stats: libc::statvfs = unsafe { std::mem::zeroed() };
    // Safe: c_path is a valid NUL-terminated string and stats is a
    // properly sized out-parameter.
    if unsafe { libc::statvfs(c_path.as_ptr(), &mut stats) } != 0 {
        return None;
    }
    let block = stats.f_frsize as u64;
    Some(DiskSpace { free: stats.f_bavail as u64 * block, total: stats.f_blocks as u64 * block })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn smart_keeps_ten_percent_and_five_gigabytes_free() {
        let big_disk = DiskSpace { free: 120 * GB, total: 1000 * GB };
        assert!(big_disk.has_room_for(19 * GB, Mode::Smart));
        assert!(!big_disk.has_room_for(20 * GB, Mode::Smart));

        let small_disk = DiskSpace { free: 8 * GB, total: 20 * GB };
        assert!(small_disk.has_room_for(2 * GB, Mode::Smart));
        assert!(!small_disk.has_room_for(3 * GB, Mode::Smart));
    }

    #[test]
    fn backup_only_keeps_a_one_gigabyte_margin() {
        let disk = DiskSpace { free: 10 * GB, total: 1000 * GB };
        assert!(disk.has_room_for(8 * GB, Mode::Backup));
        assert!(!disk.has_room_for(9 * GB, Mode::Backup));
    }

    #[test]
    fn shortfall_is_exactly_what_makes_it_fit() {
        let disk = DiskSpace { free: 30 * GB, total: 1000 * GB };
        let short = disk.shortfall(49 * GB, Mode::Backup);
        assert!(short > 19 * GB && short <= 20 * GB + 1);
        let freed = DiskSpace { free: disk.free + short, ..disk };
        assert!(freed.has_room_for(49 * GB, Mode::Backup));
        assert_eq!(disk.shortfall(GB, Mode::Backup), 0);
    }

    #[test]
    fn this_disk_reports_its_space() {
        let space = disk_space(&std::env::temp_dir()).expect("statvfs on the temp dir");
        assert!(space.total >= space.free && space.total > 0);
    }
}
