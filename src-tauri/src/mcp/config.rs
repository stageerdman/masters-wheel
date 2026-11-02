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
const AGENT_ID_ENV: &str = "MASTERS_WHEEL_AGENT_ID";

/// Every tool name this server currently exposes, in the
/// `mcp__<server name>__<tool name>` shape `--allowedTools` expects —
/// kept here (not derived from the tool registry at runtime) since it's
/// the one list a human reviewing "what can the model actually call"
/// should be able to read without chasing macro expansion.
pub const ALLOWED_TOOLS: &[&str] = &[
    "mcp__masters_wheel__list_performance_reviews",
    "mcp__masters_wheel__get_performance_review",
];

// chat_session_id/agent_id flow into the mcp_server subprocess's env so
// mcp/permission.rs knows which chat (for tag/always-allow lookups) and
// which agent (shown on the permission card) a tool call is answering
// for — the subprocess has no other way to know either.
pub fn write_config_file(chat_session_id: &str, agent_id: &str) -> io::Result<PathBuf> {
    let current_exe = std::env::current_exe()?;
    let config = serde_json::json!({
        "mcpServers": {
            "masters_wheel": {
                "command": current_exe.to_string_lossy(),
                "args": [],
                "env": {
                    MCP_SERVER_ENV: "1",
                    BRIDGE_PORT_ENV: bridge::PORT.to_string(),
                    CHAT_SESSION_ID_ENV: chat_session_id,
                    AGENT_ID_ENV: agent_id,
                }
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
