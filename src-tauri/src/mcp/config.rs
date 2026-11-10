// Generates the --mcp-config file assistant.rs hands to each `claude -p`
// call: one server entry pointing back at this app's own running binary
// (re-exec'd with MASTERS_WHEEL_MCP_SERVER set — see main.rs and
// server.rs's doc comment), so Claude Code CLI spawns our stdio MCP
// server instead of looking for a separately-installed one.

use std::io;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::mcp::bridge;

// Phase 2 (MULTI-AGENT-CHAT) dispatches multiple agents' ask_agent calls
// concurrently for one shared chat session — a path keyed only by this
// process's pid would let two parallel calls race on writing/reading the
// same file with different agent_id values. One counter per call avoids
// that regardless of how many calls are in flight at once.
static CONFIG_COUNTER: AtomicU64 = AtomicU64::new(0);

// Must match main.rs's MCP_SERVER_ENV constant exactly — kept as a
// literal here rather than shared across the main.rs/lib.rs boundary,
// since main.rs intentionally stays outside this module.
const MCP_SERVER_ENV: &str = "MASTERS_WHEEL_MCP_SERVER";
const BRIDGE_PORT_ENV: &str = "MASTERS_WHEEL_BRIDGE_PORT";
const CHAT_SESSION_ID_ENV: &str = "MASTERS_WHEEL_CHAT_SESSION_ID";
// Read by mcp/paths.rs, which has no AppHandle of its own (see that
// file's doc comment) — this is the only channel it has to learn which
// Space's records root the active chat is using.
pub const RECORDS_ROOT_ENV: &str = "MASTERS_WHEEL_RECORDS_ROOT";
// Same job as RECORDS_ROOT_ENV, for Training Room's training/ root —
// read back by mcp/paths.rs::training_root(). Always set, same as
// RECORDS_ROOT_ENV, since list_training_sessions/get_training_session
// are always-granted tools now, not conditional on an AITrainerPane call.
pub const TRAINING_ROOT_ENV: &str = "MASTERS_WHEEL_TRAINING_ROOT";
// Only set for an AITrainerPane call (see assistant.rs's `ask_agent`) —
// read back by mcp/paths.rs::training_session_path(). Distinct from
// TRAINING_ROOT_ENV above: this points at one specific session's own
// folder (for the ungated, structurally-scoped get_roleplay_transcript),
// not the whole training/ root an arbitrary session_id is resolved
// against.
pub const TRAINING_SESSION_PATH_ENV: &str = "MASTERS_WHEEL_TRAINING_SESSION_PATH";

/// Every tool name this server currently exposes, in the
/// `mcp__<server name>__<tool name>` shape `--allowedTools` expects —
/// kept here (not derived from the tool registry at runtime) since it's
/// the one list a human reviewing "what can the model actually call"
/// should be able to read without chasing macro expansion. The Training
/// Room pair is always granted, same as the Performance Review pair —
/// each is gated per-resource by its own tool (get_performance_review/
/// get_training_session), not by whether it's declared at all.
pub const ALLOWED_TOOLS: &[&str] = &[
    "mcp__masters_wheel__list_performance_reviews",
    "mcp__masters_wheel__get_performance_review",
    "mcp__masters_wheel__search_performance_reviews",
    "mcp__masters_wheel__list_training_sessions",
    "mcp__masters_wheel__get_training_session",
];

/// Only ever added on top of ALLOWED_TOOLS for an AITrainerPane call —
/// every ordinary ask_agent call (the floating widget, /chat, a
/// dedicated agent chat) never declares this tool's schema at all, since
/// it's meaningless outside one specific training session.
pub const TRAINING_ALLOWED_TOOLS: &[&str] = &["mcp__masters_wheel__get_roleplay_transcript"];

// chat_session_id/records_root/training_root flow into the mcp_server
// subprocess's env so mcp/permission.rs knows which chat to mark a
// resource "read" for, and mcp/paths.rs knows which Space's records/
// training sessions to read — the subprocess has no other way to know
// either. `training_session_path` is only ever `Some` for an
// AITrainerPane call (see assistant.rs's `ask_agent`) — distinct from
// `training_root`, which is always set.
pub fn write_config_file(
    chat_session_id: &str,
    records_root: &str,
    training_root: &str,
    training_session_path: Option<&str>,
) -> io::Result<PathBuf> {
    let current_exe = std::env::current_exe()?;
    let mut env = serde_json::json!({
        MCP_SERVER_ENV: "1",
        BRIDGE_PORT_ENV: bridge::PORT.to_string(),
        CHAT_SESSION_ID_ENV: chat_session_id,
        RECORDS_ROOT_ENV: records_root,
        TRAINING_ROOT_ENV: training_root,
    });
    if let Some(path) = training_session_path {
        env[TRAINING_SESSION_PATH_ENV] = serde_json::Value::String(path.to_string());
    }
    let config = serde_json::json!({
        "mcpServers": {
            "masters_wheel": {
                "command": current_exe.to_string_lossy(),
                "args": [],
                "env": env
            }
        }
    });

    let path = std::env::temp_dir().join(format!(
        "masters-wheel-mcp-config-{}-{}.json",
        std::process::id(),
        CONFIG_COUNTER.fetch_add(1, Ordering::SeqCst)
    ));
    std::fs::write(&path, serde_json::to_vec(&config)?)?;
    Ok(path)
}
