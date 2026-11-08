// One file per tool, each self-contained (its own data shape + how it
// reads/produces that data). server.rs wires each one up as an `#[tool]`
// method — adding tool N+1 means a new file here plus one method there,
// nothing else.

pub mod get_performance_review;
pub mod get_roleplay_transcript;
pub mod list_performance_reviews;
