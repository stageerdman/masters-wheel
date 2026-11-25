// The engine's file operations on this Mac: the Finder pointer left behind
// when a video goes to OneDrive (SPEC §8), and reading upload chunks.

use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use super::model::WEBLOC_NAME;

pub fn write_webloc(record_dir: &Path, url: &str) -> std::io::Result<()> {
    let escaped = url.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    let plist = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n\
         <plist version=\"1.0\"><dict><key>URL</key><string>{escaped}</string></dict></plist>\n"
    );
    std::fs::write(record_dir.join(WEBLOC_NAME), plist)
}

pub fn remove_webloc(record_dir: &Path) {
    let _ = std::fs::remove_file(record_dir.join(WEBLOC_NAME));
}

pub fn file_size(path: &Path) -> Option<u64> {
    std::fs::metadata(path).ok().filter(|m| m.is_file()).map(|m| m.len())
}

// Copies bytes `start..start+len` of `source` into `chunk`.
pub fn write_chunk(source: &Path, start: u64, len: u64, chunk: &Path) -> std::io::Result<()> {
    let mut file = std::fs::File::open(source)?;
    file.seek(SeekFrom::Start(start))?;
    let mut bytes = Vec::with_capacity(len as usize);
    file.take(len).read_to_end(&mut bytes)?;
    if bytes.len() as u64 != len {
        return Err(std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "file is shorter than recorded"));
    }
    std::fs::write(chunk, bytes)
}
